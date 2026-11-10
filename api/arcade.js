// Big Bang Arcade online database: players, tokens, closet, leaderboards, comments.
// Storage: Upstash Redis when its env vars are present, otherwise Vercel Blob.
import { createHash, randomBytes } from 'node:crypto';
import { PRIZES, REWARDS, REAL_PRIZES_LIVE } from '../prizes.js';

const GAMES = ['quest', 'vendetta', 'guerilla', 'gamerboy'];
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
const pub = p => ({ name: p.name, tokens: p.tokens, earned: p.earned, closet: p.closet, claims: p.claims, badge: p.badge });
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
    } else if (REWARDS[why] && !p.did[tag]) {
      gained = REWARDS[why];
      p.did[tag] = 1;
    }
    if (gained) {
      p.tokens += gained; p.earned += gained;
      await rank('earners', { pid: b.pid, name: p.name, badge: badgeIcon(p), score: p.earned, ts: Date.now() }, 'score');
    }
    await set('player/' + b.pid, p);
    return { player: pub(p), gained };
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
      p.claims.push({ id: prize.id, code, ts: Date.now() });
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
    const fn = actions[q.a];
    if (!fn) throw fail(404, 'Unknown action');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await fn(b, q));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'The arcade database is not reachable right now' });
    if (!e.status) console.error(e);
  }
}
