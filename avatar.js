// Big Bang Arcade avatar art: a cartoon character drawn with outlines and flat shading, built from the same
// choices as before (skin, hair, hair colour, and one item per wardrobe slot) and posed by a small skeleton.
// Also draws the item pictures used on the prize wall, in the closet and on loot cards.
const OL = '#170c14', G = '#ffc93a', GD = '#c98a12';
const hex = c => { const n = parseInt(String(c).replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const shade = (c, f) => { const [r, g, b] = hex(c), k = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; };
const TEES = { 'tee-red': '#e01226', 'tee-black': '#22222b', 'tee-white': '#f4f4f8', 'tee-blue': '#2f7df0', 'tee-green': '#2fc463', 'tee-gold': '#ffc93a', 'tee-purple': '#a45cf0', 'tee-orange': '#ff7a1a' };
const PANTS = { 'jeans-black': '#2b2b36', 'jeans-blue': '#2f55b0', 'shorts-grey': '#8a8f9c', 'pants-camo': '#55682f', 'pants-red': '#d2142a' };

// angles are measured from straight down, positive toward the right of the picture; f shortens a limb that points at the viewer
const POSES = {
  idle:   { aL: [-0.22, 0.32], aR: [0.22, -0.32], lL: [-0.07, 0], lR: [0.07, 0] },
  walk1:  { aL: [-0.34, 0.2], aR: [0.12, -0.5], lL: [-0.1, 0, 0.8], lR: [0.08, 0], y: -1.5 },
  walk2:  { aL: [-0.12, 0.5], aR: [0.34, -0.2], lL: [-0.08, 0], lR: [0.1, 0, 0.8], y: -1.5 },
  punch:  { aL: [-0.75, 2.5], aR: [1.5, 0.06, 1.12], lL: [-0.22, 0.1], lR: [0.3, -0.12], tilt: 0.07, fistR: 1.5 },
  kick:   { aL: [-1.0, 0.5], aR: [0.9, 1.1], lL: [-0.1, 0], lR: [1.28, 0.1, 1.1], tilt: -0.14, kick: 1 },
  jump:   { aL: [-2.6, -0.3], aR: [2.6, 0.3], lL: [-0.42, 0.9, 0.85], lR: [0.42, -0.9, 0.85], y: -4 },
  spin:   { aL: [-1.5, 0], aR: [1.5, 0], lL: [-0.5, 0.2], lR: [0.75, 0.3], tilt: 0.1 },
  blast:  { aL: [0.55, 1.1], aR: [1.45, 0.12, 1.08], lL: [-0.3, 0.12], lR: [0.26, -0.1], tilt: 0.05, orb: 1, palmR: 1 },
  hit:    { aL: [-1.3, -0.5], aR: [1.1, 0.7], lL: [-0.2, 0.3], lR: [0.34, 0.1], tilt: -0.26, ouch: 1 },
  wave:   { aL: [-0.22, 0.32], aR: [2.35, 0.75], lL: [-0.07, 0], lR: [0.07, 0], palmR: 1 },
  dance1: { aL: [-0.5, 1.9], aR: [2.5, 0.4], lL: [-0.12, 0, 0.82], lR: [0.2, 0], tilt: 0.09, y: -1 },
  dance2: { aL: [-2.5, -0.4], aR: [0.5, -1.9], lL: [-0.2, 0], lR: [0.12, 0, 0.82], tilt: -0.09, y: -1 },
};

export function drawAvatar(x, W, H, a, name, fit, look, pose, tint, AV, WEAR) {
  x.clearRect(0, 0, W, H); x.save();
  const tagH = name ? H * 0.11 : 0, s = Math.min(W / 116, (H - tagH) / 160), ox = (W - 100 * s) / 2, oy = H - 146.5 * s;
  x.translate(ox, oy); x.scale(s, s); x.lineJoin = 'round'; x.lineCap = 'round';
  const P = POSES[pose] || POSES.idle, f = fit || {}, item = id => (WEAR || []).find(w => w.id === id) || null;
  const sk = AV.skin[a.skin] || '#b9794f', skD = shade(sk, -0.2), hc = AV.hc[a.hc] || '#111', hcD = shade(hc, -0.35), dark = hex(hc).reduce((t, v) => t + v, 0) < 150, hcL = dark ? '#4a4a60' : shade(hc, 0.3);
  const shirt = f.shirt || 'tee-red', top = shirt === 'jersey' ? '#1d1d24' : shirt === 'suit' ? '#1d1d24' : shirt === 'hoodie' ? '#e01226' : shirt === 'loot-jacket' ? '#1d1d24' : TEES[shirt] || (item(shirt) || {}).c || '#e01226';
  const longSleeve = ['hoodie', 'suit', 'loot-jacket'].includes(shirt), noSleeve = shirt === 'jersey';
  const pant = PANTS[f.pants] || (item(f.pants) || {}).c || '#2b2b36', shorts = f.pants === 'shorts-grey';
  const ol = 2.3;
  const poly = (pts, fill, close = true, lw = ol) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (close) x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const ell = (cx, cy, rx, ry, fill, lw = ol, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, 7); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const seg = (p, q, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke(); };
  const limb = (pts, ws, cols) => { for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], ws[i] + ol * 2, OL); for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], ws[i], cols[i]); };
  const dir = (p, ang, len) => [p[0] + Math.sin(ang) * len, p[1] + Math.cos(ang) * len];

  // lean the whole body around the hips
  x.translate(50, 102 + (P.y || 0)); x.rotate(P.tilt || 0); x.translate(-50, -102);
  if (look && look.curvy) { x.translate(50, 0); x.scale(1.04, 1); x.translate(-50, 0); }

  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(50, 144.5, 27, 4.2, 0, 0, 7); x.fill();
  const HX = 50, HY = 37;
  const headOn = () => { x.save(); x.translate(HX, 60); x.scale(1.2, 1.2); x.translate(-HX, -60); }, bodyOn = () => { x.save(); x.translate(50, 0); x.scale(1.2, 1); x.translate(-50, 0); };
  // ---- hair that hangs behind the body ----
  headOn();
  if (a.hair === 0 || (look && look.curvy)) for (const [dx, len, wob] of [[-25, 44, 2], [-18, 50, -2], [18, 50, 2], [25, 44, -2], [-9, 40, 1], [9, 40, -1]]) { const p0 = [HX + dx * 0.9, HY - 2], p1 = [HX + dx + wob, HY + len * 0.55], p2 = [HX + dx * 1.05 - wob, HY + len]; limb([p0, p1, p2], [6.4, 5.6], [hc, hc]); x.strokeStyle = hcL; x.lineWidth = 0.9; for (const t of [0.35, 0.6, 0.85]) { const m = [p0[0] + (p2[0] - p0[0]) * t, p0[1] + (p2[1] - p0[1]) * t]; x.beginPath(); x.moveTo(m[0] - 2.2, m[1]); x.lineTo(m[0] + 2.2, m[1] + 1); x.stroke(); } }
  if (a.hair === 2) { for (const pass of [0, 1]) for (let i = 0; i < 11; i++) { const an = Math.PI + i / 10 * Math.PI, cx = HX + Math.cos(an) * 24, cy = HY - 6 + Math.sin(an) * 22; x.beginPath(); x.arc(cx, cy, pass ? 10.5 : 10.5 + ol, 0, 7); x.fillStyle = pass ? hc : OL; x.fill(); } ell(HX, HY - 10, 24, 20, hc, 0); }
  x.restore(); bodyOn();
  if (shirt === 'hoodie') ell(50, 63, 19, 9, '#b00e1e');

  // ---- legs and shoes ----
  const shoeCol = f.shoes === 'boots' ? '#c98a3a' : f.shoes === 'kicks-black' ? '#22222b' : '#f4f4f8', shoeAcc = f.shoes === 'boots' ? '#8a5a1e' : '#e01226';
  const leg = (hip, L, side) => {
    const k = L[2] || 1, knee = dir(hip, L[0], 18 * k), foot = dir(knee, L[0] + L[1], 18 * k);
    limb([hip, knee, foot], [12.5, 11], [pant, shorts ? sk : pant]);
    if (f.pants === 'pants-camo') { x.fillStyle = '#2f3a18'; for (const t of [0.25, 0.6]) { const m = [hip[0] + (knee[0] - hip[0]) * t + side * 2, hip[1] + (knee[1] - hip[1]) * t]; x.beginPath(); x.ellipse(m[0], m[1], 3, 2, 0.5, 0, 7); x.fill(); } x.fillStyle = '#7a8a4a'; const m = [knee[0] + (foot[0] - knee[0]) * 0.45 - side, knee[1] + (foot[1] - knee[1]) * 0.45]; x.beginPath(); x.ellipse(m[0], m[1], 2.6, 1.8, -0.4, 0, 7); x.fill(); }
    if (f.pants === 'pants-red') { seg([hip[0] + side * 4.2, hip[1] + 2], [knee[0] + side * 4.2, knee[1]], 1.5, '#fff'); seg([knee[0] + side * 3.6, knee[1]], [foot[0] + side * 3.6, foot[1] - 3], 1.5, '#fff'); }
    if (/^jeans/.test(f.pants || 'jeans-black') && !shorts) { x.setLineDash([1.6, 2.2]); seg([hip[0] + side * 3.6, hip[1] + 3], [knee[0] + side * 3.6, knee[1]], 0.8, shade(pant, 0.45)); seg([knee[0] + side * 3, knee[1]], [foot[0] + side * 3, foot[1] - 4], 0.8, shade(pant, 0.45)); x.setLineDash([]); }
    // shoe: a chunky sneaker (or boot) pointing a little outward, or straight out for a kick
    const kick = P.kick && side > 0, an = kick ? L[0] + L[1] : side * 0.25;
    x.save(); x.translate(foot[0], foot[1]); x.rotate(kick ? -(Math.PI / 2 - an) * 0.2 : 0); x.scale(1.12, 1.18);
    const dx = kick ? 5 : side * 3.2;
    poly([[dx - 9.5, 1], [dx - 8.5, -5.5], [dx + 1, -7.5], [dx + 8.5, -3.5], [dx + 10.5, 2.5], [dx + 9.5, 6.5], [dx - 9.5, 6.5]], shoeCol);
    poly([[dx - 9.5, 4], [dx + 10.4, 4], [dx + 9.5, 6.5], [dx - 9.5, 6.5]], f.shoes === 'boots' ? '#5a3a14' : f.shoes === 'kicks-black' ? '#f4f4f8' : '#f4f4f8', true, 1.2);
    if (f.shoes !== 'kicks-black') poly([[dx + 2.5, -6.6], [dx + 8.5, -3.5], [dx + 10.3, 2.2], [dx + 4.5, 2.6]], shoeAcc, true, 1.2);
    x.fillStyle = f.shoes === 'boots' ? '#3dd6c8' : f.shoes === 'kicks-black' ? '#e01226' : OL; for (const lx of [-4.5, -1.5, 1.5]) { x.fillRect(dx + lx, -4.8 + Math.abs(lx) * 0.1, 1.6, 1.1); }
    x.restore();
    return { knee, foot };
  };
  leg([43, 101], P.lL, -1); leg([57, 101], P.lR, 1);

  // ---- torso ----
  const torso = [[33, 66], [36, 60.5], [44.5, 58], [55.5, 58], [64, 60.5], [67, 66], [64.5, 86], [65.5, 103], [50, 106], [34.5, 103], [35.5, 86]];
  poly(torso, top);
  x.save(); x.beginPath(); torso.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.clip();
  x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(57, 56, 14, 54); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(33, 56, 5, 54);
  if (shirt === 'jersey') { x.fillStyle = '#e01226'; x.fillRect(32, 56, 4.5, 52); x.fillRect(63.5, 56, 4.5, 52); x.fillStyle = G; x.fillRect(36.3, 56, 1.2, 52); x.fillRect(62.5, 56, 1.2, 52); x.font = "900 17px Impact,'Arial Black',sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 2.2; x.strokeStyle = '#e01226'; x.strokeText('T1', 50, 80); x.fillStyle = '#fff'; x.fillText('T1', 50, 80); }
  if (shirt === 'suit') { poly([[44, 58], [50, 78], [56, 58]], '#f4f4f8', true, 1.2); poly([[48.3, 61], [51.7, 61], [52.6, 76], [50, 80], [47.4, 76]], '#e01226', true, 1); seg([44, 58], [50, 84], 1.3, OL); seg([56, 58], [50, 84], 1.3, OL); x.fillStyle = G; x.fillRect(48.9, 88, 2.2, 2.2); x.fillRect(48.9, 95, 2.2, 2.2); }
  if (shirt === 'hoodie') { poly([[41, 88], [59, 88], [61, 101], [39, 101]], '#b00e1e', true, 1.2); seg([46, 62], [45.5, 74], 1.3, '#fff'); seg([54, 62], [54.5, 74], 1.3, '#fff'); x.font = "900 9px Impact,'Arial Black',sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('T1', 50, 80); }
  if (shirt === 'loot-jacket') { x.fillStyle = G; x.fillRect(49.2, 56, 1.6, 52); x.fillRect(32, 100.5, 36, 1.8); star(x, 41.5, 72, 5.2, '#ff2a3c', G); }
  x.restore();
  if (!longSleeve && shirt !== 'suit') { x.strokeStyle = shade(top, -0.3); x.lineWidth = 1.6; x.beginPath(); x.arc(50, 56.5, 7, 0.25, Math.PI - 0.25); x.stroke(); }
  if (f.belt === 'belt') { poly([[34.5, 96], [65.5, 96], [65.5, 103], [34.5, 103]], '#16161c', true, 1.4); poly([[42, 93.5], [58, 93.5], [60, 99.5], [58, 105.5], [42, 105.5], [40, 99.5]], G, true, 1.5); ell(50, 99.5, 4.2, 3.4, GD, 1); }
  if (f.chain === 'chain') { x.strokeStyle = OL; x.lineWidth = 3.6; x.beginPath(); x.arc(50, 57, 10.5, 0.2, Math.PI - 0.2); x.stroke(); x.strokeStyle = G; x.lineWidth = 2; x.beginPath(); x.arc(50, 57, 10.5, 0.2, Math.PI - 0.2); x.stroke(); poly([[47, 67], [53, 67], [53, 73], [50, 75.5], [47, 73]], G, true, 1.2); }
  if (f.chain === 'loot-chain') { x.strokeStyle = OL; x.lineWidth = 3.6; x.beginPath(); x.arc(50, 57, 11, 0.2, Math.PI - 0.2); x.stroke(); x.strokeStyle = '#31d7ff'; x.lineWidth = 2; x.beginPath(); x.arc(50, 57, 11, 0.2, Math.PI - 0.2); x.stroke(); star(x, 50, 71.5, 6, '#fff', '#31d7ff'); }

  // ---- arms ----
  const arm = (sh, A, side) => {
    const k = A[2] || 1, el = dir(sh, A[0], 17 * k), ha = dir(el, A[0] + A[1], 16 * k), sleeve = longSleeve ? top : sk, mid = [sh[0] + (el[0] - sh[0]) * 0.62, sh[1] + (el[1] - sh[1]) * 0.62];
    limb([sh, el, ha], [10, 8.8], [sleeve, sleeve]);
    if (!longSleeve && !noSleeve) { seg(sh, mid, 11.4 + ol * 2, OL); seg(sh, mid, 11.4, top); }
    if (shirt === 'loot-jacket') seg([el[0] + (ha[0] - el[0]) * 0.72, el[1] + (ha[1] - el[1]) * 0.72], [el[0] + (ha[0] - el[0]) * 0.86, el[1] + (ha[1] - el[1]) * 0.86], 9, G);
    const big = side > 0 && P.fistR ? P.fistR : 1, glove = f.hand === 'loot-gloves', hr = (glove ? 6.8 : 5.4) * big;
    if (side > 0 && P.palmR) { ell(ha[0], ha[1], hr * 0.95, hr * 1.15, glove ? '#b06cff' : sk, ol, A[0] + A[1]); for (const t of [-0.5, 0, 0.5]) { const tip = dir(ha, A[0] + A[1] + t * 0.7, hr * 1.9); seg(ha, tip, 2.6 + ol, OL); seg(ha, tip, 2.4, glove ? '#b06cff' : sk); } }
    else { ell(ha[0], ha[1], hr, hr * 0.92, glove ? '#b06cff' : sk); if (big > 1) { x.strokeStyle = glove ? '#7a3fc0' : skD; x.lineWidth = 1; for (const t of [-0.4, 0, 0.4]) { x.beginPath(); x.moveTo(ha[0] + t * hr, ha[1] - hr * 0.6); x.lineTo(ha[0] + t * hr, ha[1] + hr * 0.2); x.stroke(); } } }
    if (glove) { x.fillStyle = G; x.beginPath(); x.arc(ha[0], ha[1], hr * 0.34, 0, 7); x.fill(); }
    if (f.rings === 'ring' && !glove) { ell(ha[0] - 1.6, ha[1] - 0.6, 1.5, 1.5, G, 0.8); ell(ha[0] + 1.8, ha[1] + 0.4, 1.5, 1.5, G, 0.8); }
    return ha;
  };
  // an arm raised above the shoulder is drawn after the head so it is not hidden behind it
  const up = A => { const k = A[2] || 1, el = dir([0, 0], A[0], 17 * k), ha = dir(el, A[0] + A[1], 16 * k); return ha[1] < -6; }, lateL = up(P.aL), lateR = up(P.aR);
  if (!lateL) arm([35, 64], P.aL, -1); let hR = lateR ? null : arm([65, 64], P.aR, 1);
  const held = () => {
  if (f.hand === 'mic') { seg([hR[0], hR[1] + 5], [hR[0] + 1, hR[1] - 9], 3.4 + ol, OL); seg([hR[0], hR[1] + 5], [hR[0] + 1, hR[1] - 9], 3, G); ell(hR[0] + 1.4, hR[1] - 12, 4.4, 4.6, '#d8d8e0'); }
  if (f.hand === 'record') { ell(hR[0] + 3, hR[1] + 1, 8.5, 8.5, G); ell(hR[0] + 3, hR[1] + 1, 4.2, 4.2, GD, 1); ell(hR[0] + 3, hR[1] + 1, 1.3, 1.3, OL, 0); }
  if (P.orb) { const c = tint || '#31d7ff', o = [hR[0] + 11, hR[1] - 1]; x.globalAlpha = 0.35; ell(o[0], o[1], 13, 13, c, 0); x.globalAlpha = 1; ell(o[0], o[1], 8.5, 8.5, c); ell(o[0] - 1.5, o[1] - 1.5, 4, 4, '#fff', 0); }
  };
  if (!lateR) held();

  x.restore();
  // ---- head ----
  headOn(); x.translate(HX, HY); x.rotate(-(P.tilt || 0) * 0.55); x.translate(-HX, -HY);
  poly([[45, 54], [55, 54], [55.5, 61], [44.5, 61]], sk, true, ol); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(45.5, 56, 9, 4);
  ell(26.6, 39, 3.6, 5.2, sk); ell(73.4, 39, 3.6, 5.2, sk); ell(26.4, 44.6, 1.7, 1.7, G, 0.9);
  x.beginPath(); x.moveTo(27.5, 33); x.bezierCurveTo(27, 12, 73, 12, 72.5, 33); x.bezierCurveTo(73, 47, 63, 58.5, 50, 58.5); x.bezierCurveTo(37, 58.5, 27, 47, 27.5, 33); x.closePath(); x.fillStyle = sk; x.fill(); x.strokeStyle = OL; x.lineWidth = ol; x.stroke();
  x.save(); x.clip(); x.fillStyle = 'rgba(0,0,0,.13)'; x.beginPath(); x.ellipse(70, 42, 12, 22, 0.2, 0, 7); x.fill(); x.restore();
  // face
  const ouch = !!P.ouch;
  for (const sx of [-1, 1]) {
    const ex = HX + sx * 9.6, ey = HY + 1.5;
    if (f.eyes === 'shades' || f.eyes === 'loot-visor' || (look && look.goggles)) continue;
    if (ouch) { seg([ex - 3.4, ey - 2.4], [ex + 3.4, ey + 2.4], 2, OL); seg([ex - 3.4, ey + 2.4], [ex + 3.4, ey - 2.4], 2, OL); continue; }
    ell(ex, ey, 5, 5.4, '#fff', 1.5); ell(ex + sx * 0.6, ey + 0.6, 2.9, 3.2, '#4a2c16', 0); ell(ex + sx * 0.6, ey + 0.8, 1.6, 1.8, '#000', 0); ell(ex + sx * 0.6 - 1, ey - 0.6, 0.9, 0.9, '#fff', 0);
    seg([ex - 5.2, ey - 3.6], [ex + 5.2, ey - 3.6 + sx * -0.4], 1.7, OL);
  }
  if (!ouch) for (const sx of [-1, 1]) seg([HX + sx * 15.5, HY - 8.2], [HX + sx * 4.6, HY - 5.6], 2.9, hc === '#111111' || hcD ? OL : hcD);
  x.strokeStyle = skD; x.lineWidth = 1.5; x.beginPath(); x.moveTo(HX - 0.5, HY + 6); x.quadraticCurveTo(HX + 3, HY + 9.4, HX - 1.2, HY + 10); x.stroke();
  // mouth: a grin (gold fangs if owned), red lips through beer goggles, or a yelp when hit
  if (ouch) ell(HX, HY + 15.5, 3.6, 4.4, '#5a1420', 1.5);
  else { x.beginPath(); x.moveTo(HX - 8, HY + 12.6); x.quadraticCurveTo(HX, HY + 14.6, HX + 8.6, HY + 11.6); x.quadraticCurveTo(HX + 3, HY + 20.5, HX - 5, HY + 17.4); x.closePath(); x.fillStyle = f.fangs === 'fangs' ? G : '#fff'; x.fill(); x.strokeStyle = look && look.curvy ? '#d2142a' : OL; x.lineWidth = look && look.curvy ? 2.4 : 1.5; x.stroke(); x.strokeStyle = f.fangs === 'fangs' ? GD : '#c9c9d4'; x.lineWidth = 0.7; for (const tx of [-3.4, 0.2, 3.8]) { x.beginPath(); x.moveTo(HX + tx, HY + 13.4); x.lineTo(HX + tx - 0.3, HY + 17.2); x.stroke(); } }
  // eyewear
  if (f.eyes === 'shades') { for (const sx of [-1, 1]) poly([[HX + sx * 2.6, HY - 2.6], [HX + sx * 17, HY - 3.6], [HX + sx * 16, HY + 5.4], [HX + sx * 9.5, HY + 8], [HX + sx * 3.4, HY + 4.6]], '#d2142a'); seg([HX - 2.6, HY - 1.4], [HX + 2.6, HY - 1.4], 1.8, G); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(HX - 14, HY - 2, 4, 1.6); x.fillRect(HX + 6, HY - 2, 4, 1.6); }
  if (f.eyes === 'loot-visor') { poly([[HX - 21, HY - 3.6], [HX + 21, HY - 3.6], [HX + 20, HY + 5.6], [HX - 20, HY + 5.6]], '#31d7ff'); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(HX - 17, HY - 1.6, 9, 1.8); x.fillStyle = '#0a5a70'; x.fillRect(HX - 20, HY + 3, 40, 1.4); }
  if (look && look.goggles) { for (const sx of [-1, 1]) ell(HX + sx * 9.6, HY + 1.5, 7.4, 6.6, '#ffb400'); seg([HX - 2.4, HY + 1.5], [HX + 2.4, HY + 1.5], 2.6, '#16161c'); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(HX - 14, HY - 2.6, 5, 1.6); x.fillRect(HX + 5, HY - 2.6, 5, 1.6); }
  // ---- hair on top ----
  const cap = (col, d = 0) => { x.beginPath(); x.moveTo(26.5 - d, 33); x.bezierCurveTo(25 - d, 8 - d, 75 + d, 8 - d, 73.5 + d, 33); x.bezierCurveTo(68, 23.5, 59, 21, 50, 23.4); x.bezierCurveTo(41, 21, 32, 23.5, 26.5 - d, 33); x.closePath(); x.fillStyle = col; x.fill(); x.strokeStyle = OL; x.lineWidth = ol; x.stroke(); };
  if (a.hair === 1) { cap(hc); x.strokeStyle = hcL; x.lineWidth = 1; x.beginPath(); x.arc(50, 30, 20, Math.PI * 1.2, Math.PI * 1.8); x.stroke(); }
  if (a.hair === 0 || (look && look.curvy)) { cap(hc, 1); for (const pass of [0, 1]) for (let i = 0; i < 7; i++) { const cx = 30 + i * 6.7, cy = 16.5 - Math.sin(i / 6 * Math.PI) * 6.5; x.beginPath(); x.arc(cx, cy, pass ? 5 : 5 + ol, 0, 7); x.fillStyle = pass ? hc : OL; x.fill(); } x.strokeStyle = hcL; x.lineWidth = 1; for (let i = 0; i < 7; i++) { const cx = 30 + i * 6.7, cy = 16.5 - Math.sin(i / 6 * Math.PI) * 6.5; x.beginPath(); x.arc(cx, cy, 3, Math.PI * 1.1, Math.PI * 1.7); x.stroke(); } for (const [dx, len] of [[-22, 34], [22, 34]]) { const p0 = [HX + dx, HY - 8], p1 = [HX + dx * 1.12, HY + len * 0.5], p2 = [HX + dx * 1.02, HY + len]; limb([p0, p1, p2], [6.4, 5.6], [hc, hc]); x.strokeStyle = hcL; x.lineWidth = 0.9; for (const t of [0.3, 0.55, 0.8]) { const m = [p0[0] + (p2[0] - p0[0]) * t, p0[1] + (p2[1] - p0[1]) * t]; x.beginPath(); x.moveTo(m[0] - 2.4, m[1]); x.lineTo(m[0] + 2.4, m[1] + 1); x.stroke(); } } }
  if (a.hair === 2) { for (const pass of [0, 1]) for (let i = 0; i < 9; i++) { const an = Math.PI * 1.08 + i / 8 * Math.PI * 0.84, cx = HX + Math.cos(an) * 21, cy = HY - 6 + Math.sin(an) * 19; x.beginPath(); x.arc(cx, cy, pass ? 8.4 : 8.4 + ol, 0, 7); x.fillStyle = pass ? hc : OL; x.fill(); } x.fillStyle = hc; x.beginPath(); x.ellipse(HX, HY - 15, 20, 9, 0, 0, 7); x.fill(); x.fillStyle = hcL; for (const [cx, cy] of [[38, 14], [50, 9], [61, 15], [44, 20]]) { x.beginPath(); x.arc(cx, cy, 1.6, 0, 7); x.fill(); } }
  if (a.hair === 3 && !f.hat) { cap(hc, 1.5); poly([[26, 29], [74, 29], [86, 33.5], [84, 37], [27, 34]], hcD); }
  // hats sit over the hair
  if (f.hat === 'beanie') { cap('#22222b', 2); poly([[24, 27], [76, 27], [77, 35], [23, 35]], '#3a3a48'); x.strokeStyle = '#16161c'; x.lineWidth = 0.9; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(27 + i * 6.4, 28); x.lineTo(27 + i * 6.4, 34); x.stroke(); } }
  if (f.hat === 'cap') { cap('#e01226', 1.5); poly([[25, 28.5], [75, 28.5], [90, 31.5], [89, 36], [26, 34]], '#22222b'); poly([[43, 14], [57, 14], [57, 23], [43, 23]], '#22222b', true, 1.2); x.font = "900 8px Impact,'Arial Black',sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText('T1', 50, 18.8); }
  if (f.hat === 'crown') { poly([[30, 24], [28, 6], [38, 15], [44, 3], [50, 14], [56, 3], [62, 15], [72, 6], [70, 24]], G); poly([[30, 20], [70, 20], [70, 25.5], [30, 25.5]], GD, true, 1.4); for (const [cx, col] of [[40, '#31d7ff'], [50, '#ff2a3c'], [60, '#3dff9a']]) ell(cx, 22.6, 2.2, 2.2, col, 0.9); }
  if (f.hat === 'loot-halo') { x.globalAlpha = 0.4; ell(50, 5, 23, 6.5, G, 0); x.globalAlpha = 1; x.strokeStyle = OL; x.lineWidth = 5.4; x.beginPath(); x.ellipse(50, 5, 19, 4.6, 0, 0, 7); x.stroke(); x.strokeStyle = G; x.lineWidth = 3; x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = 1; x.beginPath(); x.ellipse(50, 4.4, 17, 3.4, 0, Math.PI, Math.PI * 1.7); x.stroke(); }
  x.restore();
  if (lateL || lateR) { bodyOn(); if (lateL) arm([35, 64], P.aL, -1); if (lateR) { hR = arm([65, 64], P.aR, 1); held(); } x.restore(); }
  x.restore();
  if (pose === 'hit') { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,40,60,.4)'; x.fillRect(0, 0, W, H); x.restore(); }
  if (name) { x.save(); x.font = `${Math.round(H * 0.082)}px Bungee,Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineJoin = 'round'; x.lineWidth = Math.max(3, H * 0.022); x.strokeStyle = '#000'; x.strokeText(name, W / 2, 2, W - 6); x.fillStyle = '#ffc93a'; x.fillText(name, W / 2, 2, W - 6); x.restore(); }
}
function star(x, cx, cy, r, fill, edge) { x.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = edge || OL; x.lineWidth = 1.1; x.stroke(); }

// ---------- item pictures (prize wall, closet, loot cards) ----------
export function drawIcon(x, S, it) {
  x.clearRect(0, 0, S, S); x.save(); x.scale(S / 64, S / 64); x.lineJoin = 'round'; x.lineCap = 'round';
  const poly = (pts, fill, lw = 2.4) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const ell = (cx, cy, rx, ry, fill, lw = 2.4, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, 7); if (fill) { x.fillStyle = fill; x.fill(); } if (lw) { x.strokeStyle = OL; x.lineWidth = lw; x.stroke(); } };
  const line = (a, b, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); };
  const txt = (s, cx, cy, px, c, edge) => { x.font = `900 ${px}px Impact,'Arial Black',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (edge) { x.lineWidth = 3; x.strokeStyle = edge; x.strokeText(s, cx, cy); } x.fillStyle = c; x.fillText(s, cx, cy); };
  const id = it.id || '', slot = it.slot || '';
  const tee = (c, sleeves = true) => { const body = sleeves ? [[20, 10], [27, 7], [32, 12], [37, 7], [44, 10], [58, 20], [51, 30], [45, 26], [45, 56], [19, 56], [19, 26], [13, 30], [6, 20]] : [[22, 8], [28, 8], [32, 15], [36, 8], [42, 8], [46, 24], [46, 56], [18, 56], [18, 24]]; poly(body, c); x.save(); x.beginPath(); body.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.clip(); x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(38, 0, 30, 64); x.restore(); x.strokeStyle = shade(c, -0.35); x.lineWidth = 1.6; x.beginPath(); x.arc(32, 8, 6, 0.2, Math.PI - 0.2); x.stroke(); };
  if (slot === 'shirt') {
    if (id === 'jersey') { tee('#1d1d24', false); line([19.2, 26], [19.2, 55], 2, '#e01226'); line([44.8, 26], [44.8, 55], 2, '#e01226'); txt('T1', 32, 36, 17, '#fff', '#e01226'); }
    else if (id === 'hoodie') { ell(32, 12, 13, 8, '#b00e1e'); tee('#e01226'); poly([[23, 40], [41, 40], [43, 52], [21, 52]], '#b00e1e', 1.4); line([28, 14], [27.5, 26], 1.4, '#fff'); line([36, 14], [36.5, 26], 1.4, '#fff'); txt('T1', 32, 31, 9, '#fff'); }
    else if (id === 'suit') { tee('#1d1d24'); poly([[26, 8], [32, 30], [38, 8]], '#f4f4f8', 1.4); poly([[30.4, 12], [33.6, 12], [34.4, 27], [32, 31], [29.6, 27]], '#e01226', 1); line([26, 8], [32, 36], 1.4, OL); line([38, 8], [32, 36], 1.4, OL); }
    else if (id === 'loot-jacket') { tee('#1d1d24'); x.fillStyle = G; x.fillRect(31.2, 12, 1.6, 44); x.fillRect(19, 52, 26, 2); star(x, 25, 26, 5.5, '#ff2a3c', G); }
    else tee(TEES[id] || it.c || '#e01226');
  } else if (slot === 'pants') {
    const c = PANTS[id] || it.c || '#2b2b36', sh = id === 'shorts-grey', b = sh ? 38 : 58; poly([[16, 8], [48, 8], [51, b], [36, b], [32, 24], [28, b], [13, b]], c);
    line([16.5, 13], [47.5, 13], 1.6, shade(c, -0.35)); if (/jeans/.test(id)) { x.setLineDash([2, 2.4]); line([19, 16], [17, b - 3], 1, shade(c, 0.5)); line([45, 16], [47, b - 3], 1, shade(c, 0.5)); x.setLineDash([]); }
    if (id === 'pants-red') { line([18.5, 14], [16.5, b - 2], 2.2, '#fff'); line([45.5, 14], [47.5, b - 2], 2.2, '#fff'); }
    if (id === 'pants-camo') { for (const [cx, cy, c2] of [[22, 22, '#2f3a18'], [42, 30, '#2f3a18'], [20, 44, '#7a8a4a'], [44, 48, '#2f3a18'], [40, 18, '#7a8a4a']]) ell(cx, cy, 4, 2.6, c2, 0, 0.5); }
    if (sh) { line([14, 34], [27, 34], 1.4, shade(c, -0.3)); line([37, 34], [50, 34], 1.4, shade(c, -0.3)); }
  } else if (slot === 'shoes') {
    const boot = id === 'boots', c = boot ? '#c98a3a' : id === 'kicks-black' ? '#22222b' : '#f4f4f8', top = boot ? 12 : 22;
    poly([[10, top], [26, top - 2], [30, 30], [50, 36], [58, 44], [58, 52], [8, 52]], c); poly([[8, 46], [58, 46], [58, 53], [8, 53]], boot ? '#5a3a14' : '#f4f4f8', 1.6);
    if (!boot && id !== 'kicks-black') poly([[34, 31.5], [50, 36], [57.5, 43.5], [42, 44]], '#e01226', 1.4); if (id === 'kicks-black') line([12, 40], [40, 42], 2, '#e01226');
    x.fillStyle = boot ? '#3dd6c8' : id === 'kicks-black' ? '#e01226' : OL; for (let i = 0; i < 4; i++) x.fillRect(22 + i * 3.6, top + 6 + i * 3.2, 5.5, 1.8);
  } else if (slot === 'hat') {
    if (id === 'beanie') { x.beginPath(); x.moveTo(10, 44); x.bezierCurveTo(8, 4, 56, 4, 54, 44); x.closePath(); x.fillStyle = '#2a2a34'; x.fill(); x.strokeStyle = OL; x.lineWidth = 2.4; x.stroke(); poly([[8, 40], [56, 40], [57, 52], [7, 52]], '#3d3d4c'); for (let i = 0; i < 7; i++) line([13 + i * 6.4, 42], [13 + i * 6.4, 50], 1, '#16161c'); ell(32, 9, 4.5, 4, '#3d3d4c'); }
    else if (id === 'cap') { x.beginPath(); x.moveTo(8, 42); x.bezierCurveTo(6, 6, 50, 6, 48, 42); x.closePath(); x.fillStyle = '#e01226'; x.fill(); x.strokeStyle = OL; x.lineWidth = 2.4; x.stroke(); poly([[8, 40], [48, 40], [62, 44], [60, 51], [8, 48]], '#22222b'); poly([[19, 20], [37, 20], [37, 33], [19, 33]], '#22222b', 1.4); txt('T1', 28, 27, 11, '#fff'); }
    else if (id === 'crown') { poly([[10, 50], [6, 16], [20, 30], [32, 8], [44, 30], [58, 16], [54, 50]], G); poly([[10, 42], [54, 42], [54, 51], [10, 51]], GD, 1.6); for (const [cx, c] of [[20, '#31d7ff'], [32, '#ff2a3c'], [44, '#3dff9a']]) ell(cx, 46.5, 3.2, 3.2, c, 1); for (const [cx, cy] of [[6, 16], [32, 8], [58, 16]]) ell(cx, cy, 3, 3, '#ff2a3c', 1.2); }
    else { x.globalAlpha = 0.35; ell(32, 30, 28, 12, G, 0); x.globalAlpha = 1; x.strokeStyle = OL; x.lineWidth = 9; x.beginPath(); x.ellipse(32, 30, 22, 8, 0, 0, 7); x.stroke(); x.strokeStyle = G; x.lineWidth = 5; x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = 1.4; x.beginPath(); x.ellipse(32, 29, 20, 6, 0, Math.PI, Math.PI * 1.7); x.stroke(); }
  } else if (slot === 'eyes') {
    if (id === 'loot-visor') { poly([[6, 22], [58, 22], [56, 40], [8, 40]], '#31d7ff'); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(12, 26, 14, 3); x.fillStyle = '#0a5a70'; x.fillRect(8, 35, 48, 2.4); }
    else { for (const sx of [-1, 1]) poly([[32 + sx * 4, 22], [32 + sx * 27, 20], [32 + sx * 25, 36], [32 + sx * 15, 43], [32 + sx * 5, 36]], '#d2142a'); line([28, 24], [36, 24], 2.4, G); x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(11, 24, 8, 2.6); x.fillRect(41, 24, 8, 2.6); }
  } else if (slot === 'chain') { const c = id === 'loot-chain' ? '#31d7ff' : G; x.strokeStyle = OL; x.lineWidth = 7; x.beginPath(); x.arc(32, 14, 22, 0.25, Math.PI - 0.25); x.stroke(); x.strokeStyle = c; x.lineWidth = 3.6; x.setLineDash([3, 2.6]); x.stroke(); x.setLineDash([]); if (id === 'loot-chain') star(x, 32, 44, 11, '#fff', c); else { poly([[25, 36], [39, 36], [39, 48], [32, 54], [25, 48]], G); txt('T1', 32, 43.5, 9, OL); } }
  else if (slot === 'fangs') { poly([[10, 22], [54, 22], [50, 34], [14, 34]], '#5a1420'); for (let i = 0; i < 5; i++) poly([[14 + i * 7.4, 22], [21 + i * 7.4, 22], [17.5 + i * 7.4, i === 1 || i === 3 ? 38 : 31]], G, 1.4); }
  else if (slot === 'rings') { for (const [cx, cy] of [[22, 36], [42, 32]]) { x.strokeStyle = OL; x.lineWidth = 8.5; x.beginPath(); x.arc(cx, cy, 11, 0, 7); x.stroke(); x.strokeStyle = G; x.lineWidth = 5; x.stroke(); } star(x, 22, 23, 6, '#31d7ff', OL); star(x, 42, 19, 6, '#ff2a3c', OL); }
  else if (slot === 'belt') { poly([[4, 24], [60, 24], [60, 40], [4, 40]], '#16161c'); poly([[16, 14], [48, 14], [54, 32], [48, 50], [16, 50], [10, 32]], G); ell(32, 32, 10, 9, GD, 1.6); star(x, 32, 32, 6.5, G, OL); }
  else if (slot === 'hand') {
    if (id === 'mic') { line([26, 58], [36, 26], 8, OL); line([26, 58], [36, 26], 5, G); ell(38, 18, 11, 11.5, '#d8d8e0'); x.strokeStyle = '#8a8a96'; x.lineWidth = 1; for (const d of [-5, 0, 5]) { x.beginPath(); x.moveTo(28 + d * 0.2, 18 + d); x.lineTo(48, 18 + d); x.stroke(); } }
    else if (id === 'record') { ell(32, 32, 25, 25, G); ell(32, 32, 17, 17, null, 1); ell(32, 32, 9.5, 9.5, GD, 1.4); ell(32, 32, 2.4, 2.4, OL, 0); }
    else { poly([[14, 24], [20, 10], [40, 8], [50, 16], [52, 36], [44, 50], [22, 52], [14, 42]], '#b06cff'); poly([[18, 44], [46, 44], [48, 58], [16, 58]], '#7a3fc0', 2); for (const tx of [26, 34, 42]) line([tx, 12], [tx, 26], 1.4, '#7a3fc0'); star(x, 33, 34, 7, G, OL); }
  } else if (slot === 'move') {
    const C = { 'move-uppercut': '#ff2a3c', 'move-tornado': '#3dff9a', 'move-dash': '#ff4fd8', 'move-slam': '#b06cff', 'move-wave': '#ffc93a', 'move-meteor': '#ff7a1a' }[id] || '#31d7ff';
    x.globalAlpha = 0.25; ell(32, 32, 29, 29, C, 0); x.globalAlpha = 1;
    if (id === 'move-uppercut') { poly([[24, 60], [24, 30], [20, 30], [20, 18], [42, 14], [46, 26], [44, 34], [40, 34], [40, 60]], '#b9794f'); for (const tx of [26, 32, 38]) line([tx, 18], [tx, 28], 1.2, '#8a5a3c'); for (const [a, b] of [[[8, 16], [14, 6]], [[50, 10], [56, 4]], [[30, 8], [30, 2]]]) line(a, b, 3, C); }
    else if (id === 'move-tornado') { for (let i = 0; i < 5; i++) { const w = 26 - i * 4.6, y = 10 + i * 10; x.strokeStyle = OL; x.lineWidth = 8; x.beginPath(); x.ellipse(32 + (i % 2 ? 3 : -3), y, w, 4.4, 0, 0, 7); x.stroke(); x.strokeStyle = C; x.lineWidth = 4.6; x.stroke(); } }
    else if (id === 'move-dash') { poly([[36, 4], [14, 34], [28, 34], [22, 60], [50, 26], [34, 26], [44, 4]], C); for (const y of [16, 30, 44]) line([2, y], [12, y], 3, '#fff'); }
    else if (id === 'move-slam') { poly([[22, 4], [42, 4], [44, 24], [38, 30], [26, 30], [20, 24]], '#b9794f'); for (const r of [12, 20, 28]) { x.strokeStyle = OL; x.lineWidth = 5.5; x.beginPath(); x.ellipse(32, 48, r, r * 0.34, 0, 0, 7); x.stroke(); x.strokeStyle = C; x.lineWidth = 3; x.stroke(); } }
    else if (id === 'move-wave') { poly([[4, 26], [40, 20], [40, 44], [4, 38]], '#fff'); poly([[4, 29], [40, 24], [40, 40], [4, 35]], C, 0); ell(46, 32, 15, 15, C); ell(43, 29, 6.5, 6.5, '#fff', 0); for (const [a, b] of [[[50, 10], [56, 4]], [[58, 46], [62, 52]], [[30, 12], [26, 6]]]) line(a, b, 2.4, '#fff'); }
    else { poly([[4, 6], [30, 22], [22, 30]], '#ffc93a'); poly([[10, 4], [34, 18], [28, 26]], '#fff', 0); ell(40, 40, 19, 19, C); ell(36, 36, 9, 9, '#ffc93a', 0); for (const [cx, cy, r] of [[46, 46, 4], [34, 50, 2.6], [50, 34, 2.6]]) ell(cx, cy, r, r, '#8a2a08', 0); }
  } else if (slot === 'upgrade') {
    const kind = id.split('-')[1], lvl = +id.split('-')[2] || 2, C = kind === 'power' ? '#ff2a3c' : kind === 'speed' ? '#31d7ff' : '#ffc93a';
    x.globalAlpha = 0.25; ell(32, 32, 29, 29, C, 0); x.globalAlpha = 1;
    poly([[32, 6], [52, 28], [40, 28], [40, 46], [24, 46], [24, 28], [12, 28]], C); for (let i = 0; i < 3; i++) poly([[14 + i * 13, 51], [24 + i * 13, 51], [24 + i * 13, 59], [14 + i * 13, 59]], i < lvl ? C : '#3a2a55', 1.6); txt(kind === 'power' ? 'P' : kind === 'speed' ? 'S' : 'B', 32, 32, 14, '#fff', OL);
  } else if (id.startsWith('tokens') || it.coin) { ell(32, 32, 25, 25, G); ell(32, 32, 19, 19, GD, 1.6); txt('T', 32, 33.5, 24, G, OL); }
  else { x.font = '44px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(it.icon || '🎁', 32, 35); }
  x.restore();
}
// turn every <canvas data-ic="item id"> under root into that item's picture
export function paintIcons(root, find) { for (const c of (root || document).querySelectorAll('canvas[data-ic]')) { if (c.dataset.done === c.dataset.ic) continue; const it = find(c.dataset.ic) || { id: c.dataset.ic }; c.width = c.height = 128; drawIcon(c.getContext('2d'), 128, it); c.dataset.done = c.dataset.ic; } }
export const iconTag = id => `<canvas class="ic" data-ic="${String(id).replace(/[^a-z0-9-]/gi, '')}" width="128" height="128"></canvas>`;
