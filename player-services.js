import { SOCIAL_AUTH } from './config.js';
import { createClient } from './vendor/supabase.js';

export const supabase = createClient(SOCIAL_AUTH.url, SOCIAL_AUTH.key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
export async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
export async function playerCall(action, body = {}) {
  const r = await fetch(`/api/player?a=${action}`, { method: 'POST', keepalive: action==='run_end' || action==='run_events',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() }, body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error || 'Player service unavailable'), { status: r.status });
  return data;
}
export const providers = [
  ['google','Google'], ['facebook','Facebook'], ['apple','Apple'], ['discord','Discord'],
  ['azure','Microsoft'], ['linkedin_oidc','LinkedIn'],
];
export async function enabledProviders() {
  try {
    const r = await fetch(`${SOCIAL_AUTH.url}/auth/v1/settings`, { headers: { apikey: SOCIAL_AUTH.key } });
    if (!r.ok) return [];
    const settings = await r.json();
    return providers.filter(([id]) => settings.external?.[id] === true);
  } catch { return []; }
}
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Only well-defined gameplay properties leave the game. Never forward arbitrary
// objects, text input, email addresses, positions, or identity tokens.
const eventKinds = new Set(['game_ready','level_start','level_complete','game_over','victory','pause','resume','equipment_change','assist','death','score_reported','load_failed']);
const details = new Set(['playing','paused','intro','clear','victory','gameover','base','armor','cloak','fists','plunger','nunchucks','story','arcade']);
export function cleanEvent(event) {
  if (!event || !eventKinds.has(event.kind)) return null;
  const out = { id: crypto.randomUUID(), kind: event.kind };
  if (Number.isInteger(event.stage) && event.stage >= 0 && event.stage <= 99) out.stage = event.stage;
  if (Number.isFinite(event.score) && event.score >= 0 && event.score <= 1e9) out.score = Math.floor(event.score);
  if (details.has(event.detail)) out.detail = event.detail;
  return out;
}
export function cleanBlankmanSave(data) {
  if (!data || typeof data !== 'object' || !Number.isInteger(data.stage) || data.stage < 0 || data.stage > 7) return null;
  const bounded = (n, max) => Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0;
  return { stage: data.stage, score: bounded(data.score,1e9), best: bounded(data.best,1e9), unlocked: bounded(data.unlocked,7),
    cleared: [...new Set((Array.isArray(data.cleared) ? data.cleared : []).filter(n => Number.isInteger(n) && n >= 0 && n < 8))] };
}

export function createActivityTracker(call = playerCall) {
  let run = null, queue = [], busy = false, pending = Promise.resolve(), lastInput = 0, playing = false, enabled = false, epoch = 0, launch = 0;
  const flush = async (ending = false) => {
    if (busy) { if (!ending) return; await pending; }
    if (!run) return;
    const current = run, currentEpoch = epoch, batch = queue.splice(0,30);
    busy = true;
    pending = (async () => { try {
      if (batch.length || !ending) await call('run_events', { id: current, events: batch, active: playing && !document.hidden && Date.now()-lastInput < 60000 });
      if (ending) await call('run_end', { id: current });
    } catch { if (currentEpoch === epoch && !ending) queue = [...batch,...queue].slice(0,120); }
    finally { busy = false; } })();
    return pending;
  };
  return {
    enabled(value) { enabled = !!value; if (!enabled) { epoch++; launch++; run = null; queue = []; playing = false; } },
    async start(game, build = 'unknown') {
      const thisLaunch = ++launch;
      await this.stop(false); if (!enabled || thisLaunch !== launch) return;
      const currentEpoch = ++epoch, id = crypto.randomUUID();
      try { const r = await call('run_start', { id, game, build }); if (epoch === currentEpoch && !r.disabled) run = id; } catch {}
    },
    input() { lastInput = Date.now(); },
    playing(value) { playing = !!value; },
    event(event) { const e = cleanEvent(event); if (run && enabled && e && queue.length < 120) queue.push(e); },
    flush,
    async stop(cancelLaunch = true) { if (cancelLaunch) launch++; const old = run; await flush(true); if (run === old) { epoch++; run = null; queue = []; playing = false; } },
  };
}
