// Big Bang Arcade darts: the board on the bar wall, the darts and the throw, drawn in 3D.
// Every prop has a stand-in built from simple shapes right here. If finished models are present in assets/darts/
// (dart.glb, cabinet.glb, lamp.glb, trophy.glb, stool.glb) they are used instead; each one is optional.
// The face of the board is painted by darts-rules.js so every bed is exactly where the scoring says it is.
// This file loads only when somebody opens the darts game; the lobby never pays for it.
import * as THREE from './vendor/three/three.module.min.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three/meshopt_decoder.module.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { scoreAt, drawBoard, RINGS } from './darts-rules.js';

const CAB = { cy: 0.333, r: 0.226 };            // on the cabinet model: how high the middle of its board is, and the board's radius (model units)
const DART_LEN = 1.12, FOV = 36, V = (x, y, z) => new THREE.Vector3(x, y, z);
const MODELS = [];                               // which finished models are in assets/darts/ (none yet: the stand-ins below are used)
let models = null;                               // loaded once, kept for the next game
function loadModels() {
  if (!models) {
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
    const get = n => (MODELS.includes(n) ? L.loadAsync(`assets/darts/${n}.glb`).then(g => g.scene, () => null) : Promise.resolve(null));
    models = Promise.all(['dart', 'cabinet', 'lamp', 'trophy', 'stool'].map(get)).then(([dart, cabinet, lamp, trophy, stool]) => ({ dart, cabinet, lamp, trophy, stool }));
  }
  return models;
}

// The dart model arrives lying at an angle. Find its long axis and which end is the point, then stand it up as a
// template: point at 0,0,0 and looking down +Z, tail trailing behind.
function dartTemplate(src) {
  const g = new THREE.Group();
  if (!src) {                                    // no model: a simple dart built from shapes
    const mat = (c, m, r) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
    const part = (geo, m, z) => { const o = new THREE.Mesh(geo, m); o.rotation.x = Math.PI / 2; o.position.z = z; g.add(o); };
    part(new THREE.ConeGeometry(0.012, 0.22, 10), mat(0xc8ccd4, 1, 0.25), -0.11); part(new THREE.CylinderGeometry(0.034, 0.03, 0.3, 14), mat(0xd9a52b, 1, 0.3), -0.37);
    part(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), mat(0x15151a, 0.4, 0.5), -0.67);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), mat(0xd3202f, 0, 0.6)); f.position.set(0, 0, -0.88); f.rotation.z = i * Math.PI / 4; g.add(f); }
    return g;
  }
  src.updateMatrixWorld(true);
  const pts = [], v = V(0, 0, 0), mean = V(0, 0, 0);
  src.traverse(o => { if (o.isMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pts.push(v.clone()); mean.add(v); } } });
  mean.divideScalar(pts.length || 1);
  let axis = V(1, 0.7, 0.2).normalize();         // the long axis: the direction the points are most spread along
  for (let k = 0; k < 40; k++) { const n = V(0, 0, 0); for (const p of pts) { const d = p.clone().sub(mean); n.addScaledVector(d, d.dot(axis)); } axis = n.normalize(); }
  let t0 = Infinity, t1 = -Infinity; const proj = pts.map(p => { const d = p.clone().sub(mean), t = d.dot(axis); t0 = Math.min(t0, t); t1 = Math.max(t1, t); return [t, d.addScaledVector(axis, -t).length()]; });
  const q = (t1 - t0) / 4; let lo = 0, ln = 0, hi = 0, hn = 0;
  for (const [t, r] of proj) { if (t < t0 + q) { lo += r; ln++; } else if (t > t1 - q) { hi += r; hn++; } }
  const tipAtLow = lo / (ln || 1) < hi / (hn || 1), tipDir = axis.clone().multiplyScalar(tipAtLow ? -1 : 1), tip = mean.clone().addScaledVector(axis, tipAtLow ? t0 : t1);   // the thin end is the point
  const holder = new THREE.Group(), s = DART_LEN / (t1 - t0); holder.add(src);
  holder.quaternion.setFromUnitVectors(tipDir, V(0, 0, 1)); holder.scale.setScalar(s); holder.position.copy(tip).applyQuaternion(holder.quaternion).multiplyScalar(-s);
  g.add(holder); return g;
}
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

export { scoreAt };
export async function createDarts(stage, opts = {}) {
  // opts: { canThrow(), onThrow(x, y), onLand(hit, { remote }), muted(), sway }
  const M = await loadModels();
  stage.innerHTML = '<canvas class="dcv"></canvas><div class="dhud"></div><div class="dpop"></div><div class="dhint"></div>';
  const cv = stage.querySelector('.dcv'), hudEl = stage.querySelector('.dhud'), popEl = stage.querySelector('.dpop'), hintEl = stage.querySelector('.dhint');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0c0714);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; pm.dispose();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80), aimCam = camera.clone(); scene.add(camera);

  // ----- the room: wall, floor, cabinet, board face, lamps, trophy shelf, stool -----
  const grain = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#6b4226'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${i % 2 ? 30 : 140},${i % 2 ? 14 : 90},${i % 2 ? 6 : 50},${0.06 + (i * 37 % 10) / 90})`; c.fillRect(0, (i * 53) % h, w, 1 + (i * 7) % 4); } });
  const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.62 }), woodDark = new THREE.MeshStandardMaterial({ map: grain, color: 0x8a6a55, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9a52b, metalness: 1, roughness: 0.28 }), chalk = new THREE.MeshStandardMaterial({ color: 0x1f4a3a, roughness: 0.95 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 1, roughness: 0.2 }), leather = new THREE.MeshStandardMaterial({ color: 0xa3161f, roughness: 0.45 });
  let wallZ = -0.7, cabinet = null;
  if (M.cabinet) {
    cabinet = M.cabinet; cabinet.position.set(0, 0, 0); cabinet.scale.setScalar(1); cabinet.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(); let face = -Infinity;                                       // how far forward the model's own board sits
    for (const [dx, dy] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [0.8, 0.3], [-0.8, -0.3]]) { ray.set(V(dx * CAB.r, CAB.cy + dy * CAB.r, 4), V(0, 0, -1)); const h = ray.intersectObject(cabinet, true)[0]; if (h) face = Math.max(face, h.point.z); }
    if (!isFinite(face)) face = 0;
    const s = RINGS.edge / CAB.r, box = new THREE.Box3().setFromObject(cabinet);
    cabinet.scale.setScalar(s); cabinet.position.set(0, -CAB.cy * s, -face * s - 0.015); wallZ = (box.min.z - face) * s - 0.015; scene.add(cabinet);
  } else {                                                                                            // stand-in cabinet: a walnut box, two open doors with chalkboards, brass hinges
    const box = (w, h, d, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
    box(3.5, 3.9, 0.3, woodDark, 0, 0, -0.45);
    for (const [w, h, x, y] of [[3.9, 0.3, 0, 2.0], [3.9, 0.3, 0, -2.0], [0.3, 4.3, -1.8, 0], [0.3, 4.3, 1.8, 0]]) box(w, h, 0.75, wood, x, y, -0.22);
    box(3.2, 0.34, 0.5, wood, 0, 2.28, -0.3); box(2.2, 0.22, 0.45, wood, 0, 2.52, -0.32); box(3.3, 0.1, 0.5, wood, 0, -1.72, -0.05);
    for (const sx of [-1, 1]) {
      const door = new THREE.Group(); door.position.set(sx * 1.95, 0, 0.16); door.rotation.y = -sx * 0.5; scene.add(door);
      box(1.75, 4.2, 0.12, wood, sx * 0.875, 0, 0, door); box(1.35, 3.6, 0.02, chalk, sx * 0.875, 0, 0.07, door);
      for (const y of [-1.4, 1.4]) box(0.16, 0.42, 0.1, brass, sx * 0.03, y, 0.06, door);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RINGS.edge + 0.02, 0.05, 10, 64), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.6 })); rim.position.z = 0; scene.add(rim);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(RINGS.edge, RINGS.edge, 0.28, 64), woodDark); pad.rotation.x = Math.PI / 2; pad.position.z = -0.15; scene.add(pad);
    wallZ = -0.6;
  }
  const face = new THREE.Mesh(new THREE.CircleGeometry(RINGS.edge, 72), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 1024, drawBoard), roughness: 0.92, metalness: 0 })); face.position.z = 0; scene.add(face);
  const brick = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#1b1130'; c.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let k = -1; k < 8; k++) { const x = k * 64 + (r % 2 ? 32 : 0), y = r * 32, t = 22 + ((r * 7 + k * 13) % 5) * 3; c.fillStyle = `rgb(${t + 14},${t - 4},${t + 34})`; c.fillRect(x + 2, y + 2, 60, 28); } });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(9, 5);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, 24), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 })); wall.position.set(0, 2, wallZ); scene.add(wall);
  const planks = canvasTex(512, 512, (c, w, h) => { for (let k = 0; k < 8; k++) { const t = 30 + (k * 37 % 5) * 5; c.fillStyle = `rgb(${t + 26},${t + 4},${t - 6})`; c.fillRect(k * 64, 0, 62, h); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(k * 64 + 62, 0, 2, h); } });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(6, 3);
  const FLOOR = -4.4, floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 20), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.55, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, wallZ + 10); scene.add(floor);
  const strip = (y, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(44, 0.07, 0.06), new THREE.MeshBasicMaterial({ color: col })); m.position.set(0, y, wallZ + 0.04); scene.add(m); };   // neon strips, like the arcade
  strip(4.15, 0xff2a3c); strip(FLOOR + 0.5, 0x31d7ff);
  const place = (src, height, x, y, z, ry = 0) => { if (!src) return null; const o = src; o.position.set(0, 0, 0); o.rotation.set(0, ry, 0); o.scale.setScalar(1); const b = new THREE.Box3().setFromObject(o), s = height / (b.max.y - b.min.y); o.scale.setScalar(s); o.position.set(x, y - b.min.y * s, z); scene.add(o); return o; };
  const LAMP_X = 4.15;
  if (M.lamp) { const lampL = place(M.lamp, 1.45, -LAMP_X, 1.25, wallZ + 0.62, -Math.PI / 2), lampR = lampL.clone(); lampR.position.x = LAMP_X; scene.add(lampR); }
  else for (const x of [-LAMP_X, LAMP_X]) {                                                         // stand-in lamp: brass plate and arm, green shade, glowing bulb
    const g = new THREE.Group(); g.position.set(x, 2.2, wallZ); scene.add(g);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24), brass); plate.rotation.x = Math.PI / 2; plate.position.z = 0.04; g.add(plate);
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 10, 24, Math.PI), brass); arm.rotation.y = Math.PI / 2; arm.position.set(0, 0, 0.5); g.add(arm);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0f8a3c, roughness: 0.25, metalness: 0.2, side: THREE.DoubleSide })); shade.position.set(0, -0.62, 0.95); g.add(shade);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.2, 16), brass); cap.position.set(0, 0.04, 0.95); g.add(cap);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); bulb.position.set(0, -0.5, 0.95); g.add(bulb);
  }
  for (const x of [-LAMP_X, LAMP_X]) { const p = new THREE.PointLight(0xffd9a0, 26, 12, 1.8); p.position.set(x, 1.0, wallZ + 1.25); scene.add(p); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.8), wood); shelf.position.set(4.05, -1.75, wallZ + 0.4); scene.add(shelf);
  if (M.trophy) place(M.trophy, 1.45, 4.05, -1.69, wallZ + 0.42);
  else {                                                                                            // stand-in trophy: a turned gold cup on a walnut block
    const prof = [[0.02, 0], [0.26, 0.02], [0.2, 0.08], [0.07, 0.16], [0.06, 0.4], [0.16, 0.5], [0.3, 0.72], [0.36, 1.02], [0.33, 1.02], [0.27, 0.74], [0.02, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), gold); cup.position.set(4.05, -1.37, wallZ + 0.42); scene.add(cup);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.5), woodDark); base.position.set(4.05, -1.53, wallZ + 0.42); scene.add(base);
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 16), gold); h.position.set(4.05 + sx * 0.4, -0.58, wallZ + 0.42); scene.add(h); }
  }
  if (M.stool) place(M.stool, 2.5, -4.3, FLOOR, wallZ + 1.6, 0.4);
  else {                                                                                            // stand-in stool: red leather seat, four walnut legs, a brass foot ring
    const g = new THREE.Group(); g.position.set(-4.3, FLOOR, wallZ + 1.6); scene.add(g);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.6, 0.3, 28), leather); seat.position.y = 2.35; g.add(seat);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.25, 10), wood); leg.position.set(Math.cos(a) * 0.5, 1.1, Math.sin(a) * 0.5); leg.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1); g.add(leg); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 28), brass); ring.rotation.x = Math.PI / 2; ring.position.y = 0.8; g.add(ring);
  }
  scene.add(new THREE.HemisphereLight(0x8a7cc0, 0x1a0f10, 0.5));
  const spot = new THREE.SpotLight(0xfff0d8, 130, 30, 0.42, 0.7, 1.6); spot.position.set(0, 5.2, 5.5); spot.target.position.set(0, -0.2, 0); scene.add(spot, spot.target);

  // ----- darts -----
  const template = dartTemplate(M.dart ? M.dart.clone() : null), stuck = [], flying = [];
  const hand = template.clone(); hand.scale.setScalar(0.42); hand.position.set(0.2, -0.27, -1.5); hand.quaternion.setFromUnitVectors(V(0, 0, 1), V(-0.21, 0.13, -0.4).normalize()); camera.add(hand);   // the next dart, held up in front of you: point toward the board, flights by your hand
  const flat = (geo, color, order) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false })); m.renderOrder = order; return m; };
  const reticle = flat(new THREE.RingGeometry(0.1, 0.135, 48), 0xffffff, 6); reticle.visible = false; scene.add(reticle);                 // the aiming ring: dark edge, bright ring, a dot where the dart will land
  reticle.add(flat(new THREE.RingGeometry(0.085, 0.15, 48), 0x000000, 5), flat(new THREE.CircleGeometry(0.03, 20), 0x000000, 5), flat(new THREE.CircleGeometry(0.02, 20), 0xffc93a, 7));
  reticle.children[0].material.opacity = 0.55;
  const shadowTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const rayMiss = new THREE.Raycaster();

  // ----- camera: a wide look at the bar between throws, close on the board while you aim -----
  let aspect = 1, focus = 0, focusTo = 0, lastThrow = -9;
  const pose = (f, cam) => {
    const tan = Math.tan(FOV * Math.PI / 360), fit = (v, h) => Math.max(v / tan, h / (tan * aspect));
    const dTight = fit(1.72, 1.5), dWide = fit(3.5, aspect < 1 ? 3.3 : 5.6), d = dWide + (dTight - dWide) * f, ty = -0.45 * (1 - f);
    cam.aspect = aspect; cam.position.set(0, ty + 0.2 * (1 - f), d); cam.lookAt(0, ty, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  };
  function resize() { const w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight); renderer.setSize(w, h, false); aspect = w / h; pose(1, aimCam); }
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();

  // ----- aiming -----
  let aim = null, busy = false, dead = false; const nd = new THREE.Vector2(), aimRay = new THREE.Raycaster(), plane = new THREE.Plane(V(0, 0, 1), 0), hitPt = V(0, 0, 0);
  const swayAmt = () => (opts.sway ? opts.sway() : 1);
  const boardPoint = e => { const r = cv.getBoundingClientRect(); nd.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); aimRay.setFromCamera(nd, aimCam); return aimRay.ray.intersectPlane(plane, hitPt) ? [hitPt.x, hitPt.y] : [0, 0]; };
  const aimNow = t => { const k = (t - aim.t0) / 1000, A = (0.085 + 0.05 * Math.min(1, k / 3)) * swayAmt(); return [aim.x + Math.sin(k * 3.1 + aim.p1) * A + Math.sin(k * 7.3 + aim.p2) * A * 0.25, aim.y + Math.sin(k * 2.3 + aim.p2) * A * 0.85 + Math.cos(k * 6.1 + aim.p1) * A * 0.25]; };
  const can = () => !dead && !busy && (!opts.canThrow || opts.canThrow());
  const setAim = e => { const [x, y] = boardPoint(e); aim.x = Math.max(-2.6, Math.min(2.6, x)); aim.y = Math.max(-2.2, Math.min(2.4, y + (aim.touch ? 0.42 : 0))); };   // on a phone the aim sits above your finger so you can see it
  cv.addEventListener('pointerdown', e => { if (aim || !can()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {} aim = { id: e.pointerId, t0: performance.now(), p1: Math.random() * 6.28, p2: Math.random() * 6.28, touch: e.pointerType !== 'mouse', x: 0, y: 0 }; setAim(e); hintEl.style.opacity = 0; });
  cv.addEventListener('pointermove', e => { if (aim && e.pointerId === aim.id) setAim(e); });
  cv.addEventListener('pointerup', e => { if (!aim || e.pointerId !== aim.id) return; const [x, y] = aimNow(performance.now()); aim = null; if (can()) launch(x + gauss() * 0.014, y + gauss() * 0.014, false); });
  cv.addEventListener('pointercancel', () => { aim = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;

  // ----- sound (made on the spot, no files) -----
  let AC = null;
  function sound(kind) {
    if (opts.muted && opts.muted()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const t = AC.currentTime;
      const tone = (f0, f1, dur, vol, type = 'sine', at = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur); g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.001, t + at + dur); o.connect(g).connect(AC.destination); o.start(t + at); o.stop(t + at + dur + 0.02); };
      if (kind === 'thunk') { tone(170, 55, 0.12, 0.5); tone(900, 200, 0.04, 0.12, 'square'); }
      if (kind === 'miss') tone(240, 90, 0.16, 0.25, 'triangle');
      if (kind === 'big') { tone(660, 660, 0.12, 0.16, 'triangle', 0.05); tone(880, 880, 0.14, 0.16, 'triangle', 0.16); tone(1320, 1320, 0.22, 0.16, 'triangle', 0.28); }
    } catch {}
  }

  // ----- throwing -----
  function launch(x, y, remote) {
    if (dead) return Promise.resolve(null);
    x = +(+x).toFixed(4); y = +(+y).toFixed(4);                                                    // both players score the very same numbers
    busy = true; lastThrow = performance.now(); if (!remote && opts.onThrow) { try { opts.onThrow(x, y); } catch {} }
    const hit = scoreAt(x, y), d = template.clone(); let z = -0.035;
    if (hit.ring === 'miss' || hit.ring === 'edge') {                                               // off the board: it sticks in the cabinet or the wall
      z = wallZ - 0.02; if (cabinet && hit.ring === 'miss') { rayMiss.set(V(x, y, 6), V(0, 0, -1)); const h = rayMiss.intersectObject(cabinet, true)[0]; if (h) z = h.point.z - 0.035; } else if (hit.ring === 'edge') z = -0.035;
    }
    const from = remote ? V(-0.2 + Math.random() * 0.4, -1.6, camera.position.z - 0.6) : hand.getWorldPosition(V(0, 0, 0)), to = V(x, y, z);
    const lean = V(x + (Math.random() - 0.5) * 0.3 + (to.x - from.x) * 0.05, y - 0.42 - Math.random() * 0.16, z - 1);   // it comes in dropping, so it sticks with the point down and the flights up toward you
    scene.add(d);
    return new Promise(done => flying.push({ d, from, to, lean, t0: performance.now(), dur: 330, hit, remote, done }));
  }
  function land(f) {
    const { d, to, lean, hit, remote } = f; d.position.copy(to); d.lookAt(lean); stuck.push(d);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); sh.position.set(to.x + 0.08, to.y - 0.02, to.z + 0.05); d.userData.shadow = sh; scene.add(sh);
    sound(hit.score ? 'thunk' : 'miss'); if (hit.ring === 'bull' || hit.ring === 'treble') sound('big');
    busy = false; f.done(hit);
    if (opts.onLand) { try { opts.onLand(hit, { remote, x: to.x, y: to.y }); } catch {} }
  }
  function clear() { for (const d of stuck) { scene.remove(d); if (d.userData.shadow) { scene.remove(d.userData.shadow); d.userData.shadow.material.dispose(); d.userData.shadow.geometry.dispose(); } } stuck.length = 0; }
  let popT = 0;
  function pop(text, sub, color) { popEl.innerHTML = `<b style="color:${color || '#ffc93a'}">${text}</b>${sub ? `<span>${sub}</span>` : ''}`; popEl.classList.remove('on'); void popEl.offsetWidth; popEl.classList.add('on'); clearTimeout(popT); popT = setTimeout(() => popEl.classList.remove('on'), 1300); }

  // ----- every frame -----
  let raf = 0, last = performance.now();
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    focusTo = aim ? 1 : now - lastThrow < 1500 ? 1 : can() ? 0.62 : 0; focus += (focusTo - focus) * Math.min(1, dt * (focusTo > focus ? 9 : 2.6)); pose(focus, camera);
    if (aim) { const [x, y] = aimNow(now); reticle.visible = true; reticle.position.set(x, y, 0.03); const s = scoreAt(x, y); reticle.material.color.set(s.ring === 'treble' || s.ring === 'bull' ? 0x3dff9a : s.score ? 0xffffff : 0xff5a6a); }
    else reticle.visible = false;
    hand.visible = can(); hand.position.y = -0.31 + Math.sin(now / 420) * 0.006;
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], k = Math.min(1, (now - f.t0) / f.dur), e = 1 - (1 - k) * (1 - k);
      f.d.position.lerpVectors(f.from, f.to, e); f.d.position.y += Math.sin(k * Math.PI) * 0.32; f.d.lookAt(f.to.x, f.to.y + (0.45 - k) * 1.3, f.to.z - 0.6);
      if (k >= 1) { flying.splice(i, 1); land(f); }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    throwAt: (x, y) => launch(x, y, true),                       // the other player's dart
    throwMine: (x, y) => (can() ? launch(x, y, false) : null),  // for tests and keyboards
    clear, pop, hud: html => { hudEl.innerHTML = html; }, hint: t => { hintEl.textContent = t || ''; hintEl.style.opacity = t ? 1 : 0; },
    get busy() { return busy; }, darts: () => stuck.length, scoreAt, models: M,
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(popT); clear(); try { if (AC) AC.close(); } catch {} scene.environment && scene.environment.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch {} stage.innerHTML = ''; },
  };
}
