// Arcade Hub add-on: TIME PLAYED in hours and minutes, and time on each player profile.
// The hub page (cruizin.chucksi.com/hub/) loads this file. It reads public.hub_playtime with the hub password the
// page already keeps in this browser, and draws one panel at the top of the Overview tab. Nothing shows while the
// hub is locked. The people here are anonymous browser IDs (last four characters), the same ones the hub counts.
(() => {
  const API = 'https://tdjvnhuygpobdcmhlcms.supabase.co/rest/v1/rpc/hub_playtime', PUB = 'sb_publishable_hQBcSsJqxa9vLTCAwx2W-w_ZlZDVMxy';
  const NAME = { arcade: 'Arcade Lobby', cruizin: 'Cruizin IA', quest: 'Quest of Champions', vendetta: 'T1 Vs.', guerilla: 'Gorilla City 2032', gamerboy: 'Gamer Boyz', blankman: 'Blankman', tiny: 'Tiny Prompters' };
  const COLOR = { arcade: '--gold', cruizin: '--orange', quest: '--red', vendetta: '--pink', guerilla: '--green', gamerboy: '--cyan', blankman: '--gold', tiny: '--violet' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = secs => { const s = Math.round(secs || 0), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m` : `${s}s`; };
  const ago = at => { const m = Math.max(0, Math.round((Date.now() - new Date(at)) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const days = () => +(document.querySelector('#range .btn.on')?.dataset.d || 30);
  let busy = false, last = '';

  function host() {
    let el = document.getElementById('bbt'); if (el) return el;
    const grid = document.querySelector('#v-overview .grid2'); if (!grid) return null;
    el = document.createElement('div'); el.id = 'bbt'; el.className = 'p'; el.style.setProperty('--c', 'var(--gold)'); grid.prepend(el);
    return el;
  }
  const tile = (label, value, sub, c) => `<div class="tile" style="--c:var(${c})"><span>${label}</span><b style="font-size:28px">${value}</b><em>${sub}</em></div>`;
  const rows = (list, max) => list.length ? list.map(([l, v, text, c]) => `<div class="row" style="--c:var(${c || '--gold'})"><span class="lab" title="${esc(l)}">${esc(l)}</span><span class="track"><i style="width:${Math.round(100 * v / Math.max(1, max))}%"></i></span><span class="v">${text}</span></div>`).join('') : '<div class="empty">Nothing yet.</div>';

  function render(d) {
    const el = host(); if (!el) return;
    const label = d.days === 1 ? 'last 24 hours' : 'last ' + d.days + ' days', b = d.buckets || {}, games = d.games || [], top = d.top || [], named = d.named || [];
    const stay = [['Under 1 minute', b.under1], ['1 to 5 minutes', b.m1_5], ['5 to 15 minutes', b.m5_15], ['15 to 60 minutes', b.m15_60], ['Over an hour', b.h1]].map(([l, v]) => [l, v || 0, (v || 0) + (v === 1 ? ' person' : ' people'), '--cyan']);
    el.innerHTML = `<h2>TIME PLAYED <small>hours and minutes · ${label} · all devices and games</small></h2>
      <div class="tiles">
        ${tile('TOTAL TIME', hm(d.total_secs), `${d.people} people · ${d.sessions} sessions`, '--gold')}
        ${tile('PER PERSON', hm(d.avg_person_secs), 'average over the period', '--green')}
        ${tile('TYPICAL PERSON', hm(d.median_person_secs), 'half play longer, half shorter', '--cyan')}
        ${tile('PER SESSION', hm(d.avg_session_secs), 'average sitting', '--orange')}
        ${tile('LONGEST SITTING', hm(d.longest_session_secs), 'one session', '--pink')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">
        <div><h2 style="--c:var(--orange)">BY GAME <small>total · each person</small></h2><div class="rows">${rows(games.map(g => [NAME[g.game] || g.game, g.secs, `${hm(g.secs)} <small style="color:var(--dim)">${hm(g.avg_secs)} × ${g.people}</small>`, COLOR[g.game]]), Math.max(...games.map(g => g.secs), 1))}</div></div>
        <div><h2 style="--c:var(--cyan)">HOW LONG PEOPLE STAY</h2><div class="rows">${rows(stay, Math.max(...stay.map(x => x[1]), 1))}</div></div>
        <div><h2 style="--c:var(--pink)">MOST TIME <small>anonymous visitors</small></h2><div class="rows">${rows(top.slice(0, 8).map(t => ['…' + t.who + ' · ' + (t.device || '?') + ' · ' + (NAME[t.top_game] || t.top_game || ''), t.secs, `${hm(t.secs)} <small style="color:var(--dim)">${t.days}d · ${ago(t.last_at)}</small>`, '--pink']), top[0]?.secs || 1)}</div></div>
      </div>
      ${named.length ? `<h2 style="--c:var(--green);margin-top:16px">ACCOUNT PLAYERS <small>only those who switched activity sharing on</small></h2><div class="rows">${rows(named.map(p => [p.name, p.secs, `${hm(p.secs)} <small style="color:var(--dim)">${p.runs} runs</small>`, '--green']), named[0].secs)}</div>` : ''}`;
  }

  async function load(force) {
    let key = null; try { key = localStorage.getItem('bbh.key'); } catch (e) {}
    const app = document.getElementById('app');
    if (!key || !app || app.hidden || busy) return;
    const want = key + '|' + days(); if (!force && want === last && document.getElementById('bbt')) return;
    busy = true;
    try {
      const r = await fetch(API, { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: key, p_days: days() }) });
      if (r.ok) { render(await r.json()); last = want; }
    } catch (e) {} finally { busy = false; }
  }
  setInterval(() => load(false), 1500);          // picks up unlocking and range changes
  setInterval(() => load(true), 60000);          // and refreshes every minute

  // ---- Players tab: time played on each profile (public.hub_profile_time), sorting, and one profile opened up
  // (public.hub_player). The hub page leaves three hooks for this: window.bbx.head / bbx.cells(p) add the table
  // columns, and each profile row carries data-pid / data-pname. `profiles` and `drawProfiles` are the page's own.
  const RPC = 'https://tdjvnhuygpobdcmhlcms.supabase.co/rest/v1/rpc/';
  const hubKey = () => { try { return localStorage.getItem('bbh.key'); } catch (e) { return null; } };
  const call = async (fn, body) => { const r = await fetch(RPC + fn, { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: hubKey(), ...body }) }); if (!r.ok) throw new Error(fn); return r.json(); };
  const none = '<span class="muted">—</span>', gname = g => g ? (NAME[g] || g) : '';
  const list = () => { try { return Array.isArray(profiles) ? profiles : null; } catch (e) { return null; } };
  let times = null, timesAt = 0, loading = false, sortBy = 'default', done = null, doneSort = '';
  const first = new WeakMap();
  window.bbx = {
    head: '<th class="r">TIME PLAYED</th><th class="r">THIS WEEK</th><th>MOST PLAYED</th>',
    cells: p => p.secs == null ? '<td class="r muted">…</td><td></td><td></td>'
      : `<td class="r">${p.secs ? '<b>' + hm(p.secs) + '</b>' : none}</td><td class="r">${p.secs7 ? hm(p.secs7) : none}</td><td>${p.top_game ? esc(gname(p.top_game)) : none}</td>`,
  };
  function bar() {
    const q = document.getElementById('profq'); if (!q) return;
    let el = document.getElementById('bbsort'); if (!el) { el = document.createElement('div'); el.id = 'bbsort'; el.style.cssText = 'margin:0 0 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center'; q.after(el); }
    el.innerHTML = '<span class="stamp">SORT BY</span> ' + [['default', 'NEWEST'], ['secs', 'TIME PLAYED'], ['secs7', 'THIS WEEK'], ['earned', 'TOKENS EARNED'], ['boss_dmg', 'BOSS DAMAGE']].map(([k, l]) => `<button class="mini ${k === sortBy ? 'on' : ''}" data-bbsort="${k}">${l}</button>`).join(' ')
      + ' <span class="stamp">Click a player to open the profile. Time is counted on profiles from Nov 15, 2026.</span>';
  }
  function merge() {
    const ps = list(); if (!ps || !times) return;
    if (done === ps && doneSort === sortBy + '|' + timesAt) return;
    const by = new Map(times.map(t => [t.id + '|' + t.name, t]));
    ps.forEach((p, i) => { if (!first.has(p)) first.set(p, i); Object.assign(p, by.get(p.id + '|' + p.name) || { secs: 0, secs7: 0, secs_today: 0, days: 0 }); });
    ps.sort(sortBy === 'default' ? (a, b) => first.get(a) - first.get(b) : (a, b) => (b[sortBy] || 0) - (a[sortBy] || 0) || first.get(a) - first.get(b));
    done = ps; doneSort = sortBy + '|' + timesAt;
    try { drawProfiles(); } catch (e) {}
  }
  async function loadTimes() {
    if (loading || !hubKey()) return; loading = true;
    try { times = await call('hub_profile_time', {}); timesAt = Date.now(); merge(); } catch (e) {} finally { loading = false; }
  }
  setInterval(() => {
    const v = document.getElementById('v-players'), app = document.getElementById('app');
    if (!v || v.hidden || !app || app.hidden) return;
    if (!document.getElementById('bbsort')) bar();
    if (!times || Date.now() - timesAt > 60000) loadTimes(); else merge();
  }, 1000);

  function card() {
    let el = document.getElementById('bbp'); if (el) return el;
    const host = document.getElementById('profiles'); if (!host) return null;
    el = document.createElement('div'); el.id = 'bbp'; el.hidden = true;
    el.style.cssText = 'border:2px solid var(--gold);border-radius:10px;padding:14px;margin:0 0 14px;background:rgba(0,0,0,.25)';
    host.before(el); return el;
  }
  const when = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  function month(daysIn) {
    const have = new Map((daysIn || []).map(x => [x.day, x.secs])), today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const [y, m, d] = today.split('-').map(Number), out = [];
    for (let i = 29; i >= 0; i--) { const k = new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10); out.push([k, have.get(k) || 0]); }
    const max = Math.max(...out.map(x => x[1]), 1);
    return `<div style="display:flex;align-items:flex-end;gap:2px;height:70px">${out.map(([k, v]) => `<i title="${k}: ${hm(v)}" style="flex:1;min-width:3px;height:${v ? Math.max(4, Math.round(100 * v / max)) : 2}%;background:${v ? 'var(--cyan)' : 'var(--line)'};border-radius:2px 2px 0 0"></i>`).join('')}</div><div class="stamp" style="display:flex;justify-content:space-between"><span>30 days ago</span><span>today</span></div>`;
  }
  async function show(id, name) {
    const el = card(); if (!el) return;
    const head = `<h2 style="--c:var(--gold)">${esc(name)} <small>…${esc(id)}</small><button class="mini x" data-bbclose>CLOSE</button></h2>`;
    el.hidden = false; el.innerHTML = head + '<div class="empty">Loading…</div>'; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    let d = null; try { d = await call('hub_player', { p_id: id, p_name: name }); } catch (e) {}
    if (!d) { el.innerHTML = head + '<div class="empty">Could not load this profile.</div>'; return; }
    const p = (list() || []).find(x => x.id === id && x.name === name) || {}, games = d.games || [], scores = d.scores || [], bosses = d.bosses || [], loot = d.loot || [], prizes = d.prizes || [], buys = d.purchases || [];
    const sec = (title, c, body) => `<div><h2 style="--c:var(${c})">${title}</h2>${body}</div>`;
    el.innerHTML = head
      + `<p class="stamp" style="margin:-4px 0 12px">${p.signed_in ? 'Account (' + esc(p.provider || 'signed in') + ')' : 'Guest nickname'} · level ${p.level ?? '?'} · joined ${p.joined ? when(p.joined) : 'before tracking'} · last active ${p.last_day ? when(p.last_day + 'T12:00') : '—'}${d.sharing ? ' · shares detailed activity' : ''}</p>`
      + `<div class="tiles">
        ${tile('TIME PLAYED', hm(p.secs), `${p.days || 0} ${p.days === 1 ? 'day' : 'days'} played`, '--gold')}
        ${tile('THIS WEEK', hm(p.secs7), `${hm(p.secs_today)} today`, '--green')}
        ${tile('DAILY STREAK', p.streak || 0, p.last_daily ? 'last daily ' + when(p.last_daily + 'T12:00') : 'no daily bonus yet', '--orange')}
        ${tile('TOKENS', Number(p.tokens || 0).toLocaleString(), `${Number(p.earned || 0).toLocaleString()} earned in all`, '--cyan')}
        ${tile('BOSS DAMAGE', Number(p.boss_dmg || 0).toLocaleString(), `${p.loot || 0} loot drops · ${p.items || 0} items owned`, '--red')}
        ${tile('PRIZES', p.prizes || 0, `$${((p.spent_cents || 0) / 100).toFixed(2)} spent on tokens`, '--pink')}
      </div>`
      + `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px">
        ${sec('TIME BY GAME', '--orange', games.length ? `<div class="rows">${rows(games.map(g => [gname(g.game), g.secs, `${hm(g.secs)} <small style="color:var(--dim)">${g.days}d</small>`, COLOR[g.game]]), games[0].secs)}</div>` : '<div class="empty">No time recorded yet. It starts the next time this player plays.</div>')}
        ${sec('LAST 30 DAYS', '--cyan', month(d.days))}
        ${sec('HIGH SCORES', '--pink', scores.length ? `<div class="rows">${rows(scores.map(x => [gname(x.game), 1, `${Number(x.score).toLocaleString()} <small style="color:var(--dim)">#${x.place}</small>`, '--pink']), 1)}</div>` : '<div class="empty">No scores posted.</div>')}
        ${sec('BOSS FIGHTS', '--red', bosses.length ? `<div class="rows">${rows(bosses.map(b => [`${b.kind} · ${b.period}`, b.dmg, `${Number(b.dmg).toLocaleString()} dmg <small style="color:var(--dim)">${b.hits} hits${b.claimed ? ' · claimed' : ''}</small>`, '--red']), Math.max(...bosses.map(b => b.dmg), 1))}</div>` : '<div class="empty">No boss fights.</div>')}
        ${loot.length ? sec('LOOT', '--violet', `<div class="rows">${rows(loot.map(l => [l.item || 'drop', 1, `<small style="color:var(--dim)">${esc(l.rarity || '')} ${when(l.at)}</small>`, '--violet']), 1)}</div>`) : ''}
        ${prizes.length ? sec('PRIZES CLAIMED', '--green', `<div class="rows">${rows(prizes.map(x => [x.prize, 1, `<small style="color:var(--dim)">${when(x.created_at)}${x.fulfilled_at ? ' · sent' : ' · waiting'}</small>`, '--green']), 1)}</div>`) : ''}
        ${buys.length ? sec('TOKEN PURCHASES', '--gold', `<div class="rows">${rows(buys.map(x => [`${x.tokens} tokens`, 1, `$${(x.cents / 100).toFixed(2)} <small style="color:var(--dim)">${when(x.created_at)}</small>`, '--gold']), 1)}</div>`) : ''}
      </div>`;
  }
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-bbsort]'); if (s) { sortBy = s.dataset.bbsort; bar(); merge(); return; }
    if (e.target.closest('[data-bbclose]')) { const el = document.getElementById('bbp'); if (el) el.hidden = true; return; }
    const tr = e.target.closest('#profiles tr[data-pid]'); if (tr && !e.target.closest('a,button')) show(tr.dataset.pid, tr.dataset.pname);
  });
})();
