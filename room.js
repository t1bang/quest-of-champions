import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createSurfaces } from "./src/room-materials.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { WALLS, FLOOR_AREAS } from "./src/navigation.js";
import { ROOMS, cabinetPosition } from "./src/content.js";

export async function buildRoom(canvas, games, prizes, handlers, wall) {
  const mobile = matchMedia("(pointer:coarse)").matches || innerWidth < 700;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: !mobile,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new T.Scene();
  scene.background = new T.Color("#101017");
  scene.fog = new T.Fog("#101017", 23, 68);
  const camera = new T.PerspectiveCamera(55, 1, 0.07, 85);
  camera.rotation.order = "YXZ";
  const pmrem = new T.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.38;
  studio.dispose();
  pmrem.dispose();
  const surfaces = createSurfaces(renderer);
  const reducedMotion = matchMedia("(prefers-reduced-motion:reduce)");
  scene.add(new T.HemisphereLight("#afbed5", "#36251c", 0.85));
  const sun = new T.DirectionalLight("#ffe0b0", 1.0);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
  scene.add(new T.AmbientLight("#b4bfd5", 0.2));
  const env = new T.Group(),
    animated = [],
    obstacles = [],
    pickables = [],
    stations = {};
  scene.add(env);
  const materials = new Map(),
    textures = new Map(),
    loader = new T.TextureLoader();
  let disposed = false;
  const mat = (color, metalness = 0.1, roughness = 0.55) => {
    const k = `${color}:${metalness}:${roughness}`;
    if (!materials.has(k))
      materials.set(
        k,
        new T.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return materials.get(k);
  };
  const glow = (color) => {
    const k = `glow:${color}`;
    if (!materials.has(k)) materials.set(k, new T.MeshBasicMaterial({ color }));
    return materials.get(k);
  };
  function tex(url) {
    if (!textures.has(url)) {
      const t = loader.load(url, undefined, undefined, () => {});
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.set(url, t);
    }
    return textures.get(url);
  }
  function box(parent, x, y, z, w, h, d, m) {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function rounded(parent, x, y, z, w, h, d, m, r = 0.05) {
    const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  const wood = new T.MeshStandardMaterial({
    map: surfaces.walnut,
    roughness: 0.47,
    metalness: 0.08,
  });
  const leather = new T.MeshStandardMaterial({
    map: surfaces.leather,
    roughness: 0.57,
    metalness: 0.08,
  });
  const speaker = new T.MeshStandardMaterial({
    map: surfaces.grille,
    roughness: 0.65,
    metalness: 0.5,
  });
  const brass = mat("#b98942", 0.82, 0.27);
  function halo(parent, x, y, z, w, h, color, rotation = 0) {
    const o = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: surfaces.halo,
        color,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    o.position.set(x, y, z);
    o.rotation.y = rotation;
    parent.add(o);
    return o;
  }
  function contactShadow(x, z, w, d) {
    const o = new T.Mesh(
      new T.PlaneGeometry(w, d),
      new T.MeshBasicMaterial({
        map: surfaces.shadow,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      }),
    );
    o.rotation.x = -Math.PI / 2;
    o.position.set(x, 0.025, z);
    scene.add(o);
  }
  function point(color, power, x, y, z, range = 10) {
    const light = new T.PointLight(color, power, range, 2);
    light.position.set(x, y, z);
    scene.add(light);
    return light;
  }
  function pendant(x, z) {
    cylinder(env, x, 4.58, z, 0.025, 0.7, brass);
    const shade = new T.Mesh(
      new T.SphereGeometry(0.53, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      mat("#151419", 0.65, 0.28),
    );
    shade.position.set(x, 3.76, z);
    env.add(shade);
    cylinder(env, x, 3.77, z, 0.53, 0.055, brass);
    cylinder(env, x, 3.74, z, 0.46, 0.02, glow("#ffcd83"));
    point("#ffd292", 18, x, 3.5, z, 10);
    const pool = halo(env, x, 0.027, z, 5, 5, "#b98344");
    pool.rotation.x = -Math.PI / 2;
  }
  function plant(x, z, scale = 1) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    env.add(g);
    cylinder(g, 0, 0.35, 0, 0.34, 0.7, brass, 0.27);
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4,
        height = 0.85 + (i % 4) * 0.28;
      const stem = cylinder(
        g,
        Math.sin(angle) * 0.12,
        0.6 + height / 2,
        Math.cos(angle) * 0.12,
        0.015,
        height,
        mat("#42572c"),
      );
      stem.rotation.z = Math.sin(angle) * 0.2;
      const leaf = new T.Mesh(
        new T.SphereGeometry(0.3, 10, 6),
        mat(i % 2 ? "#2e4a27" : "#5b6630", 0.1, 0.6),
      );
      leaf.scale.set(0.55, 2.2, 0.12);
      leaf.position.set(
        Math.sin(angle) * 0.35,
        0.8 + height,
        Math.cos(angle) * 0.35,
      );
      leaf.rotation.set(0, angle, Math.sin(angle) * 0.75);
      g.add(leaf);
    }
    contactShadow(x, z, 1.5 * scale, 1.5 * scale);
    solid(x, z, 0.85 * scale, 0.85 * scale);
  }
  function sphere(parent, x, y, z, r, m) {
    const o = new T.Mesh(new T.SphereGeometry(r, 12, 8), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function cylinder(parent, x, y, z, r, h, m, r2 = r) {
    const o = new T.Mesh(new T.CylinderGeometry(r, r2, h, 20), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function label(
    parent,
    words,
    x,
    y,
    z,
    w,
    h,
    color = "#f4deaf",
    bg = "#122326",
    size = 64,
  ) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.max(64, Math.round((1024 * h) / w));
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min((c.height * 0.68) / words.split("\n").length, size * 1.5)}px "Arial Black",Arial,sans-serif`;
    const lines = words.split("\n");
    lines.forEach((s, i) =>
      ctx.fillText(
        s,
        512,
        c.height / 2 + ((i - (lines.length - 1) / 2) * c.height) / lines.length,
        965,
      ),
    );
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    textures.set(`label:${textures.size}`, texture);
    const o = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: texture,
        transparent: bg === "transparent",
      }),
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function image(parent, url, x, y, z, w, h) {
    const o = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({ map: tex(url) }),
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  const solid = (x, z, w, d) => obstacles.push({ x, z, w, d });
  function station(id, title, x, z, w, d, open, height = 3.95) {
    const target = new T.Mesh(
      new T.BoxGeometry(w, height, d),
      new T.MeshBasicMaterial({ visible: false }),
    );
    target.position.set(x, height / 2, z);
    target.userData.station = id;
    scene.add(target);
    pickables.push(target);
    stations[id] = {
      id,
      label: title,
      x,
      z,
      w,
      depth: d,
      open,
      arrival: { x, z: z + d / 2 + 2.1 },
    };
  }
  for (const [a, b, c, d] of FLOOR_AREAS) {
    const floorMap = surfaces.stone.clone();
    floorMap.repeat.set((b - a) / 2, (d - c) / 2);
    floorMap.needsUpdate = true;
    textures.set(`floor:${a}:${c}`, floorMap);
    const floor = new T.Mesh(
      new T.PlaneGeometry(b - a, d - c),
      new T.MeshStandardMaterial({
        map: floorMap,
        color: "#c6c0b9",
        metalness: 0.28,
        roughness: 0.28,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((a + b) / 2, 0, (c + d) / 2);
    env.add(floor);
    box(
      env,
      (a + b) / 2,
      5.12,
      (c + d) / 2,
      b - a,
      0.2,
      d - c,
      mat("#14141a", 0.2, 0.65),
    );
    for (let z = c + 2; z < d; z += 4)
      box(
        env,
        (a + b) / 2,
        4.99,
        z,
        b - a,
        0.19,
        0.13,
        mat("#232127", 0.6, 0.4),
      );
    for (let x = a + 2; x < b; x += 5) {
      const pipe = cylinder(
        env,
        x,
        4.79,
        (c + d) / 2,
        0.105,
        d - c,
        mat("#4b3429", 0.8, 0.38),
      );
      pipe.rotation.x = Math.PI / 2;
      for (let z = c + 2; z < d; z += 4) {
        const ring = cylinder(env, x, 4.79, z, 0.128, 0.055, brass);
        ring.rotation.x = Math.PI / 2;
      }
    }
  }
  if (!mobile) {
    const mirror = new Reflector(new T.PlaneGeometry(19.5, 27), {
      color: 0x73717a,
      textureWidth: 768,
      textureHeight: 512,
      multisample: 0,
      clipBias: 0.003,
    });
    mirror.material.fragmentShader = mirror.material.fragmentShader.replace(
      "vec4 base = texture2DProj( tDiffuse, vUv );",
      `vec2 uv=vUv.xy/vUv.w;
      vec4 base=texture2D(tDiffuse,uv)*0.36;
      base+=texture2D(tDiffuse,uv+vec2(0.003,0.002))*0.16;
      base+=texture2D(tDiffuse,uv+vec2(-0.003,0.002))*0.16;
      base+=texture2D(tDiffuse,uv+vec2(0.003,-0.002))*0.16;
      base+=texture2D(tDiffuse,uv+vec2(-0.003,-0.002))*0.16;`,
    );
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(0, 0.004, 0);
    scene.add(mirror);
    const tileMap = surfaces.stone.clone();
    tileMap.repeat.set(9.75, 13.5);
    tileMap.needsUpdate = true;
    textures.set("reflection-tile", tileMap);
    const veil = new T.Mesh(
      new T.PlaneGeometry(19.5, 27),
      new T.MeshBasicMaterial({
        map: tileMap,
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    veil.rotation.x = -Math.PI / 2;
    veil.position.set(0, 0.012, 0);
    scene.add(veil);
  }
  for (const [x, z, w, d] of WALLS) {
    box(env, x, 2.5, z, w, 5, d, mat("#252128", 0.08, 0.8));
    if (w > d) {
      box(env, x, 0.18, z, w, 0.13, d + 0.04, brass);
      box(env, x, 4.45, z, w, 0.04, d + 0.07, glow("#6dcced"));
      box(env, x, 3.55, z, w, 0.09, d + 0.05, wood);
      for (let px = x - w / 2 + 0.15; px < x + w / 2; px += 0.22)
        box(env, px, 4.02, z, 0.1, 0.75, d + 0.04, wood);
    } else {
      box(env, x, 0.18, z, w + 0.04, 0.13, d, brass);
      box(env, x, 4.45, z, w + 0.07, 0.04, d, glow("#6dcced"));
      box(env, x, 3.55, z, w + 0.05, 0.09, d, wood);
      for (let pz = z - d / 2 + 0.15; pz < z + d / 2; pz += 0.22)
        box(env, x, 4.02, pz, w + 0.04, 0.75, 0.1, wood);
    }
  }
  for (const [center, z, width] of [
    [0, -27.79, 19.5],
    [-18, -9.79, 15.5],
    [18, -9.79, 15.5],
    [-6.5, -13.79, 6.6],
    [6.5, -13.79, 6.6],
  ])
    for (let x = center - width / 2; x < center + width / 2; x += 0.22)
      box(env, x, 2.25, z, 0.1, 4.15, 0.08, wood);
  for (const x of [-9.3, 9.3])
    for (const z of [-12, 7]) {
      box(env, x, 2.5, z, 0.5, 5, 0.5, mat("#24232b", 0.25));
      box(env, x, 2.7, z + 0.27, 0.15, 0.6, 0.15, brass);
      halo(env, x, 2.75, z + 0.29, 1.7, 3.8, "#ffb75d");
    }
  for (const [x, z] of [
    [-5, -8.5],
    [5, -8.5],
    [-18, -4],
    [18, -4],
    [0, -23],
    [0, 7],
  ])
    pendant(x, z);
  for (const [x, z] of [
    [-8.8, -11.5],
    [8.8, -11.5],
    [-24, -8],
    [24, -8],
    [-8, 10],
  ])
    plant(x, z, 0.9);
  // The sign hangs above the route through to the next room, never across it.
  box(env, 0, 4.46, -12.1, 11.6, 1.0, 0.14, wood);
  label(
    env,
    "BIG BANG  ARCADE",
    0,
    4.48,
    -11.99,
    10.5,
    0.65,
    "#ffdb95",
    "transparent",
    100,
  );
  halo(env, 0, 4.45, -12.0, 13, 2.0, "#d48e33");
  label(env, "THE LAB", 0, 4, -27.6, 7, 0.9, "#8ee2d8", "transparent", 110);
  label(
    env,
    "SOUND + SOCIAL",
    -18,
    4,
    -9.6,
    9,
    0.7,
    "#eeb1d6",
    "transparent",
    90,
  );
  label(env, wall.title, 18, 4, -9.6, 10, 0.7, wall.accent, "transparent", 90);
  for (const r of ROOMS.slice(1)) {
    const z = r.id === "lab" ? -13.65 : 0,
      x = r.id === "lab" ? 0 : r.x > 0 ? 9.75 : -9.75;
    const sign = label(
      env,
      r.name.toUpperCase(),
      x,
      3.85,
      z,
      4.7,
      0.45,
      r.color,
      "#17181d",
      85,
    );
    if (r.id !== "lab") sign.rotation.y = r.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  function handheldScreen(parent) {
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 320;
    const q = c.getContext("2d");
    q.fillStyle = "#142653";
    q.fillRect(0, 0, 480, 320);
    q.fillStyle = "#f7d672";
    q.font = "900 32px Arial";
    q.textAlign = "center";
    q.fillText("GAMEBBOY", 240, 40);
    q.fillStyle = "#bdc7da";
    q.beginPath();
    q.roundRect(156, 58, 168, 235, 16);
    q.fill();
    q.fillStyle = "#363a50";
    q.fillRect(172, 77, 136, 116);
    q.fillStyle = "#14294c";
    q.fillRect(184, 88, 112, 93);
    q.fillStyle = "#4cce8d";
    q.fillRect(186, 161, 45, 6);
    q.fillRect(249, 133, 45, 6);
    q.fillStyle = "#f1c06c";
    q.fillRect(234, 110, 17, 18);
    q.fillStyle = "#a273e0";
    q.fillRect(231, 128, 22, 19);
    q.fillStyle = "#162134";
    q.fillRect(184, 220, 45, 13);
    q.fillRect(200, 204, 13, 45);
    q.fillStyle = "#c93665";
    for (const [x, y] of [
      [282, 219],
      [264, 239],
    ]) {
      q.beginPath();
      q.arc(x, y, 10, 0, Math.PI * 2);
      q.fill();
    }
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    textures.set("handheld-screen", t);
    const m = new T.Mesh(
      new T.PlaneGeometry(1.68, 1.11),
      new T.MeshBasicMaterial({ map: t }),
    );
    m.position.set(0, 2.58, 0.399);
    parent.add(m);
  }
  function cabinet(g) {
    const p = cabinetPosition(g),
      group = new T.Group();
    group.position.set(p.x, 0, p.z);
    env.add(group);
    const trim = g.trim || g.color,
      black = mat("#101015", 0.35, 0.31),
      edge = mat(trim, 0.5, 0.3);
    const shape = new T.Shape();
    [
      [-0.76, 0.1],
      [0.78, 0.1],
      [0.78, 1.25],
      [1.02, 1.64],
      [0.94, 1.84],
      [0.46, 1.99],
      [0.27, 3.05],
      [0.72, 3.27],
      [0.72, 3.84],
      [-0.76, 3.84],
    ].forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    for (const x of [-1.03, 1.03]) {
      const geo = new T.ExtrudeGeometry(shape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 2,
        steps: 1,
      });
      const uv = geo.attributes.uv,
        pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, (pos.getX(i) + 0.8) / 1.85, pos.getY(i) / 3.9);
      const skin = g.cab
        ? new T.MeshStandardMaterial({
            map: tex(`${g.cab}-side.jpg`),
            roughness: 0.35,
            metalness: 0.12,
          })
        : black;
      const side = new T.Mesh(geo, [skin, edge]);
      side.rotation.y = -Math.PI / 2;
      side.position.x = x;
      group.add(side);
      const contour = new T.BufferGeometry().setFromPoints(
        shape
          .getPoints(30)
          .map((v) => new T.Vector3(x > 0 ? x + 0.04 : x - 0.12, v.y, v.x)),
      );
      group.add(
        new T.LineLoop(contour, new T.LineBasicMaterial({ color: trim })),
      );
    }
    rounded(group, 0, 1.92, -0.37, 2, 3.67, 0.8, black);
    rounded(group, 0, 0.11, 0, 2.13, 0.2, 1.7, mat("#08090d", 0.2, 0.7));
    rounded(group, 0, 3.58, 0.48, 2.05, 0.58, 0.45, black);
    rounded(group, 0, 3.58, 0.72, 1.96, 0.46, 0.035, edge, 0.025);
    if (g.cab) image(group, `${g.cab}-marquee.jpg`, 0, 3.58, 0.746, 1.85, 0.39);
    else
      label(
        group,
        g.title.toUpperCase(),
        0,
        3.58,
        0.746,
        1.85,
        0.39,
        g.color,
        "#111321",
        90,
      );
    // Recessed glass, deep bevel and a tilted screen retain the cabinet silhouette.
    rounded(
      group,
      0,
      2.57,
      0.25,
      1.98,
      1.53,
      0.2,
      mat("#050608", 0.15, 0.4),
      0.11,
    );
    rounded(
      group,
      0,
      2.58,
      0.37,
      1.78,
      1.23,
      0.035,
      mat("#24242e", 0.5, 0.18),
      0.06,
    );
    const screenUrl = g.cab ? `${g.cab}-screen.jpg` : g.poster || g.art;
    if (g.id === "gamerboy") handheldScreen(group);
    else if (screenUrl) {
      const screen = image(group, screenUrl, 0, 2.58, 0.397, 1.68, 1.11);
      animated.push({ object: screen, phase: p.x });
    }
    const glass = box(
      group,
      0,
      2.58,
      0.405,
      1.69,
      1.12,
      0.005,
      new T.MeshPhysicalMaterial({
        color: "#afd7ff",
        transparent: true,
        opacity: 0.045,
        metalness: 0,
        roughness: 0.08,
        depthWrite: false,
      }),
    );
    glass.userData.animated = true;
    for (const x of [-0.69, 0.69])
      rounded(group, x, 3.17, 0.39, 0.4, 0.13, 0.04, speaker, 0.02);
    label(
      group,
      g.status === "coming-soon" ? "IN DEVELOPMENT" : "1 PLAYER     2 PLAYER",
      0,
      3.18,
      0.42,
      0.7,
      0.09,
      "#edc47b",
      "#0c1016",
      55,
    );
    rounded(group, 0, 1.74, 0.65, 2.2, 0.17, 0.92, black, 0.04);
    box(group, 0, 1.66, 1.1, 2.1, 0.045, 0.03, edge);
    if (g.cab) {
      const deck = image(group, `${g.cab}-panel.jpg`, 0, 1.83, 0.65, 2, 0.8);
      deck.rotation.x = -Math.PI / 2;
    }
    for (const px of [-0.66, 0.38]) {
      cylinder(group, px, 1.86, 0.78, 0.14, 0.055, mat("#111318", 0.8, 0.2));
      cylinder(group, px, 1.97, 0.78, 0.034, 0.22, mat("#b4bcc2", 0.9, 0.18));
      sphere(
        group,
        px,
        2.09,
        0.78,
        0.1,
        mat(g.id === "guerilla" ? "#15bbc2" : "#d5224e", 0.35, 0.18),
      );
      for (let i = 0; i < 6; i++) {
        const bx = px + 0.27 + (i % 3) * 0.14,
          bz = 0.53 + Math.floor(i / 3) * 0.17;
        cylinder(group, bx, 1.86, bz, 0.069, 0.035, mat("#07090c", 0.3));
        cylinder(
          group,
          bx,
          1.892,
          bz,
          0.053,
          0.04,
          mat(i < 3 ? "#ffd36c" : trim, 0.4, 0.22),
        );
      }
    }
    rounded(group, 0, 0.85, 0.68, 1.94, 1.52, 0.17, black, 0.025);
    if (g.cab) image(group, `${g.cab}-base.jpg`, 0, 0.29, 0.775, 1.9, 0.42);
    rounded(
      group,
      0,
      0.96,
      0.79,
      0.87,
      0.79,
      0.08,
      mat("#242427", 0.7, 0.44),
      0.04,
    );
    rounded(
      group,
      0,
      0.96,
      0.84,
      0.76,
      0.67,
      0.025,
      mat("#111114", 0.4, 0.6),
      0.03,
    );
    for (const x of [-0.22, 0.22]) {
      rounded(group, x, 1.14, 0.875, 0.13, 0.2, 0.03, mat("#5d1023"), 0.02);
      box(group, x, 1.15, 0.895, 0.035, 0.13, 0.015, glow("#ff3a44"));
      rounded(group, x, 0.79, 0.88, 0.19, 0.1, 0.02, mat("#050506"), 0.01);
    }
    for (const [x, y] of [
      [-0.37, 0.64],
      [0.37, 0.64],
      [-0.37, 1.29],
      [0.37, 1.29],
    ])
      sphere(group, x, y, 0.875, 0.018, brass);
    label(
      group,
      "—  BIG BANG ARCADE  —",
      0,
      0.14,
      0.86,
      1.9,
      0.12,
      "#d7ae62",
      "#0b0c10",
      75,
    );
    contactShadow(p.x, p.z + 0.25, 3.3, 3);
    const spill = halo(env, p.x, 0.03, p.z + 1.9, 3.6, 4.2, trim);
    spill.rotation.x = -Math.PI / 2;
    if (g.room === "main" && g.slot < 4) point(trim, 3, p.x, 2.3, p.z + 1.4, 5);
    solid(p.x, p.z, 2.25, 2.2);
    station(g.id, "SELECT " + g.title, p.x, p.z, 2.3, 2.2, () =>
      handlers.game(g),
    );
    stations[g.id].arrival.z = p.z + (g.room === "lab" ? 2 : 3.4);
    rounded(env, p.x, 4.14, p.z + 0.2, 2.65, 0.36, 0.08, mat("#0d0f15"), 0.08);
    label(
      env,
      g.genre.toUpperCase(),
      p.x,
      4.14,
      p.z + 0.25,
      2.5,
      0.25,
      g.color,
      "transparent",
      95,
    );
    halo(env, p.x, 4.14, p.z + 0.19, 3.6, 0.9, g.color);
  }
  games.forEach(cabinet);
  for (let i = 0; i < 4; i++)
    if (!games.some((g) => g.room === "lab" && g.slot === i)) {
      const x = [-6, -2, 2, 6][i];
      box(env, x, 0.13, -26, 2.5, 0.25, 2.3, mat("#243d40"));
      label(
        env,
        `NEXT UP / 0${i + 1}\nNEW GAME IN DEVELOPMENT`,
        x,
        1.9,
        -26,
        2.45,
        1.65,
        "#83ada9",
        "#152a2d",
        49,
      );
      box(env, x, 0.27, -24.82, 2.5, 0.025, 0.06, glow("#49a399"));
    }
  const kiosk = new T.Group();
  kiosk.position.set(0, 0, -5);
  env.add(kiosk);
  rounded(kiosk, 0, 0.57, 0, 2.45, 1.1, 1.2, wood, 0.07);
  rounded(kiosk, 0, 1.15, 0, 2.5, 0.12, 1.3, brass, 0.05);
  const table = new T.Group();
  table.position.set(0, 1.23, 0);
  table.rotation.x = -Math.PI / 2 + 0.18;
  kiosk.add(table);
  rounded(table, 0, 0, 0, 2.3, 1.1, 0.05, mat("#0b0d13"), 0.04);
  label(
    table,
    "★  BIG BOX  ★",
    0,
    0.37,
    0.04,
    2.1,
    0.17,
    "#f5cc81",
    "transparent",
    80,
  );
  games.slice(0, 4).forEach((g, i) => {
    const x = ((i % 2) - 0.5) * 1.06,
      y = 0.04 - Math.floor(i / 2) * 0.32;
    image(
      table,
      g.cab ? `${g.cab}-screen.jpg` : g.poster || g.art,
      x,
      y,
      0.04,
      0.98,
      0.28,
    );
  });
  label(
    kiosk,
    "THE BIG BOX",
    0,
    0.85,
    0.614,
    2.12,
    0.19,
    "#eaca88",
    "transparent",
    75,
  );
  for (let x = -1.13; x < 1.2; x += 0.12)
    box(kiosk, x, 0.4, 0.62, 0.035, 0.6, 0.03, brass);
  solid(0, -5, 2.5, 1.3);
  contactShadow(0, -5, 3.5, 2.3);
  station("bigbox", "BROWSE THE GAMES", 0, -5, 2.5, 1.3, handlers.bigbox, 1.35);
  function makeJukebox(x, z, id) {
    const j = new T.Group();
    j.position.set(x, 0, z);
    env.add(j);
    rounded(j, 0, 1.4, 0, 2.0, 2.8, 0.8, wood, 0.2);
    const profile = new T.Shape();
    profile.moveTo(-1, 0);
    profile.lineTo(1, 0);
    profile.lineTo(1, 2.65);
    profile.absarc(0, 2.65, 1, 0, Math.PI, false);
    profile.lineTo(-1, 0);
    const body = new T.Mesh(
      new T.ExtrudeGeometry(profile, {
        depth: 0.75,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 2,
      }),
      wood,
    );
    body.position.z = -0.4;
    j.add(body);
    for (const [r, c] of [
      [0.92, brass],
      [0.78, glow("#f452d6")],
      [0.68, brass],
    ]) {
      const arch = new T.Mesh(new T.TorusGeometry(r, 0.05, 8, 40, Math.PI), c);
      arch.position.set(0, 2.65, 0.48);
      j.add(arch);
      for (const dx of [-r, r]) cylinder(j, dx, 1.55, 0.48, 0.05, 2.2, c);
    }
    rounded(j, 0, 1.9, 0.44, 1.25, 1.9, 0.08, mat("#17131e", 0.5, 0.3), 0.08);
    label(j, "♫", 0, 2.66, 0.51, 0.65, 0.65, "#ff6ade", "transparent", 170);
    label(
      j,
      "JUKEBOX",
      0,
      2.13,
      0.52,
      1.23,
      0.23,
      "#ffc4ef",
      "transparent",
      100,
    );
    const bars = [];
    for (let i = 0; i < 7; i++) {
      const o = box(
        j,
        -0.48 + i * 0.16,
        1.3,
        0.53,
        0.08,
        0.65,
        0.02,
        glow(i % 2 ? "#e9b969" : "#b85ddc"),
      );
      o.userData.animated = true;
      bars.push(o);
    }
    animated.push({ bars });
    label(
      j,
      "BIG BANG MUSIC",
      0,
      0.91,
      0.53,
      1.35,
      0.15,
      "#d7b77e",
      "transparent",
      80,
    );
    rounded(j, 0, 0.46, 0.49, 1.5, 0.57, 0.09, speaker, 0.03);
    for (let i = 0; i < 12; i++)
      box(j, -0.66 + i * 0.12, 0.46, 0.55, 0.022, 0.5, 0.02, brass);
    halo(j, 0, 2, 0.38, 3.9, 4, "#a9148c");
    station(id, "PICK A RECORD", x, z, 2.1, 1.3, handlers.jukebox);
    solid(x, z, 2.1, 1.3);
    contactShadow(x, z, 3, 2);
  }
  makeJukebox(-7.7, -11.5, "lobby-music");
  makeJukebox(-21, -7.8, "jukebox");
  for (const [x, z] of [
    [-23, 3],
    [-15, 3],
  ]) {
    rounded(env, x, 0.5, z, 3.5, 0.5, 1.4, leather, 0.16);
    rounded(env, x, 0.95, z + 0.6, 3.5, 1, 0.3, leather, 0.12);
    for (let c = -1; c <= 1; c++)
      rounded(env, x + c, 0.8, z, 0.95, 0.18, 1.1, leather, 0.08);
    for (const dx of [-1.65, 1.65])
      rounded(env, x + dx, 0.85, z, 0.26, 0.5, 1.45, leather, 0.12);
    contactShadow(x, z, 4, 2.5);
    solid(x, z, 3.5, 1.7);
  }
  box(env, -19, 0.45, 3, 2.4, 0.14, 1.1, mat("#7a6249", 0.3));
  solid(-19, 3, 2.4, 1.1);
  for (let i = 0; i < 3; i++) {
    const x = -18 + i * 2;
    box(env, x, 2.45, -9.6, 1.5, 1.5, 0.12, mat("#c1a365", 0.65));
    const a = cylinder(
      env,
      x,
      2.45,
      -9.48,
      0.53,
      0.04,
      mat("#10141c", 0.8, 0.2),
    );
    a.rotation.x = Math.PI / 2;
    const b = cylinder(
      env,
      x,
      2.45,
      -9.44,
      0.17,
      0.04,
      mat(["#bb666b", "#c5ad69", "#77aca4"][i]),
    );
    b.rotation.x = Math.PI / 2;
  }
  const accent = wall.accent,
    backdrop = wall.backdrop;
  const mood =
    wall.style === "neon"
      ? "#c477ce"
      : wall.style === "studio"
        ? "#eac694"
        : accent;
  for (let col = 0; col < 3; col++) {
    const x = 13.5 + col * 4.5;
    box(env, x, 1.9, -8.9, 3.9, 3.75, 0.3, mat(backdrop));
    box(env, x, 0.1, -8.2, 4, 0.2, 1.8, mat("#b48b4d", 0.6));
    for (let row = 0; row < 4; row++) {
      const y = 0.35 + row * 0.85;
      box(env, x, y, -8.1, 4, 0.08, 1.55, mat("#c8a56b", 0.7, 0.25));
      box(env, x, y + 0.07, -7.35, 3.8, 0.025, 0.04, glow(accent));
    }
    solid(x, -8.2, 4, 1.8);
  }
  function sculpt(p, parent) {
    const gold = mat("#c69d48", 0.8, 0.22),
      dark = mat("#1d2330", 0.35, 0.3);
    if (p.id === "mic") {
      cylinder(parent, 0, 0.3, 0, 0.065, 0.45, gold);
      sphere(parent, 0, 0.58, 0, 0.16, mat("#9eaab3", 0.8, 0.35));
    } else if (p.id === "record") {
      const a = cylinder(parent, 0, 0.33, 0, 0.31, 0.055, gold);
      a.rotation.x = Math.PI / 2;
      const b = cylinder(parent, 0, 0.33, 0.04, 0.11, 0.06, dark);
      b.rotation.x = Math.PI / 2;
    } else if (p.id === "ring") {
      const a = new T.Mesh(new T.TorusGeometry(0.2, 0.07, 8, 24), gold);
      a.position.y = 0.28;
      parent.add(a);
      box(parent, 0, 0.52, 0, 0.17, 0.16, 0.16, mat("#b8dfec", 0.5, 0.1));
    } else if (p.id === "crown") {
      cylinder(parent, 0, 0.16, 0, 0.24, 0.2, gold);
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        const spike = new T.Mesh(new T.ConeGeometry(0.085, 0.3, 4), gold);
        spike.position.set(Math.cos(a) * 0.2, 0.35, Math.sin(a) * 0.2);
        parent.add(spike);
      }
      sphere(parent, 0, 0.25, 0.25, 0.06, mat("#a52e45", 0.5, 0.2));
    } else if (p.id === "belt") {
      box(parent, 0, 0.26, 0, 0.95, 0.28, 0.07, dark);
      const plate = sphere(parent, 0, 0.28, 0.06, 0.23, gold);
      plate.scale.set(1.25, 0.85, 0.3);
      label(parent, "BBA", 0, 0.28, 0.15, 0.3, 0.13, "#442c16", "#d1a84f", 90);
    } else if (p.id === "trophy") {
      cylinder(parent, 0, 0.15, 0, 0.22, 0.25, gold);
      sphere(parent, 0, 0.37, 0, 0.17, gold);
      for (const x of [-0.3, 0.3]) {
        const h = new T.Mesh(
          new T.TorusGeometry(0.17, 0.035, 8, 20, Math.PI * 1.5),
          gold,
        );
        h.position.set(x, 0.4, 0);
        parent.add(h);
      }
      box(parent, 0, 0.02, 0, 0.6, 0.09, 0.4, dark);
    } else if (p.id === "beanie") {
      const crown = new T.Mesh(
        new T.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        mat("#25497e", 0.1, 0.65),
      );
      crown.position.set(0, 0.23, 0);
      parent.add(crown);
      rounded(parent, 0, 0.23, 0.22, 0.47, 0.035, 0.3, mat("#25497e"), 0.035);
      label(
        parent,
        "★",
        0,
        0.35,
        0.245,
        0.16,
        0.16,
        "#f7ce61",
        "transparent",
        90,
      );
    } else if (p.id === "shades") {
      for (const x of [-0.17, 0.17]) {
        const a = cylinder(parent, x, 0.3, 0, 0.14, 0.05, dark);
        a.rotation.x = Math.PI / 2;
      }
      box(parent, 0, 0.34, 0, 0.14, 0.04, 0.05, gold);
    } else if (p.id === "hoodie") {
      const body = mat("#20232a", 0.05, 0.7),
        sleeve = mat("#b29465", 0.05, 0.7);
      rounded(parent, 0, 0.3, 0, 0.36, 0.46, 0.19, body, 0.07);
      for (const x of [-0.23, 0.23]) {
        const arm = rounded(parent, x, 0.32, 0, 0.16, 0.4, 0.17, sleeve, 0.06);
        arm.rotation.z = x > 0 ? 0.25 : -0.25;
        rounded(parent, x * 1.2, 0.13, 0, 0.13, 0.06, 0.17, body, 0.02);
      }
      cylinder(parent, 0, 0.54, 0, 0.1, 0.08, sleeve);
      box(parent, 0, 0.31, 0.105, 0.015, 0.39, 0.014, sleeve);
      for (let y = 0.16; y < 0.5; y += 0.085)
        sphere(parent, 0, y, 0.12, 0.012, brass);
      label(
        parent,
        "★",
        0.1,
        0.43,
        0.11,
        0.13,
        0.13,
        "#ecc983",
        "transparent",
        90,
      );
    } else if (p.id === "boots") {
      for (const x of [-0.13, 0.13]) {
        rounded(parent, x, 0.21, 0, 0.18, 0.3, 0.22, dark, 0.04);
        rounded(parent, x, 0.08, 0.12, 0.19, 0.15, 0.4, mat("#604128"), 0.05);
        rounded(parent, x, 0.025, 0.12, 0.2, 0.035, 0.42, mat("#c3a477"), 0.01);
        for (let i = 0; i < 4; i++)
          box(
            parent,
            x,
            0.19 + i * 0.035,
            0.125 - i * 0.014,
            0.13,
            0.012,
            0.015,
            mat("#cfbb8c"),
          );
      }
    } else
      label(
        parent,
        p.icon + "\n" + p.name,
        0,
        0.3,
        0.02,
        0.75,
        0.6,
        accent,
        backdrop,
        70,
      );
  }
  for (const p of prizes.filter((p) => p.visible && !p.real)) {
    const col = p.shelf % 3,
      row = Math.floor(p.shelf / 3),
      group = new T.Group();
    group.position.set(13.5 + col * 4.5, 0.46 + row * 0.85, -8.05);
    group.rotation.y = T.MathUtils.degToRad(p.rotation);
    group.scale.setScalar(p.scale);
    env.add(group);
    if (p.model)
      new GLTFLoader().load(
        p.model,
        (gltf) => {
          if (disposed) {
            gltf.scene.traverse((o) => o.geometry?.dispose());
            return;
          }
          const bounds = new T.Box3().setFromObject(gltf.scene),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          gltf.scene.scale.setScalar(0.65 / Math.max(size.x, size.y, size.z));
          gltf.scene.position.copy(center).multiplyScalar(-gltf.scene.scale.x);
          gltf.scene.position.y += 0.35;
          group.add(gltf.scene);
        },
        undefined,
        () => sculpt(p, group),
      );
    else if (p.image) {
      box(group, 0, 0.35, -0.05, 0.85, 0.65, 0.06, mat("#c9aa70", 0.7));
      image(group, p.image, 0, 0.35, 0, 0.77, 0.57);
    } else sculpt(p, group);
    label(
      env,
      p.name.toUpperCase() + " / " + p.cost + " TOKENS",
      group.position.x,
      group.position.y - 0.13,
      -7.3,
      3.4,
      0.17,
      "#e1d7be",
      backdrop,
      50,
    );
  }
  // An editable selection is visible from the entrance; the full collection is
  // through the gallery doorway on the right.
  const showcase = new T.Group();
  showcase.position.set(7.7, 0, -11.5);
  env.add(showcase);
  rounded(showcase, 0, 1.65, 0, 2.25, 3.3, 0.8, wood, 0.06);
  rounded(
    showcase,
    0,
    2.2,
    0.43,
    2.02,
    1.92,
    0.06,
    mat(wall.backdrop, 0.15, 0.65),
    0.02,
  );
  label(
    showcase,
    "PRIZE WALL",
    0,
    3.13,
    0.45,
    2.05,
    0.28,
    wall.accent,
    "transparent",
    100,
  );
  for (const y of [1.18, 2.09, 2.98]) {
    box(showcase, 0, y, 0.6, 2.1, 0.06, 0.6, brass);
    box(showcase, 0, y - 0.04, 0.55, 1.97, 0.02, 0.02, glow(wall.accent));
    halo(showcase, 0, y - 0.25, 0.47, 2.1, 1.1, wall.accent);
  }
  for (const dx of [-0.51, 0.51]) {
    rounded(showcase, dx, 0.59, 0.44, 0.98, 0.95, 0.06, brass, 0.02);
    rounded(showcase, dx, 0.59, 0.48, 0.9, 0.86, 0.04, wood, 0.02);
    sphere(showcase, dx + (dx < 0 ? 0.32 : -0.32), 0.7, 0.52, 0.025, brass);
  }
  prizes
    .filter((p) => p.visible && !p.real)
    .slice(0, 4)
    .forEach((p, i) => {
      const g = new T.Group();
      g.position.set(
        ((i % 2) - 0.5) * 0.98,
        2.15 - Math.floor(i / 2) * 0.91,
        0.58,
      );
      showcase.add(g);
      if (p.image) image(g, p.image, 0, 0.3, 0, 0.8, 0.6);
      else sculpt(p, g);
    });
  solid(7.7, -11.5, 2.25, 1.2);
  contactShadow(7.7, -11.5, 3, 2);
  station(
    "lobby-prizes",
    "EXPLORE THE PRIZE GALLERY",
    7.7,
    -11.5,
    2.25,
    1.2,
    handlers.prizes,
  );
  const galleryLight = new T.PointLight(mood, 24 * wall.lighting, 19, 2);
  galleryLight.position.set(18, 3, -4);
  scene.add(galleryLight);
  station(
    "prizes",
    "EXPLORE THE PRIZE GALLERY",
    18,
    -8,
    12,
    1.8,
    handlers.prizes,
  );
  for (const [id, title, x, z, color] of [
    ["scores", "HALL OF FAME", -6, 12.9, "#96c9ba"],
    ["closet", "MY COLLECTION", 6, 12.9, "#e3ba78"],
    ["credits", "THE PEOPLE BEHIND THE PLAY", -24, 6.5, "#e0b0cf"],
    ["donate", "KEEP THE LIGHTS ON", 24, 6.5, "#efba78"],
  ]) {
    label(env, title, x, 2.2, z, 3.5, 1, color, "#1b2c31", 65).rotation.y =
      Math.PI;
    station(id, title, x, z, 3.5, 0.3, handlers[id]);
    stations[id].arrival = { x, z: z - 2.2 };
    stations[id].yaw = Math.PI;
  }
  // Merge repeated solid architecture, retaining independent screen and artwork meshes.
  scene.updateMatrixWorld(true);
  const groups = new Map(),
    remove = [];
  env.traverse((o) => {
    if (o.isMesh && !Array.isArray(o.material) && !o.userData.animated) {
      const k = o.material.uuid,
        arr = groups.get(k) || [];
      const geo = o.geometry.clone();
      arr.push(
        (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(o.matrixWorld),
      );
      groups.set(k, arr);
      remove.push(o);
    }
  });
  for (const [k, geoms] of groups) {
    const m = remove.find((o) => o.material.uuid === k).material,
      combined = mergeGeometries(geoms, false);
    if (combined) scene.add(new T.Mesh(combined, m));
    geoms.forEach((g) => g.dispose());
  }
  remove.forEach((o) => {
    o.parent.remove(o);
    o.geometry.dispose();
  });
  const { createNavigation } = await import("./src/navigation.js");
  const nav = await createNavigation(obstacles);
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 69 : 55;
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  let lost = false;
  const onLost = (e) => {
    e.preventDefault();
    lost = true;
    canvas.dispatchEvent(
      new CustomEvent("room-error", {
        detail: "Graphics paused. Reload to return to the arcade.",
      }),
    );
  };
  canvas.addEventListener("webglcontextlost", onLost);
  const raycaster = new T.Raycaster();
  const sightWalls = WALLS.map(([x, z, w, d]) => {
    const wall = new T.Mesh(
      new T.BoxGeometry(w, 5, d),
      new T.MeshBasicMaterial({ visible: false }),
    );
    wall.position.set(x, 2.5, z);
    wall.updateMatrixWorld();
    return wall;
  });
  const destination = new T.Mesh(
    new T.RingGeometry(0.22, 0.27, 32),
    new T.MeshBasicMaterial({
      color: "#f3d58f",
      transparent: true,
      opacity: 0.65,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  destination.rotation.x = -Math.PI / 2;
  destination.visible = false;
  scene.add(destination);
  function render(p, time) {
    if (lost || disposed) return;
    camera.position.set(p.x, p.eye || 2.05, p.z);
    camera.rotation.set(p.pitch || 0, -p.yaw, 0);
    if (!reducedMotion.matches)
      for (const a of animated) {
        if (a.bars)
          a.bars.forEach(
            (bar, i) =>
              (bar.scale.y = 0.52 + Math.sin(time * 1.6 + i * 0.9) * 0.3),
          );
        else
          a.object.material.color.setScalar(
            0.98 + Math.sin(time * 0.5 + a.phase) * 0.015,
          );
      }
    renderer.render(scene, camera);
  }
  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new T.Vector2(
        ((x - r.left) / r.width) * 2 - 1,
        (-(y - r.top) / r.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return null;
    const wall = raycaster.intersectObjects(sightWalls, false)[0];
    return wall && wall.distance < hit.distance
      ? null
      : stations[hit.object.userData.station];
  }

  return {
    stations,
    render,
    pick,
    setDestination(p) {
      destination.visible = !!p;
      if (p) destination.position.set(p.x, 0.04, p.z);
    },
    ...nav,
    getZone: (p) =>
      p.z < -14 ? "lab" : p.x < -10 ? "lounge" : p.x > 10 ? "gallery" : "main",
    renderer,
    dispose() {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      nav.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
      });
      textures.forEach((t) => t.dispose());
      sightWalls.forEach((o) => {
        o.geometry.dispose();
        o.material.dispose();
      });
      surfaces.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
