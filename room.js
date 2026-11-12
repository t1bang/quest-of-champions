// Big Bang Arcade — real-time 3D room (WebGL, no libraries).
// Lit 3D cabinets, coloured point lights, glossy reflective floor, neon glow.
import { customCabinets } from './cabs.js';

const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec2 aU;uniform mat4 uVP;uniform mat4 uM;varying vec3 vP;varying vec3 vN;varying vec2 vU;
void main(){vec4 w=uM*vec4(aP,1.);vP=w.xyz;vN=mat3(uM)*aN;vU=aU;gl_Position=uVP*w;}`;
const FS = `precision highp float;varying vec3 vP;varying vec3 vN;varying vec2 vU;uniform sampler2D uT;uniform vec3 uEye;uniform vec3 uLP[18];uniform vec3 uLC[18];
uniform vec3 uTint;uniform float uEmis;uniform float uSpec;uniform float uAlpha;uniform float uMirror;
void main(){if(uMirror>0.5&&vP.y<0.)discard;vec4 t=texture2D(uT,vU);if(t.a<0.04)discard;vec3 n=normalize(vN);vec3 v=normalize(uEye-vP);if(dot(n,v)<0.)n=-n;
vec3 lit=vec3(.2,.17,.27);vec3 sp=vec3(0.);
for(int i=0;i<18;i++){vec3 d=uLP[i]-vP;float r2=dot(d,d);vec3 l=d*inversesqrt(r2);float a=1./(1.+r2/160000.);lit+=uLC[i]*max(dot(n,l),0.)*a;sp+=uLC[i]*pow(max(dot(n,normalize(l+v)),0.),48.)*a;}
vec3 c=t.rgb*uTint*mix(lit,vec3(1.),uEmis)+sp*uSpec;float f=smoothstep(1000.,3400.,length(uEye-vP))*.55;c=mix(c,vec3(.05,.02,.09),f*(1.-uEmis*.7));
gl_FragColor=vec4(c,t.a*uAlpha);}`;

const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const trans = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };

// Floor plan, shared with app.js (movement and routes): main room half-width, back wall, front wall, Big Box,
// then the East Wing doorway half-width + centre, far wall, back wall and front wall.
export const DIMS = { HW: 1200, HD: 1100, ZF: 900, BZ: -100, WD: 200, WZ: -100, WX: 2800, WZ0: -900, WZ1: 700 };

export function buildRoom(canvas, GAMES, PRIZES, handlers, SOON = []) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const U = {}; for (const n of ['uVP', 'uM', 'uT', 'uEye', 'uLP', 'uLC', 'uTint', 'uEmis', 'uSpec', 'uAlpha', 'uMirror']) U[n] = gl.getUniformLocation(prog, n);
  const A = ['aP', 'aN', 'aU'].map(n => gl.getAttribLocation(prog, n));

  // ---------- textures (drawn on 2D canvases) ----------
  const BIG = "Bungee,Impact,'Arial Black',sans-serif", PIX = "'Press Start 2P',monospace";
  function tex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), t = gl.createTexture();
    const up = () => {
      draw(x, w, h); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    };
    up(); t.redraw = up; return t;
  }
  const white = tex(4, 4, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); });
  const glowT = tex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mats = [];
  const mat = (t, o = {}) => { const m = { t, blend: !!o.blend, v: [], tint: o.tint ? rgb(o.tint) : [1, 1, 1], emis: o.emis || 0, spec: o.spec == null ? 0.25 : o.spec, glow: !!o.glow, floor: !!o.floor, dyn: o.dyn || null }; mats.push(m); return m; };
  const solids = {}; const solid = (c, emis = 0, spec) => solids[c + emis] || (solids[c + emis] = mat(white, { tint: c, emis, spec }));
  const glows = {}; const glowM = c => glows[c] || (glows[c] = mat(glowT, { tint: c, emis: 1, glow: true }));
  const text = (x, s, cx, y, font, fill, stroke) => { x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; if (stroke) { x.lineWidth = 8; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(s, cx, y); } x.fillStyle = fill; x.fillText(s, cx, y); };
  const fitText = (x, s, cx, y, size, maxW, fill, stroke, fam = BIG) => { let f = size; do { x.font = `${f}px ${fam}`; f -= 2; } while (x.measureText(s).width > maxW && f > 8); text(x, s, cx, y, x.font, fill, stroke); };
  const neon = (s, color, w = 512, h = 128) => mat(tex(w, h, (x) => { x.clearRect(0, 0, w, h); x.shadowColor = color; x.shadowBlur = 22; fitText(x, s, w / 2, h / 2, h * 0.62, w - 40, '#fff', color); x.shadowBlur = 0; fitText(x, s, w / 2, h / 2, h * 0.62, w - 40, '#fff'); }), { emis: 1, spec: 0, blend: true });
  const images = {};
  const img = (src, cb) => { let e = images[src]; if (!e) { e = images[src] = { im: new Image(), ok: false, cbs: [] }; e.im.onload = () => { e.ok = true; e.cbs.forEach(f => f()); }; e.im.src = src; } if (cb) e.ok ? cb() : e.cbs.push(cb); return e; };
  const drawFit = (x, e, dx, dy, dw, dh, cover) => { if (!e.ok) return; const iw = e.im.naturalWidth || 300, ih = e.im.naturalHeight || 400, s = (cover ? Math.max : Math.min)(dw / iw, dh / ih), w = iw * s, h = ih * s; x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(e.im, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); x.restore(); };
  const withImg = (src, w, h, draw, repeat) => { const e = img(src), t = tex(w, h, (x, W, H) => draw(x, W, H, e), repeat); img(src, t.redraw); return t; };

  // ---------- geometry ----------
  const tf = (T, p) => { const c = Math.cos(T.th || 0), s = Math.sin(T.th || 0); return [T.x + p[0] * c + p[2] * s, p[1], T.z - p[0] * s + p[2] * c]; };
  function quad(m, T, a, b, c, d, uv = [0, 0, 1, 1]) { // a=top-left b=top-right c=bottom-right d=bottom-left
    const [A_, B_, C_, D_] = [a, b, c, d].map(p => tf(T, p));
    const e1 = [B_[0] - A_[0], B_[1] - A_[1], B_[2] - A_[2]], e2 = [D_[0] - A_[0], D_[1] - A_[1], D_[2] - A_[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...n) || 1;
    const put = (p, u, v) => m.v.push(p[0], p[1], p[2], n[0] / l, n[1] / l, n[2] / l, u, v);
    const [u0, v0, u1, v1] = uv;
    put(A_, u0, v0); put(B_, u1, v0); put(C_, u1, v1); put(A_, u0, v0); put(C_, u1, v1); put(D_, u0, v1);
  }
  function box(m, T, x0, x1, y0, y1, z0, z1, f = {}) {
    quad(f.front || m, T, [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]);
    quad(f.back || m, T, [x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]);
    quad(f.left || m, T, [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]);
    quad(f.right || m, T, [x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]);
    quad(f.top || m, T, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]);
  }
  const glow = (c, T, cx, cy, z, w, h) => quad(glowM(c), T, [cx - w / 2, cy + h / 2, z], [cx + w / 2, cy + h / 2, z], [cx + w / 2, cy - h / 2, z], [cx - w / 2, cy - h / 2, z]);
  const lights = []; const light = (T, p, c, k = 1) => { lights.push({ p: tf(T, p), c: rgb(c).map(v => v * k), d: 0 }); };

  // ---------- room shell ----------
  const O = { x: 0, z: 0 }, { HW, HD, ZF, BZ, WD, WZ, WX, WZ0, WZ1 } = DIMS, CH = 560, LW = 800; // LW = lounge half-width
  const floorT = tex(512, 512, (x, w) => {
    x.fillStyle = '#0d0716'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#1b1030' : '#120a22'; x.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); }
    x.strokeStyle = 'rgba(255,42,60,.55)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, w); x.moveTo(0, i * 128); x.lineTo(w, i * 128); x.stroke(); }
    [['#ffc93a', 64, 64], ['#3ea8ff', 320, 192], ['#35e06f', 192, 448], ['#ff4fd8', 448, 320]].forEach(([c, a, b]) => { x.fillStyle = c; x.beginPath(); x.moveTo(a, b - 16); x.lineTo(a + 16, b); x.lineTo(a, b + 16); x.lineTo(a - 16, b); x.fill(); });
  }, true);
  const wallT = tex(512, 512, (x, w) => {
    const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, '#241038'); g.addColorStop(.6, '#3a1a5a'); g.addColorStop(1, '#150a24'); x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) x.fillRect(i * 128, 0, 6, w);
    x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 4; i++) x.fillRect(i * 128 + 6, 0, 3, w);
    x.fillStyle = '#ff2a3c'; x.fillRect(0, 26, w, 10); x.fillStyle = '#ffc93a'; x.fillRect(0, 44, w, 4); x.fillStyle = '#07040c'; x.fillRect(0, w - 40, w, 40); x.fillStyle = '#ff2a3c'; x.fillRect(0, w - 44, w, 4);
  }, true);
  const ceilT = tex(256, 256, (x, w) => { x.fillStyle = '#0a0612'; x.fillRect(0, 0, w, w); x.strokeStyle = '#1d1230'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, w - 4); x.fillStyle = '#fff3d6'; x.fillRect(48, 104, 160, 48); }, true);
  const floorM = mat(floorT, { floor: true, spec: 0.5 }), wallM = mat(wallT, { spec: 0.1 }), ceilM = mat(ceilT, { emis: 0.55, spec: 0 });
  quad(floorM, O, [-HW, 0, -HD], [HW, 0, -HD], [HW, 0, ZF], [-HW, 0, ZF], [0, 0, HW / 100, (ZF + HD) / 200]);
  quad(ceilM, O, [-HW, CH, ZF], [HW, CH, ZF], [HW, CH, -HD], [-HW, CH, -HD], [0, 0, HW / 200, (ZF + HD) / 400]);
  const DW = 150, CW = 350, CZ = -HD - 800; // doorway half-width, hallway half-width, hallway end
  const wall = (x0, z0, x1, z1) => quad(wallM, O, [x0, CH, z0], [x1, CH, z1], [x1, 0, z1], [x0, 0, z0], [0, 0, Math.hypot(x1 - x0, z1 - z0) / 400, 1]);
  wall(-HW, -HD, -DW, -HD); wall(DW, -HD, HW, -HD);                 // back wall, with the hallway doorway
  wall(-CW, -HD, -CW, CZ); wall(CW, CZ, CW, -HD); wall(-CW, CZ, CW, CZ); // hallway
  quad(floorM, O, [-CW, 0, CZ], [CW, 0, CZ], [CW, 0, -HD], [-CW, 0, -HD], [0, 0, 3.5, 4]);
  quad(ceilM, O, [-CW, CH, -HD], [CW, CH, -HD], [CW, CH, CZ], [-CW, CH, CZ], [0, 0, 1.75, 2]);
  light(O, [0, 430, -HD - 350], '#ffffff', 0.5);
  wall(HW, ZF, DW, ZF); wall(-DW, ZF, -HW, ZF);                     // front wall, with the lounge doorway
  wall(-HW, ZF, -HW, -HD);                                          // left wall
  wall(HW, -HD, HW, WZ - WD); wall(HW, WZ + WD, HW, ZF);            // right wall, with the East Wing doorway
  light(O, [0, 500, 520], '#ffffff', 0.55); light(O, [-650, 500, -420], '#ffffff', 0.45); light(O, [650, 500, -420], '#ffffff', 0.45);

  const stations = {};
  const add = (id, label, T, w, depth, h, open) => { const p = tf(T, [0, 0, depth / 2]), r = Math.max(w, depth) / 2 + 10; stations[id] = { id, label, x: T.x, z: T.z, w, depth, T, open, min: [p[0] - r, 0, p[2] - r], max: [p[0] + r, h, p[2] + r] }; };
  const dark = solid('#12121c', 0, 0.5), metal = solid('#2a2a38', 0, 0.8);

  // ---------- game cabinets (classic upright shape; art wraps come from config `cab`) ----------
  function tri(m, T, a, b, c, ua, ub, uc) {
    const [A_, B_, C_] = [a, b, c].map(p => tf(T, p)), e1 = [B_[0] - A_[0], B_[1] - A_[1], B_[2] - A_[2]], e2 = [C_[0] - A_[0], C_[1] - A_[1], C_[2] - A_[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...n) || 1;
    [[A_, ua], [B_, ub], [C_, uc]].forEach(([p, u]) => m.v.push(p[0], p[1], p[2], n[0] / l, n[1] / l, n[2] / l, u[0], u[1]));
  }
  function sphere(m, T, cx, cy, cz, rad) {
    const pt = (i, j) => { const th = i / 6 * Math.PI, ph = j / 10 * Math.PI * 2; return [cx + rad * Math.sin(th) * Math.cos(ph), cy + rad * Math.cos(th), cz + rad * Math.sin(th) * Math.sin(ph)]; };
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) quad(m, T, pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j));
  }
  const imgTex = (src, w, h) => withImg(src, w, h, (x, W, H, e) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, W, H); if (e.ok) x.drawImage(e.im, 0, 0, W, H); });
  // side-view outline, [z, y] from the floor up the front to the top-back
  const OUT = [[150, 0], [150, 205], [205, 225], [205, 238], [125, 262], [95, 400], [150, 405], [150, 470], [20, 470], [0, 445]];
  const PARTS = [[[0, 0], [150, 0], [150, 205], [0, 205]], [[0, 205], [150, 205], [205, 225], [205, 238], [125, 262], [0, 262]], [[0, 262], [125, 262], [95, 400], [0, 400]], [[0, 400], [95, 400], [150, 405], [150, 470], [20, 470], [0, 445]]];
  const coinT = imgTex('assets/cabs/versus-coin.jpg', 256, 256);
  function cabinet(g, T, soon) {
    if (g.style && CUSTOM[g.style]) return CUSTOM[g.style](g, T); // custom shapes live in cabs.js
    const c = g.cab, trimC = g.trim || g.color;
    const scr = imgTex(c ? c + '-screen.jpg' : g.art, 512, 512);
    const screen = mat(c ? scr : withImg(g.art, 512, 512, (x, w, h, e) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); if (e.ok) { x.save(); x.scale(1, h / (w * 0.75)); x.globalAlpha = .35; drawFit(x, e, 0, 0, w, w * .75, true); x.globalAlpha = 1; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, w * .75); drawFit(x, e, 0, 0, w, w * .75, false); x.restore(); } }), { emis: 1, spec: 0.7 });
    const marq = mat(c ? imgTex(c + '-marquee.jpg', 512, 128) : tex(512, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a0b2b'); gr.addColorStop(1, g.color); x.fillStyle = gr; x.fillRect(0, 0, w, h); fitText(x, g.title.toUpperCase(), w / 2, h / 2 + 4, 66, w - 36, '#ffc93a', '#000'); }), { emis: 1, spec: 0 });
    const side = mat(c ? imgTex(c + '-side.jpg', 256, 512) : withImg(g.art, 256, 512, (x, w, h, e) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a0b2b'); gr.addColorStop(1, g.color); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalAlpha = .9; drawFit(x, e, 14, 150, w - 28, 230, true); x.globalAlpha = 1; x.strokeStyle = '#000'; x.lineWidth = 6; x.strokeRect(14, 150, w - 28, 230); x.save(); x.translate(w / 2, 86); x.rotate(-0.12); fitText(x, g.title.toUpperCase(), 0, 0, 44, w - 30, '#ffc93a', '#000'); x.restore(); text(x, 'T1', w / 2, 448, `80px ${BIG}`, '#fff', '#000'); }), { emis: 0.55, spec: 0.4 });
    const panel = mat(c ? imgTex(c + '-panel.jpg', 512, 128) : tex(512, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1a0b2b'); gr.addColorStop(.5, g.color); gr.addColorStop(1, '#1a0b2b'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, w, h); for (const ox of [150, 390]) for (let k = 0; k < 6; k++) { x.fillStyle = '#000'; x.beginPath(); x.arc(ox + (k % 3) * 34, 44 + (k / 3 | 0) * 34, 15, 0, 7); x.fill(); x.fillStyle = k < 3 ? '#ffc93a' : g.color; x.beginPath(); x.arc(ox + (k % 3) * 34, 42 + (k / 3 | 0) * 34, 12, 0, 7); x.fill(); } text(x, 'P1 START      P2 START', w / 2, 112, `10px ${PIX}`, '#fff'); }), { emis: 0.6, spec: 0.5 });
    const base = mat(c ? imgTex(c + '-base.jpg', 512, 128) : tex(512, 128, (x, w, h) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, w, h); x.fillStyle = g.color; x.fillRect(0, 0, w, 6); for (let k = 0; k < 16; k++) { const bh = 20 + (k * 37 % 5) * 9; x.globalAlpha = .55; x.fillRect(k * 32 + 2, 62 - bh, 28, bh); } x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 62, w, 66); text(x, '——  BIG BANG ARCADE  ——', w / 2, 96, `17px ${PIX}`, '#ffc93a'); }), { emis: 0.6, spec: 0.3 });
    const coin = mat(c ? imgTex(c + '-coin.jpg', 256, 256) : coinT, { emis: 0.45, spec: 0.6 }), trim = solid(trimC, 0.5, 0.9);
    const P3 = (x, p) => [x, p[1], p[0]], uvS = (p, flip) => [flip ? 1 - p[0] / 205 : p[0] / 205, 1 - p[1] / 470];
    for (const [sx, flip] of [[-125, false], [125, true]]) for (const part of PARTS) for (let k = 1; k < part.length - 1; k++) tri(side, T, P3(sx, part[0]), P3(sx, part[k]), P3(sx, part[k + 1]), uvS(part[0], flip), uvS(part[k], flip), uvS(part[k + 1], flip));
    const span = (m, lo, hi, x0 = -113, x1 = 113) => quad(m, T, [x0, hi[1], hi[0]], [x1, hi[1], hi[0]], [x1, lo[1], lo[0]], [x0, lo[1], lo[0]]);
    for (let k = 0; k < OUT.length - 1; k++) { span(trim, OUT[k], OUT[k + 1], -125, -113); span(trim, OUT[k], OUT[k + 1], 113, 125); }
    if (g.frontArt) {
      span(mat(imgTex(g.frontArt, 512, 512), { emis: .55, spec: .5 }), OUT[0], OUT[1]);
      span(coin, [152, 10], [152, 68], -31, 31);
      box(trim, T, -113, 113, 1, 7, 150, 156);
    } else { span(dark, OUT[0], OUT[1]); span(base, [151, 4], [151, 62]); span(coin, [151, 80], [151, 192], -58, 58); }
    span(dark, OUT[1], OUT[2]); span(trim, OUT[2], OUT[3]); span(panel, OUT[3], OUT[4]); span(dark, OUT[4], OUT[5]);
    span(screen, [124, 274], [99.5, 391], -97, 97);
    span(dark, OUT[5], OUT[6]); span(marq, OUT[6], OUT[7]); span(dark, OUT[7], OUT[8]); span(dark, OUT[8], OUT[9]);
    for (const jx of [-80, 33]) { box(solid('#16161c', 0, 1), T, jx - 3, jx + 3, 250, 280, 160, 166); sphere(solid(c ? trimC : '#ff2a3c', 0.35, 1), T, jx, 287, 163, 11); }
    if (g.frontArt) for (const ox of [-57, 56]) for (let k = 0; k < 6; k++) {
      const bx = ox + k % 3 * 18, bz = 153 + Math.floor(k / 3) * 25, by = 262 - (bz - 125) * .3;
      sphere(solid(k < 3 ? '#ffcf24' : '#ef2638', .5, .9), T, bx, by + 4, bz, 7);
    }
    glow(g.color, T, 0, 330, 135, 420, 330); glow(g.color, T, 0, 438, 160, 420, 150);
    if (soon === 'open') return;
    if (soon) { quad(neon('COMING SOON', '#ffffff', 512, 128), T, [-96, 390, 102], [96, 390, 102], [96, 344, 111.5], [-96, 344, 111.5]); add(g.id, 'COMING SOON: ' + g.title.toUpperCase(), T, 250, 205, 470, () => handlers.soon(g)); return; }
    quad(neon(g.genre.toUpperCase(), g.color), T, [-150, 550, 5], [150, 550, 5], [150, 488, 5], [-150, 488, 5]);
    glow(g.color, T, 0, 518, 12, 460, 150);
    light(T, [0, 290, 270], g.color, 1.15);
    add(g.id, 'PLAY ' + g.title.toUpperCase(), T, 250, 205, 470, () => handlers.game(g));
  }
  const hallPosition = i => ({ x: i % 2 ? CW - 2 : 2 - CW, z: -HD - (i < 2 ? 230 : 560), th: i % 2 ? -Math.PI / 2 : Math.PI / 2 });
  // Cabinet slots: six on the back wall (filled from the centre out), then eight in the East Wing.
  // `style` in config.js swaps the upright cabinet for a custom shape from cabs.js.
  // A game with `room: 'east'` in config.js goes straight to the wing; `hallSlot` still pins one to the hallway.
  const CUSTOM = customCabinets({ box, quad, tri, sphere, tex, mat, solid, neon, glow, light, add, text, fitText, BIG, PIX, handlers });
  const BACK = [-700, -400, 400, 700, -960, 960].map(x => ({ x, z: 2 - HD, th: 0 }));
  const WING = [1500, 1830, 2170, 2500].flatMap(x => [{ x, z: WZ0 + 2, th: 0 }, { x, z: WZ1 - 2, th: Math.PI }]);
  const takeWing = g => { // the golf bay is two slots wide: it takes the middle pair on the wing's back wall
    const i = WING.findIndex(s => s.x === 1830 && !s.th), j = WING.findIndex(s => s.x === 2170 && !s.th);
    if (g.style === 'golf' && i >= 0 && j > i) { WING.splice(j, 1); WING.splice(i, 1); return { x: 2000, z: WZ0 + 2, th: 0 }; }
    return WING.shift();
  };
  const place = g => g.hallSlot != null ? hallPosition(g.hallSlot) : (g.room !== 'east' && BACK.shift()) || takeWing(g) || hallPosition(0);
  GAMES.forEach(g => cabinet(g, place(g)));
  SOON.forEach((g, i) => cabinet(g, g.room === 'east' ? place(g) : hallPosition(g.hallSlot ?? i), true));
  // hallway banner + vault door
  { const B = { x: 0, z: -HD, th: 0 }, bn = neon('BLANKMAN  ←  NOW PLAYING', '#ffcf24', 1024, 128);
    quad(bn, B, [-DW, 545, 2], [DW, 545, 2], [DW, 470, 2], [-DW, 470, 2]); glow('#ff4fd8', B, 0, 508, 8, 420, 170);
    const V = { x: 0, z: CZ + 2, th: 0 };
    const vt = tex(512, 512, (x, w) => { x.clearRect(0, 0, w, w); const g2 = x.createRadialGradient(256, 256, 30, 256, 256, 250); g2.addColorStop(0, '#dfe6f2'); g2.addColorStop(.6, '#8d97ab'); g2.addColorStop(1, '#3d4456'); x.fillStyle = '#20242f'; x.beginPath(); x.arc(256, 256, 254, 0, 7); x.fill(); x.fillStyle = g2; x.beginPath(); x.arc(256, 256, 226, 0, 7); x.fill();
      x.strokeStyle = '#2a2f3c'; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 170, 0, 7); x.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.fillStyle = '#20242f'; x.beginPath(); x.arc(256 + Math.cos(a) * 198, 256 + Math.sin(a) * 198, 13, 0, 7); x.fill(); }
      x.lineWidth = 18; x.strokeStyle = '#20242f'; for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI + .4; x.beginPath(); x.moveTo(256 - Math.cos(a) * 120, 256 - Math.sin(a) * 120); x.lineTo(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120); x.stroke(); } x.beginPath(); x.arc(256, 256, 120, 0, 7); x.stroke(); x.fillStyle = '#ffc93a'; x.beginPath(); x.arc(256, 256, 34, 0, 7); x.fill(); text(x, 'BB', 256, 258, `30px ${BIG}`, '#20242f'); });
    quad(mat(vt, { spec: 1, emis: 0.25, blend: true }), V, [-215, 445, 6], [215, 445, 6], [215, 15, 6], [-215, 15, 6]);
    box(solid('#20242f', 0, 0.9), V, -240, 240, 0, 470, 0, 4);
    quad(neon('BIG BANG VAULT', '#3ea8ff', 1024, 128), V, [-250, 550, 4], [250, 550, 4], [250, 480, 4], [-250, 480, 4]); glow('#3ea8ff', V, 0, 512, 10, 620, 190);
    light(V, [0, 300, 240], '#3ea8ff', 1.1); add('vault', 'OPEN THE BIG BANG VAULT', V, 430, 20, 470, handlers.vault); }

  // ---------- Big Box ----------
  const BB = { x: 0, z: BZ, th: 0 };
  const bbT = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffc93a'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
    fitText(x, 'BIG BANG BOX', w / 2, 60, 60, w - 50, '#ffc93a');
    GAMES.forEach((g, i) => { const rows = Math.ceil(GAMES.length / 2), ch = Math.floor(350 / rows), X = 40 + (i % 2) * 222, Y = 104 + (i >> 1) * ch; x.fillStyle = g.color; x.fillRect(X - 4, Y - 4, 218, ch - 9); x.fillStyle = '#000'; x.fillRect(X, Y, 210, ch - 17); drawFit(x, img(g.art), X, Y, 210, ch - 42, true); fitText(x, g.title.toUpperCase(), X + 105, Y + ch - 28, 16, 200, g.color); });
    text(x, 'SELECT YOUR GAME', w / 2, 480, `17px ${PIX}`, '#fff');
  });
  GAMES.forEach(g => img(g.art, bbT.redraw));
  const bbM = mat(bbT, { emis: 0.9, spec: 0.4 });
  box(solid('#1a1a24', 0, 0.8), BB, -130, 130, 0, 290, -130, 130, { front: bbM, back: bbM, left: bbM, right: bbM });
  for (const [ex, ez] of [[-130, -130], [130, -130], [-130, 130], [130, 130]]) box(solid('#ffc93a', 1, 0), BB, ex - 6, ex + 6, 0, 296, ez - 6, ez + 6);
  light(BB, [0, 330, 260], '#ffc93a', 0.9);
  const spinM = mat(tex(512, 128, (x, w, h) => { x.fillStyle = '#ffc93a'; x.fillRect(0, 0, w, h); fitText(x, '★ BIG BANG BOX ★', w / 2, h / 2 + 4, 58, w - 24, '#0b0612'); }), { emis: 1, spec: 0, dyn: 'spin' });
  { const S = { x: 0, z: 0 }; box(spinM, S, -80, 80, -24, 24, -80, 80); }
  stations.bigbox = { id: 'bigbox', label: 'OPEN THE BIG BANG BOX', x: 0, z: BZ + 130, w: 260, depth: 0, T: { x: 0, z: BZ + 130, th: 0 }, open: handlers.bigbox, min: [-140, 0, BZ - 140], max: [140, 300, BZ + 140] };

  // ---------- other stations ----------
  let scoreRows = [];
  const panel = (w, h, color, draw) => mat(tex(512, 512, (x, W, H) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, W, H); x.strokeStyle = color; x.lineWidth = 16; x.strokeRect(8, 8, W - 16, H - 16); draw(x, W, H); }), { emis: 0.85, spec: 0.3 });
  const emoji = (x, s, cx, cy, size) => text(x, s, cx, cy, `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`, '#fff');
  const L = z => ({ x: 2 - HW, z, th: Math.PI / 2 }), R = z => ({ x: HW - 2, z, th: -Math.PI / 2 }), F = x => ({ x, z: ZF - 2, th: Math.PI });

  let T = L(-620);
  box(solid('#1a0a1c', 0, 0.6), T, -125, 125, 0, 400, 0, 110, { front: panel(250, 400, '#ff4fd8', (x, W) => { x.fillStyle = '#ff4fd8'; x.beginPath(); x.arc(W / 2, 190, 150, Math.PI, 0); x.fill(); x.fillStyle = '#0c0c14'; x.beginPath(); x.arc(W / 2, 190, 118, Math.PI, 0); x.fill(); emoji(x, '🎵', W / 2, 140, 96); text(x, 'JUKEBOX', W / 2, 270, `66px ${BIG}`, '#ff4fd8'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffc93a' : '#3ea8ff'; x.fillRect(70 + i * 48, 330, 36, 90); } text(x, 'BIG BANG MUSIC', W / 2, 462, `16px ${PIX}`, '#fff'); }) });
  for (const sx of [-131, 131]) box(solid('#ff4fd8', 1, 0), T, sx - 6, sx + 6, 0, 400, 100, 116);
  glow('#ff4fd8', T, 0, 220, 130, 480, 520); light(T, [0, 260, 240], '#ff4fd8'); add('jukebox', 'OPEN THE JUKEBOX', T, 260, 110, 400, handlers.jukebox);

  T = L(480);
  box(solid('#0e1a2c', 0, 0.5), T, -135, 135, 0, 440, 0, 30, { front: panel(270, 440, '#3ea8ff', (x, W) => { x.fillStyle = '#16304f'; x.fillRect(60, 60, 392, 392); x.fillStyle = '#0c0c14'; x.fillRect(250, 60, 6, 392); emoji(x, '👕', 160, 200, 90); emoji(x, '🧢', 350, 200, 90); text(x, 'MY CLOSET', W / 2, 330, `58px ${BIG}`, '#3ea8ff'); text(x, 'YOUR PRIZES LIVE HERE', W / 2, 400, `14px ${PIX}`, '#fff'); x.fillStyle = '#ffc93a'; x.beginPath(); x.arc(232, 256, 9, 0, 7); x.arc(274, 256, 9, 0, 7); x.fill(); }) });
  glow('#3ea8ff', T, 0, 230, 50, 460, 540); light(T, [0, 260, 220], '#3ea8ff', 0.8); add('closet', 'OPEN MY CLOSET', T, 270, 60, 440, handlers.closet);

  T = R(-640);
  box(solid('#1c1608', 0, 0.4), T, -290, 290, 50, 480, 0, 18);
  for (const sy of [150, 290]) box(solid('#ffc93a', 0.35, 1), T, -280, 280, sy - 10, sy, 18, 100);
  PRIZES.filter(p => !p.real).slice(0, 10).forEach((p, i) => { const em = mat(tex(128, 128, (x, w) => { x.clearRect(0, 0, w, w); emoji(x, p.icon, 64, 70, 96); }), { emis: 1, spec: 0, blend: true }), cx = -224 + (i % 5) * 112, y = i < 5 ? 290 : 150; quad(em, T, [cx - 46, y + 96, 60], [cx + 46, y + 96, 60], [cx + 46, y + 4, 60], [cx - 46, y + 4, 60]); });
  quad(neon('PRIZE WALL', '#ffc93a'), T, [-190, 478, 22], [190, 478, 22], [190, 396, 22], [-190, 396, 22]);
  glow('#ffc93a', T, 0, 440, 40, 560, 200); light(T, [0, 300, 260], '#ffc93a', 1.1); add('prizes', 'SHOP THE PRIZE WALL', T, 560, 100, 480, handlers.prizes);

  T = R(480);
  box(metal, T, -160, 160, 110, 450, 0, 30, { front: panel(320, 340, '#35e06f', (x, W) => { emoji(x, '🏆', W / 2, 96, 84); text(x, 'HIGH SCORES', W / 2, 190, `52px ${BIG}`, '#35e06f'); ['1ST', '2ND', '3RD', '4TH'].forEach((s, i) => {
      const r = scoreRows[i], y = 262 + i * 46, col = i ? '#fff' : '#ffc93a';
      if (!r) { text(x, `${s}  ......  ?`, W / 2, y, `20px ${PIX}`, col); return; }
      x.font = `15px ${PIX}`; x.textBaseline = 'middle'; x.fillStyle = col;
      x.textAlign = 'left'; x.fillText(`${s} ${String(r.name).toUpperCase().slice(0, 10)}`, 40, y);
      x.textAlign = 'right'; x.fillText(`LV${r.level || 1} ${Number(r.score).toLocaleString()}`, W - 40, y);
    }); text(x, scoreRows.length ? 'ARCADE RANK · ALL GAMES' : 'WHO RUNS THE ARCADE?', W / 2, 462, `14px ${PIX}`, '#35e06f'); }) });
  const scoreWall = mats[mats.length - 1];     // the wall board is redrawn when real standings arrive (setScores)
  glow('#35e06f', T, 0, 280, 50, 520, 480); light(T, [0, 280, 220], '#35e06f', 0.8); add('scores', 'SEE THE LEADERBOARD', T, 320, 60, 450, handlers.scores);

  T = F(-360);
  box(solid('#2a0a10', 0, 0.5), T, -140, 140, 0, 390, 0, 90, { front: panel(280, 390, '#ff2a3c', (x, W) => { emoji(x, '❤️', W / 2, 150, 130); text(x, 'DONATE', W / 2, 300, `76px ${BIG}`, '#ff2a3c'); text(x, 'KEEP THE ARCADE OPEN', W / 2, 380, `15px ${PIX}`, '#fff'); text(x, 'CASH APP · APPLE PAY', W / 2, 428, `12px ${PIX}`, '#ffc93a'); text(x, 'PAYPAL · VENMO', W / 2, 456, `12px ${PIX}`, '#ffc93a'); }) });
  glow('#ff2a3c', T, 0, 220, 110, 480, 500); light(T, [0, 260, 240], '#ff2a3c', 0.8); add('donate', 'DONATE', T, 280, 90, 390, handlers.donate);

  T = F(360);
  box(solid('#e8e8f0', 0, 0.8), T, -160, 160, 50, 450, 0, 14, { front: panel(320, 400, '#ffffff', (x, W) => { emoji(x, '⭐', W / 2, 84, 70); text(x, 'CREATED BY', W / 2, 160, `20px ${PIX}`, '#fff'); text(x, 'CHUCK CRAWLEY', W / 2, 224, `46px ${BIG}`, '#ffc93a'); text(x, '&', W / 2, 274, `34px ${BIG}`, '#fff'); text(x, 'TONE DA BOSS', W / 2, 326, `50px ${BIG}`, '#ffc93a'); text(x, 'T1 ENTERTAINMENT', W / 2, 400, `16px ${PIX}`, '#ff2a3c'); text(x, 'FOLLOW US', W / 2, 452, `14px ${PIX}`, '#fff'); }) });
  glow('#ffffff', T, 0, 250, 30, 440, 480); light(T, [0, 260, 220], '#ffffff', 0.5); add('credits', 'CREDITS + SOCIALS', T, 320, 40, 450, handlers.credits);

  // ---------- neon + posters ----------
  T = F(0);
  quad(neon('BIG BANG ARCADE', '#ff2a3c', 1024, 128), T, [-330, 520, 4], [330, 520, 4], [330, 436, 4], [-330, 436, 4]); glow('#ff2a3c', T, 0, 478, 10, 860, 220);
  GAMES.filter(g => g.poster).forEach((g, i) => {
    const P = { x: 2 - HW, z: -150 + i * 275, th: Math.PI / 2 }, pm = mat(withImg(g.poster, 1024, 512, (x, w, h, e) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); drawFit(x, e, 0, 0, w, h, true); }), { emis: 0.8, spec: 0.3 });
    const hw = 105, y0 = 190, hh = hw * 0.5625;
    box(solid(g.color, 1, 0), P, -hw - 6, hw + 6, y0 - 6, y0 + hh * 2 + 6, 0, 6); quad(pm, P, [-hw, y0 + hh * 2, 8], [hw, y0 + hh * 2, 8], [hw, y0, 8], [-hw, y0, 8]);
  });

  // ---------- the lounge (through the doorway in the front wall) ----------
  {
    const LE = 1900, woodT = tex(256, 256, (x, w) => { x.fillStyle = '#3a2416'; x.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#46301d' : '#33200f'; x.fillRect(0, i * 32, w, 30); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect((i * 97) % 200, i * 32, 3, 30); } }, true);
    const woodF = mat(woodT, { floor: true, spec: 0.35 }), wood = mat(woodT, { spec: 0.4 });
    quad(woodF, O, [-LW, 0, ZF], [LW, 0, ZF], [LW, 0, LE], [-LW, 0, LE], [0, 0, 8, 5]);
    quad(ceilM, O, [-LW, CH, LE], [LW, CH, LE], [LW, CH, ZF], [-LW, CH, ZF], [0, 0, 4, 2.5]);
    quad(wallM, O, [-LW, CH, LE], [-LW, CH, ZF], [-LW, 0, ZF], [-LW, 0, LE], [0, 0, 2.5, 1]);
    quad(wallM, O, [LW, CH, ZF], [LW, CH, LE], [LW, 0, LE], [LW, 0, ZF], [0, 0, 2.5, 1]);
    quad(wallM, O, [LW, CH, LE], [-LW, CH, LE], [-LW, 0, LE], [LW, 0, LE], [0, 0, 4, 1]);
    const D2 = { x: 0, z: ZF, th: Math.PI }; quad(neon('LOUNGE + BAR', '#ffb400', 1024, 128), D2, [-DW, 430, 3], [DW, 430, 3], [DW, 372, 3], [-DW, 372, 3]);
    light(O, [0, 480, 1350], '#ffe2b0', 0.8);
    const reg = (id, label, x, z, th, w, lo, hi, open, pitch) => { stations[id] = { id, label, x, z, w, depth: 0, pitch, T: { x, z, th }, open, min: lo, max: hi }; };
    // bar
    const B = { x: 0, z: LE - 2, th: Math.PI };
    const shelf = mat(tex(1024, 512, (x, w, h) => { x.fillStyle = '#1a0f0a'; x.fillRect(0, 0, w, h); for (let row = 0; row < 3; row++) { x.fillStyle = '#5a3a20'; x.fillRect(20, 150 + row * 150, w - 40, 14); for (let k = 0; k < 13; k++) emoji2(x, ['🍾', '🍺', '🥃', '🍷', '🍸'][(k + row * 2) % 5], 70 + k * 74, 100 + row * 150, 84); } }), { emis: 0.9, spec: 0.3 });
    function emoji2(x, s, cx, cy, size) { text(x, s, cx, cy, `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`, '#fff'); }
    box(solid('#1a0f0a', 0, 0.3), B, -330, 330, 0, 400, 0, 26, { front: shelf });
    box(wood, B, -340, 340, 0, 125, 150, 205); box(solid('#0c0c14', 0, 1), B, -346, 346, 125, 134, 144, 211);
    for (const sx of [-240, -80, 80, 240]) { box(metal, B, sx - 5, sx + 5, 0, 80, 262, 272); box(solid('#b0202c', 0.2, 0.6), B, sx - 24, sx + 24, 80, 92, 243, 291); }
    quad(neon('BAR', '#ffb400'), B, [-120, 520, 30], [120, 520, 30], [120, 420, 30], [-120, 420, 30]); glow('#ffb400', B, 0, 470, 40, 420, 240);
    light(B, [0, 300, 320], '#ffb400', 1.1); add('bar', 'VISIT THE BAR', B, 700, 210, 400, handlers.bar);
    // couches
    const couch = (id, T) => { const c1 = solid('#7a1f2b', 0.12, 0.3), c2 = solid('#5a141e', 0.12, 0.3);
      box(c1, T, -140, 140, 0, 62, 0, 95); box(c2, T, -140, 140, 62, 140, 0, 28); box(c2, T, -160, -140, 0, 100, 0, 95); box(c2, T, 140, 160, 0, 100, 0, 95);
      add(id, 'SIT ON THE COUCH', T, 330, 95, 140, () => handlers.sit(id)); stations[id].seat = tf(T, [0, 0, 70]); };
    couch('couch', { x: -798, z: 1740, th: Math.PI / 2 }); couch('couch2', { x: -570, z: LE - 2, th: Math.PI });
    // darts
    const DT = { x: -798, z: 1480, th: Math.PI / 2 };
    const board = mat(tex(256, 256, (x, w) => { x.clearRect(0, 0, w, w); const cs = ['#111', '#e8e0c8']; for (let k = 0; k < 20; k++) { x.fillStyle = cs[k % 2]; x.beginPath(); x.moveTo(128, 128); x.arc(128, 128, 118, k / 20 * 6.2832, (k + 1) / 20 * 6.2832); x.fill(); } x.strokeStyle = '#d2142a'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke(); x.strokeStyle = '#1d7a3e'; x.beginPath(); x.arc(128, 128, 66, 0, 7); x.stroke(); x.fillStyle = '#1d7a3e'; x.beginPath(); x.arc(128, 128, 20, 0, 7); x.fill(); x.fillStyle = '#d2142a'; x.beginPath(); x.arc(128, 128, 9, 0, 7); x.fill(); }), { emis: 0.8, blend: true, spec: 0 });
    box(solid('#2a1a10', 0, 0.3), DT, -90, 90, 200, 400, 0, 8); quad(board, DT, [-75, 375, 10], [75, 375, 10], [75, 225, 10], [-75, 225, 10]);
    quad(neon('DARTS', '#35e06f'), DT, [-90, 470, 4], [90, 470, 4], [90, 415, 4], [-90, 415, 4]); add('darts', 'PLAY DARTS', DT, 220, 10, 420, () => handlers.mini('darts'));
    // pool table + air hockey
    const table = (id, label, cx, cz, top, rail, side, kind) => { const T0 = { x: cx, z: cz, th: 0 };
      for (const [lx, lz] of [[-78, -128], [78, -128], [-78, 128], [78, 128]]) box(dark, T0, lx - 8, lx + 8, 0, 78, lz - 8, lz + 8);
      box(solid(rail, 0.1, 0.6), T0, -95, 95, 78, 104, -145, 145); box(top, T0, -84, 84, 100, 106, -134, 134);
      reg(id, label, cx + side * 95, cz, side * Math.PI / 2, 300, [cx - 100, 0, cz - 150], [cx + 100, 115, cz + 150], () => handlers.mini(kind), -0.42); };
    const felt = mat(tex(128, 256, (x, w, h) => { x.fillStyle = '#12703a'; x.fillRect(0, 0, w, h); const bc = ['#ffd23e', '#d2142a', '#3ea8ff', '#111', '#ff7a1a', '#b06cff']; bc.forEach((c, k) => { x.fillStyle = c; x.beginPath(); x.arc(40 + (k % 3) * 24, 60 + (k / 3 | 0) * 24, 9, 0, 7); x.fill(); }); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 200, 9, 0, 7); x.fill(); }), { emis: 0.45, spec: 0.1 });
    const ice = mat(tex(128, 256, (x, w, h) => { x.fillStyle = '#eaf6ff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d2142a'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 26, 0, 7); x.stroke(); x.strokeStyle = '#3ea8ff'; x.strokeRect(34, 0, 60, 24); x.strokeRect(34, h - 24, 60, 24); x.fillStyle = '#111'; x.beginPath(); x.arc(64, 96, 8, 0, 7); x.fill(); x.fillStyle = '#d2142a'; x.beginPath(); x.arc(64, 226, 13, 0, 7); x.fill(); x.fillStyle = '#3ea8ff'; x.beginPath(); x.arc(64, 34, 13, 0, 7); x.fill(); }), { emis: 0.7, spec: 0.9 });
    table('pool', 'PLAY POOL', -390, 1240, felt, '#4a2a14', 1, 'pool'); table('hockey', 'PLAY AIR HOCKEY', 390, 1240, ice, '#1b3fa8', -1, 'hockey');
    light(O, [0, 380, 1240], '#ffffff', 0.5);
    // bowling lane
    const laneT = mat(tex(128, 512, (x, w, h) => { x.fillStyle = '#c99755'; x.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { x.fillStyle = 'rgba(90,50,20,.35)'; x.fillRect(k * 16, 0, 2, h); } x.fillStyle = '#7a3d14'; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(20 + k * 14.6, 380 - Math.abs(3 - k) * -10); x.lineTo(26 + k * 14.6, 396 - Math.abs(3 - k) * -10); x.lineTo(14 + k * 14.6, 396 - Math.abs(3 - k) * -10); x.fill(); } x.fillStyle = '#111'; x.fillRect(0, h - 8, w, 8); }), { emis: 0.35, spec: 0.9 });
    box(solid('#16161c', 0, 0.6), O, 606, 774, 0, 10, 1250, 1870); quad(laneT, O, [622, 11, 1860], [758, 11, 1860], [758, 11, 1250], [622, 11, 1250]);
    box(solid('#0c0c14', 0, 0.5), O, 606, 774, 0, 150, 1870, 1896);
    [[0, 0], [-14, 22], [14, 22], [-28, 44], [0, 44], [28, 44], [-42, 66], [-14, 66], [14, 66], [42, 66]].forEach(([px, pz]) => { box(solid('#ffffff', 0.5, 0.8), O, 690 + px - 5, 690 + px + 5, 11, 46, 1770 + pz - 5, 1770 + pz + 5); box(solid('#d2142a', 0.5, 0.5), O, 690 + px - 5.5, 690 + px + 5.5, 34, 39, 1770 + pz - 5.5, 1770 + pz + 5.5); });
    sphere(solid('#3b2a6b', 0.25, 1), O, 690, 27, 1300, 16);
    quad(neon('BOWLING', '#3ea8ff'), { x: 798, z: 1560, th: -Math.PI / 2 }, [-150, 470, 4], [150, 470, 4], [150, 400, 4], [-150, 400, 4]);
    reg('bowling', 'GO BOWLING', 690, 1250, Math.PI, 150, [606, 0, 1250], [774, 150, 1896], () => handlers.mini('bowling'), -0.2);
    light(O, [690, 260, 1650], '#3ea8ff', 0.7);
  }

  // ---------- the East Wing (through the doorway in the right wall) ----------
  {
    const VI = '#b06cff';
    quad(floorM, O, [HW, 0, WZ0], [WX, 0, WZ0], [WX, 0, WZ1], [HW, 0, WZ1], [0, 0, (WX - HW) / 200, (WZ1 - WZ0) / 200]);
    quad(ceilM, O, [HW, CH, WZ1], [WX, CH, WZ1], [WX, CH, WZ0], [HW, CH, WZ0], [0, 0, (WX - HW) / 400, (WZ1 - WZ0) / 400]);
    wall(HW, WZ0, WX, WZ0); wall(WX, WZ0, WX, WZ1); wall(WX, WZ1, HW, WZ1);
    const D3 = { x: HW, z: WZ, th: -Math.PI / 2 }; quad(neon('EAST WING  →', VI, 1024, 128), D3, [-WD, 520, 3], [WD, 520, 3], [WD, 442, 3], [-WD, 442, 3]); glow(VI, D3, 0, 480, 10, 560, 190);
    const E = { x: WX - 2, z: WZ, th: -Math.PI / 2 };
    quad(neon('EAST WING', VI, 1024, 128), E, [-330, 530, 4], [330, 530, 4], [330, 440, 4], [-330, 440, 4]); glow(VI, E, 0, 484, 10, 860, 230);
    box(solid('#140c22', 0, 0.5), E, -230, 230, 90, 410, 0, 16, { front: panel(460, 320, VI, (x, W) => { emoji(x, '🕹️', W / 2, 120, 120); text(x, 'NEW GAMES', W / 2, 262, `66px ${BIG}`, VI); text(x, 'LAND HERE', W / 2, 336, `66px ${BIG}`, '#ffc93a'); text(x, 'MORE CABINETS ON THE WAY', W / 2, 430, `14px ${PIX}`, '#fff'); }) });
    light(E, [0, 300, 300], VI, 1); light(O, [(HW + WX) / 2, 500, WZ], '#ffffff', 0.6); light(O, [HW + 250, 420, WZ], VI, 0.5);
    add('eastwing', 'EAST WING: NEW GAMES SOON', E, 660, 16, 530, handlers.eastwing);
    // a marked floor pad wherever a wing slot is still free
    const padE = solid(VI, 1, 0), padF = solid('#161022', 0, 0.6), openM = neon('OPEN SLOT', VI);
    for (const T of WING) {
      box(padF, T, -125, 125, 0, 8, 0, 205);
      for (const [a, b, c, d] of [[-125, -119, 0, 205], [119, 125, 0, 205], [-125, 125, 199, 205]]) box(padE, T, a, b, 0, 10, c, d);
      quad(openM, T, [-110, 335, 4], [110, 335, 4], [110, 275, 4], [-110, 275, 4]); glow(VI, T, 0, 305, 10, 380, 210);
    }
  }

  const sprM = mat(white, { emis: 0.75, spec: 0 }); sprM.sprite = true; quad(sprM, O, [-0.5, 1, 0], [0.5, 1, 0], [0.5, 0, 0], [-0.5, 0, 0]);
  // ---------- upload ----------
  const buf = gl.createBuffer(); let total = 0; for (const m of mats) { m.start = total; m.n = m.v.length / 8; total += m.n; }
  const data = new Float32Array(total * 8); for (const m of mats) { data.set(m.v, m.start * 8); m.v = null; }
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  [[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(([i, n, o]) => { gl.enableVertexAttribArray(A[i]); gl.vertexAttribPointer(A[i], n, gl.FLOAT, false, 32, o); });
  // the shader takes 18 lights; each frame it gets the 18 nearest the player
  const LP = new Float32Array(54), LC = new Float32Array(54);
  function setLights(P) {
    for (const l of lights) l.d = (l.p[0] - P.x) ** 2 + (l.p[2] - P.z) ** 2;
    lights.sort((a, b) => a.d - b.d); LP.fill(0); LC.fill(0);
    for (let i = 0; i < 18 && i < lights.length; i++) { LP.set(lights[i].p, i * 3); LC.set(lights[i].c, i * 3); }
    gl.uniform3fv(U.uLP, LP); gl.uniform3fv(U.uLC, LC);
  }
  gl.uniform1i(U.uT, 0); gl.enable(gl.DEPTH_TEST); gl.clearColor(0.03, 0.015, 0.06, 1);
  const I = ident();
  let fov = 1, asp = 1;
  function resize() {
    const d = Math.min(devicePixelRatio || 1, innerWidth < 800 ? 1.5 : 2) * (window.__scale || 1), w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h); asp = w / h; fov = asp > 1 ? 1.05 : 1.3;
  }
  const drawSet = (pred, time, mirror) => {
    for (const m of mats) {
      if (!m.n || m.sprite || !pred(m)) continue;
      gl.uniformMatrix4fv(U.uM, false, m.dyn ? mul(trans(0, 400 + Math.sin(time * 1.6) * 8, BZ), rotY(time * 0.7)) : I);
      gl.bindTexture(gl.TEXTURE_2D, m.t); gl.uniform3fv(U.uTint, m.tint);
      gl.uniform1f(U.uEmis, m.emis * (m.emis === 1 && !m.glow ? 0.94 + 0.06 * Math.sin(time * 9 + m.start) : 1)); gl.uniform1f(U.uSpec, m.spec);
      gl.drawArrays(gl.TRIANGLES, m.start, m.n);
    }
  };
  let sprites = [], beams = [];
  // One eye: `view`/`proj` are column-major matrices, `eye` the world-space eye, `byaw` the yaw sprites turn to face.
  function drawScene(view, proj, eye, byaw, time, mirrorFloor) {
    const flip = ident(); flip[5] = -1;
    gl.uniform3f(U.uEye, eye[0], eye[1], eye[2]);
    const pass = (vp, mirror) => {
      gl.uniformMatrix4fv(U.uVP, false, vp); gl.uniform1f(U.uMirror, mirror ? 1 : 0); gl.uniform1f(U.uAlpha, 1);
      gl.disable(gl.BLEND); gl.depthMask(true); drawSet(m => !m.glow && !m.floor && !m.blend, time);
      if (sprites.length) { // other players' avatars and VR labels, always turned to face the camera
        const c = Math.cos(byaw), s = Math.sin(byaw); gl.uniform3fv(U.uTint, sprM.tint); gl.uniform1f(U.uEmis, sprM.emis); gl.uniform1f(U.uSpec, 0);
        for (const sp of sprites) { const m = ident(); m[0] = c * sp.w; m[2] = s * sp.w; m[5] = sp.h; m[8] = -s; m[10] = c; m[12] = sp.x; m[13] = sp.y || 0; m[14] = sp.z; gl.uniformMatrix4fv(U.uM, false, m); gl.bindTexture(gl.TEXTURE_2D, sp.tex); gl.drawArrays(gl.TRIANGLES, sprM.start, 6); }
      }
      if (beams.length && !mirror) { // VR pointer rays: a thin strip from the controller, turned toward the eye
        gl.bindTexture(gl.TEXTURE_2D, white); gl.uniform1f(U.uEmis, 1); gl.uniform1f(U.uSpec, 0);
        for (const bm of beams) {
          const d = bm.d, e = [eye[0] - bm.o[0], eye[1] - bm.o[1], eye[2] - bm.o[2]];
          let r = [d[1] * e[2] - d[2] * e[1], d[2] * e[0] - d[0] * e[2], d[0] * e[1] - d[1] * e[0]]; const rl = Math.hypot(r[0], r[1], r[2]) || 1, w = bm.w || 3;
          const m = ident(); m[0] = r[0] / rl * w; m[1] = r[1] / rl * w; m[2] = r[2] / rl * w; m[4] = d[0] * bm.len; m[5] = d[1] * bm.len; m[6] = d[2] * bm.len; m[12] = bm.o[0]; m[13] = bm.o[1]; m[14] = bm.o[2];
          gl.uniform3fv(U.uTint, bm.c || [1, 1, 1]); gl.uniformMatrix4fv(U.uM, false, m); gl.drawArrays(gl.TRIANGLES, sprM.start, 6);
        }
      }
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); drawSet(m => m.blend, time);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); drawSet(m => m.glow, time); gl.depthMask(true);
    };
    if (mirrorFloor) { pass(mul(proj, mul(view, flip)), true); gl.clear(gl.DEPTH_BUFFER_BIT); } // the room mirrored below the floor
    gl.uniformMatrix4fv(U.uVP, false, mul(proj, view)); gl.uniform1f(U.uMirror, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(U.uAlpha, mirrorFloor ? 0.74 : 1); drawSet(m => m.floor, time); // glossy floor over it
    pass(mul(proj, view), false);
  }
  function render(P, time, spr) {
    sprites = spr || []; beams = [];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); resize();
    const view = mul(mul(rotX(-P.pitch), rotY(P.yaw)), trans(-P.x, -P.eye, -P.z)), proj = persp(fov, asp, 8, 8000);
    setLights(P); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(view, proj, [P.x, P.eye, P.z], P.yaw, time, true);
  }

  // ---------- VR (WebXR immersive-vr) ----------
  // The room is drawn in its own units; XRU of them make one metre (a 300-unit eye line is about 1.65 m).
  const XRU = 182, XREYE = 300;
  let xrFloor = true;
  const xrBase = P => xrFloor ? 0 : XREYE; // 'local' space starts at head height, 'local-floor' at the floor
  // a point / direction in the headset's reference space -> room coordinates, for a player rig standing at P
  const xrPoint = (p, P) => { const c = Math.cos(P.yaw), s = Math.sin(P.yaw), x = p.x * XRU, z = p.z * XRU; return [c * x - s * z + P.x, p.y * XRU + xrBase(P), s * x + c * z + P.z]; };
  const xrDir = (m, P) => { const c = Math.cos(P.yaw), s = Math.sin(P.yaw), x = -m[8], y = -m[9], z = -m[10], l = Math.hypot(x, y, z) || 1; return [(c * x - s * z) / l, y / l, (s * x + c * z) / l]; };
  async function xrBegin(session) {
    if (gl.makeXRCompatible) await gl.makeXRCompatible();
    await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl), depthNear: 0.05, depthFar: 60 });
    let ref; try { ref = await session.requestReferenceSpace('local-floor'); xrFloor = true; } catch { ref = await session.requestReferenceSpace('local'); xrFloor = false; }
    return ref;
  }
  // a controller pose -> { o, d } ray in room coordinates
  const xrRay = (pose, P) => ({ o: xrPoint(pose.transform.position, P), d: xrDir(pose.transform.matrix, P) });
  // draws both eyes; returns the head in room coordinates, or null when the headset has no pose this frame
  function renderXR(frame, ref, P, time, spr, rays) {
    const pose = frame.getViewerPose(ref), layer = frame.session.renderState.baseLayer; if (!pose || !layer) return null;
    sprites = spr || []; beams = rays || [];
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const sc = ident(); sc[0] = sc[5] = sc[10] = 1 / XRU;
    const rig = mul(sc, mul(rotY(P.yaw), trans(-P.x, -xrBase(P), -P.z)));
    const hp = xrPoint(pose.transform.position, P), hd = xrDir(pose.transform.matrix, P), head = { x: hp[0], y: hp[1], z: hp[2], yaw: Math.atan2(hd[0], -hd[2]), dir: hd };
    setLights({ x: head.x, z: head.z });
    for (const v of pose.views) {
      const vp = layer.getViewport(v); if (!vp || !vp.width) continue;
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      drawScene(mul(v.transform.inverse.matrix, rig), v.projectionMatrix, xrPoint(v.transform.position, P), head.yaw, time, false);
    }
    return head;
  }
  function pickRay(o, d) {
    let best = null, bt = 1e9;
    for (const s of Object.values(stations)) {
      let t0 = 0, t1 = 1e9;
      for (let i = 0; i < 3; i++) { const inv = 1 / (d[i] || 1e-9); let a = (s.min[i] - o[i]) * inv, b = (s.max[i] - o[i]) * inv; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (t0 <= t1 && t0 < bt) { bt = t0; best = s; }
    }
    return best ? { s: best, t: bt } : null;
  }
  // which station is under a screen point?
  function pick(px, py, P) {
    const t = Math.tan(fov / 2), cx = (px / innerWidth * 2 - 1) * t * asp, cy = (1 - py / innerHeight * 2) * t;
    const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
    const vy = cy * cp + sp, vz = -cp + cy * sp, cs = Math.cos(P.yaw), sn = Math.sin(P.yaw);
    const d = [cx * cs - vz * sn, vy, cx * sn + vz * cs], o = [P.x, P.eye, P.z];
    const h = pickRay(o, d); return h ? h.s : null;
  }
  const hfov = () => 2 * Math.atan(Math.tan(fov / 2) * asp);
  resize();
  return { stations, render, pick, pickRay, xrBegin, xrRay, renderXR, hfov, vfov: () => fov, tex, freeTex: t => gl.deleteTexture(t), setScores: rows => { scoreRows = Array.isArray(rows) ? rows.slice(0, 4) : []; if (scoreWall && scoreWall.t && scoreWall.t.redraw) scoreWall.t.redraw(); } };
}
