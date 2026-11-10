import { GAMES, SONGS, MUSIC_PAGES, DONATE, SOCIALS, CLAIM_HELP, BGM, SOON, VAULT, SOCIAL_AUTH, JUKEBOX_PLAYLIST } from './config.js';
import { PRIZES, REWARDS, REAL_PRIZES_LIVE, BAR } from './prizes.js';
import { COVERS, playTrailer } from './art.js';
import { buildRoom } from './room.js';

const $ = s => document.querySelector(s);
const view = $('#view'), panel = $('#panel'), pbody = $('#pbody');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let toastT;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

// ---------------- online database ----------------
let auth = store.get('bba-auth') || {}, me = null;
async function api(a, body, q = '') {
  const r = await fetch(`/api/arcade?a=${a}${q}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...auth, ...body }) } : undefined);
  const j = await r.json().catch(() => ({ error: 'The arcade database is not reachable right now' }));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
function setMe(p) {
  me = p; if (p && p.avatar && !store.get('bba-av')) myAv = cleanAv(p.avatar);
  $('#tok b').textContent = p ? p.tokens : 0;
  const icon = p && (PRIZES.find(x => x.id === p.badge) || {}).icon;
  $('#who').textContent = p ? (icon ? icon + ' ' : '') + p.name : 'SIGN IN';
}
async function earn(why, game, score) {
  if (!auth.pid) return;
  try { const r = await api('earn', { why, game, score }); setMe(r.player); if (r.gained) toast(`+${r.gained} TOKENS`); } catch {}
}
async function join(name) {
  const r = await api('join', { name });
  auth = { pid: r.pid, key: r.key }; store.set('bba-auth', auth); setMe(r.player);
  earn('daily');
}

// ---------------- the 3D room ----------------
const svgUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
GAMES.forEach(g => { g.art = g.art || svgUrl(COVERS[g.id]); });
const soonCard = g => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12081d"/><stop offset="1" stop-color="${g.color}"/></linearGradient></defs><rect width="400" height="400" fill="url(#s)"/><rect x="14" y="14" width="372" height="372" fill="none" stroke="#fff" stroke-width="6"/><text x="200" y="170" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="${g.title.length > 14 ? 40 : 54}" fill="#fff" stroke="#000" stroke-width="2">${g.title.toUpperCase()}</text><text x="200" y="250" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="34" fill="#ffc93a">COMING SOON</text><text x="200" y="330" text-anchor="middle" font-family="monospace" font-size="16" fill="#fff">BIG BANG ARCADE</text></svg>`;
SOON.forEach(g => { g.art = g.art || svgUrl(soonCard(g)); });
const cover = g => `<img src="${g.art}" alt="${g.title} cover art">`;
await Promise.race([Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('16px "Press Start 2P"')]).catch(() => {}), new Promise(r => setTimeout(r, 1800))]);
const handlers = { game: g => openGame(g), bigbox: () => openBigBox(), jukebox: () => openJukebox(), closet: () => openCloset(), prizes: () => openPrizes(), scores: () => openBoard('all'), donate: () => openDonate(), credits: () => openCredits(), soon: g => openSoon(g), vault: () => openVault(), bar: () => openBar(), sit: id => sitDown(id), mini: k => openMini(k) };
const room = buildRoom(view, GAMES, PRIZES, handlers, SOON);
const stations = room ? room.stations : Object.fromEntries([...GAMES.map(g => [g.id, { id: g.id, label: 'PLAY ' + g.title.toUpperCase(), open: () => openGame(g) }]),
  ...SOON.map(g => [g.id, { id: g.id, label: 'COMING SOON: ' + g.title.toUpperCase(), open: () => openSoon(g) }]),
  ...[['darts', 'PLAY DARTS'], ['pool', 'PLAY POOL'], ['hockey', 'PLAY AIR HOCKEY'], ['bowling', 'GO BOWLING']].map(([id, label]) => [id, { id, label, open: () => openMini(id) }]),
  ...[['bar', 'VISIT THE BAR'], ['vault', 'OPEN THE BIG BANG VAULT'], ['bigbox', 'OPEN THE BIG BANG BOX'], ['jukebox', 'OPEN THE JUKEBOX'], ['closet', 'OPEN MY CLOSET'], ['prizes', 'SHOP THE PRIZE WALL'], ['scores', 'SEE THE LEADERBOARD'], ['donate', 'DONATE'], ['credits', 'CREDITS + SOCIALS']].map(([id, label]) => [id, { id, label, open: handlers[id] }])]);
if (!room) { $('#hint').textContent = 'YOUR BROWSER CANNOT SHOW THE 3D ROOM. USE THE MAP BUTTON.'; $('#stick').hidden = true; }

// ---------------- movement + controls ----------------
const P = { x: 0, z: 780, yaw: 0, pitch: 0, eye: 300 }, keys = {}, joy = { x: 0, y: 0 };
let goal = null, near = null, walkT = 0;
const BZ = 150, BR = 215, ZMIN = -380, ZMAX = 790; // Big Box position + walkable depth
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const LANE = 120, HEND = -1400, inHall = p => p.z < ZMIN; // the coming-soon hallway behind the cabinets
const LZ0 = 960, LZ1 = 1850, inLounge = p => p.z > ZMAX;      // the lounge past the front doorway
const SOLID = [[-490, 1090, -290, 1390], [290, 1090, 490, 1390], [-350, 1680, 350, 1900], [600, 1240, 780, 1900], [-800, 1590, -695, 1890], [-740, 1795, -400, 1900]]; // lounge furniture
let sitting = false;
function collide() {
  if (inHall(P)) {
    if (Math.abs(P.x) > LANE) { if (P.z > ZMIN - 40) P.z = ZMIN; else P.x = Math.sign(P.x) * LANE; }
    P.z = Math.max(HEND, P.z); if (inHall(P)) return;
  }
  if (inLounge(P)) {
    if (P.z < LZ0) { if (Math.abs(P.x) > LANE) { if (P.z < ZMAX + 60) P.z = ZMAX; else if (P.z > LZ0 - 60) P.z = LZ0; else P.x = Math.sign(P.x) * LANE; } }
    else { P.x = Math.max(-730, Math.min(730, P.x)); P.z = Math.min(LZ1, P.z); }
    for (const [x0, z0, x1, z1] of SOLID) { const m = 30; if (P.x > x0 - m && P.x < x1 + m && P.z > z0 - m && P.z < z1 + m) { const d = [P.x - x0 + m, x1 + m - P.x, P.z - z0 + m, z1 + m - P.z], k = d.indexOf(Math.min(...d)); if (k === 0) P.x = x0 - m; else if (k === 1) P.x = x1 + m; else if (k === 2) P.z = z0 - m; else P.z = z1 + m; } }
    if (inLounge(P)) return;
  }
  P.x = Math.max(-690, Math.min(690, P.x));
  const dx = P.x, dz = P.z - BZ;
  if (Math.abs(dx) < BR && Math.abs(dz) < BR) { if (Math.abs(dx) > Math.abs(dz)) P.x = Math.sign(dx || 1) * BR; else P.z = Math.sign(dz || 1) * BR + BZ; }
}
// does the straight walk from a to b cut through the Big Box?
function blocked(a, b) {
  let t0 = 0, t1 = 1; const R = BR - 2;
  for (const [o, d, c] of [[a.x, b.x - a.x, 0], [a.z, b.z - a.z, BZ]]) {
    if (Math.abs(d) < 1e-6) { if (Math.abs(o - c) >= R) return false; continue; }
    let u = (c - R - o) / d, v = (c + R - o) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v);
  }
  return t0 < t1;
}
function route(from, to) {
  const K = BR + 12, C = [[-K, BZ - K], [K, BZ - K], [K, BZ + K], [-K, BZ + K]].map(([x, z]) => ({ x, z }));
  if (!blocked(from, to)) return [to];
  let best = null, bl = 1e9; const len = (...p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - p[i].x, q.z - p[i].z), 0);
  for (const c of C) if (!blocked(from, c) && !blocked(c, to) && len(from, c, to) < bl) { bl = len(from, c, to); best = [c, to]; }
  for (let i = 0; i < 4; i++) for (const j of [(i + 1) % 4, (i + 3) % 4]) { const c = C[i], e = C[j]; if (!blocked(from, c) && !blocked(e, to) && len(from, c, e, to) < bl) { bl = len(from, c, e, to); best = [c, e, to]; } }
  return best || [to];
}
function goTo(id) {
  const s = stations[id]; if (!s) return;
  closePanel(); $('#hint').style.opacity = 0; sitting = false;
  if (!room) return s.open();
  const d = (s.depth || 0) + Math.max(190, Math.min(410, Math.max((s.w / 2) / Math.tan(room.hfov() / 2) * 1.15, (s.max[1] / 2) / Math.tan(room.vfov() / 2))));
  let to = { x: s.x + Math.sin(s.T.th) * d, z: s.z + Math.cos(s.T.th) * d };
  const zone = p => p.z < -700 ? 'hall' : p.z > 900 ? 'lounge' : 'main', tz = zone(s), pz = inHall(P) ? 'hall' : inLounge(P) ? 'lounge' : 'main';
  to = tz === 'hall' ? { x: Math.max(-LANE + 10, Math.min(LANE - 10, to.x)), z: Math.max(HEND, Math.min(ZMIN - 60, to.z)) }
    : tz === 'lounge' ? { x: Math.max(-730, Math.min(730, to.x)), z: Math.max(LZ0 + 20, Math.min(LZ1, to.z)) }
    : { x: Math.max(-690, Math.min(690, to.x)), z: Math.max(ZMIN, Math.min(ZMAX, to.z)) };
  collide();
  const doorH = { x: 0, z: ZMIN + 10 }, doorL = { x: 0, z: ZMAX - 10 }, path = []; let cur = P;
  if (pz !== tz || pz === 'lounge') {
    if (pz === 'hall') { path.push(doorH); cur = doorH; }
    if (pz === 'lounge') { path.push({ x: 0, z: P.z }); cur = { x: 0, z: P.z }; if (tz !== 'lounge') { path.push(doorL); cur = doorL; } }
  }
  if (tz === 'main') path.push(...(pz === 'main' || cur !== P ? route(cur, to) : [to]));
  else if (tz === 'hall') { if (pz !== 'hall') path.push(...route(cur, doorH)); path.push(to); }
  else { if (pz !== 'lounge') path.push(...route(cur, doorL)); path.push({ x: 0, z: to.z }, to); }
  goal = { path, yaw: -s.T.th, pitch: s.pitch || 0, id, t: 0 };
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y, st = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x;
  if (keys.arrowleft) P.yaw -= dt * 1.8; if (keys.arrowright) P.yaw += dt * 1.8;
  if (f || st) { goal = null; sitting = false; }
  let moving = false;
  if (goal) {
    const w = goal.path[0], dx = w.x - P.x, dz = w.z - P.z, d = Math.hypot(dx, dz), step = 560 * dt, lastLeg = goal.path.length === 1;
    if (d > step) { P.x += dx / d * step; P.z += dz / d * step; moving = true; } else { P.x = w.x; P.z = w.z; if (!lastLeg) goal.path.shift(); }
    const want = lastLeg && d < 260 ? goal.yaw : Math.atan2(dx, -dz), da = angDiff(d > step || lastLeg ? want : P.yaw, P.yaw);
    P.yaw += Math.abs(da) < 0.02 ? da : da * Math.min(1, dt * 6); P.pitch += ((lastLeg ? goal.pitch : 0) - P.pitch) * Math.min(1, dt * 5);
    goal.t += dt;
    if ((lastLeg && d <= step && Math.abs(angDiff(goal.yaw, P.yaw)) < 0.05) || goal.t > 16) { const id = goal.id; goal = null; stations[id].open(); }
  } else if (f || st) {
    const sp = 430 * dt, s = Math.sin(P.yaw), c = Math.cos(P.yaw);
    P.x += (s * f + c * st) * sp; P.z += (-c * f + s * st) * sp; collide(); moving = true;
  }
  if (moving) walkT += dt * 11;
  P.eyeBase = (P.eyeBase || 300) + ((sitting ? 190 : 300) - (P.eyeBase || 300)) * Math.min(1, dt * 6);
  P.eye = P.eyeBase + Math.sin(walkT) * (moving ? 5 : 0);
  if (room && !window.__skip) room.render(P, now / 1000, peerSprites(dt));
  let best = null, bd = 1e9;
  if (room) for (const s of Object.values(stations)) {
    const d = Math.hypot(s.x - P.x, s.z - P.z), a = Math.atan2(s.x - P.x, -(s.z - P.z));
    if (d < 620 && d < bd && Math.abs(angDiff(a, P.yaw)) < 0.6) { best = s; bd = d; }
  }
  if (best !== near) { near = best; const b = $('#act'); b.hidden = !near || !panel.hidden; if (near) b.textContent = '▶ ' + near.label; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = 1; if ((e.key === 'Enter' || e.key.toLowerCase() === 'e') && near && panel.hidden && $('#gate').hidden) near.open(); if (e.key === 'Escape') closePanel(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = 0; });
let drag = null;
view.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const k = 2.4 / Math.max(innerWidth, 500);
  P.yaw -= (e.clientX - drag.x) * k; P.pitch = Math.max(-0.45, Math.min(0.45, P.pitch + (e.clientY - drag.y) * k)); drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { drag.moved = true; goal = null; $('#hint').style.opacity = 0; }
});
view.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (room && !drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 9) { const s = room.pick(e.clientX, e.clientY, P); if (s) goTo(s.id); }
  drag = null;
});
view.addEventListener('pointercancel', () => { drag = null; });
const stick = $('#stick'), knob = stick.firstElementChild;
const stickMove = e => {
  const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  joy.x = x * 0.8; joy.y = y; knob.style.transform = `translate(${x * 33}px,${y * 33}px)`; $('#hint').style.opacity = 0;
};
stick.addEventListener('pointerdown', e => { stick.setPointerCapture(e.pointerId); stickMove(e); });
stick.addEventListener('pointermove', e => { if (stick.hasPointerCapture(e.pointerId)) stickMove(e); });
const stickEnd = () => { joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
$('#act').onclick = () => near && near.open();

// ---------------- panels ----------------
let cleanup = null;
function closePanel() { if (cleanup) { cleanup(); cleanup = null; } panel.hidden = true; pbody.innerHTML = ''; $('#act').hidden = !near; }
function show(html, color) { closePanel(); pbody.innerHTML = html; panel.hidden = false; $('#act').hidden = true; panel.firstElementChild.style.borderColor = color || ''; panel.firstElementChild.scrollTop = 0; }
panel.querySelector('.x').onclick = closePanel;
panel.addEventListener('pointerdown', e => { if (e.target === panel) closePanel(); });
const link = (label, url, cls = '') => url ? `<a class="btn ${cls}" href="${url}" target="_blank" rel="noopener">${label}</a>` : `<button class="btn off ${cls}" data-soon="1">${label}</button>`;
pbody.addEventListener('click', e => { if (e.target.closest('[data-soon]')) toast('COMING SOON'); });
const needMe = () => { if (auth.pid) return true; openProfile(); toast('PICK A PLAYER NAME FIRST'); return false; };
const rows = (list, unit) => list.length ? list.map((r, i) => `<li><span>${i + 1}. ${r.badge || ''} ${r.name}</span><b>${r.score.toLocaleString()}${unit}</b></li>`).join('') : '<li class="dim">No scores yet. Be the first.</li>';

function openGame(g) {
  show(`<span class="tag" style="--c:${g.color}">${g.genre.toUpperCase()}</span><h2>${g.title}</h2>
    <div class="stage" style="--c:${g.color}">${cover(g)}</div>
    <p>${g.blurb}</p>
    <button class="btn go" id="gplay">▶ PLAY</button><button class="btn" id="gtrail">↻ TRAILER</button>
    <div class="cols"><section><h3>HIGH SCORES</h3><ol class="rank" id="grank"><li class="dim">Loading…</li></ol></section>
    <section><h3>COMMENTS</h3><form class="cf" id="gform"><input maxlength="280" placeholder="Say something about ${g.title}"><button class="btn go">POST</button></form><ul class="cm" id="gcm"></ul></section></div>`, g.color);
  const stage = pbody.querySelector('.stage'); let stop = null, timer, paid = false;
  const trailer = () => {
    clearTimeout(timer); if (stop) stop();
    const yt = (g.trailer.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
    if (yt) { stage.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt}?autoplay=1&playsinline=1" allow="autoplay; fullscreen"></iframe>`; stop = null; earn('trailer', g.id); return; }
    stage.innerHTML = '<canvas width="480" height="270"></canvas><em>TRAILER</em>';
    stop = playTrailer(stage.firstChild, g.id, g.title, () => { if (!paid) { paid = true; earn('trailer', g.id); } }, g.shots);
  };
  timer = setTimeout(trailer, 2600);
  cleanup = () => { clearTimeout(timer); if (stop) stop(); };
  $('#gtrail').onclick = () => { clearTimeout(timer); if (stop) stop(); stop = null; stage.innerHTML = cover(g); timer = setTimeout(trailer, 1200); };
  $('#gplay').onclick = () => {
    if (!g.play) return toast('PLAYABLE BUILD COMING SOON');
    earn('play', g.id); closePanel();
    const gf = $('#gf'); gf.hidden = false; gf.dataset.game = g.id; gf.querySelector('b').textContent = g.title.toUpperCase();
    gf.querySelector('a').href = g.play; gf.querySelector('iframe').src = g.play; pauseBgm(true);
    clearInterval(playTimer); playTimer = setInterval(() => { if (!gf.hidden && !document.hidden) earn('minute', g.id); }, 60000);
  };
  api('board', null, '&game=' + g.id).then(r => { const o = $('#grank'); if (o) o.innerHTML = rows(r.rows, ''); }).catch(() => { const o = $('#grank'); if (o) o.innerHTML = '<li class="dim">Leaderboard is offline.</li>'; });
  const loadC = () => api('comments', null, '&game=' + g.id).then(r => {
    const u = $('#gcm'); if (!u) return; u.innerHTML = '';
    if (!r.rows.length) u.innerHTML = '<li class="dim">No comments yet.</li>';
    for (const c of r.rows) { const li = el('li'), b = el('b'), s = el('span'); b.textContent = `${c.badge || ''} ${c.name}`; s.textContent = c.text; li.append(b, s); u.append(li); }
  }).catch(() => {});
  loadC();
  $('#gform').onsubmit = async e => {
    e.preventDefault(); if (!needMe()) return;
    const inp = e.target.querySelector('input');
    try { await api('comment', { game: g.id, text: inp.value }); inp.value = ''; loadC(); } catch (err) { toast(err.message.toUpperCase()); }
  };
}
let playTimer;
$('#gf button').onclick = () => { const gf = $('#gf'); clearInterval(playTimer); gf.hidden = true; gf.querySelector('iframe').src = 'about:blank'; pauseBgm(false); };
// Games report scores with: parent.postMessage({ bba: 'score', score: 1234 }, '*')
// and events with: parent.postMessage({ bba: 'level' }, '*')  or  { bba: 'fatality' }
addEventListener('message', e => {
  const gf = $('#gf'), d = e.data; if (gf.hidden || !d) return;
  if (d.bba === 'score') earn('score', gf.dataset.game, d.score);
  if (d.bba === 'level' || d.bba === 'fatality') earn(d.bba, gf.dataset.game);
});

function openBigBox() {
  show(`<h2>BIG BANG BOX</h2><p>Pick a game. Walk up to its cabinet or jump straight in.</p>` +
    GAMES.map(g => `<h3 style="color:${g.color}">${g.genre.toUpperCase()}</h3><div class="card" style="flex-direction:row;text-align:left;border-color:${g.color}">
      <div class="thumb" style="width:110px;flex:none">${cover(g)}</div><div style="flex:1"><p style="color:#fff">${g.title.toUpperCase()}</p><p class="dim">${g.blurb}</p>
      <button class="btn go" data-open="${g.id}">▶ SELECT</button><button class="btn" data-walk="${g.id}">WALK UP</button></div></div>`).join(''), '#ffc93a');
  pbody.onclick = e => { const o = e.target.closest('[data-open]'), w = e.target.closest('[data-walk]'); if (o) openGame(GAMES.find(g => g.id === o.dataset.open)); if (w) goTo(w.dataset.walk); };
  cleanup = () => { pbody.onclick = null; };
}

function openJukebox() {
  const pl = ((JUKEBOX_PLAYLIST || '').match(/[?&]list=([\w-]+)/) || [])[1];
  show(`<h2>JUKEBOX</h2><p>Big Bang music. Pick a record.</p>${pl ? `<div class="stage" style="--c:#ff4fd8"><iframe src="https://www.youtube.com/embed/videoseries?list=${pl}&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe></div>` : ''}<ul class="list"${pl ? ' hidden' : ''}>${SONGS.map((s, i) => `<li><span>${i + 1}. ${s.title}</span><button class="btn go" data-song="${i}">▶ PLAY</button></li>`).join('')}</ul>
    <h3>ARCADE MUSIC</h3><button class="btn" id="jbgm">${muted ? 'TURN MUSIC ON' : 'TURN MUSIC OFF'}</button>
    <h3>MORE MUSIC</h3>${MUSIC_PAGES.map(([n, u]) => link(n, u)).join('')}`, '#ff4fd8');
  pbody.onclick = e => {
    const b = e.target.closest('[data-song]'); if (!b) return;
    const s = SONGS[b.dataset.song], a = $('#song'); earn('song');
    if (s.file) { a.src = s.file; a.play(); pauseBgm(true); a.onended = () => pauseBgm(false); toast('NOW PLAYING: ' + s.title.toUpperCase()); }
    else if (s.link) window.open(s.link, '_blank', 'noopener'); else toast('COMING SOON');
  };
  $('#jbgm').onclick = () => { toggleMute(); openJukebox(); };
  if (pl) pauseBgm(true);
  cleanup = () => { pbody.onclick = null; if (pl) pauseBgm(false); };
}

function openPrizes() {
  if (!auth.pid) { openProfile(); return toast('SIGN IN TO REACH THE PRIZE WALL'); }
  const card = p => { const own = me && me.closet.includes(p.id) && !p.real; return `<div class="card ${own ? 'on' : ''}"><div class="ico">${p.icon}</div><span>${p.name}</span>
      <button class="btn ${own ? 'off' : 'go'}" data-buy="${p.id}" ${own ? 'disabled' : ''}>${own ? 'OWNED' : '🪙 ' + p.cost}</button></div>`; };
  const real = PRIZES.filter(p => p.real && REAL_PRIZES_LIVE), songs = PRIZES.filter(p => p.file), gear = PRIZES.filter(p => !p.real && !p.file);
  show(`<h2>PRIZE WALL</h2><p>You have <b style="color:var(--gold)">🪙 ${me ? me.tokens : 0}</b> tokens. Everything you win goes in your closet.</p>
    ${real.length ? `<h3>REAL PRIZES</h3><div class="grid">${real.map(card).join('')}</div>` : ''}
    ${songs.length ? `<h3>SONG DOWNLOADS</h3><div class="grid">${songs.map(card).join('')}</div>` : ''}
    <h3>CLOSET GEAR</h3><div class="grid">${gear.map(card).join('')}</div>
    <h3>HOW TO WIN TOKENS</h3><p class="dim">Every minute you play +${REWARDS.minute} · Beat a Quest of Champions level +${REWARDS.level} · T1 Versus fatality +${REWARDS.fatality} · Google or Facebook sign-in +${REWARDS.social} (one time) · Daily visit +${REWARDS.daily} · Game scores up to +${REWARDS.scoreMax} a run</p>`, '#ffc93a');
  pbody.onclick = async e => {
    const b = e.target.closest('[data-buy]'); if (!b || !needMe()) return;
    try { const r = await api('buy', { id: b.dataset.buy }); setMe(r.player); if (r.code || b.dataset.buy.startsWith('song-')) openCloset(); else { toast('ADDED TO YOUR CLOSET'); openPrizes(); } } catch (err) { toast(err.message.toUpperCase()); }
  };
  cleanup = () => { pbody.onclick = null; };
}

function openCloset() {
  const own = me ? PRIZES.filter(p => me.closet.includes(p.id)) : [];
  show(`<h2>MY CLOSET</h2>${own.length ? `<p>Tap a prize to wear it next to your name.</p><div class="grid">${own.map(p => `<div class="card ${me.badge === p.id ? 'on' : ''}"><div class="ico">${p.icon}</div><span>${p.name}</span>
      ${p.file ? `<a class="btn go" href="${p.file}" download="${p.name}.mp3">⬇ DOWNLOAD</a>` : `<button class="btn" data-wear="${me.badge === p.id ? '' : p.id}">${me.badge === p.id ? 'TAKE OFF' : 'WEAR'}</button>`}</div>`).join('')}</div>` : '<p>Empty for now. Win tokens and hit the prize wall.</p><button class="btn go" data-go="prizes">GO TO THE PRIZE WALL</button>'}
    ${me && me.claims.length ? `<h3>REAL PRIZE CLAIM CODES</h3><p>${CLAIM_HELP}</p>${me.claims.map(c => `<div><span class="code">${c.code}</span> ${(PRIZES.find(p => p.id === c.id) || {}).name || ''}</div>`).join('')}` : ''}`, '#3ea8ff');
  pbody.onclick = async e => {
    if (e.target.closest('[data-go]')) return goTo('prizes');
    const b = e.target.closest('[data-wear]'); if (!b) return;
    try { const r = await api('badge', { id: b.dataset.wear }); setMe(r.player); openCloset(); } catch (err) { toast(err.message.toUpperCase()); }
  };
  cleanup = () => { pbody.onclick = null; };
}

function openBoard(which) {
  const tabs = [['all', 'TOP TOKEN EARNERS'], ...GAMES.map(g => [g.id, g.title.toUpperCase()])];
  show(`<h2>LEADERBOARD</h2><div class="tabs">${tabs.map(([id, n]) => `<button class="btn ${id === which ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div><ol class="rank" id="brank"><li class="dim">Loading…</li></ol>`, '#35e06f');
  api('board', null, '&game=' + which).then(r => { const o = $('#brank'); if (o) o.innerHTML = rows(r.rows, which === 'all' ? ' 🪙' : ''); }).catch(() => { const o = $('#brank'); if (o) o.innerHTML = '<li class="dim">Leaderboard is offline.</li>'; });
  pbody.onclick = e => { const t = e.target.closest('[data-tab]'); if (t) openBoard(t.dataset.tab); };
  cleanup = () => { pbody.onclick = null; };
}

function openDonate() {
  show(`<h2>DONATE</h2><p>Every dollar keeps the machines on and new games coming.</p>${DONATE.map(([n, u]) => link(n, u, 'go')).join('')}<p class="dim">Thank you for supporting T1 Entertainment.</p>`, '#ff2a3c');
}
function openCredits() {
  show(`<h2>BIG BANG ARCADE</h2><p>Created by <b style="color:var(--gold)">Chuck Crawley</b> and <b style="color:var(--gold)">Tone Da Boss</b>.</p><p class="dim">A T1 Entertainment production.</p>` +
    Object.entries(SOCIALS).map(([who, list]) => `<h3>${who.toUpperCase()}</h3>${list.map(([n, u]) => link(n, u)).join('')}`).join('') +
    `<h3>MUSIC</h3>${MUSIC_PAGES.map(([n, u]) => link(n, u)).join('')}`, '#ffffff');
}
function openMap() {
  show(`<h2>ARCADE MAP</h2><p>Tap a spot and you'll walk there.</p><div class="grid">${Object.values(stations).map(s => `<button class="btn" data-go="${s.id}" style="margin:0">${s.label.replace(/^(PLAY|OPEN|SEE|SHOP) (THE |MY )?/, '')}</button>`).join('')}</div>`);
  pbody.onclick = e => { const b = e.target.closest('[data-go]'); if (b) goTo(b.dataset.go); };
  cleanup = () => { pbody.onclick = null; };
}
// ---------------- the lounge: couches, bar, table games ----------------
function sitDown(id) {
  const s = stations[id] || stations.couch; if (!s || !s.seat) return;
  goal = null; P.x = s.seat[0]; P.z = s.seat[2]; P.yaw = Math.PI - s.T.th; P.pitch = 0; sitting = true; toast('YOU SIT DOWN. MOVE TO STAND UP.');
}
function openBar() {
  if (!auth.pid) { openProfile(); return toast('SIGN IN TO ORDER AT THE BAR'); }
  show(`<h2>THE BAR</h2><p>You have <b style="color:var(--gold)">🪙 ${me ? me.tokens : 0}</b> tokens${me && me.beers ? ` · ${me.beers} 🍺 ordered` : ''}.</p>
    <div class="grid"><div class="card"><div class="ico">🍺</div><span>Beer</span><button class="btn go" data-bar="beer">🪙 ${BAR.beer}</button></div></div>
    <h3>LEAVE A TIP</h3>${BAR.tips.map(t => `<button class="btn" data-tip="${t}">🪙 ${t}</button>`).join('')}
    <p class="dim">In-game drinks only. Tokens spent at the bar are gone for good.</p>`, '#ffb400');
  pbody.onclick = async e => {
    const b = e.target.closest('[data-bar]'), t = e.target.closest('[data-tip]'); if (!b && !t) return;
    try { const r = await api('spend', b ? { what: 'beer' } : { what: 'tip', amount: +t.dataset.tip }); setMe(r.player); openBar(); toast(b ? 'CHEERS! 🍺' : 'THANKS FOR THE TIP!'); } catch (err) { toast(err.message.toUpperCase()); }
  };
  cleanup = () => { pbody.onclick = null; };
}
const MINI = {
  darts: { title: 'DARTS', icon: '🎯', rounds: 3, verb: 'THROW', unit: 'POINTS', score: a => a > 0.93 ? 50 : a > 0.8 ? 25 : Math.round(a * 20) },
  bowling: { title: 'BOWLING', icon: '🎳', rounds: 2, verb: 'ROLL', unit: 'PINS', score: (a, left) => Math.min(left, Math.round(a * a * (left === 10 ? 10 : left + 1))), pool: 10 },
  pool: { title: 'POOL', icon: '🎱', rounds: 4, verb: 'SHOOT', unit: 'BALLS SUNK', score: a => a > 0.9 ? 2 : a > 0.6 ? 1 : 0 },
  hockey: { title: 'AIR HOCKEY', icon: '🏒', rounds: 5, verb: 'SHOOT', unit: 'GOALS', score: a => a > 0.72 ? 1 : 0 },
};
// Simple timing games: stop the marker as close to the centre as you can.
function openMini(kind) {
  const g = MINI[kind];
  show(`<h2>${g.icon} ${g.title}</h2><p>Stop the marker in the gold zone. ${g.rounds} tries.</p><div class="stage" style="--c:#ffc93a;aspect-ratio:16/6"><canvas width="640" height="240" id="mcv"></canvas></div>
    <p id="mtxt" style="color:var(--gold)">&nbsp;</p><button class="btn go" id="mgo">${g.verb}</button><button class="btn" id="magain" hidden>PLAY AGAIN</button>`, '#ffc93a');
  const cv = $('#mcv'), c = cv.getContext('2d'); let round = 0, total = 0, left = g.pool || 0, t0 = performance.now(), frozen = null, raf, done = false;
  const pos = now => { const sp = 0.9 + round * 0.35, u = ((now - t0) / 1000 * sp) % 2; return u < 1 ? u : 2 - u; };
  const draw = now => {
    const p = frozen == null ? pos(now) : frozen; c.fillStyle = '#0b0612'; c.fillRect(0, 0, 640, 240);
    c.fillStyle = '#2a1a40'; c.fillRect(40, 100, 560, 40); c.fillStyle = '#35e06f'; c.fillRect(40 + 560 * 0.36, 100, 560 * 0.28, 40); c.fillStyle = '#ffc93a'; c.fillRect(40 + 560 * 0.465, 100, 560 * 0.07, 40);
    c.fillStyle = '#fff'; c.fillRect(40 + 560 * p - 4, 84, 8, 72); c.font = '48px sans-serif'; c.textAlign = 'center'; c.fillText(g.icon, 40 + 560 * p, 70);
    c.font = '14px "Press Start 2P",monospace'; c.fillStyle = '#fff'; c.fillText(done ? 'FINAL' : `TRY ${Math.min(round + 1, g.rounds)} OF ${g.rounds}`, 320, 200); c.fillStyle = '#ffc93a'; c.fillText(`${total} ${g.unit}`, 320, 226);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  const act = () => {
    if (done || frozen != null) return;
    frozen = pos(performance.now()); const a = 1 - Math.abs(frozen - 0.5) * 2, pts = g.score(a, left); total += pts; if (g.pool) left -= pts; round++;
    $('#mtxt').textContent = pts ? `+${pts} ${g.unit}!` : 'MISSED!';
    setTimeout(() => { if (!$('#mcv')) return; if (round >= g.rounds || (g.pool && left <= 0)) { done = true; $('#mgo').hidden = true; $('#magain').hidden = false; $('#mtxt').textContent = `FINAL: ${total} ${g.unit}` + (g.pool && total >= 10 ? ' — STRIKE OUT!' : ''); } else { frozen = null; t0 = performance.now(); } }, 800);
  };
  $('#mgo').onclick = act; cv.onpointerdown = act; $('#magain').onclick = () => openMini(kind);
  cleanup = () => cancelAnimationFrame(raf);
}

// ---------------- avatars + seeing other players ----------------
const AV = { skin: ['#f1c9a5', '#d9a273', '#b9794f', '#8a5a3c', '#5a3a26'], hc: ['#111111', '#5a3a1a', '#d2142a', '#ffd23e', '#3ea8ff', '#e8e8f0'], shirt: ['#e01226', '#111111', '#ffffff', '#3ea8ff', '#35e06f', '#ffc93a', '#b06cff', '#ff7a1a'], hair: ['LOCS', 'SHORT', 'AFRO', 'CAP', 'BALD'] };
const cleanAv = a => { a = a || {}; const n = (v, m) => Math.max(0, Math.min(m, Math.floor(Number(v) || 0))); return { skin: n(a.skin, 4), hair: n(a.hair, 4), hc: n(a.hc, 5), shirt: n(a.shirt, 7), shades: n(a.shades, 1) }; };
let myAv = cleanAv(store.get('bba-av') || { skin: 3, hair: 0, hc: 0, shirt: 0, shades: 1 });
function drawAvatar(x, W, H, a, name) { // pixel person on a 24x40 grid
  x.clearRect(0, 0, W, H); const u = Math.min(W / 24, (H - (name ? H * 0.12 : 0)) / 40), ox = (W - 24 * u) / 2, oy = H - 40 * u, R = (c, px, py, w, h) => { x.fillStyle = c; x.fillRect(Math.round(ox + px * u), Math.round(oy + py * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const sk = AV.skin[a.skin], hc = AV.hc[a.hc], sh = AV.shirt[a.shirt];
  R('#000', 6.5, 1.5, 11, 11); R(sk, 7, 2, 10, 10); R(sk, 10, 12, 4, 2);
  if (a.hair === 0) { R(hc, 6, 0, 12, 4); R(hc, 5, 3, 2, 13); R(hc, 17, 3, 2, 13); R(hc, 7, 3, 1, 9); R(hc, 16, 3, 1, 9); }
  if (a.hair === 1) R(hc, 7, 1, 10, 3);
  if (a.hair === 2) { R(hc, 5, -2, 14, 6); R(hc, 4, 1, 2, 5); R(hc, 18, 1, 2, 5); }
  if (a.hair === 3) { R(hc, 6, 0, 12, 4); R(hc, 15, 3, 6, 1.5); }
  if (a.shades) { R('#000', 7, 5.5, 10, 2.5); R('#d2142a', 8, 6, 3, 1.5); R('#d2142a', 13, 6, 3, 1.5); } else { R('#000', 9, 6, 1.5, 1.5); R('#000', 13.5, 6, 1.5, 1.5); }
  R('#000', 10.5, 9.5, 3, 0.8);
  R('#000', 4.5, 13.5, 15, 13); R(sh, 5, 14, 14, 12); R(sh, 2, 14, 3, 9); R(sh, 19, 14, 3, 9); R(sk, 2, 23, 3, 2.5); R(sk, 19, 23, 3, 2.5);
  R('#23232b', 6, 26, 5.5, 11); R('#23232b', 12.5, 26, 5.5, 11); R('#fff', 5, 37, 6.5, 3); R('#fff', 12.5, 37, 6.5, 3); R('#d2142a', 5, 37, 6.5, 1.2); R('#d2142a', 12.5, 37, 6.5, 1.2);
  if (name) { x.font = `bold ${Math.round(H * 0.075)}px Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = Math.max(3, H * 0.02); x.strokeStyle = '#000'; x.strokeText(name, W / 2, 2); x.fillStyle = '#ffc93a'; x.fillText(name, W / 2, 2); }
}
function openAvatar() {
  const rows = [['skin', 'SKIN', 5], ['hair', 'HAIR', 5], ['hc', 'HAIR COLOR', 6], ['shirt', 'SHIRT', 8], ['shades', 'SHADES', 2]];
  show(`<h2>YOUR AVATAR</h2><p>This is how other players see you in the arcade.</p><div class="cols"><div class="stage" style="--c:#3ea8ff;aspect-ratio:3/4;max-width:240px"><canvas width="240" height="320" id="avc"></canvas></div>
    <div>${rows.map(([k, label]) => `<ul class="list"><li><span>${label}</span><button class="btn" data-av="${k}">CHANGE ▶</button></li></ul>`).join('')}<button class="btn go" id="avsave">SAVE AVATAR</button></div></div>`, '#3ea8ff');
  const paint = () => drawAvatar($('#avc').getContext('2d'), 240, 320, myAv, me ? me.name : ''); paint();
  pbody.onclick = e => { const b = e.target.closest('[data-av]'); if (!b) return; const [, , n] = rows.find(r => r[0] === b.dataset.av); myAv[b.dataset.av] = (myAv[b.dataset.av] + 1) % n; paint(); };
  $('#avsave').onclick = async () => { store.set('bba-av', myAv); try { await api('avatar', { av: myAv }); } catch {} closePanel(); toast('AVATAR SAVED'); };
  cleanup = () => { pbody.onclick = null; };
}
// Other players: positions are shared live through a Supabase Realtime channel.
const peers = new Map(), sid = Math.random().toString(36).slice(2, 10);
function peerSeen(d) {
  if (!d || typeof d.id !== 'string' || d.id === sid || (peers.size >= 40 && !peers.has(d.id))) return;
  const name = String(d.n || 'Player').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 16), av = cleanAv(d.av), key = name + JSON.stringify(av);
  const x = Math.max(-760, Math.min(760, +d.x || 0)), z = Math.max(-1450, Math.min(1880, +d.z || 0));
  let p = peers.get(d.id); if (!p) { p = { x, z }; peers.set(d.id, p); }
  if (p.key !== key && room) { if (p.tex) room.freeTex(p.tex); p.tex = room.tex(128, 256, (c, W, H) => drawAvatar(c, W, H, av, name)); p.key = key; }
  p.tx = x; p.tz = z; p.sit = !!d.s; p.seen = performance.now();
}
window.__bbaPeer = peerSeen;
function peerSprites(dt) {
  const out = [], now = performance.now();
  for (const [id, p] of peers) {
    if (now - p.seen > 8000) { if (p.tex && room) room.freeTex(p.tex); peers.delete(id); continue; }
    p.x += (p.tx - p.x) * Math.min(1, dt * 5); p.z += (p.tz - p.z) * Math.min(1, dt * 5);
    if (p.tex) out.push({ tex: p.tex, x: p.x, z: p.z, y: p.sit ? -70 : 0, w: 150, h: 300 });
  }
  return out;
}
async function startPresence() {
  try {
    const c = await sb(), ch = c.channel('bba-arcade-room', { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'pos' }, m => peerSeen(m.payload));
    ch.subscribe(st => { if (st === 'SUBSCRIBED') setInterval(() => { if (!document.hidden && auth.pid && me) ch.send({ type: 'broadcast', event: 'pos', payload: { id: sid, n: me.name, av: myAv, x: Math.round(P.x), z: Math.round(P.z), s: sitting ? 1 : 0 } }); }, 700); });
  } catch {}
}

function openSoon(g) {
  show(`<span class="tag" style="--c:${g.color}">COMING SOON</span><h2>${g.title}</h2><div class="stage" style="--c:${g.color};aspect-ratio:1/1;max-width:340px">${cover(g)}</div>
    <p>This game is on the way.${g.song ? ` Soundtrack: <b style="color:var(--gold)">${g.song}</b>.` : ''}</p>${g.song && !g.file ? '<p class="dim">The song will play here once it is added.</p>' : ''}`, g.color);
}
const ytId = u => ((u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
function openVault() {
  show(`<h2>BIG BANG VAULT</h2><p>Big Bang videos. Pick one to watch.</p><div class="stage" id="vstage" style="--c:#3ea8ff" hidden></div>
    <ul class="list">${VAULT.map((v, i) => `<li><span>${v.title}</span><button class="btn go" data-vid="${i}">▶ WATCH</button></li>`).join('')}</ul>`, '#3ea8ff');
  pbody.onclick = e => {
    const b = e.target.closest('[data-vid]'); if (!b) return;
    const v = VAULT[b.dataset.vid], id = ytId(v.link), st = $('#vstage');
    if (id) { st.hidden = false; st.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`; pauseBgm(true); panel.firstElementChild.scrollTop = 0; }
    else window.open(v.link || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(v.title), '_blank', 'noopener');
  };
  cleanup = () => { pbody.onclick = null; pauseBgm(false); };
}
// Google / Facebook sign-in through Supabase Auth; gives a one-time token bonus.
let sbClient;
async function sb() {
  if (!sbClient) { const m = await import('https://esm.sh/@supabase/supabase-js@2'); sbClient = m.createClient(SOCIAL_AUTH.url, SOCIAL_AUTH.key); }
  return sbClient;
}
async function socialSignIn(provider) {
  try { const c = await sb(), r = await c.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); if (r.error) throw r.error; }
  catch { toast(provider.toUpperCase() + ' SIGN-IN IS NOT SET UP YET'); }
}
async function socialReturn() { // runs after Google/Facebook sends the player back
  if (!/access_token=|code=/.test(location.hash + location.search)) return;
  try {
    const c = await sb(), { data } = await c.auth.getSession(); if (!data.session) return;
    const u = data.session.user, nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || 'Player';
    if (!auth.pid) await join(nm);
    const r = await api('social', { token: data.session.access_token }); setMe(r.player);
    toast(r.gained ? `SIGNED IN +${r.gained} TOKENS` : 'SIGNED IN'); history.replaceState(null, '', location.pathname);
  } catch {}
}
const socialBtns = `<h3>OR SIGN IN FOR +${REWARDS.social} TOKENS</h3><button class="btn" data-social="google">CONTINUE WITH GOOGLE</button><button class="btn" data-social="facebook">CONTINUE WITH FACEBOOK</button>`;
function openProfile() {
  const wire = () => { pbody.onclick = e => { const b = e.target.closest('[data-go]'), so = e.target.closest('[data-social]'); if (b) goTo(b.dataset.go); if (so) socialSignIn(so.dataset.social); }; cleanup = () => { pbody.onclick = null; }; };
  if (me) { show(`<h2>${me.name}</h2><p>🪙 ${me.tokens} tokens · ${me.earned} won all time · ${me.closet.length} prizes</p><button class="btn go" data-go="closet">MY CLOSET</button><button class="btn" data-go="prizes">PRIZE WALL</button><button class="btn" id="pav">EDIT AVATAR</button>${socialBtns}`); wire(); $('#pav').onclick = openAvatar; return; }
  show(`<h2>SIGN IN</h2><p>Pick a player name to win tokens, reach the prize wall, post scores and comment.</p><form class="cf" id="pform"><input maxlength="16" placeholder="PLAYER NAME"><button class="btn go">SAVE</button></form>${socialBtns}`);
  wire();
  $('#pform').onsubmit = async e => { e.preventDefault(); try { await join(e.target.querySelector('input').value); toast('WELCOME, ' + me.name.toUpperCase()); openAvatar(); } catch (err) { toast(err.message.toUpperCase()); } };
}
$('#map').onclick = openMap; $('#who').onclick = openProfile; $('#tok').onclick = () => goTo('prizes');

// ---------------- arcade music ----------------
const bgm = new Audio(BGM); bgm.loop = true; bgm.volume = 0.45;
let muted = !!store.get('bba-mute'), held = false, started = false;
const applyVol = () => { $('#snd').classList.toggle('off', muted); if (!started) return; if (muted || held || document.hidden) bgm.pause(); else bgm.play().catch(() => {}); };
function startBgm() { started = true; applyVol(); }
function pauseBgm(on) { held = on; if (!on) $('#song').pause(); applyVol(); }
function toggleMute() { muted = !muted; store.set('bba-mute', muted); started = true; applyVol(); }
$('#snd').onclick = toggleMute; applyVol();
document.addEventListener('visibilitychange', applyVol);
// coming-soon cabinets play their song when you walk up
const prox = new Audio(); prox.loop = true; let proxId = null;
setInterval(() => {
  let hit = null;
  if (started && !muted && $('#gf').hidden) for (const g of SOON) { const st = stations[g.id]; if (g.file && st && st.x != null && Math.hypot(st.x - P.x, st.z - P.z) < 430) hit = g; }
  const id = hit ? hit.id : null; if (id === proxId) return; proxId = id;
  if (hit) { prox.src = hit.file; prox.play().catch(() => {}); pauseBgm(true); toast('NOW PLAYING: ' + hit.song.toUpperCase()); } else { prox.pause(); pauseBgm(false); }
}, 500);

// ---------------- entrance ----------------
const gate = $('#gate'), gname = $('#gname');
const enter = async () => {
  startBgm();
  const name = gname.value.trim();
  gate.hidden = true;
  if (!auth.pid && name) { try { await join(name); toast('WELCOME, ' + me.name.toUpperCase()); if (!store.get('bba-av')) openAvatar(); } catch (err) { toast(err.message.toUpperCase()); } }
  startPresence();
};
$('#genter').onclick = enter; gname.addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
if (auth.pid) { gname.hidden = true; api('me', {}).then(r => { setMe(r.player); earn('daily'); }).catch(() => { auth = {}; gname.hidden = false; }); }
setMe(null);
socialReturn();
