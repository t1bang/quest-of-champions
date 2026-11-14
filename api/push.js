// Sends boss alerts to every browser that opted in. Called by the arcade database's scheduler the moment a boss spawns.
// The caller must present the scheduler's secret; the database hands back the signing keys, the message and the list.
import webpush from 'web-push';
const SB_URL = 'https://tdjvnhuygpobdcmhlcms.supabase.co', SB_KEY = 'sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy';
async function rpc(action, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/bba_push`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_action: action, p_body: body }), signal: AbortSignal.timeout(8000) });
  const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.message || 'push service unavailable'), { status: r.status === 401 || j.code === '42501' ? 403 : 400 });
  return j;
}
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!/^[a-f0-9]{48}$/.test(b.secret || '')) return res.status(403).json({ error: 'No' });
    const job = await rpc('job', { secret: b.secret });
    if (!job.note || !(job.subs || []).length) return res.status(200).json({ sent: 0, note: !!job.note });
    webpush.setVapidDetails('mailto:admin@t1bang.com', job.public, job.private);
    const payload = JSON.stringify(job.note), dead = [], codes = {}; let sent = 0, failed = 0;
    await Promise.all(job.subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 1200, urgency: 'high' })
      .then(() => { sent++; }).catch(e => { failed++; const c = e.statusCode || 'error'; codes[c] = (codes[c] || 0) + 1; if (c === 404 || c === 410) dead.push(s.endpoint); })));
    if (dead.length) await rpc('report', { secret: b.secret, dead }).catch(() => {});
    res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ sent, failed, removed: dead.length, codes });
  } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'push failed' }); if (!e.status) console.error(e); }
}
