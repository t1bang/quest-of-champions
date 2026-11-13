// Buy tokens with real money through PayPal.
// Environment variables (set in Vercel): PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV ("live" or "sandbox"),
// ARCADE_SERVER_SECRET (must match the hash stored in bba_private.secrets, see the arcade_store migration).
import { TOKEN_PACK } from '../prizes.js';
import { receiptMail } from '../lib/mail.js';

const SB_URL = 'https://tdjvnhuygpobdcmhlcms.supabase.co', SB_KEY = 'sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy';
const PP = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
const ready = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.ARCADE_SERVER_SECRET);
const fail = (status, message) => Object.assign(new Error(message), { status });
const bearer = h => (/^Bearer [A-Za-z0-9._-]+$/.test(h || '') ? { Authorization: h } : {});
const price = () => (TOKEN_PACK.cents / 100).toFixed(2);

async function rpc(fn, args, authorization) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json', ...bearer(authorization) }, body: JSON.stringify(args), signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  if (!r.ok) throw fail(j.code === '28000' ? 401 : 400, j.message || 'The arcade is unavailable.');
  return j;
}
async function paypal(path, body) {
  const tok = await fetch(PP() + '/v1/oauth2/token', { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: 'Basic ' + Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials' }).then(r => r.json());
  if (!tok.access_token) throw fail(502, 'The payment service is not reachable right now');
  const r = await fetch(PP() + path, { method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

export default async function handler(req, res) {
  try {
    const q = req.query || {}, b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    res.setHeader('Cache-Control', 'no-store');
    if (q.a === 'config') return res.status(200).json({ enabled: ready(), tokens: TOKEN_PACK.tokens, price: price() });
    if (req.method !== 'POST') throw fail(405, 'Use POST for this action');
    if (!ready()) throw fail(503, 'Token purchases are not switched on yet');
    const origin = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host);

    if (q.a === 'create') {
      // The buyer must be a real arcade player; their id rides along on the order.
      const me = await rpc('bba_arcade', { p_action: 'me', p_body: { pid: b.pid, key: b.key }, p_game: null }, req.headers.authorization);
      const pid = String(b.pid || '');
      if (!me.player || !/^[a-f0-9]{16}$/.test(pid)) throw fail(401, 'Sign in first');
      const o = await paypal('/v2/checkout/orders', { intent: 'CAPTURE',
        purchase_units: [{ custom_id: pid, description: `${TOKEN_PACK.tokens} Big Bang Arcade tokens`, amount: { currency_code: 'USD', value: price() } }],
        payment_source: { paypal: { experience_context: { brand_name: 'Big Bang Arcade', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', return_url: origin + '/?pay=return', cancel_url: origin + '/?pay=cancel' } } } });
      const link = (o.data.links || []).find(l => l.rel === 'payer-action' || l.rel === 'approve');
      if (!o.ok || !link) throw fail(502, 'Could not start the payment');
      return res.status(200).json({ id: o.data.id, url: link.href });
    }
    if (q.a === 'capture') {
      const id = String(b.order || ''); if (!/^[A-Z0-9]{10,24}$/.test(id)) throw fail(400, 'Unknown payment');
      let c = await paypal(`/v2/checkout/orders/${id}/capture`, {});
      if (!c.ok) c = await paypal(`/v2/checkout/orders/${id}`); // already captured: read it back
      const unit = (c.data.purchase_units || [])[0] || {}, cap = ((unit.payments || {}).captures || [])[0] || {};
      const pid = cap.custom_id || unit.custom_id || '';
      if (c.data.status !== 'COMPLETED' || cap.status !== 'COMPLETED' || !cap.id) throw fail(402, 'The payment was not completed');
      if ((cap.amount || {}).currency_code !== 'USD' || (cap.amount || {}).value !== price() || !/^[a-f0-9]{16}$/.test(pid)) throw fail(400, 'This payment does not match a token pack');
      const r = await rpc('bba_credit_tokens', { p_secret: process.env.ARCADE_SERVER_SECRET, p_pid: pid, p_tokens: TOKEN_PACK.tokens, p_ref: cap.id, p_cents: TOKEN_PACK.cents });
      if (r.credited) await receiptMail((c.data.payer || {}).email_address, ((c.data.payer || {}).name || {}).given_name || 'Player', TOKEN_PACK.tokens, price(), cap.id);
      return res.status(200).json({ ok: true, credited: !!r.credited, tokens: TOKEN_PACK.tokens });
    }
    throw fail(404, 'Unknown action');
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'The payment could not be processed right now' });
    if (!e.status) console.error(e);
  }
}
