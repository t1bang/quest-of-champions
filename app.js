import { GAMES, SONGS, MUSIC_PAGES, DONATE, SOCIALS, CLAIM_HELP, BGM } from './config.js';
import { PRIZES, REWARDS, REAL_PRIZES_LIVE } from './prizes.js';
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
  me = p;
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
const cover = g => `<img src="${g.art}" alt="${g.title} cover art">`;
await Promise.race([Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('16px "Press Start 2P"')]).catch(() => {}), new Promise(r => setTimeout(r, 1800))]);
const handlers = { game: g => openGame(g), bigbox: () => openBigBox(), jukebox: () => openJukebox(), closet: () => openCloset(), prizes: () => openPrizes(), scores: () => openBoard('all'), donate: () => openDonate(), credits: () => openCredits() };
const room = buildRoom(view, GAMES, PRIZES, handlers);
const stations = room ? room.stations : Object.fromEntries([...GAMES.map(g => [g.id, { id: g.id, label: 'PLAY ' + g.title.toUpperCase(), open: () => openGame(g) }]),
  ...[['bigbox', 'OPEN THE BIG BOX'], ['jukebox', 'OPEN THE JUKEBOX'], ['closet', 'OPEN MY CLOSET'], ['prizes', 'SHOP THE PRIZE WALL'], ['scores', 'SEE THE LEADERBOARD'], ['donate', 'DONATE'], ['credits', 'CREDITS + SOCIALS']].map(([id, label]) => [id, { id, label, open: handlers[id] }])]);
if (!room) { $('#hint').textContent = 'YOUR BROWSER CANNOT SHOW THE 3D ROOM. USE THE MAP BUTTON.'; $('#stick').hidden = true; }

// ---------------- movement + controls ----------------
const P = { x: 0, z: 780, yaw: 0, pitch: 0, eye: 300 }, keys = {}, joy = { x: 0, y: 0 };
let goal = null, near = null, walkT = 0;
const BZ = 150, BR = 215, ZMIN = -380, ZMAX = 790; // Big Box position + walkable depth
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function collide() {
  P.x = Math.max(-690, Math.min(690, P.x)); P.z = Math.max(ZMIN, Math.min(ZMAX, P.z));
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
function route(to) {
  const K = BR + 12, C = [[-K, BZ - K], [K, BZ - K], [K, BZ + K], [-K, BZ + K]].map(([x, z]) => ({ x, z }));
  if (!blocked(P, to)) return [to];
  let best = null, bl = 1e9; const len = (...p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - p[i].x, q.z - p[i].z), 0);
  for (const c of C) if (!blocked(P, c) && !blocked(c, to) && len(P, c, to) < bl) { bl = len(P, c, to); best = [c, to]; }
  for (let i = 0; i < 4; i++) for (const j of [(i + 1) % 4, (i + 3) % 4]) { const c = C[i], e = C[j]; if (!blocked(P, c) && !blocked(e, to) && len(P, c, e, to) < bl) { bl = len(P, c, e, to); best = [c, e, to]; } }
  return best || [to];
}
function goTo(id) {
  const s = stations[id]; if (!s) return;
  closePanel(); $('#hint').style.opacity = 0;
  if (!room) return s.open();
  const d = (s.depth || 0) + Math.max(190, Math.min(460, (s.w / 2) / Math.tan(room.hfov() / 2) * 1.15));
  const to = { x: Math.max(-690, Math.min(690, s.x + Math.sin(s.T.th) * d)), z: Math.max(ZMIN, Math.min(ZMAX, s.z + Math.cos(s.T.th) * d)) };
  collide(); goal = { path: route(to), yaw: -s.T.th, id, t: 0 };
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y, st = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x;
  if (keys.arrowleft) P.yaw -= dt * 1.8; if (keys.arrowright) P.yaw += dt * 1.8;
  if (f || st) goal = null;
  let moving = false;
  if (goal) {
    const w = goal.path[0], dx = w.x - P.x, dz = w.z - P.z, d = Math.hypot(dx, dz), step = 560 * dt, lastLeg = goal.path.length === 1;
    if (d > step) { P.x += dx / d * step; P.z += dz / d * step; moving = true; } else { P.x = w.x; P.z = w.z; if (!lastLeg) goal.path.shift(); }
    const want = lastLeg && d < 260 ? goal.yaw : Math.atan2(dx, -dz), da = angDiff(d > step || lastLeg ? want : P.yaw, P.yaw);
    P.yaw += Math.abs(da) < 0.02 ? da : da * Math.min(1, dt * 6); P.pitch *= 1 - Math.min(1, dt * 5);
    goal.t += dt;
    if ((lastLeg && d <= step && Math.abs(angDiff(goal.yaw, P.yaw)) < 0.05) || goal.t > 8) { const id = goal.id; goal = null; stations[id].open(); }
  } else if (f || st) {
    const sp = 430 * dt, s = Math.sin(P.yaw), c = Math.cos(P.yaw);
    P.x += (s * f + c * st) * sp; P.z += (-c * f + s * st) * sp; collide(); moving = true;
  }
  if (moving) walkT += dt * 11;
  P.eye = 300 + Math.sin(walkT) * (moving ? 5 : 0);
  if (room && (panel.hidden || true)) room.render(P, now / 1000);
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
view.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const k = 2.4 / Math.max(innerWidth, 500);
  P.yaw -= (e.clientX - drag.x) * k; P.pitch = Math.max(-0.45, Math.min(0.45, P.pitch + (e.clientY - drag.y) * k)); drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { goal = null; $('#hint').style.opacity = 0; }
});
view.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (room && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 9) { const s = room.pick(e.clientX, e.clientY, P); if (s) goTo(s.id); }
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
$('#gf button').onclick = () => { const gf = $('#gf'); gf.hidden = true; gf.querySelector('iframe').src = 'about:blank'; pauseBgm(false); };
// Games report scores with: parent.postMessage({ bba: 'score', score: 1234 }, '*')
addEventListener('message', e => { const gf = $('#gf'); if (!gf.hidden && e.data && e.data.bba === 'score') earn('score', gf.dataset.game, e.data.score); });

function openBigBox() {
  show(`<h2>BIG BOX</h2><p>Pick a game. Walk up to its cabinet or jump straight in.</p>` +
    GAMES.map(g => `<h3 style="color:${g.color}">${g.genre.toUpperCase()}</h3><div class="card" style="flex-direction:row;text-align:left;border-color:${g.color}">
      <div class="thumb" style="width:110px;flex:none">${cover(g)}</div><div style="flex:1"><p style="color:#fff">${g.title.toUpperCase()}</p><p class="dim">${g.blurb}</p>
      <button class="btn go" data-open="${g.id}">▶ SELECT</button><button class="btn" data-walk="${g.id}">WALK UP</button></div></div>`).join(''), '#ffc93a');
  pbody.onclick = e => { const o = e.target.closest('[data-open]'), w = e.target.closest('[data-walk]'); if (o) openGame(GAMES.find(g => g.id === o.dataset.open)); if (w) goTo(w.dataset.walk); };
  cleanup = () => { pbody.onclick = null; };
}

function openJukebox() {
  show(`<h2>JUKEBOX</h2><p>Big Bang music. Pick a record.</p><ul class="list">${SONGS.map((s, i) => `<li><span>${i + 1}. ${s.title}</span><button class="btn go" data-song="${i}">▶ PLAY</button></li>`).join('')}</ul>
    <h3>ARCADE MUSIC</h3><button class="btn" id="jbgm">${muted ? 'TURN MUSIC ON' : 'TURN MUSIC OFF'}</button>
    <h3>MORE MUSIC</h3>${MUSIC_PAGES.map(([n, u]) => link(n, u)).join('')}`, '#ff4fd8');
  pbody.onclick = e => {
    const b = e.target.closest('[data-song]'); if (!b) return;
    const s = SONGS[b.dataset.song], a = $('#song'); earn('song');
    if (s.file) { a.src = s.file; a.play(); pauseBgm(true); a.onended = () => pauseBgm(false); toast('NOW PLAYING: ' + s.title.toUpperCase()); }
    else if (s.link) window.open(s.link, '_blank', 'noopener'); else toast('COMING SOON');
  };
  $('#jbgm').onclick = () => { toggleMute(); openJukebox(); };
  cleanup = () => { pbody.onclick = null; };
}

function openPrizes() {
  const shown = PRIZES.filter(p => !p.real || REAL_PRIZES_LIVE);
  show(`<h2>PRIZE WALL</h2><p>You have <b style="color:var(--gold)">🪙 ${me ? me.tokens : 0}</b> tokens. Everything you win goes in your closet.</p>
    <div class="grid">${shown.map(p => { const own = me && me.closet.includes(p.id) && !p.real; return `<div class="card ${own ? 'on' : ''}"><div class="ico">${p.icon}</div><span>${p.name}</span>
      <button class="btn ${own ? 'off' : 'go'}" data-buy="${p.id}" ${own ? 'disabled' : ''}>${own ? 'OWNED' : '🪙 ' + p.cost}</button></div>`; }).join('')}
      ${REAL_PRIZES_LIVE ? '' : '<div class="card"><div class="ico">🎁</div><span>REAL PRIZES</span><button class="btn off" data-soon="1">COMING SOON</button></div>'}</div>
    <h3>HOW TO WIN TOKENS</h3><p class="dim">Daily visit +${REWARDS.daily} · Play a game +${REWARDS.play} · Watch a trailer +${REWARDS.trailer} · Spin the jukebox +${REWARDS.song} · Game scores up to +${REWARDS.scoreMax} a run</p>`, '#ffc93a');
  pbody.onclick = async e => {
    const b = e.target.closest('[data-buy]'); if (!b || !needMe()) return;
    try { const r = await api('buy', { id: b.dataset.buy }); setMe(r.player); if (r.code) openCloset(); else { toast('ADDED TO YOUR CLOSET'); openPrizes(); } } catch (err) { toast(err.message.toUpperCase()); }
  };
  cleanup = () => { pbody.onclick = null; };
}

function openCloset() {
  const own = me ? PRIZES.filter(p => me.closet.includes(p.id)) : [];
  show(`<h2>MY CLOSET</h2>${own.length ? `<p>Tap a prize to wear it next to your name.</p><div class="grid">${own.map(p => `<div class="card ${me.badge === p.id ? 'on' : ''}"><div class="ico">${p.icon}</div><span>${p.name}</span>
      <button class="btn" data-wear="${me.badge === p.id ? '' : p.id}">${me.badge === p.id ? 'TAKE OFF' : 'WEAR'}</button></div>`).join('')}</div>` : '<p>Empty for now. Win tokens and hit the prize wall.</p><button class="btn go" data-go="prizes">GO TO THE PRIZE WALL</button>'}
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
function openProfile() {
  if (me) return show(`<h2>${me.name}</h2><p>🪙 ${me.tokens} tokens · ${me.earned} won all time · ${me.closet.length} prizes</p><button class="btn go" data-go="closet">MY CLOSET</button><button class="btn" data-go="prizes">PRIZE WALL</button>`), (pbody.onclick = e => { const b = e.target.closest('[data-go]'); if (b) goTo(b.dataset.go); }), (cleanup = () => { pbody.onclick = null; });
  show(`<h2>PLAYER NAME</h2><p>Pick a name to win tokens, post scores and comment.</p><form class="cf" id="pform"><input maxlength="16" placeholder="PLAYER NAME"><button class="btn go">SAVE</button></form>`);
  $('#pform').onsubmit = async e => { e.preventDefault(); try { await join(e.target.querySelector('input').value); closePanel(); toast('WELCOME, ' + me.name.toUpperCase()); } catch (err) { toast(err.message.toUpperCase()); } };
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

// ---------------- entrance ----------------
const gate = $('#gate'), gname = $('#gname');
const enter = async () => {
  startBgm();
  const name = gname.value.trim();
  gate.hidden = true;
  if (!auth.pid && name) { try { await join(name); toast('WELCOME, ' + me.name.toUpperCase()); } catch (err) { toast(err.message.toUpperCase()); } }
};
$('#genter').onclick = enter; gname.addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
if (auth.pid) { gname.hidden = true; api('me', {}).then(r => { setMe(r.player); earn('daily'); }).catch(() => { auth = {}; gname.hidden = false; }); }
setMe(null);
