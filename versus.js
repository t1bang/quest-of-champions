// Bar games against another player: darts, pool, air hockey and bowling, turn by turn.
// One player challenges another who is in the arcade; if they accept, both see the same match. Each player's own
// browser decides its own shots and tells the other one, so this is for bragging rights only (no tokens ride on it).
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TURN_SECS = 20;

export function createVersus(ctx) {
  // ctx: { sid, peers, MINI, send(payload), toast, hub, show, pbody, onClose, closePanel, myName(), voice, panelBusy(), event(type) }
  const { sid, peers, MINI } = ctx;
  let invite = null, match = null, bar = null;

  // ----- inviting -----
  function pick(kind) {
    const g = MINI[kind], list = [...peers.entries()].filter(([, p]) => !p.g && !p.away);
    ctx.show(`<h2>${g.icon} ${g.title}: CHALLENGE A PLAYER</h2><p>Pick someone who is in the arcade right now. You take turns; ${g.three ? 'three darts a turn, three turns each, highest total wins' : `highest score after ${g.rounds} tries each wins`}.</p>
      <ul class="list">${list.map(([id, p]) => `<li><span>${esc(p.name || 'Player')}${p.v ? ' 🎙' : ''}</span><button class="btn go" data-ch="${esc(id)}">CHALLENGE</button></li>`).join('') || '<li><span class="dim">Nobody else is in the arcade right now.</span></li>'}</ul>
      <p><button class="btn" data-solo="${kind}">PLAY SOLO INSTEAD</button></p>`, '#ffc93a');
    ctx.pbody.onclick = e => {
      const s = e.target.closest('[data-solo]'); if (s) return ctx.solo(kind);
      const b = e.target.closest('[data-ch]'), p = b && peers.get(b.dataset.ch); if (!p) return;
      const mid = Math.random().toString(36).slice(2, 10); invite = { mid, kind, to: b.dataset.ch, name: p.name, at: Date.now() };
      ctx.send({ t: 'invite', mid, kind, to: invite.to, from: sid, n: ctx.myName() }); ctx.hub('versus_invite:' + kind);
      ctx.show(`<h2>${g.icon} ${g.title}</h2><p>Waiting for <b style="color:var(--gold)">${esc(p.name)}</b> to answer…</p><p><button class="btn" id="vsx">CANCEL</button></p>`, '#ffc93a');
      ctx.pbody.onclick = ev => { if (ev.target.closest('#vsx')) { ctx.send({ t: 'cancel', mid, to: invite.to, from: sid }); invite = null; ctx.closePanel(); } };
      setTimeout(() => { if (invite && invite.mid === mid) { invite = null; ctx.toast(String(p.name || 'THEY').toUpperCase() + ' DID NOT ANSWER'); ctx.closePanel(); } }, 25000);
    };
    ctx.onClose(() => { ctx.pbody.onclick = null; });
  }
  function ask(m) { // someone challenged me: a small banner with accept / no thanks
    if (match || bar) return ctx.send({ t: 'no', mid: m.mid, to: m.from, from: sid, why: 'busy' });
    const g = MINI[m.kind]; if (!g) return;
    bar = document.createElement('div'); bar.id = 'vsask'; bar.innerHTML = `<b>${esc(String(m.n || 'A player').slice(0, 16))}</b> challenges you to ${g.icon} ${g.title}<br><button class="btn go" data-a="yes">ACCEPT</button> <button class="btn" data-a="no">NO THANKS</button>`;
    document.body.appendChild(bar);
    const done = yes => { if (!bar) return; bar.remove(); bar = null; clearTimeout(t);
      if (yes) { ctx.send({ t: 'yes', mid: m.mid, to: m.from, from: sid, n: ctx.myName() }); start({ mid: m.mid, kind: m.kind, opp: m.from, oppName: String(m.n || 'Player').slice(0, 16), first: m.from }); }
      else ctx.send({ t: 'no', mid: m.mid, to: m.from, from: sid }); };
    bar.onclick = e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === 'yes'); };
    const t = setTimeout(() => done(false), 22000);
  }

  // ----- the match -----
  function start({ mid, kind, opp, oppName, first }) {
    const g = MINI[kind];
    if (g.three && ctx.darts) return startDarts({ mid, opp, oppName, first });
    match = { mid, kind, g, opp, oppName, turn: first, me: { shots: 0, total: 0, left: g.pool || 0 }, them: { shots: 0, total: 0, left: g.pool || 0 }, t0: performance.now(), frozen: null, last: '', over: false, deadline: Date.now() + TURN_SECS * 1000, lastHeard: Date.now() };
    ctx.hub('versus_start:' + kind); ctx.event('mini');
    ctx.show(`<h2>${g.icon} ${g.title}: YOU vs ${esc(oppName.toUpperCase())}</h2><div class="stage" style="--c:#ffc93a;aspect-ratio:16/7"><canvas width="640" height="280" id="vscv"></canvas></div>
      <p id="vstxt" style="color:var(--gold)">&nbsp;</p><button class="btn go" id="vsgo">${g.verb}</button> <button class="btn" id="vsvoice">${ctx.voice && ctx.voice.on ? '🎙 VOICE IS ON' : '🎙 TALK: JOIN VOICE'}</button> <button class="btn" id="vsagain" hidden>REMATCH</button>`, '#ffc93a');
    const cv = document.getElementById('vscv'), c = cv.getContext('2d'); let raf;
    const mine = () => match && match.turn === sid, done = s => s.shots >= g.rounds || (g.pool && s.left <= 0);
    const pos = now => { const who = mine() ? match.me : match.them, sp = 0.9 + who.shots * 0.35, u = ((now - match.t0) / 1000 * sp) % 2; return u < 1 ? u : 2 - u; };
    const draw = now => {
      if (!match || match.mid !== mid) return;
      const p = match.frozen == null ? pos(now) : match.frozen, my = mine(); c.fillStyle = '#120405'; c.fillRect(0, 0, 640, 280);
      c.fillStyle = '#401013'; c.fillRect(40, 110, 560, 40); c.fillStyle = '#35e06f'; c.fillRect(40 + 560 * 0.36, 110, 560 * 0.28, 40); c.fillStyle = '#ffc93a'; c.fillRect(40 + 560 * 0.465, 110, 560 * 0.07, 40);
      c.globalAlpha = my || match.frozen != null ? 1 : 0.45; c.fillStyle = my ? '#fff' : '#31d7ff'; c.fillRect(40 + 560 * p - 4, 94, 8, 72); c.font = '44px sans-serif'; c.textAlign = 'center'; c.fillText(g.icon, 40 + 560 * p, 82); c.globalAlpha = 1;
      c.font = '13px "Press Start 2P",monospace'; c.textAlign = 'left'; c.fillStyle = my ? '#ffc93a' : '#fff'; c.fillText(`YOU  ${match.me.total}`, 40, 30); c.textAlign = 'right'; c.fillStyle = my ? '#fff' : '#31d7ff'; c.fillText(`${match.them.total}  ${oppName.toUpperCase()}`, 600, 30);
      c.font = '9px "Press Start 2P",monospace'; c.fillStyle = '#9c8fb5'; c.textAlign = 'left'; c.fillText(`TRY ${Math.min(match.me.shots + 1, g.rounds)}/${g.rounds}`, 40, 48); c.textAlign = 'right'; c.fillText(`TRY ${Math.min(match.them.shots + 1, g.rounds)}/${g.rounds}`, 600, 48);
      c.textAlign = 'center'; c.font = '14px "Press Start 2P",monospace'; c.fillStyle = match.over ? '#ffc93a' : my ? '#3dff9a' : '#31d7ff';
      const secs = Math.max(0, Math.ceil((match.deadline - Date.now()) / 1000));
      c.fillText(match.over ? match.last : my ? `YOUR TURN · ${secs}s` : `${oppName.toUpperCase()} IS AIMING…`, 320, 210); if (!match.over && match.last) { c.fillStyle = '#fff'; c.font = '11px "Press Start 2P",monospace'; c.fillText(match.last, 320, 240); }
      const go = document.getElementById('vsgo'); if (go) go.disabled = !my || match.frozen != null || match.over;
      if (!match.over) {
        if (my && match.frozen == null && Date.now() > match.deadline) shoot(true);                              // ran out of time: a miss
        if (!my && Date.now() - match.lastHeard > 40000) finish('forfeit');                                     // the other player went quiet
        if (!peers.has(opp) && Date.now() - match.lastHeard > 9000) finish('forfeit');
      }
      raf = requestAnimationFrame(draw);
    };
    const next = () => { if (!match || match.mid !== mid) return; match.frozen = null; match.t0 = performance.now();
      if (done(match.me) && done(match.them)) return finish();
      const other = match.turn === sid ? opp : sid, otherS = other === sid ? match.me : match.them; if (!done(otherS)) match.turn = other;
      match.deadline = Date.now() + TURN_SECS * 1000; match.lastHeard = Date.now(); };
    const land = (s, f, pts, who) => { s.total += pts; if (g.pool) s.left -= pts; s.shots++; match.frozen = f; match.last = `${who}: ${pts ? '+' + pts + ' ' + g.unit : 'MISSED'}`; setTimeout(next, 900); };
    function shoot(timeout) {
      if (!match || !mine() || match.frozen != null || match.over) return;
      const f = timeout ? 0 : pos(performance.now()), a = 1 - Math.abs(f - 0.5) * 2, pts = timeout ? 0 : g.score(a, match.me.left);
      ctx.send({ t: 'shot', mid, to: opp, from: sid, n: match.me.shots, f: +f.toFixed(4), pts }); land(match.me, f, pts, 'YOU');
    }
    function finish(how) {
      if (!match || match.over) return; match.over = true;
      const a = match.me.total, b = match.them.total, won = how === 'forfeit' || a > b;
      match.last = how === 'forfeit' ? `${oppName.toUpperCase()} LEFT. YOU WIN!` : a === b ? `DRAW ${a}-${b}` : won ? `YOU WIN ${a}-${b}!` : `${oppName.toUpperCase()} WINS ${b}-${a}`;
      ctx.toast(match.last); ctx.hub(won && a !== b ? 'versus_win:' + kind : 'versus_done:' + kind, a);
      const again = document.getElementById('vsagain'), go = document.getElementById('vsgo'); if (go) go.hidden = true; if (again && how !== 'forfeit') again.hidden = false;
    }
    match.onShot = m => { if (m.n !== match.them.shots || match.turn !== opp) return; match.lastHeard = Date.now(); const pts = Math.max(0, Math.min(50, m.pts | 0)), cap = g.pool ? Math.min(pts, match.them.left) : pts; land(match.them, Math.max(0, Math.min(1, +m.f || 0)), cap, oppName.toUpperCase()); };
    match.onQuit = () => finish('forfeit');
    raf = requestAnimationFrame(draw);
    ctx.pbody.onclick = e => {
      if (e.target.closest('#vsgo') || e.target.closest('#vscv')) return shoot(false);
      if (e.target.closest('#vsvoice')) { if (ctx.voice) { if (ctx.voice.on) ctx.toast('VOICE IS ALREADY ON'); else ctx.voice.join().then(() => { const b = document.getElementById('vsvoice'); if (b && ctx.voice.on) b.textContent = '🎙 VOICE IS ON'; }); } return; }
      if (e.target.closest('#vsagain')) { const m2 = Math.random().toString(36).slice(2, 10); invite = { mid: m2, kind, to: opp, name: oppName, at: Date.now() }; ctx.send({ t: 'invite', mid: m2, kind, to: opp, from: sid, n: ctx.myName() }); ctx.toast('REMATCH SENT'); }
    };
    ctx.onClose(() => { cancelAnimationFrame(raf); ctx.pbody.onclick = null; if (match && match.mid === mid) { if (!match.over) ctx.send({ t: 'quit', mid, to: opp, from: sid }); match = null; } });
  }

  // ----- darts: the real 3D board (darts3d.js). Three darts a turn, three turns each. Both players watch every dart land. -----
  async function startDarts({ mid, opp, oppName, first }) {
    const kind = 'darts', PER = 3, ALL = 9, OPP = oppName.toUpperCase();
    match = { mid, kind, g: MINI.darts, opp, oppName, turn: first, me: { shots: 0, total: 0 }, them: { shots: 0, total: 0 }, over: false, busy: false, deadline: Date.now() + TURN_SECS * 1000, lastHeard: Date.now(), last: '' };
    const M = match; ctx.hub('versus_start:' + kind); ctx.event('mini');
    ctx.show(`<h2>🎯 DARTS: YOU vs ${esc(OPP)}</h2><div class="dstage" id="dstage"><div class="dload">SETTING UP THE BOARD…</div></div>
      <p id="vstxt" style="color:var(--gold)">&nbsp;</p><button class="btn" id="vsvoice">${ctx.voice && ctx.voice.on ? '🎙 VOICE IS ON' : '🎙 TALK: JOIN VOICE'}</button> <button class="btn" id="vsagain" hidden>REMATCH</button>`, '#ffc93a');
    let view = null, closed = false, timer = 0; const early = [], live = () => match === M && !closed;
    M.onShot = m => early.push(m); M.onQuit = () => finish('forfeit');
    ctx.onClose(() => { closed = true; clearInterval(timer); if (ctx.pauseLobby) ctx.pauseLobby(false); if (view) view.destroy(); ctx.pbody.onclick = null; if (match === M) { if (!M.over) ctx.send({ t: 'quit', mid, to: opp, from: sid }); match = null; } });
    ctx.pbody.onclick = e => {
      if (e.target.closest('#vsvoice')) { if (ctx.voice) { if (ctx.voice.on) ctx.toast('VOICE IS ALREADY ON'); else ctx.voice.join().then(() => { const b = document.getElementById('vsvoice'); if (b && ctx.voice.on) b.textContent = '🎙 VOICE IS ON'; }); } return; }
      if (e.target.closest('#vsagain')) { const m2 = Math.random().toString(36).slice(2, 10); invite = { mid: m2, kind, to: opp, name: oppName, at: Date.now() }; ctx.send({ t: 'invite', mid: m2, kind, to: opp, from: sid, n: ctx.myName() }); ctx.toast('REMATCH SENT'); }
    };
    const mine = () => M.turn === sid, say = t => { const el = document.getElementById('vstxt'); if (el && el.textContent !== t) el.textContent = t; };
    const dots = s => { const left = s.shots >= ALL ? 0 : PER - s.shots % PER; return '<i></i>'.repeat(left) + '<i class="u"></i>'.repeat(PER - left); };
    const hud = () => view && view.hud(`<span class="me">YOU <b>${M.me.total}</b></span><span class="dd">${dots(mine() ? M.me : M.them)}</span><span class="op"><b>${M.them.total}</b> ${esc(OPP)}</span>`);
    function finish(how) {
      if (M.over) return; M.over = true;
      const a = M.me.total, b = M.them.total, won = how === 'forfeit' || a > b;
      M.last = how === 'forfeit' ? `${OPP} LEFT. YOU WIN!` : a === b ? `DRAW ${a}-${b}` : won ? `YOU WIN ${a}-${b}!` : `${OPP} WINS ${b}-${a}`;
      ctx.toast(M.last); ctx.hub(won && a !== b ? 'versus_win:' + kind : 'versus_done:' + kind, a); say(M.last);
      if (view) { view.hint(''); view.pop(M.last, '', won ? '#3dff9a' : '#ffc93a'); }
      const again = document.getElementById('vsagain'); if (again && how !== 'forfeit') again.hidden = false;
    }
    // a dart has landed (mine or theirs), or a turn timed out with nothing thrown
    function count(s, pts) {
      s.shots++; s.total += pts; M.busy = false; M.lastHeard = Date.now(); M.deadline = Date.now() + TURN_SECS * 1000; hud();
      if (M.me.shots >= ALL && M.them.shots >= ALL) return finish();
      if (s.shots % PER !== 0) return;                                                             // same player throws again
      const other = s === M.me ? M.them : M.me; if (other.shots < ALL) M.turn = s === M.me ? opp : sid;
      M.busy = true; setTimeout(() => { if (!live()) return; M.busy = false; M.deadline = Date.now() + TURN_SECS * 1000; if (view) view.clear(); hud(); }, 1400);   // a beat to look at the board, then pull the darts
    }
    const theirs = m => {
      if (M.over || m.n !== M.them.shots || M.turn !== opp) return;
      const x = +m.x, y = +m.y; M.lastHeard = Date.now();
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 4 || Math.abs(y) > 4) return count(M.them, m.x == null ? Math.max(0, Math.min(60, m.pts | 0)) : 0);   // ran out of time (or an older version of the game)
      M.busy = true; view.throwAt(x, y);
    };
    try {
      if (ctx.pauseLobby) ctx.pauseLobby(true);
      const mod = await ctx.darts(); if (!live()) return;
      view = await mod.createDarts(document.getElementById('dstage'), { muted: ctx.muted, canThrow: () => live() && !M.over && mine() && !M.busy,
        onThrow: (x, y) => { M.busy = true; ctx.send({ t: 'shot', mid, to: opp, from: sid, n: M.me.shots, x, y, pts: mod.scoreAt ? mod.scoreAt(x, y).score : 0, f: 0.5 }); },
        onLand: (hit, info) => { if (!live()) return; view.pop(hit.label, (info.remote ? OPP + ' ' : '') + (hit.score ? '+' + hit.score : 'NO SCORE'), info.remote ? '#31d7ff' : hit.score ? '#ffc93a' : '#ff5a6a'); count(info.remote ? M.them : M.me, hit.score); } });
      if (!live()) { view.destroy(); return; }
    } catch { if (live()) { ctx.toast('3D DARTS COULD NOT START ON THIS DEVICE'); ctx.closePanel(); } return; }
    window.__dartsVs = { view, match: M };
    M.onShot = theirs; for (const m of early.splice(0)) theirs(m); hud();
    timer = setInterval(() => {
      if (!live() || M.over) return;
      const secs = Math.max(0, Math.ceil((M.deadline - Date.now()) / 1000));
      say(mine() ? `YOUR THROW · ${secs}s` : `${OPP} IS AIMING…`); view.hint(mine() && !M.busy ? 'HOLD TO AIM · LET GO TO THROW' : '');
      if (mine() && !M.busy && Date.now() > M.deadline) { ctx.send({ t: 'shot', mid, to: opp, from: sid, n: M.me.shots, x: 9, y: 9, pts: 0, f: 0 }); view.pop('TOO SLOW', 'NO SCORE', '#ff5a6a'); count(M.me, 0); }
      if (!mine() && Date.now() - M.lastHeard > 40000) finish('forfeit');
      if (!peers.has(opp) && Date.now() - M.lastHeard > 9000) finish('forfeit');
    }, 300);
  }

  // ----- messages from the other player -----
  function onMsg(m) {
    if (!m || m.to !== sid || typeof m.from !== 'string') return;
    if (m.t === 'invite') return ask(m);
    if (m.t === 'cancel') { if (bar) { bar.remove(); bar = null; } return; }
    if (m.t === 'yes' && invite && invite.mid === m.mid && m.from === invite.to) { const inv = invite; invite = null; return start({ mid: inv.mid, kind: inv.kind, opp: inv.to, oppName: String(m.n || inv.name || 'Player').slice(0, 16), first: sid }); }
    if (m.t === 'no' && invite && invite.mid === m.mid) { ctx.toast(String(invite.name || 'THEY').toUpperCase() + (m.why === 'busy' ? ' IS IN ANOTHER MATCH' : ' SAID NO THANKS')); invite = null; ctx.closePanel(); return; }
    if (match && m.mid === match.mid && m.from === match.opp) { if (m.t === 'shot') match.onShot(m); else if (m.t === 'quit') match.onQuit(); }
  }
  return { pick, onMsg, get busy() { return !!match; } };
}
