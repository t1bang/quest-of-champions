// Big Bang Arcade lobby: avatar animation and moves.
// Everyone can punch, kick, jump, throw a combo and fire a blast. Special moves and upgrades are bought on the
// prize wall (prizes.js MOVES / UPGRADES) and live in the player's closet like any other item.
// Hits are for show: they stagger an avatar and shake the view of the player who was hit, and never move anyone.
// A sparring bot on the main floor gives you something to hit when the room is empty.
import { MOVES, UPGRADES } from './prizes.js';

const TW = 256, TH = 256;                      // avatar texture size (wider than the body so limbs can reach out)
export const SPRITE = { w: 300, h: 300 };      // its size in the room
const POSES = ['idle', 'walk1', 'walk2', 'punch', 'kick', 'jump', 'spin', 'blast', 'hit', 'wave', 'dance1', 'dance2'];
const BASE = { punch: { cd: 0.42, dur: 0.26, dmg: 8, reach: 250 }, kick: { cd: 0.55, dur: 0.32, dmg: 11, reach: 275 }, combo: { cd: 1.1, dur: 0.7, dmg: 6, reach: 255 }, blast: { cd: 0.9, dur: 0.34, dmg: 14 }, jump: { cd: 0.5, dur: 0.62 } };
const SPECIAL = {
  'move-uppercut': { cd: 2.2, dur: 0.5, dmg: 26, reach: 200, pose: 'jump', label: 'RISING UPPERCUT' },
  'move-tornado': { cd: 3, dur: 0.8, dmg: 9, reach: 240, pose: 'spin', label: 'TORNADO KICK' },
  'move-dash': { cd: 2.5, dur: 0.22, dmg: 18, reach: 150, pose: 'punch', label: 'FLASH DASH' },
  'move-slam': { cd: 4, dur: 0.85, dmg: 34, reach: 330, pose: 'jump', label: 'GROUND SLAM' },
  'move-wave': { cd: 5, dur: 1.5, dmg: 7, pose: 'blast', label: 'BIG BANG WAVE' },
  'move-meteor': { cd: 6, dur: 1.2, dmg: 60, pose: 'blast', label: 'METEOR BLAST' },
};
const COLORS = { blast: '#31d7ff', 'move-wave': '#ffc93a', 'move-meteor': '#ff7a1a', 'move-slam': '#b06cff', spark: '#ffffff', 'move-tornado': '#3dff9a', 'move-dash': '#ff4fd8', 'move-uppercut': '#ff2a3c' };

// ---------- pose art: the normal avatar picture with limbs moved or redrawn ----------
// The avatar is drawn on a 24 x 40 grid; these helpers work in the same grid units.
export function drawPose(x, W, H, drawBase, pose, tint) {
  const base = document.createElement('canvas'); base.width = W; base.height = H; const b = base.getContext('2d'); drawBase(b, W, H);
  const u = Math.min(W / 24, (H - H * 0.12) / 40), ox = (W - 24 * u) / 2, oy = H - 40 * u;
  const px = gx => Math.round(ox + gx * u), py = gy => Math.round(oy + gy * u);
  const pick = (gx, gy, fallback) => { try { const d = b.getImageData(px(gx), py(gy), 1, 1).data; return d[3] > 40 ? `rgb(${d[0]},${d[1]},${d[2]})` : fallback; } catch { return fallback; } };
  const skin = pick(11.6, 8.2, '#c68642'), sleeve = pick(3.5, 15.5, '#e01226'), pants = pick(8.5, 28, '#23232b'), shoe = pick(8, 38.8, '#ffffff');
  x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false; x.drawImage(base, 0, 0);
  const R = (c, gx, gy, w, h) => { x.fillStyle = c; x.fillRect(px(gx), py(gy), Math.ceil(w * u), Math.ceil(h * u)); };
  const wipe = (gx, gy, w, h) => x.clearRect(px(gx), py(gy), Math.ceil(w * u), Math.ceil(h * u));
  const shift = (gx, gy, w, h, dx, dy) => { wipe(gx, gy, w, h); x.drawImage(base, px(gx), py(gy), Math.ceil(w * u), Math.ceil(h * u), px(gx + dx), py(gy + dy), Math.ceil(w * u), Math.ceil(h * u)); };
  const armOut = side => { // a straight arm with a fist, to the right (1) or left (-1)
    if (side > 0) { wipe(18.9, 13.8, 3.4, 12.4); R('#000', 18.6, 14.6, 9.8, 4.4); R(sleeve, 19, 15, 3.6, 3.4); R(skin, 22.6, 15, 3, 3.4); R(skin, 25.4, 14.6, 2.6, 4.2); }
    else { wipe(1.7, 13.8, 3.4, 12.4); R('#000', -4.4, 14.6, 9.8, 4.4); R(sleeve, 1.4, 15, 3.6, 3.4); R(skin, -1.6, 15, 3, 3.4); R(skin, -4, 14.6, 2.6, 4.2); }
  };
  const armUp = side => { const gx = side > 0 ? 19 : 2; wipe(gx - 0.3, 13.8, 3.6, 12.4); R('#000', gx - 0.4, 4.6, 3.8, 10); R(sleeve, gx, 9.6, 3, 5); R(skin, gx, 5, 3, 4.6); };
  const orb = (gx, gy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px(gx), py(gy), r * u, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px(gx), py(gy), r * u * 0.5, 0, 7); x.fill(); };
  if (pose === 'walk1' || pose === 'dance1') { shift(4.8, 25.8, 6.9, 14.2, 0, -1.6); shift(18.9, 13.8, 3.4, 12.2, 0, -1); shift(1.7, 13.8, 3.4, 12.2, 0, 1); }
  if (pose === 'walk2' || pose === 'dance2') { shift(12.3, 25.8, 6.9, 14.2, 0, -1.6); shift(1.7, 13.8, 3.4, 12.2, 0, -1); shift(18.9, 13.8, 3.4, 12.2, 0, 1); }
  if (pose === 'dance1') armUp(1); if (pose === 'dance2') armUp(-1);
  if (pose === 'wave') armUp(1);
  if (pose === 'punch') { armOut(1); R('#fff', 28.4, 15.4, 1.6, 0.6); R('#fff', 28.4, 17.4, 2.2, 0.6); }
  if (pose === 'spin') { armOut(1); armOut(-1); }
  if (pose === 'kick') { wipe(12.3, 25.8, 7, 14.2); R('#000', 12.2, 25.6, 12.6, 5.6); R(pants, 12.5, 26, 8.4, 4.8); R(shoe, 20.9, 25.6, 3.4, 5.6); R('#fff', 25, 26.6, 2, 0.6); R('#fff', 25, 29, 1.4, 0.6); }
  if (pose === 'jump') { armUp(1); armUp(-1); shift(4.8, 25.8, 14.4, 14.2, 0, -2.4); }
  if (pose === 'blast') { armOut(1); orb(29, 16.6, 2.6, tint || COLORS.blast); }
  if (pose === 'hit') {
    const snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(x.canvas, 0, 0);
    x.clearRect(0, 0, W, H); x.save(); x.translate(W / 2, H); x.rotate(-0.2); x.drawImage(snap, -W / 2, -H); x.restore();
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,40,60,.45)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  }
}
function drawOrb(x, W, H, color) { // a hard-edged pixel orb (sprites are drawn without soft edges)
  x.clearRect(0, 0, W, H); const c = W / 2;
  for (const [r, col] of [[0.48, color], [0.34, '#ffffff'], [0.2, color]]) { x.fillStyle = col; x.beginPath(); x.arc(c, c, W * r, 0, 7); x.fill(); }
  x.fillStyle = '#fff'; x.fillRect(c - W * 0.06, c - W * 0.3, W * 0.12, W * 0.12);
}
function drawBot(x, W, H, state) { // SPAR-BOT: a training robot
  x.clearRect(0, 0, W, H); const u = Math.min(W / 24, H * 0.86 / 44), ox = (W - 24 * u) / 2, oy = H - 40 * u;
  const R = (c, gx, gy, w, h) => { x.fillStyle = c; x.fillRect(Math.round(ox + gx * u), Math.round(oy + gy * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const body = state === 'hit' ? '#ff6a7a' : state === 'ko' ? '#5a5a66' : '#c9ced8', eye = state === 'ko' ? '#16161c' : state === 'hit' ? '#fff' : '#31d7ff';
  if (state === 'ko') { x.save(); x.translate(W / 2, H); x.rotate(-1.35); x.translate(-W / 2, -H + 6 * u); }
  R('#000', 5.5, 0.5, 13, 12); R(body, 6, 1, 12, 11); R('#16161c', 7.5, 4, 9, 4); R(eye, 8.5, 5, 2.5, 2); R(eye, 13, 5, 2.5, 2); R('#ffc93a', 11.3, -2.5, 1.4, 3); R('#ff2a3c', 10.6, -4, 2.8, 2);
  R('#000', 3.5, 13.5, 17, 15); R(body, 4, 14, 16, 14); R('#ff2a3c', 9, 17, 6, 6); R('#fff', 10.5, 18.5, 3, 3);
  R(body, 0.5, 14.5, 3, 10); R(body, 20.5, 14.5, 3, 10); R('#ff2a3c', 0, 24, 4, 4); R('#ff2a3c', 20, 24, 4, 4);
  R('#16161c', 6, 28, 5, 9); R('#16161c', 13, 28, 5, 9); R(body, 5, 37, 7, 3); R(body, 12, 37, 7, 3);
  if (state === 'ko') x.restore();
  x.font = `bold ${Math.round(H * 0.07)}px Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = 4; x.strokeStyle = '#000'; x.strokeText('SPAR-BOT', W / 2, 2); x.fillStyle = '#31d7ff'; x.fillText('SPAR-BOT', W / 2, 2);
}

// ---------- the system ----------
export function createMoves(ctx) {
  // ctx: { room, P, peers, sid, closet(), skin(), drawMine(c,W,H), blocked(), stand(), collide(), toast(), hub(), send(payload), name() }
  const { room, P, peers } = ctx, now = () => performance.now() / 1000;
  const owned = id => ctx.closet().includes(id), level = stat => 1 + (owned(`up-${stat}-2`) ? 1 : 0) + (owned(`up-${stat}-2`) && owned(`up-${stat}-3`) ? 1 : 0);
  const POWER = [0, 1, 1.4, 1.8], SPEED = [0, 1, 0.75, 0.55], SIZE = [0, 1, 1.35, 1.7];
  const ready = {}, orbs = {}, shots = [], sparks = [];
  let special = null, act = null, jumpY = 0, jumpV = 0, shake = 0, hitFlash = 0, combo = 0, comboDmg = 0, comboAt = 0, emote = null, lastHitToast = 0;
  try { special = localStorage.getItem('bba-move') || null; } catch {}
  const orbTex = key => orbs[key] || (orbs[key] = room.tex(64, 64, (c, W, H) => drawOrb(c, W, H, COLORS[key] || COLORS.blast)));
  const bot = { x: -560, z: 380, hp: 100, state: 'idle', until: 0, wob: 0, tex: {} };
  for (const s of ['idle', 'hit', 'ko']) bot.tex[s] = room.tex(TW, TH, (c, W, H) => drawBot(c, W, H, s));
  const dir = (yaw = P.yaw) => [Math.sin(yaw), -Math.cos(yaw)];
  const inFront = (tx, tz, reach, cone = 0.75, from = P) => { const dx = tx - from.x, dz = tz - from.z, d = Math.hypot(dx, dz); if (d > reach) return false; const a = Math.atan2(dx, -dz), diff = Math.atan2(Math.sin(a - from.yaw), Math.cos(a - from.yaw)); return d < 60 || Math.abs(diff) < cone; };

  // ----- what a hit does -----
  function spark(x, z, y, key = 'spark', size = 70) { sparks.push({ x, z, y, key, size, t: 0.22 }); }
  function hitBot(dmg, key) {
    if (bot.state === 'ko') return;
    bot.hp -= dmg; bot.state = 'hit'; bot.until = now() + 0.22; bot.wob = 1; spark(bot.x, bot.z, 190, key);
    combo++; comboDmg += Math.round(dmg); comboAt = now(); showCombo();
    if (bot.hp <= 0) { bot.state = 'ko'; bot.until = now() + 3.2; ctx.toast('SPAR-BOT K.O.!  COMBO x' + combo); ctx.hub('spar_ko', comboDmg); }
  }
  function strike(reach, dmg, key, cone) { // close-range hit from where I stand
    let landed = false;
    if (inFront(bot.x, bot.z, reach, cone)) { hitBot(dmg, key); landed = true; }
    for (const p of peers.values()) if (inFront(p.x, p.z, reach, cone)) { spark(p.x, p.z, 170, key); landed = true; }
    return landed;
  }
  function showCombo() {
    let el = document.getElementById('combo');
    if (!el) { el = document.createElement('div'); el.id = 'combo'; document.body.appendChild(el); }
    el.innerHTML = `<b>x${combo}</b> COMBO <span>${comboDmg} DMG</span>`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); el.style.opacity = 1;
  }
  function gotHit(by, big) {
    hitFlash = 1; shake = big ? 1 : 0.55; setAct({ m: 'hit', dur: 0.35 }, true);
    if (now() - lastHitToast > 2.5) { lastHitToast = now(); ctx.toast(String(by || 'SOMEBODY').toUpperCase() + ' GOT YOU!  HIT BACK'); }
  }

  // ----- starting a move -----
  function setAct(a, share) { act = { ...a, t0: now() }; if (share) ctx.send({ id: ctx.sid, m: a.m, k: a.k || '', x: Math.round(P.x), z: Math.round(P.z), yaw: +P.yaw.toFixed(2), pw: level('power'), bl: level('blast'), n: ctx.name() }); }
  function can(name) { return !ctx.blocked() && now() >= (ready[name] || 0) && !(act && act.lock && now() < act.t0 + act.dur); }
  function shoot(key, opts = {}) {
    const [dx, dz] = dir(opts.yaw ?? P.yaw), sz = (opts.size || 90) * SIZE[opts.bl || level('blast')];
    shots.push({ key, x: (opts.x ?? P.x) + dx * 60, z: (opts.z ?? P.z) + dz * 60, y: opts.y ?? 150, dx, dz, speed: opts.speed || 1500, life: opts.life || 0.95, size: sz, dmg: opts.dmg || 0, mine: !opts.from, from: opts.from || null, big: !!opts.big, vy: opts.vy || 0, hit: new Set() });
  }
  function doMove(name) {
    if (!can(name)) return false;
    ctx.stand(); emote = null;
    const pw = POWER[level('power')], sp = SPEED[level('speed')];
    if (name === 'jump') { if (jumpY > 0) return false; jumpV = 760; ready.jump = now() + BASE.jump.cd * sp; setAct({ m: 'jump', dur: BASE.jump.dur }, true); return true; }
    if (name === 'punch' || name === 'kick') { const b = BASE[name]; ready[name] = now() + b.cd * sp; setAct({ m: name, dur: b.dur }, true); strike(b.reach, b.dmg * pw, 'spark'); return true; }
    if (name === 'combo') { const b = BASE.combo; ready.combo = now() + b.cd * sp; setAct({ m: 'combo', dur: b.dur, lock: true, ticks: 0 }, true); return true; }
    if (name === 'blast') { const b = BASE.blast; ready.blast = now() + b.cd * sp; setAct({ m: 'blast', dur: b.dur }, true); shoot('blast', { dmg: b.dmg * pw }); return true; }
    if (name === 'special') {
      const s = SPECIAL[special]; if (!s || !owned(special)) { ctx.toast('BUY A SPECIAL MOVE ON THE PRIZE WALL'); return false; }
      ready.special = now() + s.cd * sp; setAct({ m: 'special', k: special, dur: s.dur, lock: true, ticks: 0, done: false }, true);
      ctx.toast(s.label + '!');
      if (special === 'move-uppercut') { jumpV = 620; strike(s.reach, s.dmg * pw, special); }
      if (special === 'move-slam') jumpV = 900;
      if (special === 'move-dash') { const [dx, dz] = dir(); act.dash = { dx, dz, left: 380 }; }
      return true;
    }
    return false;
  }
  function doEmote(kind) { if (ctx.blocked()) return; emote = emote === kind ? null : kind; ctx.send({ id: ctx.sid, m: 'emote', k: emote || '', n: ctx.name() }); }

  // ----- another player did something -----
  function onAct(d) {
    if (!d || typeof d.id !== 'string' || d.id === ctx.sid) return;
    const p = peers.get(d.id); if (!p) return;
    const m = String(d.m || ''), k = String(d.k || '');
    if (m === 'emote') { p.emote = k === 'wave' || k === 'dance' ? k : null; return; }
    const s = SPECIAL[k], dur = m === 'special' && s ? s.dur : m === 'hit' ? 0.35 : (BASE[m] || { dur: 0.3 }).dur;
    p.act = { m, k, t0: now(), dur }; p.emote = null;
    const from = { x: +d.x || p.x, z: +d.z || p.z, yaw: +d.yaw || 0 }, pw = POWER[Math.max(1, Math.min(3, d.pw | 0))] || 1, bl = Math.max(1, Math.min(3, d.bl | 0)), name = String(d.n || 'Player').slice(0, 16);
    const near = (reach, cone) => inFront(P.x, P.z, reach, cone, from) && !ctx.blocked();
    if ((m === 'punch' || m === 'kick') && near(BASE[m].reach)) gotHit(name);
    if (m === 'combo' && near(BASE.combo.reach)) gotHit(name);
    if (m === 'blast') shoot('blast', { x: from.x, z: from.z, yaw: from.yaw, from: name, bl });
    if (m === 'special' && s) {
      if ((k === 'move-uppercut' || k === 'move-tornado' || k === 'move-dash') && near(s.reach + (k === 'move-dash' ? 380 : 0), k === 'move-tornado' ? 3.2 : 0.75)) gotHit(name, true);
      if (k === 'move-slam') setTimeout(() => { ring(from.x, from.z, k); if (Math.hypot(P.x - from.x, P.z - from.z) < s.reach && !ctx.blocked()) gotHit(name, true); }, 700);
      if (k === 'move-wave') for (let i = 0; i < 9; i++) setTimeout(() => shoot(k, { x: from.x, z: from.z, yaw: from.yaw, from: name, bl, size: 120, speed: 1700, life: 0.8 }), 500 + i * 90);
      if (k === 'move-meteor') setTimeout(() => shoot(k, { x: from.x, z: from.z, yaw: from.yaw, from: name, bl, size: 190, speed: 900, life: 0.9, y: 420, vy: -460, big: true }), 350);
    }
  }
  function ring(x, z, key) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; shots.push({ key, x, z, y: 40, dx: Math.sin(a), dz: Math.cos(a), speed: 620, life: 0.5, size: 80, dmg: 0, mine: false, from: null, hit: new Set(), fx: true }); } }

  // ----- every frame -----
  function update(dt, sprites) {
    const t = now(), pw = POWER[level('power')];
    // jump arc
    if (jumpV || jumpY > 0) { jumpY += jumpV * dt; jumpV -= 2300 * dt; if (jumpY <= 0) { jumpY = 0; jumpV = 0; if (act && act.m === 'special' && act.k === 'move-slam' && !act.done) { act.done = true; shake = 0.8; ring(P.x, P.z, 'move-slam'); const s = SPECIAL['move-slam']; if (Math.hypot(bot.x - P.x, bot.z - P.z) < s.reach) hitBot(s.dmg * pw, 'move-slam'); } } }
    if (act) {
      const k = (t - act.t0) / act.dur;
      if (act.m === 'combo') { const n = Math.min(4, Math.floor(k * 4) + 1); while (act.ticks < n) { act.ticks++; strike(BASE.combo.reach, BASE.combo.dmg * pw * (act.ticks === 4 ? 2 : 1), 'spark'); } }
      if (act.m === 'special') {
        const s = SPECIAL[act.k];
        if (act.k === 'move-tornado') { const n = Math.min(5, Math.floor(k * 5) + 1); while (act.ticks < n) { act.ticks++; strike(s.reach, s.dmg * pw, act.k, 3.2); } }
        if (act.k === 'move-dash' && act.dash && act.dash.left > 0) { const step = Math.min(act.dash.left, 2400 * dt); P.x += act.dash.dx * step; P.z += act.dash.dz * step; act.dash.left -= step; ctx.collide(); if (act.dash.left <= 0) strike(s.reach, s.dmg * pw, act.k, 1.2); }
        if (act.k === 'move-wave' && k > 0.33) { const n = Math.floor((k - 0.33) / 0.67 * 9) + 1; while (act.ticks < Math.min(9, n)) { act.ticks++; shoot(act.k, { dmg: s.dmg * pw, size: 120, speed: 1700, life: 0.8 }); shake = Math.max(shake, 0.2); } }
        if (act.k === 'move-meteor' && k > 0.3 && !act.done) { act.done = true; shoot(act.k, { dmg: s.dmg * pw, size: 190, speed: 900, life: 0.9, y: 420, vy: -460, big: true }); }
      }
      if (k >= 1) act = null;
    }
    // blasts in flight
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.dx * s.speed * dt; s.z += s.dz * s.speed * dt; s.y = Math.max(40, s.y + s.vy * dt); s.life -= dt;
      const r = s.size * 0.6 + 50;
      if (!s.fx) {
        if (s.mine && bot.state !== 'ko' && !s.hit.has('bot') && Math.hypot(bot.x - s.x, bot.z - s.z) < r) { s.hit.add('bot'); hitBot(s.dmg, s.key); if (!s.big) s.life = Math.min(s.life, 0.05); }
        if (s.mine) for (const [id, p] of peers) if (!s.hit.has(id) && Math.hypot(p.x - s.x, p.z - s.z) < r) { s.hit.add(id); spark(p.x, p.z, 170, s.key); }
        if (!s.mine && !s.hit.has('me') && Math.hypot(P.x - s.x, P.z - s.z) < r && !ctx.blocked()) { s.hit.add('me'); gotHit(s.from, s.big); ctx.send({ id: ctx.sid, m: 'hit', n: ctx.name() }); }
      }
      if (s.life <= 0) { if (s.big) ring(s.x, s.z, s.key); shots.splice(i, 1); continue; }
      sprites.push({ tex: orbTex(s.key), x: s.x, z: s.z, y: s.y - s.size / 2, w: s.size, h: s.size });
    }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; if (s.t <= 0) { sparks.splice(i, 1); continue; } const sz = s.size * (1.4 - s.t * 2); sprites.push({ tex: orbTex(s.key), x: s.x, z: s.z, y: s.y - sz / 2, w: sz, h: sz }); }
    // the sparring bot
    if (bot.state !== 'idle' && t > bot.until) { if (bot.state === 'ko') bot.hp = 100; bot.state = 'idle'; }
    bot.wob *= Math.pow(0.002, dt);
    sprites.push({ tex: bot.tex[bot.state], x: bot.x + Math.sin(t * 40) * 14 * bot.wob, z: bot.z, y: 0, w: SPRITE.w, h: SPRITE.h });
    if (combo && t - comboAt > 2.2) { combo = 0; comboDmg = 0; const el = document.getElementById('combo'); if (el) el.style.opacity = 0; }
    shake *= Math.pow(0.004, dt); hitFlash *= Math.pow(0.01, dt);
    drawOverlay(t);
    return { lift: jumpY, shakeX: (Math.random() - 0.5) * 0.05 * shake, shakeY: (Math.random() - 0.5) * 26 * shake, spin: act && act.m === 'special' && act.k === 'move-tornado' ? (t - act.t0) / act.dur * 6.283 : 0 };
  }

  // ----- which picture another player's avatar shows -----
  function peerSprite(p, id, dt) {
    const t = now(); let pose = 'idle', lift = 0;
    const moving = Math.hypot((p.tx ?? p.x) - p.x, (p.tz ?? p.z) - p.z) > 8;
    if (p.act && t < p.act.t0 + p.act.dur) {
      const k = (t - p.act.t0) / p.act.dur, m = p.act.m, sp = SPECIAL[p.act.k];
      pose = m === 'combo' ? (Math.floor(k * 4) % 2 ? 'kick' : 'punch') : m === 'special' ? (sp ? sp.pose : 'punch') : m === 'hit' ? 'hit' : POSES.includes(m) ? m : 'idle';
      if (m === 'jump' || (m === 'special' && (p.act.k === 'move-uppercut' || p.act.k === 'move-slam'))) lift = Math.sin(Math.min(1, k) * Math.PI) * (p.act.k === 'move-slam' ? 190 : 130);
      if (m === 'special' && p.act.k === 'move-tornado') pose = Math.floor(k * 10) % 2 ? 'spin' : 'kick';
    } else if (p.emote === 'dance') pose = Math.floor(t * 4) % 2 ? 'dance1' : 'dance2';
    else if (p.emote === 'wave') pose = Math.floor(t * 3) % 2 ? 'wave' : 'idle';
    else if (moving && !p.sit) pose = Math.floor(t * 6 + (id.charCodeAt(0) || 0)) % 2 ? 'walk1' : 'walk2';
    else lift = Math.sin(t * 2.2 + (id.charCodeAt(0) || 0)) * 3;      // breathing
    if (!p.texs) p.texs = {};
    if (!p.texs[pose] && p.draw) p.texs[pose] = room.tex(TW, TH, (c, W, H) => drawPose(c, W, H, p.draw, pose, p.act && COLORS[p.act.k]));
    return { tex: p.texs[pose] || p.texs.idle, lift };
  }
  function freePeer(p) { if (p.texs) for (const tx of Object.values(p.texs)) room.freeTex(tx); p.texs = {}; }

  // ----- first-person view of your own moves: fists, boots and flashes drawn over the room -----
  const fx = document.createElement('canvas'); fx.id = 'fx'; document.body.appendChild(fx); const g = fx.getContext('2d');
  let fxDirty = false;
  function drawOverlay(t) {
    const live = (act && act.m !== 'hit') || hitFlash > 0.02 || jumpY > 0;
    if (!live) { if (fxDirty) { g.clearRect(0, 0, fx.width, fx.height); fxDirty = false; } return; }
    if (fx.width !== innerWidth || fx.height !== innerHeight) { fx.width = innerWidth; fx.height = innerHeight; }
    const W = fx.width, H = fx.height, u = Math.max(8, Math.round(H * 0.022)), skin = ctx.skin(); g.clearRect(0, 0, W, H); fxDirty = true;
    const block = (c, x, y, w, h) => { g.fillStyle = '#000'; g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle = c; g.fillRect(x, y, w, h); };
    const fist = (x, y, s = 1) => { block(skin, x - 4 * u * s, y - 3 * u * s, 8 * u * s, 6 * u * s); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 4; i++) g.fillRect(x - 4 * u * s + i * 2 * u * s - 2, y - 3 * u * s, 3, 3 * u * s); block('#e01226', x - 3 * u * s, y + 3 * u * s, 6 * u * s, H); };
    const boot = (x, y) => { block('#fff', x - 7 * u, y - 3 * u, 14 * u, 6 * u); block('#d2142a', x - 7 * u, y - 3 * u, 14 * u, 2 * u); block('#23232b', x + 2 * u, y + 3 * u, 6 * u, H); };
    const lines = (cx, cy, n, col) => { g.strokeStyle = col; g.lineWidth = 4; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 3, r0 = H * 0.16, r1 = H * 0.26; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); } };
    const glow = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, 7); g.fill(); };
    if (act && act.m !== 'hit') {
      const k = Math.min(1, (t - act.t0) / act.dur), out = Math.sin(k * Math.PI), m = act.m, key = act.k;
      if (m === 'punch') fist(W * (0.86 - 0.24 * out), H * (1.02 - 0.42 * out));
      if (m === 'kick') boot(W * (0.2 + 0.2 * out), H * (1.05 - 0.36 * out));
      if (m === 'combo') { const n = Math.floor(k * 4), o = Math.sin((k * 4 % 1) * Math.PI); if (n % 2) boot(W * (0.2 + 0.2 * o), H * (1.05 - 0.36 * o)); else fist(W * (n === 0 ? 0.86 - 0.24 * o : 0.14 + 0.24 * o), H * (1.02 - 0.42 * o)); }
      if (m === 'blast') { fist(W * 0.62, H * 0.86); glow(W * 0.5, H * (0.74 - 0.2 * k), u * (5 - 3 * k), COLORS.blast); }
      if (m === 'special') {
        const col = COLORS[key] || '#fff';
        if (key === 'move-uppercut') { fist(W * 0.5, H * (1.05 - 0.6 * out), 1.3); lines(W * 0.5, H * 0.45, 10, col); }
        if (key === 'move-tornado') lines(W * 0.5, H * 0.5, 16, col);
        if (key === 'move-dash') { g.strokeStyle = col; g.lineWidth = 5; for (let i = 0; i < 14; i++) { const y = (i * 97 % H), x = (i * 211 % W); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < W / 2 ? -1 : 1) * W * 0.12, y); g.stroke(); } }
        if (key === 'move-slam') { fist(W * 0.38, H * (0.5 + 0.5 * k), 1.1); fist(W * 0.62, H * (0.5 + 0.5 * k), 1.1); }
        if (key === 'move-wave') { fist(W * 0.4, H * 0.84); fist(W * 0.6, H * 0.84); glow(W * 0.5, H * 0.7, u * (k < 0.33 ? 2 + k * 14 : 7), col); if (k > 0.33) lines(W * 0.5, H * 0.7, 12, col); }
        if (key === 'move-meteor') { fist(W * 0.62, H * (0.9 - 0.3 * out)); glow(W * 0.5, H * (0.5 - 0.3 * k), u * (6 - 4 * k), col); }
      }
    }
    if (hitFlash > 0.02) { const v = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(255,0,30,0)'); v.addColorStop(1, `rgba(255,0,30,${0.55 * hitFlash})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
  }
  // my own avatar picture in a pose (for the moves panel preview)
  const preview = (c, W, H, pose, key) => drawPose(c, W, H, ctx.drawMine, pose, COLORS[key]);

  return {
    doMove, doEmote, onAct, update, peerSprite, freePeer, preview, level, owned,
    get special() { return special; }, setSpecial(id) { special = id; try { localStorage.setItem('bba-move', id || ''); } catch {} },
    cooldown: name => Math.max(0, (ready[name] || 0) - now()), myPose: () => (act ? act.m : emote), bot,
    specials: () => MOVES.filter(m => owned(m.id)), SPECIAL, UPGRADES,
  };
}
