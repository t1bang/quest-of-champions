// Big Bang Arcade lobby: avatar animation and moves.
// Everyone can punch, kick, jump, throw a combo and fire a blast. Special moves and upgrades are bought on the
// prize wall (prizes.js MOVES / UPGRADES) and live in the player's closet like any other item.
// Hits are for show: they stagger an avatar and shake the view of the player who was hit, and never move anyone.
// A sparring bot on the main floor gives you something to hit when the room is empty.
import { MOVES, UPGRADES } from './prizes.js';
import { shade as shadeC } from './avatar.js';

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
export function drawPose(x, W, H, drawBase, pose, tint) { drawBase(x, W, H, pose, tint); }   // drawBase(ctx, W, H, pose, tint) is the avatar artist (avatar.js)
function drawOrb(x, W, H, color) { // a hard-edged pixel orb (sprites are drawn without soft edges)
  x.clearRect(0, 0, W, H); const c = W / 2;
  for (const [r, col] of [[0.48, color], [0.34, '#ffffff'], [0.2, color]]) { x.fillStyle = col; x.beginPath(); x.arc(c, c, W * r, 0, 7); x.fill(); }
  x.fillStyle = '#fff'; x.fillRect(c - W * 0.06, c - W * 0.3, W * 0.12, W * 0.12);
}
function drawBot(x, W, H, state) { // OPP-BOT: a round cartoon training robot
  x.clearRect(0, 0, W, H); x.save(); const u = W / 100, OL = '#170c14', ko = state === 'ko', hit = state === 'hit';
  x.scale(u, u); x.lineJoin = 'round'; x.lineCap = 'round';
  const body = ko ? '#70707e' : hit ? '#ffb0b8' : '#c9ced8', dk = ko ? '#55555f' : '#8b93a3', eye = ko ? '#333' : hit ? '#fff' : '#31d7ff';
  const E = (cx, cy, rx, ry, f, lw = 2.2, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, 7); x.fillStyle = f; x.fill(); if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const RR = (px, py, w, h, r, f, lw = 2.2) => { x.beginPath(); x.roundRect(px, py, w, h, r); x.fillStyle = f; x.fill(); if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const L = (a, b, w, c) => { x.strokeStyle = OL; x.lineWidth = w + 4; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.strokeStyle = c; x.lineWidth = w; x.stroke(); };
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(50, 96.5, 24, 3.4, 0, 0, 7); x.fill();
  if (ko) { x.translate(50, 96); x.rotate(-1.3); x.translate(-50, -96 + 14); }
  else if (hit) { x.translate(50, 96); x.rotate(0.12); x.translate(-50, -96); }
  L([42, 74], [38, 90], 6, dk); L([58, 74], [62, 90], 6, dk); RR(30, 88, 15, 8, 3, body); RR(55, 88, 15, 8, 3, body);                     // legs + feet
  L([31, 54], [18, hit ? 46 : 62], 5.5, dk); L([69, 54], [82, hit ? 46 : 62], 5.5, dk); E(16, hit ? 44 : 64, 7, 7, body); E(84, hit ? 44 : 64, 7, 7, body);   // arms + ball hands
  RR(31, 46, 38, 32, 9, body); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(58, 48, 9, 28); RR(40, 54, 20, 9, 3, ko ? '#444' : '#ff2a3c', 1.6); E(50, 70, 2.6, 2.6, dk, 1.2);       // chest
  L([50, 20], [50, 10], 2.4, dk); E(50, 8, 4.6, 4.6, ko ? '#555' : '#ff2a3c');                                                                 // antenna
  RR(26, 18, 48, 30, 11, body); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(30, 21, 16, 3); RR(31, 24, 38, 18, 6, '#16161c', 1.6);    // head + visor
  if (ko) { for (const cx of [41, 59]) { L([cx - 3, 30], [cx + 3, 36], 1.6, '#888'); L([cx - 3, 36], [cx + 3, 30], 1.6, '#888'); } }
  else { RR(37, 28.5, 8, 9, 2, eye, 0); RR(55, 28.5, 8, 9, 2, eye, 0); }
  x.restore();
  x.font = `${Math.round(H * 0.075)}px Bungee,Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineJoin = 'round'; x.lineWidth = 4; x.strokeStyle = '#000'; x.strokeText('OPP-BOT', W / 2, 2); x.fillStyle = '#31d7ff'; x.fillText('OPP-BOT', W / 2, 2);
}

// ---------- the system ----------
export function createMoves(ctx) {
  // ctx: { room, P, peers, sid, closet(), skin(), drawMine(c,W,H), blocked(), stand(), collide(), toast(), hub(), send(payload), name() }
  const { room, P, peers } = ctx, now = () => performance.now() / 1000;
  const owned = id => ctx.closet().includes(id), level = stat => 1 + (owned(`up-${stat}-2`) ? 1 : 0) + (owned(`up-${stat}-2`) && owned(`up-${stat}-3`) ? 1 : 0);
  const POWER = [0, 1, 1.4, 1.8], SPEED = [0, 1, 0.75, 0.55], SIZE = [0, 1, 1.35, 1.7];
  const ready = {}, orbs = {}, shots = [], sparks = [];
  let hitUntil = 0, hitSide = 0;
  let special = null, act = null, jumpY = 0, jumpV = 0, shake = 0, hitFlash = 0, combo = 0, comboDmg = 0, comboAt = 0, emote = null, lastHitToast = 0;
  try { special = localStorage.getItem('bba-move') || null; } catch {}
  const orbTex = key => orbs[key] || (orbs[key] = room.tex(64, 64, (c, W, H) => drawOrb(c, W, H, COLORS[key] || COLORS.blast)));
  const bot = { x: -560, z: 380, hp: 100, state: 'idle', until: 0, wob: 0, tex: {} };
  for (const s of ['idle', 'hit', 'ko']) bot.tex[s] = room.tex(TW, TH, (c, W, H) => drawBot(c, W, H, s));
  const dir = (yaw = P.yaw) => [Math.sin(yaw), -Math.cos(yaw)];
  const inFront = (tx, tz, reach, cone = 0.75, from = P) => { const dx = tx - from.x, dz = tz - from.z, d = Math.hypot(dx, dz); if (d > reach) return false; const a = Math.atan2(dx, -dz), diff = Math.atan2(Math.sin(a - from.yaw), Math.cos(a - from.yaw)); return d < 60 || Math.abs(diff) < cone; };

  // ----- what a hit does -----
  function spark(x, z, y, key = 'spark', size = 70) { sparks.push({ x, z, y, key, size, t: 0.22 }); }
  const emit = (type, n) => { try { ctx.event && ctx.event(type, n); } catch {} };
  function landed(dmg) { hitUntil = now() + 0.14; hitSide = Math.random() - 0.5; combo++; comboDmg += Math.round(dmg); comboAt = now(); showCombo(); emit('hit', Math.round(dmg)); if (combo === 10) emit('combo10', 1); }
  function hitBot(dmg, key) {
    if (bot.state === 'ko') return;
    bot.hp -= dmg; bot.state = 'hit'; bot.until = now() + 0.22; bot.wob = 1; spark(bot.x, bot.z, 190, key);
    landed(dmg);
    if (bot.hp <= 0) { bot.state = 'ko'; bot.until = now() + 3.2; ctx.toast('OPP-BOT K.O.!  COMBO x' + combo); ctx.hub('spar_ko', comboDmg); emit('ko', 1); }
  }
  // Other things you can hit (the lobby bosses): { x, z, r, y, alive(), hit(dmg, key) }
  const targets = [];
  function hitTarget(tg, dmg, key) { tg.hit(dmg, key); spark(tg.x + (Math.random() - 0.5) * tg.r, tg.z, tg.y || 220, key, 90); landed(dmg); }
  function strike(reach, dmg, key, cone) { // close-range hit from where I stand
    let landed = false;
    if (inFront(bot.x, bot.z, reach, cone)) { hitBot(dmg, key); landed = true; }
    for (const tg of targets) if (tg.alive() && inFront(tg.x, tg.z, reach + tg.r, cone)) { hitTarget(tg, dmg, key); landed = true; }
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
    if (name !== 'special' || (SPECIAL[special] && owned(special))) emit('move:' + name, 1);
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
  function doEmote(kind) { if (ctx.blocked()) return; emote = emote === kind ? null : kind; if (emote) emit('emote', 1); ctx.send({ id: ctx.sid, m: 'emote', k: emote || '', n: ctx.name() }); }

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
    if (jumpV || jumpY > 0) { jumpY += jumpV * dt; jumpV -= 2300 * dt; if (jumpY <= 0) { jumpY = 0; jumpV = 0; if (act && act.m === 'special' && act.k === 'move-slam' && !act.done) { act.done = true; shake = 0.8; ring(P.x, P.z, 'move-slam'); const s = SPECIAL['move-slam']; if (Math.hypot(bot.x - P.x, bot.z - P.z) < s.reach) hitBot(s.dmg * pw, 'move-slam'); for (const tg of targets) if (tg.alive() && Math.hypot(tg.x - P.x, tg.z - P.z) < s.reach + tg.r) hitTarget(tg, s.dmg * pw, 'move-slam'); } } }
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
        if (s.mine) for (const tg of targets) if (tg.alive() && !s.hit.has(tg) && Math.hypot(tg.x - s.x, tg.z - s.z) < r + tg.r) { s.hit.add(tg); hitTarget(tg, s.dmg, s.key); if (!s.big) s.life = Math.min(s.life, 0.05); }
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
    const live = (act && act.m !== 'hit') || hitFlash > 0.02 || jumpY > 0 || t < hitUntil;
    if (!live) { if (fxDirty) { g.clearRect(0, 0, fx.width, fx.height); fxDirty = false; } return; }
    if (fx.width !== innerWidth || fx.height !== innerHeight) { fx.width = innerWidth; fx.height = innerHeight; }
    const W = fx.width, H = fx.height, u = Math.max(8, Math.round(H * 0.022)), skin = ctx.skin(); g.clearRect(0, 0, W, H); fxDirty = true;
    const OLc = '#170c14', dark = shadeC(skin, -0.22);
    const path = (pts, fill, lw = 5) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = fill; g.fill(); if (lw) { g.strokeStyle = OLc; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } };
    // an arm reaching in from the bottom of the screen to (x, y): forearm, wristband, then a fist or an open hand
    const arm = (x, y, s = 1, open = false) => {
      const bx = x + (x < W / 2 ? -1 : 1) * W * 0.16, by = H + u * 3, dx = x - bx, dy = y - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w0 = 7.5 * u * s, w1 = 4.6 * u * s;
      path([[bx + nx * w0, by + ny * w0], [x + nx * w1, y + ny * w1], [x - nx * w1, y - ny * w1], [bx - nx * w0, by - ny * w0]], skin);
      const at = t => [x - dx / len * t * u * s, y - dy / len * t * u * s], band = (t0, t1, col) => { const a = at(t0), b = at(t1), wa = w1 * (1 + t0 * 0.02) + 2, wb = w1 * (1 + t1 * 0.02) + 2; path([[a[0] + nx * wa, a[1] + ny * wa], [b[0] + nx * wb, b[1] + ny * wb], [b[0] - nx * wb, b[1] - ny * wb], [a[0] - nx * wa, a[1] - ny * wa]], col, col === '#16161c' ? 5 : 0); };
      band(3.5, 9.5, '#16161c'); band(5, 5.8, '#e01226'); band(7.2, 8, '#e01226');
      const r = 5.6 * u * s; g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + Math.PI / 2);
      if (open) { for (const [fx, fl] of [[-0.75, 1.5], [-0.28, 1.85], [0.22, 1.9], [0.68, 1.6]]) { g.beginPath(); g.roundRect(fx * r - r * 0.2, -r * fl, r * 0.42, r * fl, r * 0.2); g.fillStyle = skin; g.fill(); g.strokeStyle = OLc; g.lineWidth = 5; g.stroke(); } g.beginPath(); g.roundRect(-r * 1.25, -r * 0.5, r * 0.5, r * 1.1, r * 0.22); g.fillStyle = skin; g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, 7); g.fillStyle = skin; g.fill(); g.stroke(); }
      else { g.beginPath(); g.roundRect(-r, -r * 0.95, r * 2, r * 1.75, r * 0.5); g.fillStyle = skin; g.fill(); g.strokeStyle = OLc; g.lineWidth = 5; g.stroke(); g.strokeStyle = dark; g.lineWidth = 3; for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(k * r, -r * 0.9); g.lineTo(k * r, -r * 0.1); g.stroke(); } g.beginPath(); g.roundRect(-r * 1.05, r * 0.05, r * 1.5, r * 0.62, r * 0.3); g.fillStyle = skin; g.fill(); g.strokeStyle = OLc; g.lineWidth = 4; g.stroke(); }
      g.restore();
    };
    const fist = (x, y, s = 1) => arm(x, y, s, false);
    // a leg kicking up from the bottom left, sneaker sole toward the middle of the screen
    const boot = (x, y) => {
      const bx = x - W * 0.2, by = H + u * 3, dx = x - bx, dy = y - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w0 = 9 * u, w1 = 5.4 * u;
      path([[bx + nx * w0, by + ny * w0], [x + nx * w1, y + ny * w1], [x - nx * w1, y - ny * w1], [bx - nx * w0, by - ny * w0]], '#2b2b36');
      g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + Math.PI / 2); const r = 6 * u;
      g.beginPath(); g.roundRect(-r * 0.95, -r * 2.3, r * 1.9, r * 2.9, r * 0.6); g.fillStyle = '#22222b'; g.fill(); g.strokeStyle = OLc; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.roundRect(-r * 0.95, -r * 2.3, r * 1.9, r * 1.15, r * 0.6); g.fillStyle = '#e01226'; g.fill(); g.stroke();
      g.beginPath(); g.roundRect(-r * 1.08, -r * 2.55, r * 2.16, r * 0.5, r * 0.25); g.fillStyle = '#f4f4f8'; g.fill(); g.stroke();
      g.strokeStyle = '#f4f4f8'; g.lineWidth = 4; for (const k of [-0.9, -0.45, 0]) { g.beginPath(); g.moveTo(-r * 0.5, r * k); g.lineTo(r * 0.5, r * (k - 0.18)); g.stroke(); }
      g.restore();
    };
    const lines = (cx, cy, n, col) => { g.strokeStyle = col; g.lineWidth = 4; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 3, r0 = H * 0.16, r1 = H * 0.26; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); } };
    const glow = (cx, cy, r, col) => { g.globalAlpha = 0.35; g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r * 1.6, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = OLc; g.lineWidth = 4; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, 7); g.fill(); };
    const beam = (cx, cy, col, k) => { const tx = W / 2, ty = H * 0.38, w = u * 3.2 * k; path([[cx - w, cy], [tx - w * 0.25, ty], [tx + w * 0.25, ty], [cx + w, cy]], col, 0); path([[cx - w * 0.45, cy], [tx - w * 0.1, ty], [tx + w * 0.1, ty], [cx + w * 0.45, cy]], '#fff', 0); };
    const burst = (cx, cy, r) => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + 0.2, rr = i % 2 ? r * 0.5 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } path(pts, '#ffc93a', 5); const p2 = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + 0.2, rr = (i % 2 ? r * 0.5 : r) * 0.55; p2.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } path(p2, '#fff', 0); };
    if (t < hitUntil) burst(W * 0.5 + (hitSide || 0) * W * 0.04, H * 0.45, u * 6.5);
    if (act && act.m !== 'hit') {
      const k = Math.min(1, (t - act.t0) / act.dur), out = Math.sin(k * Math.PI), m = act.m, key = act.k;
      if (m === 'punch') fist(W * (0.86 - 0.24 * out), H * (1.02 - 0.42 * out));
      if (m === 'kick') boot(W * (0.2 + 0.2 * out), H * (1.05 - 0.36 * out));
      if (m === 'combo') { const n = Math.floor(k * 4), o = Math.sin((k * 4 % 1) * Math.PI); if (n % 2) boot(W * (0.2 + 0.2 * o), H * (1.05 - 0.36 * o)); else fist(W * (n === 0 ? 0.86 - 0.24 * o : 0.14 + 0.24 * o), H * (1.02 - 0.42 * o)); }
      if (m === 'blast') { arm(W * 0.6, H * 0.84, 1, true); glow(W * 0.52, H * (0.72 - 0.22 * k), u * (5 - 3 * k), COLORS.blast); }
      if (m === 'special') {
        const col = COLORS[key] || '#fff';
        if (key === 'move-uppercut') { fist(W * 0.5, H * (1.05 - 0.6 * out), 1.3); lines(W * 0.5, H * 0.45, 10, col); }
        if (key === 'move-tornado') lines(W * 0.5, H * 0.5, 16, col);
        if (key === 'move-dash') { g.strokeStyle = col; g.lineWidth = 5; for (let i = 0; i < 14; i++) { const y = (i * 97 % H), x = (i * 211 % W); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < W / 2 ? -1 : 1) * W * 0.12, y); g.stroke(); } }
        if (key === 'move-slam') { fist(W * 0.38, H * (0.5 + 0.5 * k), 1.1); fist(W * 0.62, H * (0.5 + 0.5 * k), 1.1); }
        if (key === 'move-wave') { if (k > 0.33) beam(W * 0.5, H * 0.72, col, 1 + Math.sin(t * 40) * 0.15); arm(W * 0.36, H * 0.82, 1.05, true); arm(W * 0.64, H * 0.82, 1.05, true); glow(W * 0.5, H * 0.72, u * (k < 0.33 ? 2 + k * 14 : 7), col); if (k > 0.33) lines(W * 0.5, H * 0.72, 12, col); }
        if (key === 'move-meteor') { arm(W * 0.62, H * (0.9 - 0.3 * out), 1, true); glow(W * 0.5, H * (0.5 - 0.3 * k), u * (6 - 4 * k), col); }
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
    addTarget: tg => targets.push(tg), stagger: (by, big, stun) => { gotHit(by, big); if (stun && act) { act.dur = stun; act.lock = true; } }, airborne: () => jumpY > 45, ring, spark,
  };
}
