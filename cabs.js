// Big Bang Arcade — custom cabinet shapes.
// A game in config.js picks one with  style: 'racer' | 'golf' | 'dance' | 'pinball' | 'claw'.
// Each builder gets the game entry and a spot T ({x, z, th}); local x runs along the wall,
// y is up, z comes out from the wall toward the player. room.js passes in its drawing kit.
export function customCabinets(kit) {
  const { box, quad, tri, sphere, tex, mat, solid, neon, glow, light, add, text, fitText, BIG, PIX, handlers } = kit;
  const soonLabel = g => 'COMING SOON: ' + g.title.toUpperCase();
  // a custom cabinet becomes playable as soon as its config.js entry has a `play` address
  const station = (g, T, w, depth, h) => g.play ? add(g.id, 'PLAY ' + g.title.toUpperCase(), T, w, depth, h, () => handlers.game(g)) : add(g.id, soonLabel(g), T, w, depth, h, () => handlers.soon(g));
  const RAINBOW = ['#ff2a3c', '#ff7a1a', '#ffd23e', '#35e06f', '#3ea8ff', '#b06cff'];
  const TAU = Math.PI * 2;

  // a flat disc facing along local x (wheel faces), textured edge to edge
  function disc(m, T, x, cy, cz, r, n = 18) {
    const pt = k => { const a = k / n * TAU; return [[x, cy + Math.sin(a) * r, cz + Math.cos(a) * r], [0.5 + Math.cos(a) * 0.5, 0.5 - Math.sin(a) * 0.5]]; };
    for (let k = 0; k < n; k++) { const [p0, u0] = pt(k), [p1, u1] = pt(k + 1); tri(m, T, [x, cy, cz], p0, p1, [0.5, 0.5], u0, u1); }
  }
  // the tread between two discs
  function tread(m, T, x0, x1, cy, cz, r, n = 18) {
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, b = (k + 1) / n * TAU;
      quad(m, T, [x0, cy + Math.sin(a) * r, cz + Math.cos(a) * r], [x1, cy + Math.sin(a) * r, cz + Math.cos(a) * r], [x1, cy + Math.sin(b) * r, cz + Math.cos(b) * r], [x0, cy + Math.sin(b) * r, cz + Math.cos(b) * r]);
    }
  }
  const banner = (x, w, h, sub, color) => {
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, h - 96, w, 96);
    fitText(x, sub, w / 2, h - 50, 40, w - 60, '#fff', '#000', PIX);
    x.fillStyle = color; x.fillRect(0, h - 100, w, 5);
  };

  // ---------- twin sit-down racer ----------
  function racer(g, T) {
    const dark = solid('#101018', 0, 0.7), body = solid('#14141c', 0, 0.9), red = solid('#e0162b', 0.35, 0.6), tire = solid('#0a0a0e', 0, 0.9), blue = solid('#2a4bff', 1, 0);
    const road = (x, w, h, player) => {
      const sky = x.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#1b0b3a'); sky.addColorStop(0.6, '#b0246a'); sky.addColorStop(1, '#ff9a3c'); x.fillStyle = sky; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffd23e'; x.beginPath(); x.arc(w / 2, h * 0.55, 90, Math.PI, 0); x.fill();
      x.fillStyle = '#12081d'; for (let k = 0; k < 14; k++) { const bw = 30 + (k * 53 % 40), bh = 40 + (k * 71 % 90); x.fillRect(k * 40 - 10, h * 0.55 - bh, bw, bh); }
      x.fillStyle = '#0e1a12'; x.fillRect(0, h * 0.55, w, h);
      x.fillStyle = '#23232e'; x.beginPath(); x.moveTo(w / 2 - 18, h * 0.55); x.lineTo(w / 2 + 18, h * 0.55); x.lineTo(w + 60, h); x.lineTo(-60, h); x.fill();
      x.fillStyle = '#ffd23e'; for (let k = 0; k < 7; k++) { const t = k / 7, y = h * 0.55 + t * t * h * 0.45, s = 4 + t * 26; x.fillRect(w / 2 - s / 4, y, s / 2, s * 1.4); }
      for (const sx of [-1, 1]) for (let k = 1; k < 7; k++) { const t = k / 7, y = h * 0.55 + t * t * h * 0.45, ox = 30 + t * t * (w / 2 + 40); x.fillStyle = RAINBOW[(k + player) % 6]; x.fillRect(w / 2 + sx * ox - 3, y - 20 - t * 60, 6, 20 + t * 60); }
      // the car, seen from behind
      const cx = w / 2 + (player ? 46 : -46), cy = h * 0.8; x.fillStyle = player ? '#3ea8ff' : '#ff2a3c'; x.fillRect(cx - 62, cy - 30, 124, 46); x.fillRect(cx - 44, cy - 56, 88, 30);
      x.fillStyle = '#0c0c14'; x.fillRect(cx - 36, cy - 50, 72, 18); x.fillRect(cx - 70, cy + 8, 26, 22); x.fillRect(cx + 44, cy + 8, 26, 22);
      x.fillStyle = '#fff3d6'; x.fillRect(cx - 58, cy - 18, 26, 10); x.fillRect(cx + 32, cy - 18, 26, 10);
    };
    const lower = k => mat(tex(512, 512, (x, w, h) => { road(x, w, h, k); text(x, `P${k + 1}`, 52, 44, `30px ${PIX}`, '#fff', '#000'); }), { emis: 1, spec: 0.7 });
    const upper = k => mat(tex(512, 512, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#12081d'); gr.addColorStop(1, k ? '#10306a' : '#6a1020'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#fff' : '#111'; x.fillRect(i * 32, j * 32, 32, 32); x.fillRect(i * 32, h - 64 + j * 32, 32, 32); }
      x.save(); x.translate(w / 2, h / 2 - 70); x.rotate(-0.07); fitText(x, g.title.toUpperCase(), 0, 0, 120, w - 50, '#ffd23e', '#000'); x.restore();
      text(x, 'T1 RACING', w / 2, h / 2 + 24, `26px ${PIX}`, '#fff', '#000'); fitText(x, g.play ? 'INSERT COIN' : 'COMING SOON', w / 2, h / 2 + 104, 44, w - 70, '#fff', '#000', PIX);
    }), { emis: 1, spec: 0.6 });
    const wheelM = mat(tex(256, 256, (x, w) => {
      x.fillStyle = '#0a0a0e'; x.fillRect(0, 0, w, w); x.lineWidth = 9; x.strokeStyle = '#b06cff'; x.beginPath(); x.arc(128, 128, 96, 0, TAU); x.stroke();
      RAINBOW.forEach((c, k) => { x.strokeStyle = c; x.lineWidth = 7; x.beginPath(); x.arc(128, 128, 96, k / 6 * TAU, (k + 1) / 6 * TAU); x.stroke(); });
      x.fillStyle = '#ff2a3c'; x.beginPath(); x.arc(128, 128, 82, 0, TAU); x.fill(); x.fillStyle = '#0a0a0e'; x.beginPath(); x.arc(128, 128, 60, 0, TAU); x.fill();
      x.strokeStyle = '#ff2a3c'; x.lineWidth = 15; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76); x.stroke(); }
      x.fillStyle = '#ffd23e'; x.beginPath(); x.arc(128, 128, 15, 0, TAU); x.fill();
    }), { emis: 0.85, spec: 0.5 });
    const steerM = mat(tex(128, 128, (x, w) => {
      x.clearRect(0, 0, w, w); x.strokeStyle = '#15151c'; x.lineWidth = 16; x.beginPath(); x.arc(64, 64, 52, 0, TAU); x.stroke();
      x.lineWidth = 12; x.beginPath(); x.moveTo(12, 64); x.lineTo(116, 64); x.moveTo(64, 64); x.lineTo(64, 116); x.stroke();
      x.fillStyle = '#ff2a3c'; x.beginPath(); x.arc(64, 64, 15, 0, TAU); x.fill();
    }), { emis: 0.5, spec: 0.6, blend: true });
    const tailM = mat(tex(512, 256, (x, w, h) => {
      x.fillStyle = '#0c0c12'; x.fillRect(0, 0, w, h);
      RAINBOW.forEach((c, k) => { x.fillStyle = c; x.fillRect(20 + k * 79, 40, 76, 9); });
      for (const sx of [70, 330]) { x.fillStyle = '#ff2a3c'; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(sx + k * 38, 90); x.lineTo(sx + 30 + k * 38, 90); x.lineTo(sx + 44 + k * 38, 122); x.lineTo(sx + 30 + k * 38, 154); x.lineTo(sx + k * 38, 154); x.lineTo(sx + 14 + k * 38, 122); x.fill(); } }
      x.fillStyle = '#b06cff'; x.fillRect(196, 96, 120, 52); fitText(x, 'T1', 256, 124, 44, 100, '#fff', '#000');
      fitText(x, g.title.toUpperCase(), w / 2, 206, 44, w - 60, '#ffd23e', '#000');
    }), { emis: 0.9, spec: 0.5 });
    const backM = mat(tex(256, 512, (x, w, h) => {
      x.fillStyle = '#e0162b'; x.fillRect(0, 0, w, h); x.fillStyle = '#0c0c12'; x.beginPath(); x.moveTo(60, 70); x.lineTo(196, 70); x.lineTo(176, 440); x.lineTo(80, 440); x.fill();
      for (let k = 0; k < 6; k++) { x.strokeStyle = k % 2 ? '#35e06f' : '#ff4fd8'; x.lineWidth = 9; x.beginPath(); x.moveTo(84, 130 + k * 44); x.lineTo(128, 96 + k * 44); x.lineTo(172, 130 + k * 44); x.stroke(); }
      fitText(x, 'CRUIZIN', w / 2, 410, 30, 90, '#ffd23e', '#000');
    }), { emis: 0.75, spec: 0.4 });

    box(solid('#0c0c16', 0, 0.5), T, -185, 185, 0, 10, 0, 226);
    box(blue, T, -191, 191, 0, 12, 226, 232); box(blue, T, -191, -185, 0, 12, 0, 226); box(blue, T, 185, 191, 0, 12, 0, 226);
    [-90, 90].forEach((cx, k) => {
      box(dark, T, cx - 84, cx + 84, 10, 236, 0, 58);                                                   // tower base
      box(dark, T, cx - 84, cx + 84, 236, 548, 0, 46);                                                  // screen backing
      quad(lower(k), T, [cx - 80, 394, 50], [cx + 80, 394, 50], [cx + 80, 240, 60], [cx - 80, 240, 60]); // lower screen
      quad(upper(k), T, [cx - 80, 546, 86], [cx + 80, 546, 86], [cx + 80, 400, 50], [cx - 80, 400, 50]); // upper screen, leaning out
      box(dark, T, cx - 80, cx + 80, 150, 230, 58, 104); box(red, T, cx - 80, cx + 80, 230, 238, 58, 108); // dash
      box(dark, T, cx - 6, cx + 6, 238, 262, 100, 114);
      quad(steerM, T, [cx - 36, 294, 112], [cx + 36, 294, 112], [cx + 36, 226, 126], [cx - 36, 226, 126]); // steering wheel
      box(body, T, cx - 70, cx + 70, 12, 118, 122, 222, { front: tailM });                              // the car-tail seat base
      box(red, T, cx - 48, cx + 48, 118, 134, 128, 196);                                                // cushion
      box(red, T, cx - 44, cx + 44, 134, 246, 190, 216, { front: backM });                              // seat back
      for (const sx of [-1, 1]) {
        box(red, T, cx + sx * 44 - (sx < 0 ? 12 : 0), cx + sx * 44 + (sx > 0 ? 12 : 0), 176, 240, 180, 216);         // head wings
        const x0 = cx + sx * 72, x1 = cx + sx * 86; tread(tire, T, x0, x1, 74, 172, 62); disc(wheelM, T, x1, 74, 172, 62); // big neon wheel
      }
    });
    glow(g.color, T, 0, 300, 2, 760, 620); light(T, [0, 220, 330], '#ff3b30', 0.9); light(T, [0, 60, 260], '#2a4bff', 0.6);
    station(g, T, 380, 232, 546);
  }

  // ---------- golf simulator bay ----------
  function golf(g, T) {
    const frame = solid('#101016', 0, 0.6), green = '#35e06f';
    const hole = mat(tex(1024, 512, (x, w, h) => {
      const sky = x.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, '#4aa8ff'); sky.addColorStop(1, '#cfeaff'); x.fillStyle = sky; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff'; for (const [cx, cy, r] of [[190, 120, 46], [240, 110, 60], [300, 126, 44], [760, 90, 40], [810, 84, 54]]) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
      x.fillStyle = '#2f7d4a'; x.beginPath(); x.moveTo(0, h * 0.5); for (let k = 0; k <= 16; k++) x.lineTo(k * 64, h * 0.5 - 30 - Math.sin(k * 1.7) * 26); x.lineTo(w, h); x.lineTo(0, h); x.fill();
      x.fillStyle = '#1f5a34'; for (let k = 0; k < 9; k++) { const tx = 40 + k * 120 + (k % 2) * 30, ty = h * 0.5 - 6; x.beginPath(); x.moveTo(tx, ty - 90); x.lineTo(tx + 34, ty); x.lineTo(tx - 34, ty); x.fill(); }
      x.fillStyle = '#3fae5c'; x.fillRect(0, h * 0.5, w, h);
      x.fillStyle = '#56c770'; x.beginPath(); x.moveTo(w / 2 - 50, h * 0.52); x.lineTo(w / 2 + 70, h * 0.52); x.lineTo(w * 0.86, h); x.lineTo(w * 0.14, h); x.fill();   // fairway
      x.fillStyle = '#f1dfa6'; x.beginPath(); x.ellipse(w * 0.28, h * 0.66, 90, 26, 0, 0, TAU); x.fill();                                                               // bunker
      x.fillStyle = '#7fe08f'; x.beginPath(); x.ellipse(w / 2 + 10, h * 0.56, 110, 22, 0, 0, TAU); x.fill();                                                             // green
      x.fillStyle = '#fff'; x.fillRect(w / 2 + 8, h * 0.56 - 96, 5, 96); x.fillStyle = '#ff2a3c'; x.beginPath(); x.moveTo(w / 2 + 13, h * 0.56 - 96); x.lineTo(w / 2 + 62, h * 0.56 - 80); x.lineTo(w / 2 + 13, h * 0.56 - 62); x.fill();
      x.fillStyle = 'rgba(8,10,20,.72)'; x.fillRect(30, 30, 330, 150); text(x, 'HOLE 1', 110, 66, `24px ${PIX}`, '#ffd23e'); text(x, 'PAR 4', 270, 66, `24px ${PIX}`, '#fff'); text(x, '412 YDS', 195, 116, `28px ${PIX}`, '#fff'); text(x, 'WIND 6 MPH →', 195, 154, `14px ${PIX}`, green);
      x.fillStyle = 'rgba(8,10,20,.72)'; x.fillRect(0, h - 132, w, 132); fitText(x, g.title.toUpperCase(), w / 2, h - 86, 72, w - 80, '#ffd23e', '#000'); text(x, 'COMING SOON', w / 2, h - 30, `24px ${PIX}`, '#fff');
    }), { emis: 0.95, spec: 0.2 });
    const turf = mat(tex(256, 256, (x, w) => { for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#1f7a3c' : '#25904a'; x.fillRect(k * 32, 0, 32, w); } }), { emis: 0.25, spec: 0.05 });
    const matT = solid('#145a2a', 0.2, 0.05), metal = solid('#c8ccd6', 0.15, 1), white = solid('#ffffff', 0.6, 0.8);
    box(frame, T, -290, -272, 0, 432, 0, 300); box(frame, T, 272, 290, 0, 432, 0, 300); box(frame, T, -290, 290, 420, 436, 0, 300);   // bay frame
    for (const sx of [-281, 281]) box(solid(green, 1, 0), T, sx - 3, sx + 3, 0, 436, 300, 304);
    quad(hole, T, [-270, 418, 6], [270, 418, 6], [270, 8, 6], [-270, 8, 6]);                                                          // impact screen
    box(solid('#1a6a34', 0.2, 0.05), T, -272, 272, 0, 7, 0, 300, { top: turf });
    box(matT, T, -70, 70, 7, 11, 190, 280); box(white, T, -2, 2, 11, 18, 228, 232); sphere(white, T, 0, 23, 230, 6);                   // mat, tee, ball
    box(solid('#16161c', 0, 0.8), T, -230, -180, 7, 70, 236, 280, { top: mat(tex(128, 128, (x, w) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, w, w); x.fillStyle = green; x.fillRect(10, 10, w - 20, 40); text(x, '285', w / 2, 86, `30px ${PIX}`, '#fff'); text(x, 'YDS', w / 2, 114, `12px ${PIX}`, green); }), { emis: 1, spec: 0.3 }) }); // launch monitor
    box(solid('#b0202c', 0.2, 0.4), T, 196, 240, 7, 120, 244, 288);                                                                    // club bag
    [[204, 252, 190], [216, 262, 205], [228, 256, 182], [222, 276, 198]].forEach(([cx, cz, top]) => { box(metal, T, cx - 2, cx + 2, 120, top, cz - 2, cz + 2); box(solid('#22222c', 0.1, 1), T, cx - 9, cx + 5, top, top + 12, cz - 5, cz + 5); });
    quad(neon('GOLF SIMULATOR', green, 1024, 128), T, [-250, 524, 302], [250, 524, 302], [250, 446, 302], [-250, 446, 302]); glow(green, T, 0, 486, 306, 700, 200);
    light(T, [0, 300, 380], green, 0.9); light(T, [0, 380, 150], '#ffffff', 0.7);
    station(g, T, 590, 300, 524);
  }

  // ---------- dance machine ----------
  function dance(g, T) {
    const dark = solid('#12101c', 0, 0.6), metal = solid('#8d97ab', 0.1, 1), pink = '#ff4fd8', cyan = '#3ee6ff';
    const arrow = (x, cx, cy, s, dir, c) => { x.save(); x.translate(cx, cy); x.rotate(dir * Math.PI / 2); x.fillStyle = c; x.beginPath(); x.moveTo(0, -s); x.lineTo(s, 0); x.lineTo(s * 0.45, 0); x.lineTo(s * 0.45, s); x.lineTo(-s * 0.45, s); x.lineTo(-s * 0.45, 0); x.lineTo(-s, 0); x.fill(); x.restore(); };
    const screen = mat(tex(512, 512, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a0a4a'); gr.addColorStop(1, '#0a2a4a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let lane = 0; lane < 4; lane++) for (let k = 0; k < 4; k++) arrow(x, 96 + lane * 106, 150 + k * 78 + (lane % 2) * 36, 30, lane, [pink, cyan, '#ffd23e', '#35e06f'][lane]);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, w, 100); fitText(x, g.title.toUpperCase(), w / 2, 52, 66, w - 40, '#ffd23e', '#000');
      banner(x, w, h, 'COMING SOON', pink);
    }), { emis: 1, spec: 0.6 });
    const pads = mat(tex(512, 512, (x, w, h) => {
      x.fillStyle = '#15121f'; x.fillRect(0, 0, w, h);
      for (let p = 0; p < 2; p++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const X = 10 + p * 256 + i * 80, Y = 130 + j * 84, edge = (i + j) % 2 === 1; x.fillStyle = edge ? (j === 1 ? cyan : pink) : '#262238'; x.fillRect(X, Y, 74, 78);
        if (edge) arrow(x, X + 37, Y + 39, 24, j === 0 ? 0 : j === 2 ? 2 : i === 0 ? 3 : 1, '#12101c');
      }
      text(x, 'P1', 128, 70, `40px ${BIG}`, pink); text(x, 'P2', 384, 70, `40px ${BIG}`, cyan);
    }), { emis: 0.8, spec: 0.7 });
    const speaker = mat(tex(256, 256, (x, w) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, w, w); for (const cx of [70, 186]) { x.fillStyle = '#23232e'; x.beginPath(); x.arc(cx, 128, 56, 0, TAU); x.fill(); x.fillStyle = '#0c0c14'; x.beginPath(); x.arc(cx, 128, 36, 0, TAU); x.fill(); x.fillStyle = pink; x.beginPath(); x.arc(cx, 128, 12, 0, TAU); x.fill(); } }), { emis: 0.5, spec: 0.4 });
    box(dark, T, -120, 120, 0, 170, 0, 60, { front: speaker }); box(dark, T, -120, 120, 170, 330, 0, 56, { front: screen });
    box(dark, T, -128, 128, 330, 404, 0, 64); quad(neon(g.title.toUpperCase(), pink, 512, 128), T, [-120, 400, 66], [120, 400, 66], [120, 336, 66], [-120, 336, 66]);
    box(solid(pink, 1, 0), T, -142, -124, 0, 404, 10, 40); box(solid(cyan, 1, 0), T, 124, 142, 0, 404, 10, 40);                 // light towers
    box(solid('#1c1a28', 0, 0.9), T, -132, 132, 0, 14, 66, 284, { top: pads });                                               // dance stage
    for (const sx of [-126, 0, 126]) box(metal, T, sx - 3, sx + 3, 14, 124, 276, 282); box(metal, T, -129, 129, 118, 124, 276, 282); // rear bar
    glow(pink, T, 0, 230, 2, 620, 520); light(T, [-90, 260, 300], pink, 0.8); light(T, [90, 260, 300], cyan, 0.8);
    station(g, T, 300, 284, 404);
  }

  // ---------- pinball table ----------
  function pinball(g, T) {
    const wood = solid('#1a1030', 0.1, 0.6), metal = solid('#c8ccd6', 0.15, 1), gold = '#ffc93a';
    const field = mat(tex(256, 512, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0a4a'); gr.addColorStop(1, '#0a1a4a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      [[80, 120, '#ff2a3c'], [176, 120, '#3ea8ff'], [128, 190, gold], [70, 260, '#35e06f'], [186, 260, '#ff4fd8']].forEach(([cx, cy, c]) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, 28, 0, TAU); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(cx, cy, 21, 0, TAU); x.fill(); });
      x.strokeStyle = gold; x.lineWidth = 6; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(40 + k * 58, 30); x.lineTo(40 + k * 58, 70); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(56, 420); x.lineTo(108, 452); x.moveTo(200, 420); x.lineTo(148, 452); x.stroke();
      x.fillStyle = '#c8ccd6'; x.beginPath(); x.arc(150, 340, 9, 0, TAU); x.fill(); fitText(x, 'BIG BANG', w / 2, 372, 30, w - 40, gold, '#000');
    }), { emis: 0.9, spec: 0.9 });
    const glassT = mat(tex(256, 512, (x, w, h) => {
      const gr = x.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.4, 300); gr.addColorStop(0, '#ff9a3c'); gr.addColorStop(0.5, '#b0246a'); gr.addColorStop(1, '#12081d'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 5; x.beginPath(); x.moveTo(w / 2, h * 0.4); x.lineTo(w / 2 + Math.cos(a) * 320, h * 0.4 + Math.sin(a) * 320); x.stroke(); }
      x.fillStyle = '#c8ccd6'; x.beginPath(); x.arc(w / 2, h * 0.4, 46, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2 - 14, h * 0.4 - 14, 12, 0, TAU); x.fill();
      fitText(x, g.title.toUpperCase(), w / 2, 76, 40, w - 24, gold, '#000'); text(x, 'COMING SOON', w / 2, h - 60, `15px ${PIX}`, '#fff', '#000');
    }), { emis: 1, spec: 0.5 });
    for (const [lx, lz, top] of [[-56, 60, 100], [56, 60, 100], [-56, 244, 84], [56, 244, 84]]) box(metal, T, lx - 4, lx + 4, 0, top, lz - 4, lz + 4);   // legs
    const A = [70, 152], B = [254, 112], C = [254, 82], D = [70, 98];                                                                                  // table side outline [z, y]
    for (const sx of [-62, 62]) quad(wood, T, [sx, A[1], A[0]], [sx, B[1], B[0]], [sx, C[1], C[0]], [sx, D[1], D[0]]);
    quad(field, T, [-58, A[1] - 4, A[0]], [58, A[1] - 4, A[0]], [58, B[1] - 4, B[0]], [-58, B[1] - 4, B[0]]);                                            // playfield
    quad(wood, T, [-62, B[1], B[0]], [62, B[1], B[0]], [62, C[1], C[0]], [-62, C[1], C[0]]);                                                            // front apron
    for (const sx of [-60, 60]) quad(solid(gold, 0.6, 1), T, [sx - 2, A[1], A[0]], [sx + 2, A[1], A[0]], [sx + 2, B[1], B[0]], [sx - 2, B[1], B[0]]);     // rails
    sphere(solid('#ff2a3c', 0.4, 1), T, 46, 98, 258, 7);                                                                                               // plunger
    box(wood, T, -62, 62, 96, 152, 28, 70); box(wood, T, -66, 66, 152, 336, 28, 70, { front: glassT });                                                 // backbox
    box(solid(gold, 1, 0), T, -66, 66, 336, 342, 28, 72);
    glow('#b06cff', T, 0, 230, 2, 420, 460); light(T, [0, 240, 300], '#b06cff', 0.7);
    station(g, T, 160, 258, 342);
  }

  // ---------- claw machine ----------
  function claw(g, T) {
    const hot = '#ff4fd8', metal = solid('#c8ccd6', 0.15, 1), post = solid('#ffd23e', 0.5, 0.9);
    const front = mat(tex(256, 256, (x, w, h) => {
      x.fillStyle = '#7a1466'; x.fillRect(0, 0, w, h); x.fillStyle = '#0c0c14'; x.fillRect(20, 20, w - 40, 70);
      fitText(x, g.title.toUpperCase(), w / 2, 56, 42, w - 56, '#ffd23e', '#000');
      x.fillStyle = '#0c0c14'; x.fillRect(150, 130, 80, 96); x.fillStyle = '#23232e'; x.fillRect(158, 138, 64, 80); text(x, 'PRIZE', 190, 240, `10px ${PIX}`, '#fff');
      x.fillStyle = '#15121f'; x.beginPath(); x.arc(64, 170, 26, 0, TAU); x.fill(); x.fillStyle = '#ff2a3c'; x.beginPath(); x.arc(64, 164, 16, 0, TAU); x.fill();
      x.fillStyle = '#35e06f'; x.beginPath(); x.arc(118, 172, 13, 0, TAU); x.fill(); text(x, 'COMING SOON', 76, 226, `9px ${PIX}`, '#fff');
    }), { emis: 0.8, spec: 0.4 });
    const glass = mat(tex(8, 8, x => { x.clearRect(0, 0, 8, 8); x.fillStyle = 'rgba(170,225,255,.16)'; x.fillRect(0, 0, 8, 8); }), { emis: 0.7, spec: 1, blend: true });
    box(solid('#7a1466', 0.25, 0.5), T, -85, 85, 0, 132, 0, 170, { front });
    box(solid('#2a0a26', 0.1, 0.3), T, -81, 81, 132, 138, 4, 166);                                                              // prize floor
    for (const [px, pz] of [[-82, 3], [82, 3], [-82, 167], [82, 167]]) box(post, T, px - 3, px + 3, 132, 330, pz - 3, pz + 3);
    box(solid('#0c0c14', 0, 0.4), T, -85, 85, 132, 330, 0, 3);                                                                  // back panel
    [[-50, 40, '#ff2a3c'], [-14, 34, '#3ea8ff'], [24, 44, '#ffd23e'], [56, 36, '#35e06f'], [-34, 78, '#b06cff'], [6, 86, '#ff7a1a'], [44, 82, '#ff4fd8'], [-58, 118, '#3ee6ff'], [-14, 126, '#ffd23e'], [30, 124, '#ff2a3c'], [-30, 60, '#35e06f'], [12, 58, '#3ea8ff']].forEach(([px, pz, c], k) => sphere(solid(c, 0.45, 0.6), T, px, 154 + (k > 9 ? 22 : 0), pz, 17));
    box(metal, T, 18, 22, 244, 326, 88, 92); sphere(metal, T, 20, 240, 90, 9);                                                  // the claw
    for (const [dx, dz] of [[-12, 0], [12, 0], [0, 12]]) box(metal, T, 20 + dx - 2, 20 + dx + 2, 212, 238, 90 + dz - 2, 90 + dz + 2);
    quad(glass, T, [-82, 330, 168], [82, 330, 168], [82, 134, 168], [-82, 134, 168]);
    for (const sx of [-83, 83]) quad(glass, T, [sx, 330, 4], [sx, 330, 166], [sx, 134, 166], [sx, 134, 4]);
    box(solid('#2a0a26', 0.1, 0.5), T, -88, 88, 330, 384, 0, 174); quad(neon(g.title.toUpperCase(), hot, 512, 128), T, [-82, 380, 176], [82, 380, 176], [82, 334, 176], [-82, 334, 176]);
    glow(hot, T, 0, 250, 176, 340, 380); light(T, [0, 300, 260], hot, 0.8);
    station(g, T, 196, 174, 384);
  }

  return { racer, golf, dance, pinball, claw };
}
