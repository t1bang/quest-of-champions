// Arcade Hub add-on: TIME PLAYED in hours and minutes.
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
})();
