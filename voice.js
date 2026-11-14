// Big Bang Arcade lobby voice chat. Off until a player taps JOIN VOICE; only players who joined hear each other.
// Audio goes straight between browsers (WebRTC); the arcade's live channel is only used to introduce them.
// Voices get quieter with distance in the room. Anyone can be muted from the voice panel.
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
const MAX = 8;                                   // voice links per player (a small room conversation, not a broadcast)
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createVoice(ctx) {
  // ctx: { sid, peers, P, send(payload), toast, hub, show, pbody, onClose, closePanel }
  const { sid, peers, P } = ctx, links = new Map(), muted = new Set();
  let on = false, mic = null, micOff = false, AC = null, panelOpen = false;
  const can = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);

  function link(id) {
    let L = links.get(id); if (L) return L;
    const pc = new RTCPeerConnection({ iceServers: ICE }), audio = new Audio(); audio.autoplay = true; audio.playsInline = true;
    L = { id, pc, audio, level: 0, an: null, buf: null, made: performance.now(), pending: [] }; links.set(id, L);
    if (mic) for (const t of mic.getTracks()) pc.addTrack(t, mic);
    pc.onicecandidate = e => { if (e.candidate) ctx.send({ to: id, from: sid, t: 'ice', d: e.candidate.toJSON() }); };
    pc.ontrack = e => { audio.srcObject = e.streams[0]; audio.play().catch(() => {});
      try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const src = AC.createMediaStreamSource(e.streams[0]); L.an = AC.createAnalyser(); L.an.fftSize = 256; L.buf = new Uint8Array(L.an.frequencyBinCount); src.connect(L.an); } catch {} };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) drop(id); if (pc.connectionState === 'connected') paint(); };
    return L;
  }
  function drop(id, tell) { const L = links.get(id); if (!L) return; links.delete(id); try { L.pc.close(); } catch {} L.audio.srcObject = null; if (tell) ctx.send({ to: id, from: sid, t: 'bye' }); paint(); }
  async function call(id) { const L = link(id); try { const offer = await L.pc.createOffer(); await L.pc.setLocalDescription(offer); ctx.send({ to: id, from: sid, t: 'offer', d: L.pc.localDescription.toJSON() }); } catch { drop(id); } }

  // a message from another player's browser: an offer to talk, an answer, a network route, or goodbye
  async function onSignal(m) {
    if (!m || m.to !== sid || typeof m.from !== 'string' || m.from === sid) return;
    if (m.t === 'bye') return drop(m.from);
    if (!on) return;
    try {
      if (m.t === 'offer') {
        if (!links.has(m.from) && links.size >= MAX) return;
        const L = link(m.from); await L.pc.setRemoteDescription(m.d);
        for (const c of L.pending.splice(0)) await L.pc.addIceCandidate(c).catch(() => {});
        const ans = await L.pc.createAnswer(); await L.pc.setLocalDescription(ans); ctx.send({ to: m.from, from: sid, t: 'answer', d: L.pc.localDescription.toJSON() });
      } else if (m.t === 'answer') { const L = links.get(m.from); if (L && L.pc.signalingState === 'have-local-offer') { await L.pc.setRemoteDescription(m.d); for (const c of L.pending.splice(0)) await L.pc.addIceCandidate(c).catch(() => {}); } }
      else if (m.t === 'ice') { const L = links.get(m.from); if (!L) return; if (L.pc.remoteDescription) await L.pc.addIceCandidate(m.d).catch(() => {}); else L.pending.push(m.d); }
    } catch { drop(m.from); }
  }

  // every second: connect to players who are in voice, drop the ones who left, set volume by distance, read who is talking
  setInterval(() => {
    if (!on) return;
    for (const [id, p] of peers) if (p.v && !links.has(id) && links.size < MAX && sid < id) call(id);       // the lower id places the call so two players never call each other at once
    for (const [id, L] of links) {
      const p = peers.get(id);
      if (!p || !p.v) { if (performance.now() - L.made > 12000 || !p) drop(id, true); continue; }
      if (L.pc.connectionState !== 'connected' && performance.now() - L.made > 20000) { drop(id, true); continue; }
      const d = Math.hypot(p.x - P.x, p.z - P.z); L.audio.volume = muted.has(id) ? 0 : Math.max(0.12, Math.min(1, 1.25 - d / 2200)); L.audio.muted = muted.has(id);
    }
  }, 1000);
  setInterval(() => { for (const L of links.values()) { if (!L.an) continue; L.an.getByteFrequencyData(L.buf); let s = 0; for (let i = 2; i < 40; i++) s += L.buf[i]; L.level = s / 38 / 255; } }, 160);

  async function join() {
    if (!can) return ctx.toast('THIS BROWSER CANNOT DO VOICE CHAT');
    if (on) return;
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch { return ctx.toast('THE MICROPHONE IS BLOCKED FOR THIS SITE'); }
    on = true; micOff = false; ctx.hub('voice_join'); ctx.toast('YOU ARE IN VOICE CHAT. PLAYERS WHO JOINED CAN HEAR YOU'); paint();
  }
  function leave() {
    if (!on) return; on = false;
    for (const id of [...links.keys()]) drop(id, true);
    if (mic) { mic.getTracks().forEach(t => t.stop()); mic = null; }
    ctx.hub('voice_leave'); ctx.toast('YOU LEFT VOICE CHAT'); paint();
  }
  function toggleMic() { if (!mic) return; micOff = !micOff; mic.getAudioTracks().forEach(t => { t.enabled = !micOff; }); paint(); }

  // ----- the button and the panel -----
  const btn = document.getElementById('vc');
  function paint() {
    if (btn) { btn.textContent = on ? (micOff ? '🔇' : '🎙') + ' ' + (links.size + 1) : '🎙'; btn.classList.toggle('live', on); btn.title = on ? 'Voice chat is on' : 'Join voice chat'; }
    if (panelOpen) { const el = document.getElementById('vcbody'); if (el) el.innerHTML = html(); }
  }
  const inVoice = () => [...peers.entries()].filter(([, p]) => p.v);
  function html() {
    if (!can) return '<p class="dim">This browser cannot do voice chat.</p>';
    if (!on) return `<p>Talk with other players in the arcade. Voice is <b>off</b> until you join, and only players who joined can hear you. Voices get quieter the farther apart you stand.</p>
      <p>${inVoice().length ? `<b style="color:var(--gold)">${inVoice().length}</b> player${inVoice().length === 1 ? ' is' : 's are'} in voice right now.` : 'Nobody is in voice right now. Join and others will see the 🎙 by your name.'}</p>
      <p><button class="btn go" data-vc="join">🎙 JOIN VOICE CHAT</button></p><p class="dim">Your browser will ask to use the microphone. Be respectful: anyone can mute you, and you can mute anyone.</p>`;
    const rows = inVoice().map(([id, p]) => { const L = links.get(id), st = !L ? 'WAITING' : L.pc.connectionState === 'connected' ? (muted.has(id) ? 'MUTED BY YOU' : 'CONNECTED') : 'CONNECTING…';
      return `<li><span>🎙 ${esc(p.name || 'Player')}<small style="display:block;color:var(--dim);font-size:8px">${st}</small></span>${L ? `<button class="btn" data-vcmute="${esc(id)}">${muted.has(id) ? 'UNMUTE' : 'MUTE'}</button>` : ''}</li>`; }).join('');
    return `<p>You are in voice chat${micOff ? ' with your <b>mic muted</b>' : ''}.</p><p><button class="btn ${micOff ? 'go' : ''}" data-vc="mic">${micOff ? '🎙 UNMUTE MY MIC' : '🔇 MUTE MY MIC'}</button> <button class="btn" data-vc="leave">LEAVE VOICE</button></p>
      <h3>IN VOICE NOW</h3><ul class="list">${rows || '<li><span class="dim">Just you so far. Other players who join will show up here.</span></li>'}</ul>
      <p class="dim">Voice connects browser to browser. On some networks two players cannot reach each other; they will stay on CONNECTING.</p>`;
  }
  function open() {
    ctx.show(`<h2>VOICE CHAT</h2><div id="vcbody">${html()}</div>`, '#3dff9a'); panelOpen = true;
    const timer = setInterval(paint, 1500);
    ctx.pbody.onclick = e => { const a = e.target.closest('[data-vc]'), m = e.target.closest('[data-vcmute]');
      if (a) { if (a.dataset.vc === 'join') join(); else if (a.dataset.vc === 'leave') leave(); else toggleMic(); }
      if (m) { const id = m.dataset.vcmute; if (muted.has(id)) muted.delete(id); else muted.add(id); paint(); } };
    ctx.onClose(() => { panelOpen = false; clearInterval(timer); ctx.pbody.onclick = null; });
  }
  if (btn) { btn.onclick = open; if (!can) btn.hidden = true; }
  addEventListener('pagehide', () => { for (const id of [...links.keys()]) drop(id, true); });
  return { join, leave, open, onSignal, get on() { return on; }, get micOff() { return micOff; }, talking: id => { const L = links.get(id); return !!L && !muted.has(id) && L.level > 0.08; }, can, html };
}
