// Big Bang Arcade — real-time 3D room (WebGL, no libraries).
// Lit 3D cabinets, coloured point lights, glossy reflective floor, neon glow.
const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec2 aU;uniform mat4 uVP;uniform mat4 uM;varying vec3 vP;varying vec3 vN;varying vec2 vU;
void main(){vec4 w=uM*vec4(aP,1.);vP=w.xyz;vN=mat3(uM)*aN;vU=aU;gl_Position=uVP*w;}`;
const FS = `precision highp float;varying vec3 vP;varying vec3 vN;varying vec2 vU;uniform sampler2D uT;uniform vec3 uEye;uniform vec3 uLP[12];uniform vec3 uLC[12];
uniform vec3 uTint;uniform float uEmis;uniform float uSpec;uniform float uAlpha;uniform float uMirror;
void main(){if(uMirror>0.5&&vP.y<0.)discard;vec4 t=texture2D(uT,vU);if(t.a<0.04)discard;vec3 n=normalize(vN);vec3 v=normalize(uEye-vP);if(dot(n,v)<0.)n=-n;
vec3 lit=vec3(.2,.17,.27);vec3 sp=vec3(0.);
for(int i=0;i<12;i++){vec3 d=uLP[i]-vP;float r2=dot(d,d);vec3 l=d*inversesqrt(r2);float a=1./(1.+r2/160000.);lit+=uLC[i]*max(dot(n,l),0.)*a;sp+=uLC[i]*pow(max(dot(n,normalize(l+v)),0.),48.)*a;}
vec3 c=t.rgb*uTint*mix(lit,vec3(1.),uEmis)+sp*uSpec;float f=smoothstep(700.,2300.,length(uEye-vP))*.55;c=mix(c,vec3(.05,.02,.09),f*(1.-uEmis*.7));
gl_FragColor=vec4(c,t.a*uAlpha);}`;

const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const trans = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };

const FOOTPRINT_SCALE = 1.25;
export const ROOM_LAYOUT = {
  halfWidth: 800 * FOOTPRINT_SCALE,
  backDepth: 700 * FOOTPRINT_SCALE,
  frontDepth: 900 * FOOTPRINT_SCALE,
  entryZ: 780 * FOOTPRINT_SCALE,
  bigBoxZ: 150 * FOOTPRINT_SCALE,
  bigBoxClearance: 215,
};

export function buildRoom(canvas, GAMES, PRIZES, handlers) {
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
  const lights = []; const light = (T, p, c, k = 1) => { if (lights.length < 12) lights.push({ p: tf(T, p), c: rgb(c).map(v => v * k) }); };

  // ---------- room shell ----------
  const O = { x: 0, z: 0 }, CH = 560;
  const { halfWidth: HW, backDepth: HD, frontDepth: ZF, bigBoxZ } = ROOM_LAYOUT;
  const floorRepeat = 8 * FOOTPRINT_SCALE, wallRepeat = 4 * FOOTPRINT_SCALE;
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
  quad(floorM, O, [-HW, 0, -HD], [HW, 0, -HD], [HW, 0, ZF], [-HW, 0, ZF], [0, 0, floorRepeat, floorRepeat]);
  quad(ceilM, O, [-HW, CH, ZF], [HW, CH, ZF], [HW, CH, -HD], [-HW, CH, -HD], [0, 0, wallRepeat, wallRepeat]);
  quad(wallM, O, [-HW, CH, -HD], [HW, CH, -HD], [HW, 0, -HD], [-HW, 0, -HD], [0, 0, wallRepeat, 1]);
  quad(wallM, O, [HW, CH, ZF], [-HW, CH, ZF], [-HW, 0, ZF], [HW, 0, ZF], [0, 0, wallRepeat, 1]);
  quad(wallM, O, [-HW, CH, ZF], [-HW, CH, -HD], [-HW, 0, -HD], [-HW, 0, ZF], [0, 0, wallRepeat, 1]);
  quad(wallM, O, [HW, CH, -HD], [HW, CH, ZF], [HW, 0, ZF], [HW, 0, -HD], [0, 0, wallRepeat, 1]);
  light(O, [0, 500, 520 * FOOTPRINT_SCALE], '#ffffff', 0.55);

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
  GAMES.forEach((g, i) => {
    const T = { x: (-540 + i * 360) * FOOTPRINT_SCALE, z: -HD + 2, th: 0 }, c = g.cab, trimC = g.trim || g.color;
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
    span(dark, OUT[0], OUT[1]); span(base, [151, 4], [151, 62]); span(coin, [151, 80], [151, 192], -58, 58);
    span(dark, OUT[1], OUT[2]); span(trim, OUT[2], OUT[3]); span(panel, OUT[3], OUT[4]); span(dark, OUT[4], OUT[5]);
    span(screen, [124, 274], [99.5, 391], -97, 97);
    span(dark, OUT[5], OUT[6]); span(marq, OUT[6], OUT[7]); span(dark, OUT[7], OUT[8]); span(dark, OUT[8], OUT[9]);
    for (const jx of [-80, 33]) { box(solid('#16161c', 0, 1), T, jx - 3, jx + 3, 250, 280, 160, 166); sphere(solid(c ? trimC : '#ff2a3c', 0.35, 1), T, jx, 287, 163, 11); }
    glow(g.color, T, 0, 330, 135, 420, 330); glow(g.color, T, 0, 438, 160, 420, 150);
    quad(neon(g.genre.toUpperCase(), g.color), T, [-150, 550, 5], [150, 550, 5], [150, 488, 5], [-150, 488, 5]);
    glow(g.color, T, 0, 518, 12, 460, 150);
    light(T, [0, 290, 270], g.color, 1.15);
    add(g.id, 'PLAY ' + g.title.toUpperCase(), T, 250, 205, 470, () => handlers.game(g));
  });

  // ---------- Big Box ----------
  const BB = { x: 0, z: bigBoxZ, th: 0 };
  const bbT = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffc93a'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
    text(x, 'BIG BOX', w / 2, 62, `64px ${BIG}`, '#ffc93a');
    GAMES.forEach((g, i) => { const X = 40 + (i % 2) * 222, Y = 108 + (i >> 1) * 176; x.fillStyle = g.color; x.fillRect(X - 4, Y - 4, 218, 164); x.fillStyle = '#000'; x.fillRect(X, Y, 210, 156); drawFit(x, img(g.art), X, Y, 210, 156, true); });
    text(x, 'SELECT YOUR GAME', w / 2, 480, `17px ${PIX}`, '#fff');
  });
  GAMES.forEach(g => img(g.art, bbT.redraw));
  const bbM = mat(bbT, { emis: 0.9, spec: 0.4 });
  box(solid('#1a1a24', 0, 0.8), BB, -130, 130, 0, 290, -130, 130, { front: bbM, back: bbM, left: bbM, right: bbM });
  for (const [ex, ez] of [[-130, -130], [130, -130], [-130, 130], [130, 130]]) box(solid('#ffc93a', 1, 0), BB, ex - 6, ex + 6, 0, 296, ez - 6, ez + 6);
  light(BB, [0, 330, 260], '#ffc93a', 0.9);
  const spinM = mat(tex(512, 128, (x, w, h) => { x.fillStyle = '#ffc93a'; x.fillRect(0, 0, w, h); text(x, '★ BIG BOX ★', w / 2, h / 2 + 4, `58px ${BIG}`, '#0b0612'); }), { emis: 1, spec: 0, dyn: 'spin' });
  { const S = { x: 0, z: 0 }; box(spinM, S, -80, 80, -24, 24, -80, 80); }
  stations.bigbox = { id: 'bigbox', label: 'OPEN THE BIG BOX', x: 0, z: bigBoxZ + 130, w: 260, depth: 0, T: { x: 0, z: bigBoxZ + 130, th: 0 }, open: handlers.bigbox, min: [-140, 0, bigBoxZ - 140], max: [140, 300, bigBoxZ + 140] };

  // ---------- other stations ----------
  const panel = (w, h, color, draw) => mat(tex(512, 512, (x, W, H) => { x.fillStyle = '#0c0c14'; x.fillRect(0, 0, W, H); x.strokeStyle = color; x.lineWidth = 16; x.strokeRect(8, 8, W - 16, H - 16); draw(x, W, H); }), { emis: 0.85, spec: 0.3 });
  const emoji = (x, s, cx, cy, size) => text(x, s, cx, cy, `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`, '#fff');
  const L = z => ({ x: -HW + 2, z: z * FOOTPRINT_SCALE, th: Math.PI / 2 });
  const R = z => ({ x: HW - 2, z: z * FOOTPRINT_SCALE, th: -Math.PI / 2 });
  const F = x => ({ x: x * FOOTPRINT_SCALE, z: ZF - 2, th: Math.PI });

  let T = L(-230);
  box(solid('#1a0a1c', 0, 0.6), T, -125, 125, 0, 400, 0, 110, { front: panel(250, 400, '#ff4fd8', (x, W) => { x.fillStyle = '#ff4fd8'; x.beginPath(); x.arc(W / 2, 190, 150, Math.PI, 0); x.fill(); x.fillStyle = '#0c0c14'; x.beginPath(); x.arc(W / 2, 190, 118, Math.PI, 0); x.fill(); emoji(x, '🎵', W / 2, 140, 96); text(x, 'JUKEBOX', W / 2, 270, `66px ${BIG}`, '#ff4fd8'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffc93a' : '#3ea8ff'; x.fillRect(70 + i * 48, 330, 36, 90); } text(x, 'BIG BANG MUSIC', W / 2, 462, `16px ${PIX}`, '#fff'); }) });
  for (const sx of [-131, 131]) box(solid('#ff4fd8', 1, 0), T, sx - 6, sx + 6, 0, 400, 100, 116);
  glow('#ff4fd8', T, 0, 220, 130, 480, 520); light(T, [0, 260, 240], '#ff4fd8'); add('jukebox', 'OPEN THE JUKEBOX', T, 260, 110, 400, handlers.jukebox);

  T = L(330);
  box(solid('#0e1a2c', 0, 0.5), T, -135, 135, 0, 440, 0, 30, { front: panel(270, 440, '#3ea8ff', (x, W) => { x.fillStyle = '#16304f'; x.fillRect(60, 60, 392, 392); x.fillStyle = '#0c0c14'; x.fillRect(250, 60, 6, 392); emoji(x, '👕', 160, 200, 90); emoji(x, '🧢', 350, 200, 90); text(x, 'MY CLOSET', W / 2, 330, `58px ${BIG}`, '#3ea8ff'); text(x, 'YOUR PRIZES LIVE HERE', W / 2, 400, `14px ${PIX}`, '#fff'); x.fillStyle = '#ffc93a'; x.beginPath(); x.arc(232, 256, 9, 0, 7); x.arc(274, 256, 9, 0, 7); x.fill(); }) });
  glow('#3ea8ff', T, 0, 230, 50, 460, 540); light(T, [0, 260, 220], '#3ea8ff', 0.8); add('closet', 'OPEN MY CLOSET', T, 270, 60, 440, handlers.closet);

  T = R(-200);
  box(solid('#1c1608', 0, 0.4), T, -290, 290, 50, 480, 0, 18);
  for (const sy of [150, 290]) box(solid('#ffc93a', 0.35, 1), T, -280, 280, sy - 10, sy, 18, 100);
  PRIZES.filter(p => !p.real).slice(0, 10).forEach((p, i) => { const em = mat(tex(128, 128, (x, w) => { x.clearRect(0, 0, w, w); emoji(x, p.icon, 64, 70, 96); }), { emis: 1, spec: 0, blend: true }), cx = -224 + (i % 5) * 112, y = i < 5 ? 290 : 150; quad(em, T, [cx - 46, y + 96, 60], [cx + 46, y + 96, 60], [cx + 46, y + 4, 60], [cx - 46, y + 4, 60]); });
  quad(neon('PRIZE WALL', '#ffc93a'), T, [-190, 478, 22], [190, 478, 22], [190, 396, 22], [-190, 396, 22]);
  glow('#ffc93a', T, 0, 440, 40, 560, 200); light(T, [0, 300, 260], '#ffc93a', 1.1); add('prizes', 'SHOP THE PRIZE WALL', T, 560, 100, 480, handlers.prizes);

  T = R(400);
  box(metal, T, -160, 160, 110, 450, 0, 30, { front: panel(320, 340, '#35e06f', (x, W) => { emoji(x, '🏆', W / 2, 96, 84); text(x, 'HIGH SCORES', W / 2, 190, `52px ${BIG}`, '#35e06f'); ['1ST', '2ND', '3RD', '4TH'].forEach((s, i) => { text(x, `${s}  ......  ?`, W / 2, 262 + i * 46, `20px ${PIX}`, i ? '#fff' : '#ffc93a'); }); text(x, 'WHO RUNS THE ARCADE?', W / 2, 462, `14px ${PIX}`, '#35e06f'); }) });
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
    const P = i ? L(55) : F(0), pm = mat(withImg(g.poster, 1024, 512, (x, w, h, e) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); drawFit(x, e, 0, 0, w, h, true); }), { emis: 0.8, spec: 0.3 });
    const hw = i ? 105 : 180, y0 = 190, hh = hw * 0.5625;
    box(solid(g.color, 1, 0), P, -hw - 6, hw + 6, y0 - 6, y0 + hh * 2 + 6, 0, 6); quad(pm, P, [-hw, y0 + hh * 2, 8], [hw, y0 + hh * 2, 8], [hw, y0, 8], [-hw, y0, 8]);
  });

  // ---------- upload ----------
  const buf = gl.createBuffer(); let total = 0; for (const m of mats) { m.start = total; m.n = m.v.length / 8; total += m.n; }
  const data = new Float32Array(total * 8); for (const m of mats) { data.set(m.v, m.start * 8); m.v = null; }
  gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  [[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(([i, n, o]) => { gl.enableVertexAttribArray(A[i]); gl.vertexAttribPointer(A[i], n, gl.FLOAT, false, 32, o); });
  gl.uniform3fv(U.uLP, new Float32Array(12 * 3).map((_, i) => (lights[i / 3 | 0] || { p: [0, 0, 0] }).p[i % 3]));
  gl.uniform3fv(U.uLC, new Float32Array(12 * 3).map((_, i) => (lights[i / 3 | 0] || { c: [0, 0, 0] }).c[i % 3]));
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
      if (!m.n || !pred(m)) continue;
      gl.uniformMatrix4fv(U.uM, false, m.dyn ? mul(trans(0, 400 + Math.sin(time * 1.6) * 8, bigBoxZ), rotY(time * 0.7)) : I);
      gl.bindTexture(gl.TEXTURE_2D, m.t); gl.uniform3fv(U.uTint, m.tint);
      gl.uniform1f(U.uEmis, m.emis * (m.emis === 1 && !m.glow ? 0.94 + 0.06 * Math.sin(time * 9 + m.start) : 1)); gl.uniform1f(U.uSpec, m.spec);
      gl.drawArrays(gl.TRIANGLES, m.start, m.n);
    }
  };
  function render(P, time) {
    resize();
    const view = mul(mul(rotX(-P.pitch), rotY(P.yaw)), trans(-P.x, -P.eye, -P.z)), proj = persp(fov, asp, 8, 5000);
    const flip = ident(); flip[5] = -1;
    gl.uniform3f(U.uEye, P.x, P.eye, P.z); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const pass = (vp, mirror) => {
      gl.uniformMatrix4fv(U.uVP, false, vp); gl.uniform1f(U.uMirror, mirror ? 1 : 0); gl.uniform1f(U.uAlpha, 1);
      gl.disable(gl.BLEND); gl.depthMask(true); drawSet(m => !m.glow && !m.floor && !m.blend, time);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); drawSet(m => m.blend, time);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); drawSet(m => m.glow, time); gl.depthMask(true);
    };
    pass(mul(proj, mul(view, flip)), true);          // the room mirrored below the floor
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(U.uVP, false, mul(proj, view)); gl.uniform1f(U.uMirror, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(U.uAlpha, 0.74); drawSet(m => m.floor, time); // glossy floor over it
    pass(mul(proj, view), false);
  }
  // which station is under a screen point?
  function pick(px, py, P) {
    const t = Math.tan(fov / 2), cx = (px / innerWidth * 2 - 1) * t * asp, cy = (1 - py / innerHeight * 2) * t;
    const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
    const vy = cy * cp + sp, vz = -cp + cy * sp, cs = Math.cos(P.yaw), sn = Math.sin(P.yaw);
    const d = [cx * cs - vz * sn, vy, cx * sn + vz * cs], o = [P.x, P.eye, P.z];
    let best = null, bt = 1e9;
    for (const s of Object.values(stations)) {
      let t0 = 0, t1 = 1e9;
      for (let i = 0; i < 3; i++) { const inv = 1 / (d[i] || 1e-9); let a = (s.min[i] - o[i]) * inv, b = (s.max[i] - o[i]) * inv; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (t0 <= t1 && t0 < bt) { bt = t0; best = s; }
    }
    return best;
  }
  const hfov = () => 2 * Math.atan(Math.tan(fov / 2) * asp);
  resize();
  return { stations, render, pick, hfov, vfov: () => fov };
}
