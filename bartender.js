// Dee the bartender: stands behind the bar and takes feedback about the arcade and its games, typed or spoken.
// Each message goes to /api/feedback, which saves it and emails it to the arcade admin straight away.
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const BARTENDER = { name: 'DEE', x: 0, z: 1808, av: { skin: 3, hair: 2, hc: 0, shirt: 1, shades: 0 }, fit: { shirt: 'suit', pants: 'jeans-black', shoes: 'kicks-black', chain: 'chain' } };
const LINES = ["What's good? Tell me what you love, what's broken, or what you want next. It goes straight to the team.", 'Pull up a stool. What should we fix or add around here?', 'I hear everything in this place. What do you think of the arcade?'];
const MAX_SECS = 60;

export function openBartender(ctx) {
  // ctx: { show, pbody, onClose, toast, hub, games: [[id, title]], send(payload) -> { ok, emailed }, back() }
  let rec = null, stream = null, chunks = [], timer = null, t0 = 0, clip = null, sr = null, heard = '', sending = false;
  const about = [['arcade', 'The arcade (lobby)'], ...ctx.games, ['bar-games', 'Darts, pool, hockey, bowling'], ['other', 'Something else']];
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  ctx.show(`<h2>DEE THE BARTENDER</h2><p style="color:var(--gold)">"${LINES[Math.floor(Math.random() * LINES.length)]}"</p>
    <h3>WHAT IS IT ABOUT?</h3><select id="fbabout" class="fbin">${about.map(([id, t]) => `<option value="${esc(id)}">${esc(t)}</option>`).join('')}</select>
    <h3>TYPE IT</h3><textarea id="fbtext" class="fbin" rows="4" maxlength="2000" placeholder="What do you love? What is broken? What should we add?"></textarea>
    <h3>OR SAY IT</h3>${canRecord ? `<p><button class="btn" id="fbrec">🎤 RECORD A VOICE NOTE</button> <span id="fbtime" class="dim">UP TO ${MAX_SECS} SECONDS</span></p><div id="fbclip"></div>` : '<p class="dim">This browser cannot record. Type your feedback instead.</p>'}
    <p><button class="btn go" id="fbsend">SEND TO THE TEAM</button> <button class="btn" id="fbback">BACK TO THE BAR</button></p>
    <p class="dim">Your player name is sent with it. Voice notes are only recorded while the button says STOP.</p>`, '#ffb400');
  const $ = s => ctx.pbody.querySelector(s);
  const stopTracks = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } clearInterval(timer); timer = null; if (sr) { try { sr.stop(); } catch {} sr = null; } };
  async function startRec() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return ctx.toast('THE MICROPHONE IS BLOCKED FOR THIS SITE'); }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    chunks = []; heard = ''; clip = null; $('#fbclip').innerHTML = '';
    rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : undefined);
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000)), blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }); stopTracks(); rec = null;
      const b = $('#fbrec'); if (b) { b.textContent = '🎤 RECORD AGAIN'; b.classList.remove('go'); }
      const fr = new FileReader(); fr.onload = () => { const url = String(fr.result), base64 = url.slice(url.indexOf(',') + 1); clip = { base64, mime: blob.type, secs };
        const box = $('#fbclip'); if (box) box.innerHTML = `<audio controls src="${url}" style="width:100%;margin-top:8px"></audio>${heard.trim() ? `<p class="dim">Heard: "${esc(heard.trim())}"</p>` : ''}<p><button class="btn" id="fbdrop">✕ REMOVE THE VOICE NOTE</button></p>`;
        const t = $('#fbtime'); if (t) t.textContent = secs + ' SECONDS RECORDED'; }; fr.readAsDataURL(blob);
    };
    rec.start(); t0 = performance.now(); const b = $('#fbrec'); b.textContent = '■ STOP'; b.classList.add('go');
    timer = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000), t = $('#fbtime'); if (t) t.textContent = `RECORDING ${s}s / ${MAX_SECS}s`; if (s >= MAX_SECS && rec && rec.state === 'recording') rec.stop(); }, 250);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;      // a written copy of what was said, where the browser can do it
    if (SR) { try { sr = new SR(); sr.continuous = true; sr.interimResults = false; sr.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) heard += e.results[i][0].transcript + ' '; }; sr.onerror = () => {}; sr.start(); } catch { sr = null; } }
  }
  ctx.pbody.onclick = async e => {
    if (e.target.closest('#fbback')) return ctx.back();
    if (e.target.closest('#fbdrop')) { clip = null; $('#fbclip').innerHTML = ''; $('#fbtime').textContent = `UP TO ${MAX_SECS} SECONDS`; return; }
    if (e.target.closest('#fbrec')) { if (rec && rec.state === 'recording') rec.stop(); else startRec(); return; }
    if (e.target.closest('#fbsend')) {
      if (sending) return; if (rec && rec.state === 'recording') return ctx.toast('STOP THE RECORDING FIRST');
      const text = $('#fbtext').value.trim(); if (!text && !clip) return ctx.toast('TYPE OR RECORD SOMETHING FIRST');
      sending = true; $('#fbsend').textContent = 'SENDING…';
      try {
        const r = await ctx.send({ about: $('#fbabout').value, text, transcript: heard.trim(), ...(clip ? { audio: clip.base64, mime: clip.mime, secs: clip.secs } : {}) });
        ctx.hub(clip ? 'feedback_voice' : 'feedback_text'); ctx.toast(r.emailed ? 'SENT. DEE PASSED IT TO THE TEAM' : 'SAVED. THE TEAM WILL SEE IT IN THE HUB');
        ctx.show(`<h2>DEE THE BARTENDER</h2><p style="color:var(--gold)">"Got it. Appreciate you. That goes straight to the people who build this place."</p><p><button class="btn go" id="fbmore">TELL DEE SOMETHING ELSE</button> <button class="btn" id="fbback">BACK TO THE BAR</button></p>`, '#ffb400');
        ctx.pbody.onclick = ev => { if (ev.target.closest('#fbmore')) openBartender(ctx); else if (ev.target.closest('#fbback')) ctx.back(); };
      } catch (err) { sending = false; const s = $('#fbsend'); if (s) s.textContent = 'SEND TO THE TEAM'; ctx.toast(String(err.message || 'COULD NOT SEND').toUpperCase()); }
    }
  };
  ctx.onClose(() => { if (rec && rec.state === 'recording') { rec.onstop = null; try { rec.stop(); } catch {} } stopTracks(); ctx.pbody.onclick = null; });
}
