// The bartender's ear: saves a player's feedback (text and/or a short voice note) and emails it to the arcade admin at once.
import { feedbackMail, mailReady } from '../lib/mail.js';
const SB_URL = 'https://tdjvnhuygpobdcmhlcms.supabase.co', SB_KEY = 'sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy';
const ADMIN = process.env.FEEDBACK_TO || 'admin@t1bang.com';
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
async function rpc(action, body, authorization) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/bba_feedback`, { method: 'POST', signal: AbortSignal.timeout(9000),
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json', ...(/^Bearer [A-Za-z0-9._-]+$/.test(authorization || '') ? { Authorization: authorization } : {}) }, body: JSON.stringify({ p_action: action, p_body: body }) });
  const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.message || 'The bartender is busy. Try again.'), { status: j.code === '28000' ? 401 : 400 });
  return j;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json({ mail: mailReady() });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}, auth = req.headers?.authorization;
    const saved = await rpc('save', { pid: b.pid, key: b.key, about: b.about, text: b.text, transcript: b.transcript, secs: b.secs, audio: b.audio || null, mime: b.mime || null }, auth);
    const emailed = await feedbackMail(ADMIN, { ...saved, audio: b.audio || null, mime: b.mime || '', secs: b.secs });
    if (emailed) await rpc('sent', { pid: b.pid, key: b.key, id: saved.id }, auth).catch(() => {});
    res.status(200).json({ ok: true, id: saved.id, emailed });
  } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'The bartender is busy. Try again.' }); if (!e.status) console.error(e); }
}
