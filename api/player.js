import { SOCIAL_AUTH } from '../config.js';

const siteActions = new Set(['library','site_events','site_dashboard']);
const actions = new Set([...siteActions,'account','preferences','avatar','save_get','save_put','run_start','run_events','run_end','lobby_create','lobby_join','lobby_get','lobby_leave','dashboard','export','erase_activity']);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
    const action = req.query?.a;
    if (!actions.has(action)) return res.status(404).json({ error: 'Unknown player action' });
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'Invalid request' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Invalid request' });
    if (JSON.stringify(body).length > 90000) return res.status(413).json({ error: 'Request too large' });
    const authorization = req.headers?.authorization;
    if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization || '')) return res.status(401).json({ error: 'Sign in first' });
    // Forward the player's JWT, never a service-role key. PostgREST verifies the
    // signature and the private function checks ownership on every operation.
    const r = await fetch(`${SOCIAL_AUTH.url}/rest/v1/rpc/${siteActions.has(action) ? 'bba_site' : 'bba_player'}`, {
      method: 'POST', headers: { apikey: SOCIAL_AUTH.key, Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_action: action, p_body: body }), signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    if (!r.ok) {
      const code = data.code === '28000' || r.status === 401 ? 401 : data.code === '42501' ? 403 : data.code === '40001' ? 409 : 400;
      return res.status(code).json({ error: data.message || 'Could not save that change' });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(503).json({ error: 'Player services are temporarily unavailable. Your local game is still available.' });
  }
}
