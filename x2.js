// Big Bang Arcade — how the expansion rooms play (see rooms2.js for how they look).
// Walking through the new doorways, the mirrors, the library books and what they open, the seals, the gloves and
// the sword, loose basketballs and the Shoot'em hoop, laser tag, the kid zone piano.
import { PLAN, BOOKS, SECRET_ORDER } from './rooms2.js';

export function createX2(c) {
  const { P, room, stations, peers, store, toast, show, closePanel, legacyCollide, setGoal, sprite, selfTex, openGame, emote, hub } = c;
  const flags = { secret: !!store.get('bb.secret'), gloves: !!store.get('bb.gloves'), sword: !!store.get('bb.sword') };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // ---------------- sound: a few plain tones ----------------
  let ac = null;
  function tone(freq, len = 0.18, type = 'sine', vol = 0.12) {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + len); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + len); } catch {}
  }

  // ---------------- walking ----------------
  const M = 110, rects = [...Object.entries(PLAN.rooms).map(([id, r]) => ({ id, r: [r.x0 + M, r.z0 + M, r.x1 - M, r.z1 - M] })), ...PLAN.lanes.map(l => ({ r: l.slice(0, 4), lock: l[4] }))];
  const open = q => !q.lock || flags[q.lock], inR = (p, r) => p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3];
  const inAny = p => rects.some(q => open(q) && inR(p, q.r));
  const roomOf = p => { const q = rects.find(q => q.id && inR(p, q.r)); if (q) return q.id; for (const [id, r] of Object.entries(PLAN.rooms)) if (p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1 && inAny(p)) return id; return null; };
  const inHall = p => p.z < -1250 && p.z > PLAN.hall.z0 - 40 && Math.abs(p.x) < 1500;
  function push(list) { for (const [x0, z0, x1, z1] of list) { const m = 30; if (P.x > x0 - m && P.x < x1 + m && P.z > z0 - m && P.z < z1 + m) { const d = [P.x - x0 + m, x1 + m - P.x, P.z - z0 + m, z1 + m - P.z], k = d.indexOf(Math.min(...d)); if (k === 0) P.x = x0 - m; else if (k === 1) P.x = x1 + m; else if (k === 2) P.z = z0 - m; else P.z = z1 + m; } } }
  function nearest() { let best = null, bd = 1e18; for (const q of rects) { if (!open(q)) continue; const x = Math.max(q.r[0], Math.min(q.r[2], P.x)), z = Math.max(q.r[1], Math.min(q.r[3], P.z)), d = (x - P.x) ** 2 + (z - P.z) ** 2; if (d < bd) { bd = d; best = [x, z]; } } if (best) { P.x = best[0]; P.z = best[1]; } }
  let wasNew = false;
  function collide() {
    if (inAny(P)) { wasNew = true; push(PLAN.solids); return; }
    if (wasNew) {
      const x = P.x, z = P.z; legacyCollide();
      if (Math.hypot(P.x - x, P.z - z) < 0.5) { wasNew = false; if (inHall(P)) push(PLAN.hallSolids); return; }   // a real spot in the older rooms
      P.x = x; P.z = z; nearest(); push(PLAN.solids); return;
    }
    legacyCollide(); if (inHall(P)) push(PLAN.hallSolids);
  }
  // Walking to something in a new room: step through its door first (the same way the Arena and the Club work).
  function goTo(id) {
    const s = stations[id], cur = roomOf(P);
    if (s.room2) {
      if (s.room2 === 'chamber' && !flags.secret) return true;
      const r = PLAN.rooms[s.room2], q = rects.find(q => q.id === s.room2).r;
      const stand = s.seat ? { x: s.seat[0], z: s.seat[2] } : { x: Math.max(q[0], Math.min(q[2], s.x + Math.sin(s.T.th) * 170)), z: Math.max(q[1], Math.min(q[3], s.z + Math.cos(s.T.th) * 170)) };
      if (cur !== s.room2) { P.x = r.entry.x; P.z = r.entry.z; P.yaw = r.entry.yaw; P.pitch = 0; wasNew = true; if (r.label) toast(r.label); hub('room:' + s.room2); }
      setGoal({ path: [stand], yaw: -s.T.th, pitch: 0, id, t: 0 }); return true;
    }
    if (cur) { const a = PLAN.rooms[cur].anchor; P.x = a.x; P.z = a.z; wasNew = false; }
    return false;
  }

  // ---------------- the library ----------------
  function book(i) {
    const b = BOOKS[i]; if (!b) return;
    if (b.odd) return oddBook();
    let page = 0;
    const draw = () => { show(`<span class="tag" style="--c:${b.c}">LIBRARY</span><h2>${b.mark} ${esc(b.title)}</h2><p style="white-space:pre-line;min-height:9em;font-size:1.05em;line-height:1.5">${esc(b.pages[page])}</p><p class="dim">Page ${page + 1} of ${b.pages.length}</p><button class="btn" id="bprev" ${page ? '' : 'disabled'}>← BACK</button> <button class="btn go" id="bnext">${page < b.pages.length - 1 ? 'TURN THE PAGE →' : 'CLOSE THE BOOK'}</button>`, b.c);
      document.getElementById('bprev').onclick = () => { page--; tone(330, 0.06, 'triangle', 0.05); draw(); };
      document.getElementById('bnext').onclick = () => { if (page < b.pages.length - 1) { page++; tone(392, 0.06, 'triangle', 0.05); draw(); } else closePanel(); }; };
    draw(); hub('book:' + i);
  }
  function oddBook() {
    if (flags.secret) return show('<h2>?</h2><p>The pages are blank now. Behind you, a shelf stands a little out of line.</p>', '#b06cff');
    const marks = ['◆', '★', '●', '▲'], got = [];
    const draw = msg => { show(`<h2>?</h2><p>No title. No author. Four signs pressed into the cover, worn smooth by other fingers.</p><p class="dim">${msg || 'A line inside the cover reads: <i>oldest ink first.</i>'}</p><div class="tabs">${marks.map(m => `<button class="btn" data-mark="${m}" style="font-size:1.6em;min-width:2.4em" ${got.includes(m) ? 'disabled' : ''}>${m}</button>`).join('')}</div><p style="font-size:1.4em;letter-spacing:.3em">${got.join(' ') || '&nbsp;'}</p>`, '#b06cff');
      for (const bt of document.querySelectorAll('[data-mark]')) bt.onclick = () => { got.push(bt.dataset.mark); tone(300 + got.length * 80, 0.12, 'triangle');
        if (got.length < 4) return draw();
        if (got.join() === SECRET_ORDER.join()) { flags.secret = true; store.set('bb.secret', 1); room.hideFb('secretshelf', true); tone(196, 0.9, 'sawtooth', 0.08); setTimeout(() => tone(147, 1.2, 'sawtooth', 0.08), 250); closePanel(); toast('SOMETHING HEAVY MOVES BEHIND THE SHELVES'); hub('secret_open'); }
        else { got.length = 0; tone(110, 0.3, 'square', 0.06); draw('Nothing happens. The signs settle back.'); } }; };
    draw();
  }

  // ---------------- the seals, the altar ----------------
  const Q = { phase: 0, lit: [0, 0, 0], seq: [], at: 0, t: 0, on: [false, false, false], flash: [0, 0, 0] }, NOTE = [262, 330, 392];
  const overSeal = (p, i) => Math.hypot(p.x - PLAN.seals[i][0], p.z - PLAN.seals[i][1]) < 95;
  function quest(dt) {
    const here = roomOf(P) === 'chamber';
    if (!here && Q.phase < 3) { if (Q.phase) { Q.phase = 0; Q.lit = [0, 0, 0]; } for (let i = 0; i < 3; i++) room.hideFb('seal' + i, true); return; }
    if (!here) return;
    const show3 = [false, false, false];
    for (let i = 0; i < 3; i++) {
      const mine = overSeal(P, i), stepped = mine && !Q.on[i]; Q.on[i] = mine; Q.flash[i] = Math.max(0, Q.flash[i] - dt);
      if (Q.phase === 0) { let any = mine; for (const p of peers.values()) if (overSeal(p, i)) any = true; if (any) { if (Q.lit[i] <= 0) tone(NOTE[i], 0.3); Q.lit[i] = 6; } else Q.lit[i] -= dt; show3[i] = Q.lit[i] > 0; }
      else if (Q.phase === 2) { if (stepped) { Q.flash[i] = 0.45; tone(NOTE[i], 0.3);
          if (Q.seq[Q.at] === i) { if (++Q.at >= Q.seq.length) { Q.phase = 3; room.hideFb('cage', true); tone(523, 0.8); setTimeout(() => tone(784, 1.2), 300); toast('THE ALTAR IS OPEN'); hub('seals_done'); } }
          else { Q.phase = 0; Q.lit = [0, 0, 0]; tone(98, 0.5, 'square', 0.07); toast('THE SEALS GO DARK'); } }
        show3[i] = Q.flash[i] > 0; }
      else if (Q.phase === 3) show3[i] = true;
    }
    if (Q.phase === 0 && Q.lit.every(v => v > 0) && !flags.gloves) { Q.phase = 1; Q.t = 1.2; Q.at = -1; Q.seq = Array.from({ length: 5 }, (_, n) => (n * 7 + Math.floor(Math.random() * 3)) % 3); for (let n = 1; n < 5; n++) if (Q.seq[n] === Q.seq[n - 1]) Q.seq[n] = (Q.seq[n] + 1) % 3; toast('THE SEALS ARE AWAKE. LISTEN.'); }
    if (Q.phase === 1) { Q.t -= dt; if (Q.t <= 0) { Q.at++; if (Q.at >= Q.seq.length) { Q.phase = 2; Q.at = 0; Q.on = [0, 1, 2].map(i => overSeal(P, i)); toast('NOW ANSWER THEM'); } else { tone(NOTE[Q.seq[Q.at]], 0.5); Q.t = 0.85; } }
      for (let i = 0; i < 3; i++) show3[i] = Q.at >= 0 && Q.at < Q.seq.length && Q.seq[Q.at] === i && Q.t > 0.2; }
    for (let i = 0; i < 3; i++) room.hideFb('seal' + i, !show3[i]);
  }
  function altar() {
    if (flags.gloves) return show('<h2>THE ALTAR</h2><p>Empty now. Your hands remember what was here.</p>', '#b06cff');
    if (Q.phase < 3) return toast('SOMETHING HOLDS IT SHUT');
    flags.gloves = true; store.set('bb.gloves', 1); room.hideFb('gloves', true); tone(659, 0.5); setTimeout(() => tone(880, 0.9), 200); hub('gloves');
    show('<h2>✋ THE MYSTICAL GLOVES</h2><p>They are warm, and they fit as if they had been waiting for you in particular.</p><p class="dim">You can not think what they would be for.</p>', '#ffc93a');
  }
  function sword() {
    const game = { id: 'nameless', title: 'The Blade With No Name', genre: '???', color: '#b06cff', blurb: 'It was waiting for somebody. Cut down what comes out of the dark, for as long as you can stand.', play: 'games/sword/', trailer: '', art: c.swordArt, shots: [] };
    if (flags.sword) return openGame(game);
    if (!flags.gloves) { tone(140, 0.4, 'sawtooth', 0.06); return show('<h2>…</h2><p>The hilt is so cold it burns. It does not move, and your palm stings for a long moment after you let go.</p><p class="dim"><i>Not with bare hands. Somewhere quiet, the right pages are waiting.</i></p>', '#b06cff'); }
    flags.sword = true; store.set('bb.sword', 1); tone(440, 0.3); setTimeout(() => tone(660, 0.4), 160); setTimeout(() => tone(880, 0.9), 340); hub('sword_pulled');
    show('<h2>⚔️</h2><p>The gloves drink the cold. The blade slides free with a sound like a held breath let go, and the dark screen wakes.</p><button class="btn go" id="swgo">▶ PLAY</button>', '#b06cff');
    document.getElementById('swgo').onclick = () => openGame(game);
  }

  // ---------------- basketballs and the Shoot'em hoop ----------------
  const BR = 22, G = 1800, H = PLAN.hall, RK = PLAN.rack;
  const rackSpot = i => ({ x: RK.x - 36 + (i % 3) * 36, y: (i < 3 ? 55 : 115) + BR, z: RK.z });
  const balls = Array.from({ length: 6 }, (_, i) => ({ ...rackSpot(i), vx: 0, vy: 0, vz: 0, st: 'rack', a: i, rest: 0, i }));
  let held = null, shots = { score: 0, streak: 0, best: store.get('bb.shoot') || 0 };
  const dirOf = () => { const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), s = Math.sin(P.yaw), co = Math.cos(P.yaw); return [s * cp, sp, -co * cp]; };
  function grab(b) { if (held) return toast('YOUR HANDS ARE FULL'); b = b || balls.find(q => q.st === 'rack') || balls.slice().sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0]; b.st = 'held'; held = b; tone(180, 0.08, 'triangle'); toast('THROW IT AT THE HOOP, OR AT A FRIEND'); }
  function throwBall() { const b = held; if (!b) return; const d = dirOf(), pow = 760; held = null; b.st = 'free'; b.rest = 0; b.vx = d[0] * pow; b.vz = d[2] * pow; b.vy = d[1] * pow + 520; b.hit = 0; tone(220, 0.07, 'triangle'); }
  function ballsStep(dt) {
    const d = dirOf(), list = [];
    for (const b of balls) {
      if (b.st === 'held') { const s = Math.sin(P.yaw), co = Math.cos(P.yaw); b.x = P.x + d[0] * 62 + co * 24; b.z = P.z + d[2] * 62 + s * 24; b.y = P.eye - 62 + d[1] * 40; b.a += dt * 0.6; }
      else if (b.st === 'free') {
        const py = b.y; b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.a += Math.hypot(b.vx, b.vz) * dt / 40;
        if (b.y < BR) { b.y = BR; if (Math.abs(b.vy) > 90) tone(90, 0.05, 'triangle', Math.min(0.12, Math.abs(b.vy) / 6000)); b.vy = -b.vy * 0.68; b.vx *= 0.86; b.vz *= 0.86; if (Math.abs(b.vy) < 70) b.vy = 0; }
        if (b.y > 545) { b.y = 545; b.vy = -Math.abs(b.vy) * 0.5; }
        if (b.x < H.x0) { b.x = H.x0; b.vx = Math.abs(b.vx) * 0.6; } if (b.x > H.x1) { b.x = H.x1; b.vx = -Math.abs(b.vx) * 0.6; }
        if (b.z < H.z0) { b.z = H.z0; b.vz = Math.abs(b.vz) * 0.6; } if (b.z > H.z1) { b.z = H.z1; b.vz = -Math.abs(b.vz) * 0.6; }
        for (const [x0, z0, x1, z1] of PLAN.hallSolids) if (b.y < 190 && b.x > x0 && b.x < x1 && b.z > z0 && b.z < z1) { const e = [b.x - x0, x1 - b.x, b.z - z0, z1 - b.z], kx = e.indexOf(Math.min(...e)); if (kx === 0) { b.x = x0; b.vx = -Math.abs(b.vx) * 0.5; } else if (kx === 1) { b.x = x1; b.vx = Math.abs(b.vx) * 0.5; } else if (kx === 2) { b.z = z0; b.vz = -Math.abs(b.vz) * 0.5; } else { b.z = z1; b.vz = Math.abs(b.vz) * 0.5; } }
        // the backboard, then the hoop: through the ring on the way down scores
        const hp = PLAN.hoop;
        if (b.z < hp.z - 36 && b.z > hp.z - 90 && Math.abs(b.x - hp.x) < 80 && b.y > hp.y - 40 && b.y < hp.y + 130 && b.vz < 0) { b.z = hp.z - 36; b.vz = Math.abs(b.vz) * 0.55; tone(160, 0.05, 'square', 0.05); }
        if (py >= hp.y && b.y < hp.y && b.vy < 0 && Math.hypot(b.x - hp.x, b.z - hp.z) < hp.r && !b.hit) { b.hit = 1; b.vx *= 0.2; b.vz *= 0.2; shots.score += 2; shots.streak++; if (shots.score > shots.best) { shots.best = shots.score; store.set('bb.shoot', shots.best); }
          tone(523, 0.12); setTimeout(() => tone(784, 0.25), 110); toast(`SWISH! ${shots.score} POINTS` + (shots.streak > 1 ? ` · ${shots.streak} IN A ROW` : '')); hub('shootem_score'); }
        if (!b.hit && b.y <= BR + 1 && b.vy === 0 && b.rest === 0) shots.streak = 0;
        for (const [id, p] of peers) if (b.y < 330 && Math.hypot(b.vx, b.vz) > 220 && Math.hypot(b.x - p.x, b.z - p.z) < 48) { b.vx = -b.vx * 0.45; b.vz = -b.vz * 0.45; b.x += b.vx * dt * 2; b.z += b.vz * dt * 2; tone(240, 0.1, 'square', 0.07); toast('BONK! YOU HIT ' + String((p.last && p.last.name) || p.name || 'A PLAYER').toUpperCase()); }
        if (b.vy === 0 && Math.hypot(b.vx, b.vz) < 30) { b.vx = b.vz = 0; b.rest += dt; if (b.rest > 22) { Object.assign(b, rackSpot(b.i), { st: 'rack', rest: 0 }); } }
      }
      if (b.st !== 'held' || true) list.push({ x: b.x, y: b.y, z: b.z, r: BR, a: b.a });
    }
    room.setBalls(inHall(P) || balls.some(b => b.st !== 'rack') ? list : []);
  }
  const looseNear = () => held ? null : balls.find(b => b.st === 'free' && b.y < 160 && Math.hypot(b.x - P.x, b.z - P.z) < 135 && Math.hypot(b.vx, b.vz) < 260);

  // ---------------- laser tag ----------------
  const LZ = { on: false, t: 0, score: 0, target: -1, tt: 0, best: store.get('bb.laser') || 0, beams: [], cool: 0 };
  function laserStart() { if (LZ.on) return; Object.assign(LZ, { on: true, t: 45, score: 0, tt: 0 }); nextTarget(); toast('LASER TAG: 45 SECONDS. HIT THE LIT TARGETS!'); tone(660, 0.15); hub('laser_start'); closePanel(); }
  function nextTarget() { if (LZ.target >= 0) room.hideFb('lt' + LZ.target, true); let n; do { n = Math.floor(Math.random() * PLAN.targets.length); } while (n === LZ.target); LZ.target = n; LZ.tt = 5; room.hideFb('lt' + n, false); }
  function laserEnd() { LZ.on = false; if (LZ.target >= 0) room.hideFb('lt' + LZ.target, true); LZ.target = -1; const top = LZ.score > LZ.best; if (top) { LZ.best = LZ.score; store.set('bb.laser', LZ.best); } tone(330, 0.4);
    show(`<span class="tag" style="--c:#31d7ff">LASER TAG</span><h2>${LZ.score} POINTS</h2><p>${top ? 'A new personal best.' : 'Your best is ' + LZ.best + '.'}</p><button class="btn go" id="lzgo">▶ GO AGAIN</button>`, '#31d7ff'); document.getElementById('lzgo').onclick = laserStart; hub('laser_end'); }
  const raySphere = (o, d, cx, cy, cz, r) => { const x = cx - o[0], y = cy - o[1], z = cz - o[2], t = x * d[0] + y * d[1] + z * d[2]; if (t < 0) return -1; const q = x * x + y * y + z * z - t * t; return q < r * r ? t : -1; };
  function fire() {
    if (LZ.cool > 0) return; LZ.cool = 0.22; const d = dirOf(), s = Math.sin(P.yaw), co = Math.cos(P.yaw), o = [P.x + co * 16, P.eye - 26, P.z + s * 16]; let len = 2600, col = [0.2, 0.85, 1];
    tone(880, 0.07, 'sawtooth', 0.05);
    const tg = PLAN.targets[LZ.target]; if (tg) { const t = raySphere(o, d, tg[0], tg[1], tg[2], 62); if (t > 0) { len = t; LZ.score += 1; tone(1175, 0.12); nextTarget(); col = [0.3, 1, 0.5]; } }
    for (const p of peers.values()) { if (roomOf(p) !== 'laser') continue; const t = raySphere(o, d, p.x, 170, p.z, 75); if (t > 0 && t < len) { len = t; LZ.score += 3; col = [1, 0.3, 0.6]; tone(1568, 0.14); toast('TAGGED ' + String((p.last && p.last.name) || 'A PLAYER').toUpperCase() + '! +3'); } }
    LZ.beams.push({ o, d, len, w: 3.5, c: col, t: 0.14 });
  }

  // ---------------- small things ----------------
  let key = -1;
  function act(what) {
    if (what === 'altar') return altar();
    if (what === 'sword') return sword();
    if (what === 'ball') return grab();
    if (what === 'laser') return laserStart();
    if (what === 'shootem') return show(`<span class="tag" style="--c:#ff7a1a">BASKETBALL</span><h2>BIG BANG SHOOT'EM</h2><p>Grab a ball from the rack, look up at the hoop and throw. Looking higher throws higher. Two points a basket.</p><p>This visit: <b>${shots.score}</b> · Your best: <b>${shots.best}</b></p>`, '#ff7a1a');
    if (what === 'pit') { emote('jump'); tone(523, 0.1); setTimeout(() => tone(659, 0.1), 90); setTimeout(() => tone(784, 0.16), 180); return toast('SPLASH! BALLS EVERYWHERE'); }
    if (what === 'library') return toast('THE LIBRARY: THE BOOKS ON THE BRASS STANDS CAN BE READ');
    if (what === 'outside') return toast('FRESH AIR. THE ARCADE IS OPEN LATE');
    if (what === 'popcorn') { tone(700, 0.05, 'square', 0.05); return toast('🍿 FRESH POPCORN. ENJOY THE SHOW'); }
    if (what === 'daycare') { show('<span class="tag" style="--c:#ff9ad0">DAYCARE</span><h2>LITTLE ONES PLAY HERE</h2><p>Cribs, a play rug, a rocking horse and a shelf of toys. Ring the bell if you need the desk.</p><button class="btn go" id="dcbell">🔔 RING THE BELL</button>', '#ff9ad0'); document.getElementById('dcbell').onclick = () => { tone(1319, 0.5); setTimeout(() => tone(1047, 0.7), 180); }; }
  }
  // what the action button does right now, when it is not a station: fire, throw, pick up
  function override() {
    if (LZ.on && roomOf(P) === 'laser') return { label: `🔫 FIRE · ${LZ.score} PTS · 0:${String(Math.ceil(LZ.t)).padStart(2, '0')}`, open: fire, live: true };
    if (held) return { label: '🏀 THROW (LOOK UP TO AIM HIGHER)', open: throwBall };
    const b = looseNear(); if (b) return { label: '🏀 PICK UP THE BALL', open: () => grab(b) };
    return null;
  }
  function update(dt, spr) {
    const here = roomOf(P);
    // mirrors: you, and anyone else in the closet, seen the other way round behind the glass
    if (here === 'closet' || (P.x < -1080 && P.x > -1400 && P.z > 380 && P.z < 580)) {
      const r = PLAN.rooms.closet, MX = PLAN.mirrorX, t = selfTex();
      for (const s of spr.slice()) if (s.x > r.x0 && s.x < r.x1 && s.z > r.z0 && s.z < r.z1) spr.push({ ...s, x: 2 * MX - s.x });
      if (t) spr.push({ tex: t, x: 2 * MX - P.x, z: P.z, y: 0, w: sprite.w, h: sprite.h });
    }
    quest(dt);
    ballsStep(dt);
    if (LZ.on) { LZ.t -= dt; LZ.tt -= dt; if (LZ.tt <= 0) nextTarget(); if (LZ.t <= 0) laserEnd(); }
    LZ.cool -= dt; LZ.beams = LZ.beams.filter(b => (b.t -= dt) > 0);
    if (here === 'kids') { const k2 = PLAN.keys.findIndex(p => Math.abs(P.x - p.x) < 31 && Math.abs(P.z - p.z) < 80); if (k2 !== key) { key = k2; if (k2 >= 0) tone([262, 294, 330, 349, 392, 440, 494, 523][k2], 0.35, 'triangle', 0.14); } }
    return { beams: LZ.beams };
  }
  // how the rooms start out for this player
  room.hideFb('secretshelf', flags.secret); room.hideFb('gloves', flags.gloves); if (flags.gloves) { room.hideFb('cage', true); Q.phase = 3; }
  return { collide, goTo, book, act, override, update, roomOf, flags, dbg: { Q, shots, balls, LZ } };
}
