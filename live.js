// Big Bang Arcade lobby, the live layer: who is here (radar + list), daily quests, and the lobby bosses.
// Quests and bosses are kept by the database (public.bba_daily): it picks the day's three quests, pays the
// rewards once, holds each boss's shared health, and caps how much damage one player can report.
// The day turns over at midnight Central; the weekly boss turns over on Monday.

export const QUESTS = {
  'q-hits': { icon: '👊', text: 'Land 30 hits on SPAR-BOT or a boss', ev: 'hit', n: 30, count: true },
  'q-bot': { icon: '🤖', text: 'Knock out SPAR-BOT', ev: 'ko', n: 1 },
  'q-boss': { icon: '👾', text: 'Deal 300 damage to a boss', ev: 'bossdmg', n: 300 },
  'q-blast': { icon: '💥', text: 'Fire 15 blasts', ev: 'move:blast', n: 15 },
  'q-combo': { icon: '🌀', text: 'Throw 8 combos', ev: 'move:combo', n: 8 },
  'q-jump': { icon: '⤴', text: 'Jump 20 times', ev: 'move:jump', n: 20 },
  'q-x10': { icon: '🔥', text: 'Reach a x10 combo', ev: 'combo10', n: 1 },
  'q-emote': { icon: '🕺', text: 'Wave or dance 3 times', ev: 'emote', n: 3 },
  'q-play': { icon: '🕹️', text: 'Play any game for 3 minutes', ev: 'minute', n: 3 },
  'q-open2': { icon: '🎮', text: 'Start 2 different games', ev: 'game', n: 2, distinct: true },
  'q-mini': { icon: '🎯', text: 'Play darts, pool, air hockey or bowling', ev: 'mini', n: 1 },
  'q-trailer': { icon: '🎬', text: 'Watch a game trailer', ev: 'trailer', n: 1 },
  'q-dodge': { icon: '🦘', text: 'Jump over 3 boss slams', ev: 'dodge', n: 3 },
};
const DAILY_NAMES = ['OVERHEAT', 'GLITCH', 'STATIC', 'TILT', 'LAG SPIKE', 'BUG', 'CRASH'];        // Sunday..Saturday
const DAILY_TINTS = ['#ff7a1a', '#ff2a3c', '#31d7ff', '#ffc93a', '#3dff9a', '#b06cff', '#ff4fd8'];
export const BOSSES = {
  daily: { x: 560, z: 200, r: 90, w: 400, h: 400, y: 260, cycle: 6.5, range: 430, ring: 'move-uppercut', label: 'DAILY BOSS' },
  weekly: { x: 2050, z: -100, r: 140, w: 600, h: 600, y: 360, cycle: 5, range: 560, ring: 'move-slam', label: 'WEEKLY BOSS', name: 'THE BIG CRUNCH', tint: '#b06cff' },
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- boss art ----------
function drawBoss(x, W, H, kind, state, name, level, tint) {
  x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false;
  const u = W / 32, top = H * 0.15, ko = state === 'ko', wind = state === 'wind';
  const R = (c, gx, gy, w, h) => { x.fillStyle = c; x.fillRect(Math.round(gx * u), Math.round(top + gy * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const C = (c, gx, gy, r) => { x.fillStyle = c; x.beginPath(); x.arc(gx * u, top + gy * u, r * u, 0, 7); x.fill(); };
  const eye = ko ? '#444' : wind ? '#ff2a3c' : '#fff';
  x.save();
  if (ko) { x.translate(W / 2, H); x.rotate(-0.45); x.translate(-W / 2, -H + 3 * u); }
  if (kind === 'daily') {              // a runaway arcade cabinet
    const armY = wind ? -1 : 9;
    R('#000', 0.5, armY - 0.5, 5, 11); R('#000', 26.5, armY - 0.5, 5, 11); R('#2a1a40', 1, armY, 4, 10); R('#2a1a40', 27, armY, 4, 10);
    R('#000', -0.2, wind ? -3.5 : 18.5, 6.4, 5.6); R('#000', 25.8, wind ? -3.5 : 18.5, 6.4, 5.6); R(tint, 0.3, wind ? -3 : 19, 5.4, 4.6); R(tint, 26.3, wind ? -3 : 19, 5.4, 4.6);
    R('#000', 6, 0, 20, 25.5); R('#1a1026', 7, 1, 18, 23.5); R(tint, 7, 1, 18, 4); R('#000', 9, 2.2, 14, 1.6);
    R('#05020a', 9, 6, 14, 9); R(eye, 11, 8.4, 3, 3); R(eye, 18, 8.4, 3, 3); R('#05020a', 12, 9.4, 1.4, 1.4); R('#05020a', 19, 9.4, 1.4, 1.4);
    R(tint, 10, 7.2, 5, 1.1); R(tint, 17, 7.2, 5, 1.1);
    if (wind) { R('#ff2a3c', 12, 11.6, 8, 2.8); for (let i = 0; i < 4; i++) R('#fff', 12.4 + i * 2, 11.6, 1, 1); }
    else { R('#fff', 12, 12.2, 8, 1.6); for (let i = 0; i < 4; i++) R('#05020a', 13.2 + i * 2, 12.2, 0.7, 1.6); }
    R('#3a2a55', 6, 16, 20, 3); R('#ff2a3c', 10.5, 14.6, 2, 2.4); R('#ffc93a', 16.5, 16.7, 2, 1.5); R('#31d7ff', 19.5, 16.7, 2, 1.5); R('#3dff9a', 22.5, 16.7, 2, 1.5);
    R('#ffc93a', 15, 20.5, 2, 3); R('#000', 15.7, 21, 0.6, 2);
    R('#000', 7, 24.5, 7.5, 3.4); R('#000', 17.5, 24.5, 7.5, 3.4); R('#2a1a40', 7.5, 25, 6.5, 2.4); R('#2a1a40', 18, 25, 6.5, 2.4);
  } else {                             // a collapsing star with a crown, one eye and two floating fists
    const fy = wind ? 3 : 17;
    C('#000', 16, 13.5, 11.6); C('#1b0b33', 16, 13.5, 11); C('#2e1458', 13, 10.5, 6.5);
    x.strokeStyle = tint; x.lineWidth = u * 1.3; x.beginPath(); x.ellipse(16 * u, top + 14.5 * u, 15 * u, 3.6 * u, -0.18, 0, 7); x.stroke();
    for (let i = 0; i < 5; i++) { R('#000', 8.6 + i * 3.2, 0.2 - (i % 2 ? 0 : 1.6), 2.4, 4.4); R('#ffc93a', 9 + i * 3.2, 0.7 - (i % 2 ? 0 : 1.6), 1.6, 3.6); }
    C('#000', 16, 11, 5.2); C(eye, 16, 11, 4.6); C(ko ? '#222' : '#ff2a3c', 16, 11.4, wind ? 3 : 2.2); C('#05020a', 16, 11.6, 1);
    R('#05020a', 10.5, 18, 11, wind ? 3.6 : 2.2); for (let i = 0; i < 5; i++) R('#fff', 11 + i * 2.1, 18, 1.2, 1.2);
    C('#000', 2.8, fy, 3.2); C(tint, 2.8, fy, 2.7); C('#000', 29.2, fy, 3.2); C(tint, 29.2, fy, 2.7); C('#fff', 2, fy - 0.8, 0.8); C('#fff', 28.4, fy - 0.8, 0.8);
  }
  x.restore();
  if (state === 'hit' || ko) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = ko ? 'rgba(70,70,80,.6)' : 'rgba(255,255,255,.55)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
  x.font = `bold ${Math.round(H * 0.085)}px Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = 5; x.strokeStyle = '#000';
  const label = ko ? 'K.O.' : `${name}  LV ${level}`; x.strokeText(label, W / 2, 3, W - 8); x.fillStyle = ko ? '#fff' : tint; x.fillText(label, W / 2, 3, W - 8);
}
function drawBar(x, W, H, pct, tint) {
  x.clearRect(0, 0, W, H); x.fillStyle = '#000'; x.fillRect(0, 4, W, H - 8); x.fillStyle = '#2a1a40'; x.fillRect(4, 8, W - 8, H - 16);
  x.fillStyle = pct > 0.5 ? '#3dff9a' : pct > 0.2 ? '#ffc93a' : '#ff2a3c'; x.fillRect(4, 8, Math.round((W - 8) * Math.max(0, Math.min(1, pct))), H - 16);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(4, 8, W - 8, 4); x.fillStyle = tint; x.fillRect(0, 4, 4, H - 8); x.fillRect(W - 4, 4, 4, H - 8);
}

export function createLive(ctx) {
  // ctx: { room, P, peers, moves, call(action, body), signedUp(), setTokens(tokens, earned), toast, hub, blocked(), collide(), show(html, color),
  //        closePanel(), panelOpen(), pbody, gameTitle(id), myName(), sendBoss(payload), inGame() }
  const { room, P, peers, moves } = ctx, now = () => performance.now() / 1000, $ = s => document.querySelector(s);
  const startAt = now();
  let state = null, day = '', prog = { day: '', c: {}, seen: {} }, claiming = {}, lastFetch = 0, fetching = false;
  try { const s = JSON.parse(localStorage.getItem('bba-quests')); if (s && s.day) prog = s; } catch {}
  const save = () => { try { localStorage.setItem('bba-quests', JSON.stringify(prog)); } catch {} };

  // ---------- the database ----------
  async function call(action, body) {
    if (!ctx.signedUp()) return null;
    try { const r = await ctx.call(action, body || {}); if (r) apply(r); return r; } catch (e) { return { error: e.message || 'unavailable' }; }
  }
  function apply(r) {
    if (!r || !r.day) return;
    if (r.tokens != null) ctx.setTokens(r.tokens, r.earned);
    if (r.day !== prog.day) { prog = { day: r.day, c: {}, seen: {} }; save(); }
    day = r.day; state = r; lastFetch = now();
    for (const k of ['daily', 'weekly']) {
      const b = boss[k], s = r.bosses && r.bosses[k]; if (!s) continue;
      if (b.s && s.kills > b.s.kills) { b.koUntil = now() + 7; ctx.toast(`${b.name} IS DOWN!  IT WILL BE BACK STRONGER`); if (b.pendingKo) ctx.hub('boss_ko:' + k, s.level - 1); }
      b.pendingKo = false;
      const mine = Math.max(s.mine || 0, b.s && b.s.kills === s.kills ? b.localMine || 0 : 0);
      b.s = { ...s }; b.hp = Math.max(0, s.hp - b.pending); b.localMine = mine;
      if (b.level !== s.level) { b.level = s.level; for (const t of Object.values(b.tex)) t.redraw(); }
      if (s.kills >= 1 && (s.mine || 0) >= s.need && !s.claimed && !claiming[k]) {
        claiming[k] = true;
        call('claim', { boss: k }).then(x => { claiming[k] = false; if (x && x.gained) { ctx.toast(`${b.label} REWARD: +${x.gained} TOKENS`); ctx.hub('boss_reward:' + k, x.gained); } });
      }
    }
    paintTrack(); if (panelKind === 'quests') paintQuests();
  }
  const refresh = () => { if (fetching) return; fetching = true; call('state').finally(() => { fetching = false; lastFetch = now(); }); };

  // ---------- quests ----------
  const todays = () => (state && state.quests && state.quests.ids || []).filter(id => QUESTS[id]);
  const done = id => !!(state && state.quests && (state.quests.done || []).includes(id));
  const count = id => Math.min(QUESTS[id].n, done(id) ? QUESTS[id].n : prog.c[id] || 0);
  function event(type, n = 1) {
    if (!state) return;
    let changed = false;
    for (const id of todays()) {
      const q = QUESTS[id]; if (q.ev !== type || done(id) || (prog.c[id] || 0) >= q.n) continue;
      if (q.distinct) { const seen = prog.seen[id] || (prog.seen[id] = []); if (seen.includes(n)) continue; seen.push(n); prog.c[id] = seen.length; }
      else prog.c[id] = (prog.c[id] || 0) + (q.count ? 1 : Math.max(1, Math.round(+n || 1)));
      changed = true;
      if (prog.c[id] >= q.n) finish(id);
    }
    if (changed) { save(); paintTrack(); if (panelKind === 'quests') paintQuests(); }
  }
  const finishing = {};
  async function finish(id) {
    if (finishing[id]) return; finishing[id] = true;
    const r = await call('quest', { id }); finishing[id] = false;
    if (r && r.gained) { ctx.toast(r.gained > (state.quests.reward || 5) ? `ALL 3 QUESTS DONE!  +${r.gained} TOKENS` : `QUEST DONE: +${r.gained} TOKENS`); ctx.hub('quest_done', r.gained); }
  }
  // ---------- bosses ----------
  const boss = {};
  for (const [k, def] of Object.entries(BOSSES)) {
    const dow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })).getDay();
    const b = boss[k] = { ...def, kind: k, name: def.name || DAILY_NAMES[dow], tint: def.tint || DAILY_TINTS[dow], s: null, hp: 1, level: 1, pending: 0, cast: 0, localMine: 0, flash: 0, koUntil: 0, prev: 0, tex: {}, barPct: -1, pendingKo: false };
    if (room) {
      for (const st of ['idle', 'wind', 'hit', 'ko']) b.tex[st] = room.tex(256, 256, (c, W, H) => drawBoss(c, W, H, k, st, b.name, b.level, b.tint));
      b.bar = room.tex(256, 32, (c, W, H) => drawBar(c, W, H, b.barPct < 0 ? 1 : b.barPct, b.tint));
    }
    if (moves) moves.addTarget({
      get x() { return b.x; }, get z() { return b.z; }, r: b.r, y: b.y * 0.6,
      alive: () => !!b.s && b.hp > 0 && now() > b.koUntil,
      hit(dmg) {
        dmg = Math.round(dmg); b.pending += dmg; b.cast += dmg; b.hp = Math.max(0, b.hp - dmg); b.localMine += dmg; b.flash = now() + 0.16;
        event('bossdmg', dmg); if (b.hp <= 0) { b.pendingKo = true; flush(b); }
      },
    });
  }
  async function flush(b) {
    if (b.sending || b.pending < 1) return;
    const dmg = b.pending; b.pending = 0; b.sending = true;
    const r = await call('hit', { boss: b.kind, dmg }); b.sending = false;
    if (r && r.ko) ctx.sendBoss({ b: b.kind, ko: 1 });
    if (!r || r.error) b.pending += dmg;            // keep it for the next try
  }
  setInterval(() => {
    for (const b of Object.values(boss)) { flush(b); if (b.cast > 0) { ctx.sendBoss({ b: b.kind, d: b.cast }); b.cast = 0; } }
    const idle = document.hidden || ctx.inGame();
    if (ctx.signedUp() && !fetching && now() - lastFetch > (idle ? 120 : state ? 20 : 3)) refresh();
  }, 2000);
  function onBoss(d) { // another player hit a boss
    const b = d && boss[d.b]; if (!b || !b.s) return;
    if (d.ko) { refresh(); return; }
    const dmg = Math.max(0, Math.min(2000, +d.d || 0)); if (!dmg) return;
    b.hp = Math.max(1, b.hp - dmg); b.flash = now() + 0.16;
  }
  function near(b, range) { return Math.hypot(P.x - b.x, P.z - b.z) < range; }
  function update(dt, sprites) {
    const t = now(), clock = Date.now() / 1000; let show = null;
    for (const b of Object.values(boss)) {
      if (!b.s || !room) continue;
      const ko = t < b.koUntil || b.hp <= 0, phase = clock % b.cycle, wind = !ko && phase > b.cycle - 1.3;
      if (!ko && phase < b.prev && t - startAt > 2) {                     // the slam lands as the cycle wraps
        moves && moves.ring(b.x, b.z, b.ring);
        if (near(b, b.range) && !ctx.blocked()) {
          if (moves && moves.airborne()) { event('dodge', 1); ctx.toast('DODGED!'); }
          else if (moves) moves.stagger(b.name, true, 0.9);      // caught by the slam: shaken and unable to move for a moment
        }
      }
      b.prev = phase;
      const st = ko ? 'ko' : t < b.flash ? 'hit' : wind ? 'wind' : 'idle', bob = ko ? 0 : Math.sin(t * 1.7 + b.x) * 10 + (wind ? 26 : 0), jit = t < b.flash ? Math.sin(t * 60) * 10 : 0;
      sprites.push({ tex: b.tex[st], x: b.x + jit, z: b.z, y: bob, w: b.w, h: b.h });
      const pct = Math.round(b.hp / Math.max(1, b.s.max) * 50) / 50;
      if (pct !== b.barPct) { b.barPct = pct; b.bar.redraw(); }
      if (!ko) sprites.push({ tex: b.bar, x: b.x, z: b.z, y: b.h + bob + 14, w: b.w * 0.8, h: b.w * 0.1 });
      if (near(b, 720) && (!show || near(b, Math.hypot(P.x - show.x, P.z - show.z)))) show = b;
    }
    paintBossBar(show);
  }
  // the boss you are standing near, shown at the top of the screen
  let barEl = null, barKey = '';
  function paintBossBar(b) {
    if (!barEl) { barEl = document.createElement('div'); barEl.id = 'bossbar'; barEl.hidden = true; document.body.appendChild(barEl); }
    const hide = !b || ctx.blocked(); if (hide) { if (!barEl.hidden) { barEl.hidden = true; barKey = ''; } return; }
    const ko = now() < b.koUntil || b.hp <= 0, key = [b.kind, Math.round(b.hp), b.level, Math.round(b.localMine), ko, b.s.fighters].join('|');
    if (key === barKey) return; barKey = key; barEl.hidden = false; barEl.style.setProperty('--c', b.tint);
    const need = b.s.need, mine = Math.round(b.localMine);
    barEl.innerHTML = `<b>${esc(b.name)} <small>${b.label} · LV ${b.level}</small></b><div class="hp"><i style="width:${Math.max(0, Math.min(100, b.hp / Math.max(1, b.s.max) * 100)).toFixed(1)}%"></i><span>${ko ? 'K.O.' : Math.round(b.hp) + ' / ' + b.s.max}</span></div>
      <small>YOU ${mine} DMG${b.s.claimed ? ' · REWARD CLAIMED' : mine >= need ? ' · REWARD READY WHEN IT FALLS' : ` · ${need - mine} MORE FOR THE ${b.s.reward}-TOKEN REWARD`} · JUMP WHEN IT WINDS UP</small>`;
  }
  // ---------- the quest tracker on screen + the panel ----------
  let track = null, trackKey = '', panelKind = '';
  function paintTrack() {
    if (!track) { track = document.createElement('button'); track.id = 'qtrack'; track.onclick = openQuests; document.body.appendChild(track); }
    const ids = todays(); track.hidden = !ids.length;
    const n = ids.filter(done).length, html = `<b>DAILY QUESTS ${n}/${ids.length}</b>` + ids.map(id => `<span class="${done(id) ? 'ok' : ''}">${done(id) ? '✔' : QUESTS[id].icon} ${esc(QUESTS[id].text)} <i>${count(id)}/${QUESTS[id].n}</i></span>`).join('');
    if (html !== trackKey) { trackKey = html; track.innerHTML = html; }
  }
  const left = () => { const s = state ? Math.max(0, state.secs_left - (now() - lastFetch)) : 0; return `${Math.floor(s / 3600)}H ${Math.floor(s % 3600 / 60)}M`; };
  function questsHtml() {
    if (!ctx.signedUp()) return '<p class="dim">Enter a player name to get daily quests and fight the bosses.</p>';
    if (!state) return '<p class="dim">Loading today\'s quests…</p>';
    const ids = todays(), q = state.quests;
    const row = id => { const d = QUESTS[id], c = count(id), ok = done(id); return `<li><span>${d.icon} ${esc(d.text)}<small class="qbar"><i style="width:${(c / d.n * 100).toFixed(0)}%"></i></small></span><b class="${ok ? 'ok' : ''}">${ok ? '✔ DONE' : `${c}/${d.n} · 🪙 ${q.reward}`}</b></li>`; };
    const bossRow = k => { const b = boss[k], s = b.s; if (!s) return ''; const mine = Math.round(b.localMine);
      return `<li><span><b style="color:${b.tint}">${esc(b.name)}</b> · ${b.label} · LV ${b.level}<small class="qbar"><i style="width:${(b.hp / Math.max(1, s.max) * 100).toFixed(0)}%;background:${b.tint}"></i></small>
        <small style="display:block;color:var(--dim);font-size:8px;margin-top:4px">${Math.round(b.hp)} / ${s.max} HP · BEATEN ${s.kills} TIME${s.kills === 1 ? '' : 'S'} ${k === 'daily' ? 'TODAY' : 'THIS WEEK'} · YOU ${mine} DMG · ${s.claimed ? 'REWARD CLAIMED' : `DEAL ${s.need}+ AND BEAT IT FOR 🪙 ${s.reward}`}</small>
        ${(s.top || []).length ? `<small style="display:block;font-size:8px;margin-top:4px">TOP: ${s.top.map(x => esc(x.name) + ' ' + x.dmg).join(' · ')}</small>` : ''}</span><button class="btn go" data-boss="${k}">GO FIGHT</button></li>`; };
    return `<p>Three new quests every day. Each pays 🪙 ${q.reward}, and finishing all three pays 🪙 ${q.bonus_reward} more. New quests in <b style="color:var(--gold)">${left()}</b>.</p>
      <ul class="list quests">${ids.map(row).join('')}</ul>${q.bonus ? '<p style="color:var(--gold)">★ ALL THREE DONE TODAY</p>' : ''}
      <h3>LOBBY BOSSES</h3><p>Everyone in the arcade wears down the same boss. Each time it falls it comes back a level stronger. Jump when it winds up to dodge its slam.</p>
      <ul class="list quests">${bossRow('daily')}${bossRow('weekly')}</ul>`;
  }
  let questsShown = ''; function paintQuests() { const el = $('#qbody'), html = questsHtml(); if (el && html !== questsShown) { questsShown = html; el.innerHTML = html; } }
  function goBoss(k) { const b = boss[k]; ctx.closePanel(); P.x = b.x; P.z = b.z + b.r + 220; P.yaw = 0; P.pitch = 0; ctx.collide(); ctx.toast(`${b.name}: PUNCH, KICK AND BLAST IT. JUMP WHEN IT WINDS UP`); }
  function openQuests() {
    ctx.show(`<h2>QUESTS + BOSSES</h2><div id="qbody">${questsHtml()}</div>`, '#ffc93a'); panelKind = 'quests'; refresh();
    ctx.pbody.onclick = e => { const b = e.target.closest('[data-boss]'); if (b) goBoss(b.dataset.boss); };
    ctx.onClose(() => { panelKind = ''; ctx.pbody.onclick = null; });
  }

  // ---------- who is here: radar + list ----------
  const area = p => p.g ? 'PLAYING ' + String(ctx.gameTitle(p.g) || 'A GAME').toUpperCase() : p.away ? 'AWAY' : p.x > 1090 ? 'EAST WING' : p.z > 790 ? 'THE LOUNGE' : p.z < -780 ? 'BACK HALLWAY' : 'MAIN FLOOR';
  const radar = document.createElement('canvas'); radar.id = 'radar'; radar.width = radar.height = 192; radar.title = 'Who is here'; document.body.appendChild(radar);
  const rc = radar.getContext('2d');
  function paintRadar() {
    const off = ctx.blocked(); if (radar.hidden !== off) radar.hidden = off; if (off) return;
    const W = 192, c = W / 2, R = 1500, s = Math.sin(P.yaw), co = Math.cos(P.yaw);
    rc.clearRect(0, 0, W, W); rc.fillStyle = 'rgba(11,6,18,.8)'; rc.beginPath(); rc.arc(c, c, c - 4, 0, 7); rc.fill(); rc.lineWidth = 4; rc.strokeStyle = '#ffc93a'; rc.stroke();
    rc.strokeStyle = 'rgba(255,255,255,.14)'; rc.lineWidth = 2; rc.beginPath(); rc.arc(c, c, (c - 4) / 2, 0, 7); rc.stroke();
    const dot = (wx, wz, col, r) => { const dx = wx - P.x, dz = wz - P.z; let sx = dx * co + dz * s, sy = -(dx * s - dz * co), d = Math.hypot(sx, sy), k = (c - 14) / R; if (d * k > c - 14) { sx *= (c - 14) / (d * k); sy *= (c - 14) / (d * k); } rc.fillStyle = '#000'; rc.beginPath(); rc.arc(c + sx * k, c + sy * k, r + 3, 0, 7); rc.fill(); rc.fillStyle = col; rc.beginPath(); rc.arc(c + sx * k, c + sy * k, r, 0, 7); rc.fill(); };
    if (moves) dot(moves.bot.x, moves.bot.z, '#31d7ff', 5);
    for (const b of Object.values(boss)) if (b.s) dot(b.x, b.z, now() < b.koUntil ? '#666' : b.tint, b.kind === 'weekly' ? 12 : 9);
    for (const p of peers.values()) dot(p.x, p.z, p.g || p.away ? '#9a8fb0' : '#fff', 7);
    rc.fillStyle = '#ffc93a'; rc.beginPath(); rc.moveTo(c, c - 13); rc.lineTo(c + 9, c + 9); rc.lineTo(c, c + 4); rc.lineTo(c - 9, c + 9); rc.fill();
    rc.font = "bold 22px Impact,'Arial Black',sans-serif"; rc.textAlign = 'center'; rc.lineWidth = 5; rc.strokeStyle = '#000'; const n = '👥 ' + (peers.size + 1); rc.strokeText(n, c, W - 14); rc.fillStyle = '#fff'; rc.fillText(n, c, W - 14);
  }
  setInterval(paintRadar, 160);
  function peopleHtml() {
    const rows = [...peers.entries()].map(([id, p]) => `<li><span>${esc(p.name || 'Player')}<small style="display:block;color:var(--dim);font-size:8px">${area(p)}</small></span><button class="btn go" data-peer="${esc(id)}">GO TO</button></li>`).join('');
    return `<p><b style="color:var(--gold)">${peers.size + 1}</b> in the arcade right now, counting you. The dots on the radar are other players (white), bosses (colour) and SPAR-BOT (blue).</p>
      <ul class="list"><li><span>${esc(ctx.myName())}<small style="display:block;color:var(--dim);font-size:8px">YOU · ${area(P)}</small></span></li>${rows}</ul>${peers.size ? '' : '<p class="dim">Nobody else is in right now. Share the link and they will show up here the moment they walk in.</p>'}`;
  }
  function openPeople() {
    ctx.show(`<h2>WHO'S HERE</h2><div id="ppl">${peopleHtml()}</div>`, '#31d7ff'); panelKind = 'people';
    let shown = peopleHtml(); const timer = setInterval(() => { const el = $('#ppl'), html = peopleHtml(); if (el && html !== shown) { shown = html; el.innerHTML = html; } }, 2000);
    ctx.pbody.onclick = e => { const b = e.target.closest('[data-peer]'), p = b && peers.get(b.dataset.peer); if (!p) return; ctx.closePanel(); P.x = p.x; P.z = p.z + 190; P.yaw = 0; P.pitch = 0; ctx.collide(); P.yaw = Math.atan2(p.x - P.x, -(p.z - P.z)); ctx.toast('YOU WALK UP TO ' + String(p.name || 'PLAYER').toUpperCase()); };
    ctx.onClose(() => { clearInterval(timer); panelKind = ''; ctx.pbody.onclick = null; });
  }
  radar.addEventListener('click', openPeople);
  function joined(name) { if (now() - startAt > 8 && !ctx.blocked()) ctx.toast(String(name || 'A PLAYER').toUpperCase() + ' WALKED IN'); }

  paintTrack();
  return { event, update, onBoss, openQuests, openPeople, joined, refresh, boss, get state() { return state; }, area };
}
