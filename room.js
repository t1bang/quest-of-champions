import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.background = new T.Color("#10181c");
  scene.fog = new T.Fog("#10181c", 18, 61);
  const camera = new T.PerspectiveCamera(62, 1, 0.07, 85);
  camera.rotation.order = "YXZ";
  scene.add(new T.HemisphereLight("#b5d7d5", "#71624d", 3.6));
  const sun = new T.DirectionalLight("#ffe2b9", 3);
  sun.position.set(0, 7, 6);
  scene.add(sun);
  scene.add(new T.AmbientLight("#c2d0d0", 0.8));
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
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${size}px Bungee,Arial Black,sans-serif`;
    const lines = words.split("\n");
    lines.forEach((s, i) =>
      ctx.fillText(s, 512, 128 + (i - (lines.length - 1) / 2) * 83, 965),
    );
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    textures.set(`label:${textures.size}`, texture);
    const o = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({ map: texture }),
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
  function station(id, title, x, z, w, d, open) {
    const target = new T.Mesh(
      new T.BoxGeometry(w, 3.3, d),
      new T.MeshBasicMaterial({ visible: false }),
    );
    target.position.set(x, 1.65, z);
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
    box(
      env,
      (a + b) / 2,
      -0.12,
      (c + d) / 2,
      b - a,
      0.24,
      d - c,
      mat("#182529", 0.3, 0.3),
    );
    box(env, (a + b) / 2, 5.1, (c + d) / 2, b - a, 0.2, d - c, mat("#34454a"));
    for (let x = a + 1; x < b; x += 2)
      box(env, x, 0.005, (c + d) / 2, 0.018, 0.01, d - c, mat("#364345"));
    for (let z = c + 1; z < d; z += 2)
      box(env, (a + b) / 2, 0.005, z, b - a, 0.01, 0.018, mat("#364345"));
    for (let x = a + 2; x < b; x += 5)
      for (let z = c + 3; z < d; z += 7) {
        box(env, x, 4.92, z, 1.7, 0.04, 0.75, glow("#f4d8ab"));
      }
  }
  if (!mobile) {
    const mirror = new Reflector(new T.PlaneGeometry(19.5, 27), {
      color: 0x333b3e,
      textureWidth: 512,
      textureHeight: 512,
      multisample: 0,
      clipBias: 0.003,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(0, 0.008, 0);
    scene.add(mirror);
    const veil = new T.Mesh(
      new T.PlaneGeometry(19.5, 27),
      new T.MeshBasicMaterial({
        color: "#294047",
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    veil.rotation.x = -Math.PI / 2;
    veil.position.set(0, 0.012, 0);
    scene.add(veil);
  }
  for (let z = -12; z < 14; z += 4)
    box(env, 0, 4.92, z, 20, 0.16, 0.1, mat("#4c5c5e"));
  const pendant = cylinder(
    env,
    0,
    3.8,
    5,
    0.55,
    0.5,
    mat("#ab7c48", 0.65, 0.3),
    0.85,
  );
  cylinder(env, 0, 4.5, 5, 0.025, 1, mat("#ab7c48"));
  cylinder(env, 0, 3.54, 5, 0.74, 0.035, glow("#f5d5a0"));
  for (const [x, z, w, d] of WALLS) {
    box(env, x, 2.5, z, w, 5, d, mat("#253d44"));
    if (w > d) {
      box(env, x, 0.2, z, w, 0.12, d + 0.025, mat("#c59651", 0.7, 0.3));
      box(env, x, 4.6, z, w, 0.045, d + 0.07, glow("#61b4b0"));
    } else {
      box(env, x, 0.2, z, w + 0.025, 0.12, d, mat("#c59651", 0.7, 0.3));
      box(env, x, 4.6, z, w + 0.07, 0.045, d, glow("#61b4b0"));
    }
  }
  for (const [center, z, width] of [
    [0, -27.79, 19.5],
    [-18, -9.79, 15.5],
    [18, -9.79, 15.5],
  ])
    for (let x = center - width / 2; x < center + width / 2; x += 0.23)
      box(env, x, 2.25, z, 0.105, 4.2, 0.08, mat("#624231", 0.1, 0.75));
  for (const x of [-8.7, 8.7]) {
    box(env, x, 2.5, -13.8, 0.5, 5, 0.5, mat("#a78655", 0.6));
    box(env, x, 2.5, 7, 0.45, 5, 0.45, mat("#a78655", 0.6));
  }
  label(
    env,
    "BIG BANG   /   ARCADE",
    0,
    4.1,
    -13.75,
    13.5,
    1.15,
    "#f4cc7c",
    "#253d44",
    66,
  );
  label(env, "THE LAB", 0, 4, -27.6, 8, 1.3, "#8ee2d8", "#15272a", 110);
  label(env, "SOUND + SOCIAL", -18, 4, -9.6, 9, 1.05, "#eeb1d6", "#29212b", 65);
  label(env, wall.title, 18, 4, -9.6, 10, 1.05, wall.accent, wall.backdrop, 60);
  for (const r of ROOMS.slice(1)) {
    const z = r.id === "lab" ? -13.7 : 0,
      x = r.id === "lab" ? 0 : r.x > 0 ? 9.75 : -9.75;
    const sign = label(
      env,
      r.name.toUpperCase(),
      x,
      3.9,
      z,
      4.7,
      0.65,
      r.color,
      "#253d44",
      68,
    );
    if (r.id !== "lab") sign.rotation.y = r.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  function cabinet(g) {
    const p = cabinetPosition(g),
      group = new T.Group();
    group.position.set(p.x, 0, p.z);
    env.add(group);
    const trim = g.trim || g.color,
      black = mat("#090d10", 0.4, 0.25),
      edge = mat(trim, 0.45, 0.28);
    const shape = new T.Shape();
    shape.moveTo(-0.76, 0);
    shape.lineTo(0.78, 0);
    shape.lineTo(0.78, 1.2);
    shape.lineTo(0.95, 1.65);
    shape.lineTo(0.6, 1.85);
    shape.lineTo(0.37, 2.95);
    shape.lineTo(0.8, 3.32);
    shape.lineTo(0.8, 3.85);
    shape.lineTo(-0.76, 3.85);
    shape.closePath();
    for (const x of [-1.04, 1.01]) {
      const side = new T.Mesh(
        new T.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false }),
        edge,
      );
      side.rotation.y = -Math.PI / 2;
      side.position.x = x;
      group.add(side);
    }
    box(group, 0, 1.84, -0.3, 2, 3.7, 0.88, black);
    box(group, 0, 0.16, 0.45, 2.05, 0.3, 1.45, black);
    box(group, 0, 3.58, 0.51, 2.04, 0.55, 0.33, black);
    if (g.cab) image(group, `${g.cab}-marquee.jpg`, 0, 3.59, 0.69, 1.92, 0.44);
    else
      label(
        group,
        g.title.toUpperCase(),
        0,
        3.59,
        0.69,
        1.92,
        0.44,
        g.color,
        "#0c1218",
        76,
      );
    box(group, 0, 2.63, 0.31, 1.96, 1.35, 0.12, mat("#030605"));
    if (g.id === "gamerboy") {
      label(
        group,
        "GAMEBBOY\nADVENTURE AWAITS",
        0,
        2.64,
        0.405,
        1.72,
        1.12,
        "#b8ddff",
        "#163887",
        85,
      );
    }
    const screenUrl = g.cab ? `${g.cab}-screen.jpg` : g.poster || g.art;
    if (screenUrl && g.id !== "gamerboy") {
      const screen = image(group, screenUrl, 0, 2.64, 0.39, 1.72, 1.12);
      animated.push({ object: screen, phase: p.x });
    } else if (g.id !== "gamerboy")
      label(
        group,
        g.title + "\nCOMING SOON",
        0,
        2.64,
        0.39,
        1.72,
        1.12,
        g.color,
        "#081b24",
        70,
      );
    box(group, 0, 1.75, 0.65, 2.18, 0.16, 0.89, edge);
    if (g.cab) {
      const deck = image(group, `${g.cab}-panel.jpg`, 0, 1.84, 0.65, 2, 0.73);
      deck.rotation.x = -Math.PI / 2;
      image(group, `${g.cab}-base.jpg`, 0, 0.88, 0.25, 1.94, 1.35);
    } else
      label(
        group,
        g.title.toUpperCase(),
        0,
        0.72,
        0.26,
        1.9,
        1.15,
        g.color,
        "#0e1720",
        70,
      );
    for (const px of [-0.55, 0.5]) {
      cylinder(group, px, 1.91, 0.58, 0.075, 0.26, mat("#9aabb0", 0.8, 0.2));
      sphere(group, px, 2.07, 0.58, 0.12, mat("#b52d41", 0.15, 0.25));
      for (let i = 0; i < 6; i++)
        cylinder(
          group,
          px + 0.23 + (i % 3) * 0.13,
          1.87,
          0.48 + Math.floor(i / 3) * 0.17,
          0.051,
          0.07,
          mat(i < 3 ? "#eaca69" : "#bd4347", 0.3, 0.25),
        );
    }
    box(group, 0, 1.02, 0.33, 0.4, 0.42, 0.07, mat("#4c5456", 0.7, 0.2));
    for (const x of [-0.1, 0.1])
      box(group, x, 1.08, 0.374, 0.045, 0.15, 0.015, glow("#b92b32"));
    label(
      group,
      "BIG BANG ARCADE",
      0,
      0.18,
      0.79,
      1.8,
      0.19,
      "#d4aa63",
      "#10151a",
      68,
    );
    label(
      group,
      g.status === "coming-soon"
        ? "IN DEVELOPMENT"
        : g.status === "demo"
          ? "PLAY THE DEMO"
          : "PRESS START",
      0,
      3.1,
      0.71,
      1.75,
      0.17,
      g.status === "coming-soon" ? "#a7b5bf" : "#d8f0e9",
      "#121c21",
      58,
    );
    if (g.cab)
      for (const x of [-1.09, 1.09]) {
        const side = image(
          group,
          `${g.cab}-side.jpg`,
          x,
          1.9,
          -0.05,
          1.35,
          3.25,
        );
        side.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    solid(p.x, p.z, 2.25, 1.9);
    station(g.id, "SELECT " + g.title, p.x, p.z, 2.3, 1.9, () =>
      handlers.game(g),
    );
    label(
      env,
      g.genre.toUpperCase(),
      p.x,
      4.35,
      p.z + 0.05,
      2.5,
      0.45,
      g.color,
      "#253d44",
      80,
    );
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
  kiosk.position.set(0, 0, 5);
  env.add(kiosk);
  box(kiosk, 0, 0.9, 0, 2, 1.8, 0.95, mat("#152226", 0.5, 0.3));
  box(kiosk, 0, 1.9, 0, 2.5, 0.18, 1.2, mat("#d4a953", 0.65, 0.25));
  label(
    kiosk,
    "THE BIG BOX",
    0,
    2.15,
    0.05,
    2.3,
    0.58,
    "#eecf8b",
    "#132428",
    72,
  );
  box(kiosk, 0, 1.2, 0.51, 1.85, 1, 0.08, mat("#070d12"));
  label(
    kiosk,
    "FIND YOUR NEXT GAME\nTAP TO EXPLORE",
    0,
    1.21,
    0.56,
    1.73,
    0.87,
    "#c9ddd9",
    "#132327",
    61,
  );
  solid(0, 5, 2.5, 1.3);
  station("bigbox", "BROWSE THE GAMES", 0, 5, 2.5, 1.3, handlers.bigbox);
  const jukebox = new T.Group();
  jukebox.position.set(-21, 0, -7.8);
  env.add(jukebox);
  box(jukebox, 0, 1.5, 0, 2.4, 3, 0.9, mat("#251b29", 0.45, 0.35));
  box(jukebox, 0, 1.55, 0.48, 2.1, 2.8, 0.12, mat("#a98252", 0.75, 0.3));
  box(jukebox, 0, 1.55, 0.56, 1.87, 2.55, 0.1, mat("#171b26"));
  label(
    jukebox,
    "BIG BANG\nJUKEBOX",
    0,
    2.4,
    0.64,
    1.6,
    0.7,
    "#f5c6e4",
    "#24182c",
    100,
  );
  const arch = new T.Mesh(
    new T.TorusGeometry(0.68, 0.055, 8, 32, Math.PI),
    glow("#da7cbe"),
  );
  arch.position.set(0, 2.25, 0.65);
  jukebox.add(arch);
  for (let i = 0; i < 9; i++)
    box(
      jukebox,
      -0.65 + i * 0.16,
      0.82,
      0.65,
      0.08,
      1.2,
      0.025,
      mat(i % 2 ? "#c6a569" : "#6b5c78", 0.5),
    );
  station("jukebox", "PICK A RECORD", -21, -7.8, 2.4, 1.2, handlers.jukebox);
  solid(-21, -7.8, 2.5, 1.2);
  for (const [x, z] of [
    [-23, 3],
    [-15, 3],
  ]) {
    box(env, x, 0.5, z, 3.5, 0.5, 1.4, mat("#77483e", 0.1, 0.9));
    box(env, x, 0.95, z + 0.6, 3.5, 1, 0.25, mat("#77483e"));
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
      sphere(parent, 0, 0.25, 0, 0.28, dark).scale.y = 0.6;
      box(parent, 0.08, 0.23, 0.25, 0.4, 0.04, 0.25, dark);
    } else if (p.id === "shades") {
      for (const x of [-0.17, 0.17]) {
        const a = cylinder(parent, x, 0.3, 0, 0.14, 0.05, dark);
        a.rotation.x = Math.PI / 2;
      }
      box(parent, 0, 0.34, 0, 0.14, 0.04, 0.05, gold);
    } else if (p.id === "hoodie") {
      box(parent, 0, 0.3, 0, 0.36, 0.45, 0.16, mat("#8d3439"));
      for (const x of [-0.26, 0.26])
        box(parent, x, 0.34, 0, 0.15, 0.4, 0.14, mat("#8d3439")).rotation.z =
          x > 0 ? 0.3 : -0.3;
      sphere(parent, 0, 0.57, 0, 0.17, mat("#8d3439"));
    } else if (p.id === "boots") {
      for (const x of [-0.13, 0.13]) {
        box(parent, x, 0.21, 0, 0.18, 0.3, 0.22, dark);
        box(parent, x, 0.07, 0.12, 0.19, 0.12, 0.4, mat("#b49769"));
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
    if (o.isMesh && !o.material.map) {
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
  function render(p, time) {
    if (lost || disposed) return;
    camera.position.set(p.x, p.eye || 1.72, p.z);
    camera.rotation.set(p.pitch || 0, -p.yaw, 0);
    if (!matchMedia("(prefers-reduced-motion:reduce)").matches)
      for (const a of animated)
        a.object.material.color.setScalar(
          0.94 + Math.sin(time * 0.7 + a.phase) * 0.035,
        );
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
    return (
      stations[
        raycaster.intersectObjects(pickables, false)[0]?.object.userData.station
      ] || null
    );
  }
  return {
    stations,
    render,
    pick,
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
      renderer.dispose();
    },
  };
}
