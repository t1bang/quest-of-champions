// Big Bang Arcade online database: players, tokens, closet, leaderboards, comments.
// Storage: configured Upstash Redis or Vercel Blob; otherwise the T1Bang Supabase arcade.
import { createHash, randomBytes } from 'node:crypto';
import { PRIZES, REWARDS, REAL_PRIZES_LIVE, BAR, WEAR } from '../prizes.js';
import { prizeMail } from '../lib/mail.js';

const SB_URL = "https://tdjvnhuygpobdcmhlcms.supabase.co";
const SB_KEY = "sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy";
async function supabaseAction(action, body, game, authorization) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/bba_arcade`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json", ...(/^Bearer [A-Za-z0-9._-]+$/.test(authorization || '') ? { Authorization: authorization } : {}) },
    body: JSON.stringify({
      p_action: action,
      p_body: body,
      p_game: game || null,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok)
    throw fail(
      data.code === "28000" ? 401 : 400,
      data.message || "The arcade is unavailable.",
    );
  return data;
}

const GAMES = ['quest', 'vendetta', 'guerilla', 'gamerboy', 'blankman', 'cruizin'];
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOK}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const newest = blobs => blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
async function get(key) {
  if (R_URL) { const v = await redis(['GET', 'bba:' + key]); return v ? JSON.parse(v) : null; }
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: `db/${key}/` });
  if (!blobs.length) return null;
  return (await fetch(newest(blobs)[0].url)).json();
}
async function set(key, val) {
  if (R_URL) return redis(['SET', 'bba:' + key, JSON.stringify(val)]);
  const { put, list, del } = await import('@vercel/blob');
  await put(`db/${key}/${Date.now()}-${randomBytes(3).toString('hex')}.json`, JSON.stringify(val),
    { access: 'public', addRandomSuffix: false, contentType: 'application/json' });
  const { blobs } = await list({ prefix: `db/${key}/` });
  if (blobs.length > 1) await del(newest(blobs).slice(1).map(b => b.url));
}

const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = s => createHash('sha256').update(String(s)).digest('hex');
const cleanName = s => String(s || '').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 16);
const pub = p => ({ name: p.name, tokens: p.tokens, earned: p.earned, closet: p.closet, claims: p.claims, badge: p.badge, avatar: p.avatar || null, outfit: p.outfit || {}, beers: p.beers || 0 });
const today = () => new Date().toISOString().slice(0, 10);
const badgeIcon = p => (PRIZES.find(x => x.id === p.badge) || {}).icon || '';

async function auth(b) {
  if (!/^[a-f0-9]{16}$/.test(b.pid || '')) throw fail(401, 'Sign in first');
  const p = await get('player/' + b.pid);
  if (!p || p.kh !== hash(b.key)) throw fail(401, 'Sign in first');
  if (p.day !== today()) { p.day = today(); p.did = {}; }
  return p;
}
async function rank(key, entry, field, keep = 100) {
  const list = ((await get(key)) || []).filter(e => e.pid !== entry.pid);
  list.push(entry);
  list.sort((a, b) => b[field] - a[field]);
  await set(key, list.slice(0, keep));
}

const actions = {
  async join(b) {
    const name = cleanName(b.name);
    if (name.length < 2) throw fail(400, 'Pick a player name (2-16 letters or numbers)');
    const pid = randomBytes(8).toString('hex'), key = randomBytes(16).toString('hex');
    const p = { name, kh: hash(key), tokens: 0, earned: 0, closet: [], claims: [], badge: '', day: today(), did: {} };
    await set('player/' + pid, p);
    return { pid, key, player: pub(p) };
  },
  async me(b) { return { player: pub(await auth(b)) }; },
  async earn(b) {
    const p = await auth(b), why = b.why, game = b.game;
    let gained = 0, tag = why;
    if (why === 'play' || why === 'trailer' || why === 'score') {
      if (!GAMES.includes(game)) throw fail(400, 'Unknown game');
      tag = why + ':' + game;
    }
    if (why === 'score') {
      const score = Math.max(0, Math.min(1e9, Math.floor(Number(b.score) || 0)));
      const left = 200 - (p.did.scoreTok || 0);
      gained = Math.max(0, Math.min(left, REWARDS.scoreMax, Math.floor(score / 100) * REWARDS.scorePer100));
      p.did.scoreTok = (p.did.scoreTok || 0) + gained;
      const board = (await get('scores/' + game)) || [];
      const mine = board.find(e => e.pid === b.pid);
      if (!mine || score > mine.score) await rank('scores/' + game, { pid: b.pid, name: p.name, badge: badgeIcon(p), score, ts: Date.now() }, 'score');
    } else if (why === 'minute' || why === 'fatality' || why === 'level') {
      // repeatable rewards, rate-limited: [seconds between awards, max awards a day]
      const [gap, cap] = { minute: [55, 180], fatality: [20, 20], level: [30, 12] }[why];
      const okGame = why === 'minute' ? GAMES.includes(game) : game === (why === 'fatality' ? 'vendetta' : 'quest');
      if (!okGame) throw fail(400, 'Unknown game');
      p.last = p.last || {};
      if (Date.now() - (p.last[why] || 0) >= gap * 1000 && (p.did['n:' + why] || 0) < cap) {
        gained = REWARDS[why]; p.last[why] = Date.now(); p.did['n:' + why] = (p.did['n:' + why] || 0) + 1;
      }
    } else if (why === 'daily') {
      // Daily streak: 10 x the streak day, capped at day 7.
      const t = today(), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      if (p.lastDaily !== t) { p.streak = p.lastDaily === y ? (p.streak || 0) + 1 : 1; p.lastDaily = t; gained = REWARDS.daily * Math.min(p.streak, REWARDS.streakMax); }
    } else if (why !== 'social' && REWARDS[why] && !p.did[tag]) {
      gained = REWARDS[why];
      p.did[tag] = 1;
    }
    if (gained) {
      p.tokens += gained; p.earned += gained;
      await rank('earners', { pid: b.pid, name: p.name, badge: badgeIcon(p), score: p.earned, ts: Date.now() }, 'score');
    }
    await set('player/' + b.pid, p);
    return { player: pub(p), gained, streak: p.streak || 0 };
  },
  // One-time bonus for signing in with Google or Facebook (verified with Supabase Auth).
  async social(b) {
    const p = await auth(b);
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${b.token}` } });
    const u = r.ok ? await r.json() : null, provider = u && u.app_metadata && u.app_metadata.provider;
    if (!u || !u.id || !['google', 'facebook'].includes(provider)) throw fail(400, 'That sign-in could not be verified');
    let gained = 0;
    if (!p.social && !(await get('social/' + u.id))) {
      gained = REWARDS.social; p.tokens += gained; p.earned += gained;
      await set('social/' + u.id, { pid: b.pid, ts: Date.now() });
      await rank('earners', { pid: b.pid, name: p.name, badge: badgeIcon(p), score: p.earned, ts: Date.now() }, 'score');
    }
    p.social = provider;
    await set('player/' + b.pid, p);
    return { player: pub(p), gained };
  },
  // Bar: a beer costs BEER tokens; a tip is 1-20 tokens.
  async spend(b) {
    const p = await auth(b), cost = b.what === 'play' ? BAR.play : b.what === 'beer' ? BAR.beer : b.what === 'tip' ? Math.max(1, Math.min(20, Math.floor(Number(b.amount) || 0))) : 0;
    if (!cost) throw fail(400, 'Unknown order');
    if (p.tokens < cost) throw fail(400, 'Not enough tokens yet');
    p.tokens -= cost; if (b.what === 'beer') p.beers = (p.beers || 0) + 1;
    const bar = (await get('bar')) || { beers: 0, tips: 0 };
    if (b.what === 'beer') bar.beers++; else bar.tips += cost;
    await set('bar', bar); await set('player/' + b.pid, p);
    return { player: pub(p) };
  },
  async wear(b) {
    const p = await auth(b), fit = {};
    for (const [slot, id] of Object.entries(b.outfit || {})) { const w = WEAR.find(x => x.id === id && x.slot === slot); if (w && (w.cost === 0 || p.closet.includes(id))) fit[slot] = id; }
    p.outfit = fit; await set('player/' + b.pid, p);
    return { player: pub(p) };
  },
  async avatar(b) {
    const p = await auth(b), a = b.av || {}, n = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
    p.avatar = { skin: n(a.skin, 4), hair: n(a.hair, 4), hc: n(a.hc, 5), shirt: n(a.shirt, 7), shades: n(a.shades, 1) };
    await set('player/' + b.pid, p);
    return { player: pub(p) };
  },
  async buy(b) {
    const p = await auth(b), prize = PRIZES.find(x => x.id === b.id);
    if (!prize || (prize.real && !REAL_PRIZES_LIVE)) throw fail(400, 'That prize is not available');
    if (!prize.real && p.closet.includes(prize.id)) throw fail(400, 'Already in your closet');
    if (p.tokens < prize.cost) throw fail(400, 'Not enough tokens yet');
    p.tokens -= prize.cost;
    if (!p.closet.includes(prize.id)) p.closet.push(prize.id);
    let code;
    if (prize.real) {
      code = 'BBA-' + randomBytes(4).toString('hex').toUpperCase();
      p.claims.push({ id: prize.id, code, name: prize.name, kind: prize.kind || 'ship', link: prize.kind === 'ticket' ? process.env.TICKETS_LINK || '' : '', ts: Date.now() });
      const all = (await get('claims')) || [];
      all.push({ code, prize: prize.id, pid: b.pid, name: p.name, ts: Date.now() });
      await set('claims', all);
    }
    await set('player/' + b.pid, p);
    return { player: pub(p), code };
  },
  async badge(b) {
    const p = await auth(b);
    if (b.id && !p.closet.includes(b.id)) throw fail(400, 'Win it first');
    p.badge = b.id || '';
    await set('player/' + b.pid, p);
    return { player: pub(p) };
  },
  async board(b, q) {
    const key = GAMES.includes(q.game) ? 'scores/' + q.game : 'earners';
    return { rows: ((await get(key)) || []).slice(0, 20).map(({ name, badge, score }) => ({ name, badge, score })) };
  },
  async comments(b, q) {
    if (!GAMES.includes(q.game)) throw fail(400, 'Unknown game');
    return { rows: ((await get('comments/' + q.game)) || []).slice(-50).reverse() };
  },
  async comment(b) {
    const p = await auth(b);
    if (!GAMES.includes(b.game)) throw fail(400, 'Unknown game');
    const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!text) throw fail(400, 'Write something first');
    if (Date.now() - (p.lastC || 0) < 15000) throw fail(429, 'Slow down a second');
    p.lastC = Date.now();
    const list = (await get('comments/' + b.game)) || [];
    list.push({ name: p.name, badge: badgeIcon(p), text, ts: Date.now() });
    await set('comments/' + b.game, list.slice(-200));
    await set('player/' + b.pid, p);
    return { ok: true };
  },
  // Moderation: POST {admin, game, ts} with the ADMIN_KEY env var value removes a comment.
  async uncomment(b) {
    if (!process.env.ADMIN_KEY || b.admin !== process.env.ADMIN_KEY) throw fail(403, 'No');
    const list = (await get('comments/' + b.game)) || [];
    await set('comments/' + b.game, list.filter(c => c.ts !== b.ts));
    return { ok: true };
  },
};

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!['GET', 'POST'].includes(req.method)) throw fail(405, 'Method not allowed');
    if (req.method !== 'POST' && !['board', 'comments'].includes(q.a)) throw fail(405, 'Use POST for this action');
    if (JSON.stringify(b).length > 32768) throw fail(413, 'Request too large');
    const fn = actions[q.a];
    if (!fn) throw fail(404, 'Unknown action');
    res.setHeader('Cache-Control', 'no-store');
    // Preserve configured legacy stores. The T1Bang deployment uses the existing
    // Supabase RPC when neither Redis nor Blob is connected.
    if (!R_URL && !process.env.BLOB_READ_WRITE_TOKEN) {
      if (q.a === 'uncomment') throw fail(501, 'Comment moderation is not available on this storage backend');
      const out = await supabaseAction(q.a, b, q.game, req.headers?.authorization);
      // A redeemed real prize is emailed to the signed-in player (and copied to the arcade mailbox).
      if (q.a === 'buy' && out.code && out.prize) { out.emailed = await prizeMail(out.email, out.player?.name || 'Player', out.prize, out.code); delete out.email; }
      return res.status(200).json(out);
    }
    res.status(200).json(await fn(b, q));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'The arcade database is not reachable right now' });
    if (!e.status) console.error(e);
  }
}
