// Big Bang Arcade — the expansion (Nov 2026): theater, walk-in closet with mirrors, library and what is behind it,
// laser tag, kid zone, daycare, and the parking lot outside. Also the free-standing machines in the big game room.
// PLAN is plain data shared with app.js (walking, doors); buildExtra() draws the rooms with room.js's own tools.

const room = (x0, x1, z0, z1, entry, anchor, label) => ({ x0, x1, z0, z1, entry, anchor, label });
export const PLAN = {
  // entry = where you stand just inside (yaw: 0 faces north / -z), anchor = a spot in the older rooms to leave from
  rooms: {
    theater: room(-2400, -1200, -700, 180, { x: -1340, z: -70, yaw: -Math.PI / 2 }, { x: -1000, z: -70 }, 'THE THEATER'),
    closet: room(-1900, -1200, 330, 830, { x: -1340, z: 480, yaw: -Math.PI / 2 }, { x: -1000, z: 480 }, 'THE CLOSET'),
    library: room(-3500, -2400, -700, 180, { x: -2540, z: -260, yaw: -Math.PI / 2 }, { x: -1000, z: -70 }, 'THE LIBRARY'),
    chamber: room(-3500, -2600, 420, 1300, { x: -2950, z: 560, yaw: Math.PI }, { x: -1000, z: -70 }, ''),
    laser: room(-3300, -1500, -3150, -1350, { x: -1640, z: -2700, yaw: -Math.PI / 2 }, { x: -1150, z: -2700 }, 'LASER TAG'),
    kids: room(1500, 2700, -3150, -2250, { x: 1640, z: -2700, yaw: Math.PI / 2 }, { x: 1150, z: -2700 }, 'KID ZONE'),
    daycare: room(1500, 2700, -2130, -1230, { x: 2300, z: -1990, yaw: Math.PI }, { x: 1150, z: -2700 }, 'DAYCARE'),
    outside: room(-200, 2600, -4700, -3200, { x: 1000, z: -3340, yaw: 0 }, { x: 1000, z: -2750 }, 'OUTSIDE'),
  },
  // doorways you walk through: [x0, z0, x1, z1, lock]
  lanes: [[-1320, -170, -1080, 30], [-1320, 420, -1080, 540], [-2520, -330, -2280, -190], [-3010, 60, -2890, 540, 'secret'],
    [-1620, -2780, -1220, -2620], [1220, -2780, 1620, -2620], [2230, -2370, 2370, -2010], [900, -3320, 1100, -2790]],
  // things you walk round: [x0, z0, x1, z1]
  solids: [
    ...[-380, -230, -80, 70].flatMap(z => [[-2250, z, -1920, z + 70], [-1780, z, -1450, z + 70]]),                 // theater seats
    [-3210, -430, -2700, -350], [-3210, -130, -2700, -50], [-2640, 20, -2480, 110],                                // library shelves and a table
    [-3090, 815, -3010, 905],                                                                                      // the altar
    [-2000, -1900, -1940, -1500], [-2500, -2300, -2100, -2240], [-2900, -1900, -2840, -1560], [-2600, -2900, -2540, -2560], [-2300, -2760, -1960, -2700],
    [-3080, -2560, -2760, -2500], [-2460, -1700, -2400, -1560], [-2100, -2500, -2040, -2380], [-2760, -2260, -2700, -2040], [-1900, -3020, -1840, -2900], // laser course
    [2180, -3080, 2620, -2700], [1620, -3090, 1900, -2960], [1750, -2500, 1950, -2360],                              // ball pit, slide, little table
    [1600, -1420, 1960, -1300], [2200, -1500, 2420, -1340], [2460, -2060, 2620, -1840],                              // cribs, toy shelf, desk
    ...[200, 520, 1500, 1820, 2140].map(x => [x - 105, -4560, x + 105, -4120]), [380, -3560, 620, -3460],           // parked cars, a bench
  ],
  secret: { x: -2950, z: 180 },
  seals: [[-3280, 620], [-2820, 620], [-3050, 1130]], altar: [-3050, 860],
  hallSolids: [[-330, -2310, 300, -1810], [330, -2120, 470, -1980]],                                                  // the two free-standing machines, the ball rack
  rack: { x: 400, z: -2050 }, hoop: { x: 150, y: 269, z: -2198, r: 46 }, hall: { x0: -1480, x1: 1480, z0: -3180, z1: -1120 },
  mirrorX: -1900,
  keys: [0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ x: 1740 + k * 62, z: -2700 })),                                           // floor piano
  targets: [[-1960, 230, -1700], [-2300, 150, -2244], [-2836, 250, -1730], [-2536, 200, -2730], [-2130, 120, -2704], [-2920, 230, -2504], [-3290, 300, -2250], [-2400, 320, -3140], [-2704, 170, -2150], [-1836, 210, -2960]],
};

// The library's books. `mark` is the sign on the cover; pages are plain text. The last one has no title.
export const BOOKS = [
  { title: 'THE NIGHT THE LIGHTS WENT OUT', mark: '◆', c: '#7a1f2b', pages: [
    'It was a Friday, and every machine in the building was taken. Then the street went dark, and so did we.\n\nNobody left. Somebody found a flashlight. Somebody else found a deck of cards. The change machine became a table.',
    'When the power came back at midnight, forty people cheered a row of title screens.\n\nThe owner let everyone play free until sunrise. People still call it the best night the arcade ever had.',
    'On the last page, in pencil, in a careful hand:\n\n◆  1987' ] },
  { title: 'HIGH SCORES NEVER DIE', mark: '★', c: '#1b3fa8', pages: [
    'A score is a small promise: I was here, and I was this good.\n\nThe first board in this building was a chalk slate by the door. Three letters, one number, wiped clean every Sunday.',
    'Nobody remembers who held the top line longest. Everybody remembers the kid who took it from them.\n\nThat is how it should be.',
    'Inside the back cover, in the same careful pencil:\n\n★  1979' ] },
  { title: 'A FIELD GUIDE TO BOSSES', mark: '●', c: '#12703a', pages: [
    'Every boss teaches one lesson and then tests whether you were listening.\n\nWatch first. Count the beats between swings. The pattern is the door.',
    'When three of you fight together, do not all stand in the same place. Bosses love that.\n\nSpread out. Call what you see. Step when your name is called.',
    'A note in the margin, small and neat:\n\n●  1994' ] },
  { title: 'THE CARTOGRAPHER OF THE BACK ROOMS', mark: '▲', c: '#8a5a1e', pages: [
    'I have drawn this building eleven times and the drawings never agree.\n\nThere is always one more room than there are doors.',
    'If a shelf is fuller than its neighbours, ask what it is hiding. If a wall is warmer than the others, ask what is behind it.\n\nBuildings keep secrets the way people do: badly.',
    'Pencilled under the last map:\n\n▲  1983' ] },
  { title: 'ON GLOVES, AND WHY HEROES WEAR THEM', mark: '✋', c: '#4a2a6a', pages: [
    'Some things should not be touched with bare hands. Hot pans. Old film. Certain blades.\n\nThe old stories agree on this more than they agree on anything else.',
    'A blade that has waited a long time grows particular. It does not ask who you are. It asks what you did to get here.\n\nGloves are how you answer.' ] },
  { odd: true, title: '', mark: '?', c: '#16161c', pages: [] },
];
export const SECRET_ORDER = ['★', '▲', '◆', '●'];   // oldest ink first

export function buildExtra(k) {
  const { box, quad, sphere, tex, mat, solid, fb, neon, glow, light, add, text, fitText, BIG, PIX, handlers, MODELS, stations, ceilM, wallM, CH, O, setMirror, opts, DIMS, setHole, emoji } = k;
  const R = PLAN.rooms, { wallG, DH } = k;
  const floor = (m, r, s = 200) => quad(m, O, [r.x0, 0, r.z0], [r.x1, 0, r.z0], [r.x1, 0, r.z1], [r.x0, 0, r.z1], [0, 0, (r.x1 - r.x0) / s, (r.z1 - r.z0) / s]);
  const ceil = (m, r, s = 400, y = CH) => quad(m, O, [r.x0, y, r.z1], [r.x1, y, r.z1], [r.x1, y, r.z0], [r.x0, y, r.z0], [0, 0, (r.x1 - r.x0) / s, (r.z1 - r.z0) / s]);
  // which walls a room draws itself: n(orth: z0) s(outh: z1) w(est: x0) e(ast: x1), each with its own gaps
  const shell = (r, wm, fm, cm, w) => { floor(fm, r); if (cm) ceil(cm, r); if (w.n) wallG(wm, r.x0, r.z0, r.x1, r.z0, w.n === true ? [] : w.n); if (w.s) wallG(wm, r.x1, r.z1, r.x0, r.z1, w.s === true ? [] : w.s); if (w.w) wallG(wm, r.x0, r.z1, r.x0, r.z0, w.w === true ? [] : w.w); if (w.e) wallG(wm, r.x1, r.z0, r.x1, r.z1, w.e === true ? [] : w.e); };
  const sign = (s, c, T, hw, y, w = 1024) => { quad(neon(s, c, w, 128), T, [-hw, y + 40, 4], [hw, y + 40, 4], [hw, y - 40, 4], [-hw, y - 40, 4]); glow(c, T, 0, y, 10, hw * 2 + 160, 190); };
  const flat = (w, h, draw, o = {}) => mat(tex(w, h, draw, o.repeat), o);
  const N = (x, z) => ({ x, z, th: 0 }), S = (x, z) => ({ x, z, th: Math.PI }), W = (x, z) => ({ x, z, th: Math.PI / 2 }), E = (x, z) => ({ x, z, th: -Math.PI / 2 });   // on the north / south / west / east wall, facing in
  const stat = (id, label, x, z, th, w, lo, hi, open, extra) => { stations[id] = Object.assign({ id, label, x, z, w, depth: 0, T: { x, z, th }, open, min: lo, max: hi, x2: !!(extra && extra.room2) }, extra || {}); };
  const tagRoom = (name, ids) => ids.forEach(id => { if (stations[id]) { stations[id].x2 = true; stations[id].room2 = name; } });

  // ================= THE THEATER (through the wall where the big screen used to hang) =================
  {
    const r = R.theater, carpet = flat(256, 256, (x, w) => { x.fillStyle = '#2a0710'; x.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#3a0a16' : '#310812'; x.beginPath(); x.arc(i * 32 + 16, j * 32 + 16, 9, 0, 7); x.fill(); } x.fillStyle = '#ffc93a'; for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 30, i * 64 + 30, 4, 4); }, { repeat: true, spec: 0.05 });
    const drape = flat(256, 256, (x, w) => { for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, '#2c0509'); g.addColorStop(.5, '#6d0f1c'); g.addColorStop(1, '#2c0509'); x.fillStyle = g; x.fillRect(i * 16, 0, 16, w); } x.fillStyle = '#ffc93a'; x.fillRect(0, 0, w, 8); }, { repeat: true, spec: 0.05 });
    const dimCeil = solid('#0c0305', 0, 0);
    shell(r, drape, carpet, dimCeil, { n: true, s: true, w: [[-260, 120]] });
    // the screen fills the north wall; the page's video shows through it exactly as it did on the old wall
    const V = N(-1850, r.z0 + 2), hw = 430, y0 = 70, y1 = y0 + hw * 2 * 0.5625;
    box(solid('#ffc93a', 1, 0), V, -hw - 12, hw + 12, y0 - 12, y1 + 12, 0, 6); quad(solid('#000000', 1, 0), V, [-hw, y1, 8], [hw, y1, 8], [hw, y0, 8], [-hw, y0, 8]);
    glow('#ffffff', V, 0, (y0 + y1) / 2, 4, hw * 2 + 260, y1 - y0 + 220);
    if (opts.wallVideo) setHole(V, hw, y0, y1);
    else quad(flat(1024, 512, (x, w, h) => { x.fillStyle = '#05050a'; x.fillRect(0, 0, w, h); fitText(x, 'NOW SHOWING', w / 2, 170, 90, w - 80, '#ffc93a'); fitText(x, 'BIG BANG ARCADE', w / 2, 310, 120, w - 80, '#ffffff', '#ff2a3c'); }, { emis: 0.9, spec: 0 }), V, [-hw, y1, 10], [hw, y1, 10], [hw, y0, 10], [-hw, y0, 10]);
    for (const sx of [-hw - 60, hw + 60]) box(solid('#5a0d18', 0.15, 0.1), V, sx - 34, sx + 34, 0, CH - 20, 0, 26);              // curtains either side
    // rows of seats facing the screen, an aisle down the middle, aisle lights
    const seatA = fb('seat', '#8a1420', 0.15, 0.3), seatB = fb('seat', '#5a0c14', 0.1, 0.3);
    [-380, -230, -80, 70].forEach((z, row) => { for (const x0 of [-2250, -1780]) for (let s = 0; s < 5; s++) { const sx = x0 + 6 + s * 66, T = { x: sx + 27, z, th: Math.PI };
      box(seatA, T, -27, 27, 0, 46 + row * 4, -60, -10); box(seatB, T, -27, 27, 46 + row * 4, 112 + row * 6, -70, -56); box(seatB, T, -31, -27, 0, 70, -60, -10); box(seatB, T, 27, 31, 0, 70, -60, -10); }
      for (const ax of [-1905, -1795]) box(solid('#ffc93a', 1, 0), O, ax - 3, ax + 3, 0, 4, z + 20, z + 50); });
    for (const z of [-520, -260, 0]) for (const [T, c] of [[W(r.x0 + 2, z), '#ffb400'], [E(r.x1 - 2, z === -260 ? -430 : z), '#ffb400']]) { box(solid('#2a1a10', 0, 0.4), T, -10, 10, 300, 360, 0, 14); glow(c, T, 0, 340, 16, 150, 190); }
    light(O, [-1850, 420, -420], '#fff1d0', 0.5); light(O, [-1850, 300, 60], '#ffb400', 0.5); light(O, [-1330, 380, -70], '#ffffff', 0.4);
    // popcorn stand by the door
    const PC = S(-1420, r.z1 - 2); box(solid('#b0202c', 0.2, 0.5), PC, -70, 70, 0, 120, 0, 70); box(solid('#fff3d6', 0.6, 0.6), PC, -60, 60, 120, 230, 6, 64);
    quad(flat(256, 128, (x, w, h) => { x.fillStyle = '#b0202c'; x.fillRect(0, 0, w, h); fitText(x, 'POPCORN', w / 2, h / 2, 60, w - 20, '#ffc93a'); }, { emis: 0.8 }), PC, [-70, 280, 34], [70, 280, 34], [70, 232, 34], [-70, 232, 34]);
    stat('theater', 'WATCH THE BIG SCREEN', -1850, -150, Math.PI, 300, [-1900, 0, -160], [-1800, 120, -80], () => handlers.sit('theater'), { seat: [-1850, 0, -150], room2: 'theater' });
    stat('popcorn', 'GRAB SOME POPCORN', -1420, r.z1 - 80, Math.PI, 160, [-1490, 0, r.z1 - 80], [-1350, 290, r.z1], () => handlers.x2('popcorn'), { room2: 'theater' });
    // over the doorway on the main floor side
    const D = W(2 - DIMS.HW, -70); sign('←  THE THEATER', '#ffc93a', D, 150, 440); box(solid('#12121c', 0, 0.5), D, -150, 150, DH, DH + 40, -6, 2);
    quad(neon('LIBRARY  ←', '#35e06f', 512, 128), E(r.x1 - 2, -430), [-110, 470, 4], [110, 470, 4], [110, 420, 4], [-110, 420, 4]);
    sign('THE LIBRARY', '#35e06f', W(r.x0 + 2, -260), 120, 420, 512);
  }

  // ================= THE WALK-IN CLOSET, WITH MIRRORS =================
  {
    const r = R.closet, MX = PLAN.mirrorX, woodT = tex(256, 256, (x, w) => { x.fillStyle = '#4a3020'; x.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#553726' : '#42291a'; x.fillRect(i * 32, 0, 30, w); } }, true);
    const fm = mat(woodT, { spec: 0.3 }), wm = flat(256, 256, (x, w) => { x.fillStyle = '#ead9c8'; x.fillRect(0, 0, w, w); x.fillStyle = '#d9c4ae'; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 2, w); x.fillStyle = '#b08a5a'; x.fillRect(0, w - 30, w, 30); }, { repeat: true, spec: 0.1 });
    const cm = solid('#f4ece2', 0.5, 0), gapsW = [[390, 90], [580, 90], [770, 50]];   // three mirrors along the west wall (the last is narrow)
    const glass = mat(tex(4, 4, x => { x.fillStyle = 'rgba(200,225,255,.13)'; x.fillRect(0, 0, 4, 4); }), { blend: true, emis: 0.7, spec: 1 });
    const inside = () => {
      floor(fm, r); ceil(cm, r); wallG(wm, r.x0, r.z0, r.x1, r.z0); wallG(wm, r.x1, r.z1, r.x0, r.z1);
      // hanging rails with clothes along the north and south walls, shoe shelves under them
      const cols = ['#ff2a3c', '#3ea8ff', '#ffc93a', '#35e06f', '#b06cff', '#ff7a1a', '#ffffff', '#16161c', '#ff4fd8', '#31d7ff'];
      for (const [T, n] of [[N(-1560, r.z0 + 2), 11], [S(-1560, r.z1 - 2), 9]]) {
        box(solid('#c8ccd8', 0.2, 1), T, -310, 310, 300, 306, 44, 50);
        for (let i = 0; i < n; i++) { const hx = -280 + i * (560 / (n - 1)), c = cols[(i * 3 + n) % cols.length]; box(solid(c, 0.25, 0.2), T, hx - 22, hx + 22, 150 + (i % 3) * 22, 296, 36, 58); box(solid('#3a2416', 0, 0.3), T, hx - 2, hx + 2, 296, 304, 44, 50); }
        box(solid('#6a4a30', 0, 0.3), T, -310, 310, 0, 14, 0, 70); box(solid('#6a4a30', 0, 0.3), T, -310, 310, 60, 70, 0, 70);
        for (let i = 0; i < 9; i++) box(solid(cols[(i * 7) % cols.length], 0.3, 0.5), T, -290 + i * 66, -250 + i * 66, 14, 34, 20, 60);
      }
      // an ottoman in the middle
      box(solid('#7a1f2b', 0.15, 0.3), O, -1620, -1480, 0, 52, 540, 620);
    };
    inside(); wallG(wm, r.x0, r.z1, r.x0, r.z0, gapsW, CH);
    // the west wall: mirrors are openings on to a second copy of the room built the other way round
    for (const [c, hw] of gapsW) { const T = W(MX + 1, c); for (const [a, b, y0, y1] of [[-hw - 8, -hw, 0, DH + 8], [hw, hw + 8, 0, DH + 8], [-hw - 8, hw + 8, DH, DH + 8], [-hw - 8, hw + 8, 0, 10]]) box(solid('#ffc93a', 0.5, 1), T, a, b, y0, y1, -3, 5);
      quad(glass, T, [-hw, DH, 1], [hw, DH, 1], [hw, 10, 1], [-hw, 10, 1]); }
    setMirror(MX); inside(); wallG(wm, r.x1, r.z0, r.x1, r.z1, [[480, 110]]); setMirror(null);     // the copy also needs the east wall you came through
    light(O, [-1550, 480, 580], '#fff6e6', 0.9); light(O, [-1800, 300, 480], '#ffffff', 0.5);
    const C = E(r.x1 - 2, 690); box(solid('#0e1a2c', 0, 0.5), C, -100, 100, 0, 400, 0, 30, { front: k.panel(200, 400, '#3ea8ff', (x, Wd) => { emoji(x, '👕', Wd / 2, 190, 150); text(x, 'MY CLOSET', Wd / 2, 380, `58px ${BIG}`, '#3ea8ff'); text(x, 'CHANGE YOUR LOOK', Wd / 2, 450, `15px ${PIX}`, '#fff'); }) });
    glow('#3ea8ff', C, 0, 220, 50, 360, 480); add('closet', 'OPEN MY CLOSET', C, 200, 40, 400, handlers.closet); tagRoom('closet', ['closet']);
    const D = W(2 - DIMS.HW, 480); sign('←  CLOSET + MIRRORS', '#3ea8ff', D, 110, 430, 512); box(solid('#12121c', 0, 0.5), D, -110, 110, DH, DH + 36, -6, 2);
  }

  // ================= THE LIBRARY =================
  const stoneT = tex(256, 256, (x, w) => { x.fillStyle = '#2a2833'; x.fillRect(0, 0, w, w); for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { x.fillStyle = ['#34323f', '#2e2c38', '#3b3948'][(i + j * 2) % 3]; x.fillRect(i * 86 + (j % 2) * 43 - 43, j * 64 + 3, 82, 58); x.fillRect(i * 86 + (j % 2) * 43 + 215, j * 64 + 3, 82, 58); } }, true);
  {
    const r = R.library, GR = '#35e06f';
    const floorW = flat(256, 256, (x, w) => { x.fillStyle = '#3b2617'; x.fillRect(0, 0, w, w); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#4a301c' : '#402918'; x.fillRect(i * 32 + 1, j * 64 + (i % 2) * 32 - 32, 30, 62); x.fillRect(i * 32 + 1, j * 64 + (i % 2) * 32 + 224, 30, 62); } }, { repeat: true, spec: 0.35, floor: true });
    const panelW = flat(256, 256, (x, w) => { x.fillStyle = '#20301f'; x.fillRect(0, 0, w, w); x.fillStyle = '#2b1a0f'; x.fillRect(0, w * .55, w, w * .45); x.fillStyle = '#3d2716'; for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 6, w * .6, 52, w * .34); x.fillStyle = '#ffc93a'; x.fillRect(0, w * .55 - 4, w, 4); }, { repeat: true, spec: 0.1 });
    shell(r, panelW, floorW, solid('#191310', 0.25, 0), { n: true, w: true, s: [[PLAN.secret.x, 62]] });
    const spines = seed => flat(512, 256, (x, w, h) => { x.fillStyle = '#1c120a'; x.fillRect(0, 0, w, h); const cs = ['#7a1f2b', '#1b3fa8', '#12703a', '#8a5a1e', '#4a2a6a', '#b0202c', '#205a66', '#c9a24a', '#2e2e3a']; for (let row = 0; row < 4; row++) { let bx = 6, n = seed + row * 7; while (bx < w - 10) { const bw = 10 + (n * 13 % 14), bh = 44 + (n * 7 % 14); x.fillStyle = cs[n % cs.length]; x.fillRect(bx, row * 64 + 60 - bh, bw, bh); x.fillStyle = 'rgba(255,220,150,.5)'; x.fillRect(bx + 2, row * 64 + 60 - bh + 8, bw - 4, 3); bx += bw + 2; n++; } x.fillStyle = '#5a3a20'; x.fillRect(0, row * 64 + 60, w, 4); } }, { spec: 0.15, emis: 0.12 });
    const shelf = (T, hw, h = 420, d = 50, seed = 1, name) => { const wood = name ? fb(name, '#2b1a0f', 0, 0.3) : solid('#2b1a0f', 0, 0.3), sp = spines(seed); if (name) sp.fb = name; box(wood, T, -hw, hw, 0, h, 0, d, { front: sp }); box(wood, T, -hw - 6, hw + 6, h, h + 12, 0, d + 6); };
    // shelves round the walls and two free-standing rows; a rolling ladder, reading tables with green lamps
    shelf(N(-3180, r.z0 + 2), 300, 420, 50, 1); shelf(N(-2680, r.z0 + 2), 180, 420, 50, 5);
    shelf(W(r.x0 + 2, -480), 200, 420, 50, 9); shelf(W(r.x0 + 2, -50), 200, 420, 50, 13);
    shelf(S(-3310, r.z1 - 2), 170, 420, 50, 17); shelf(S(-2620, r.z1 - 2), 190, 420, 50, 21);
    shelf(S(PLAN.secret.x, r.z1 - 2), 66, 420, 50, 25, 'secretshelf');                                               // this one is not like the others
    for (const z of [-430, -130]) { shelf(S(-2955, z + 80), 255, 300, 40, z + 600); shelf(N(-2955, z), 255, 300, 40, z + 700); }
    for (const lx of [-3340, -3300]) box(solid('#6a4a30', 0, 0.4), N(lx, r.z0 + 60), -4, 4, 0, 430, 0, 6);
    const table = (cx, cz) => { box(solid('#4a2a14', 0.05, 0.5), O, cx - 80, cx + 80, 78, 88, cz - 45, cz + 45); for (const [a, b] of [[-70, -35], [70, -35], [-70, 35], [70, 35]]) box(solid('#2b1a0f', 0, 0.3), O, cx + a - 5, cx + a + 5, 0, 78, cz + b - 5, cz + b + 5); box(solid('#12703a', 0.9, 0.5), O, cx - 14, cx + 14, 118, 132, cz - 8, cz + 8); box(solid('#c9a24a', 0.2, 1), O, cx - 2, cx + 2, 88, 118, cz - 2, cz + 2); light(O, [cx, 150, cz], '#bfffd0', 0.45); };
    table(-2560, 65); table(-2560, -560);
    // the books you can read: each on a brass stand with a small lamp
    const BOOKS = k.BOOKS, stand = (id, i, x, z, th) => { const T = { x, z, th }, b = BOOKS[i]; box(solid('#c9a24a', 0.2, 1), T, -4, 4, 0, 118, 0, 8); box(solid('#2b1a0f', 0, 0.3), T, -34, 34, 118, 124, -12, 26);
      quad(flat(128, 128, (c, w) => { c.fillStyle = b.c; c.fillRect(0, 0, w, w); c.strokeStyle = '#ffc93a'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, w - 16); text(c, b.mark, w / 2, w / 2 + 4, `64px ${BIG}`, '#ffc93a'); }, { emis: 0.55, spec: 0.3 }), T, [-28, 150, -10], [28, 150, -10], [28, 126, 24], [-28, 126, 24]);
      glow(b.c, T, 0, 150, 30, 120, 120); add(id, b.odd ? 'A BOOK WITH NO TITLE' : 'READ: ' + b.title, T, 90, 40, 170, () => handlers.book(i)); tagRoom('library', [id]); stations[id].hidden = true; };
    stand('book0', 0, -3180, r.z0 + 70, 0); stand('book1', 1, r.x0 + 70, -260, Math.PI / 2); stand('book2', 2, -2600, r.z0 + 70, 0); stand('book3', 3, -2480, 95, Math.PI); stand('book4', 4, -3200, r.z1 - 70, Math.PI);
    stand('book5', 5, -2955, -240, Math.PI);
    stat('library', 'VISIT THE LIBRARY', -2560, -20, Math.PI, 160, [-2640, 0, 20], [-2480, 130, 110], () => handlers.x2('library'), { room2: 'library' });
    sign('THE LIBRARY', GR, N(-2950, r.z0 + 2), 260, 500); quad(neon('QUIET, PLEASE', '#fff3d6', 512, 128), W(r.x0 + 2, -260), [-130, 500, 56], [130, 500, 56], [130, 450, 56], [-130, 450, 56]);
    light(O, [-2950, 470, -260], '#ffe2b0', 0.75); light(O, [-3300, 380, -560], '#ffe2b0', 0.5); light(O, [-2620, 380, 40], '#ffe2b0', 0.5); light(O, [PLAN.secret.x, 300, 100], '#b06cff', 0.35);
    // ---- behind the shelf ----
    const pas = { x0: PLAN.secret.x - 62, x1: PLAN.secret.x + 62, z0: 180, z1: 420 }, sm = mat(stoneT, { spec: 0.15 }), sf = mat(stoneT, { spec: 0.25, tint: '#8a8696' });
    floor(sf, pas, 160); ceil(sm, pas, 160, DH); wallG(sm, pas.x0, pas.z1, pas.x0, pas.z0, [], DH); wallG(sm, pas.x1, pas.z0, pas.x1, pas.z1, [], DH);
    const c = R.chamber, VI = '#b06cff';
    shell(c, sm, sf, mat(stoneT, { tint: '#55506a', spec: 0 }), { n: [[PLAN.secret.x, 62]], s: true, w: true, e: true });
    const torch = (T, col = '#ff9a3a') => { box(solid('#2b1a0f', 0, 0.3), T, -6, 6, 230, 290, 0, 16); box(solid(col, 1, 0), T, -9, 9, 290, 318, 4, 22); glow(col, T, 0, 310, 24, 170, 210); light(T, [0, 300, 60], col, 0.8); };
    torch(W(c.x0 + 2, 640)); torch(E(c.x1 - 2, 640)); torch(W(c.x0 + 2, 1100)); torch(E(c.x1 - 2, 1100)); torch(E(pas.x1 - 2, 300), VI);
    // three seals in the floor: a dull ring always, a bright one when woken
    const SC = ['#ff4fd8', '#31d7ff', '#ffc93a'], ring = (col, bright) => flat(256, 256, (x, w) => { x.clearRect(0, 0, w, w); x.strokeStyle = col; x.globalAlpha = bright ? 1 : .35; x.lineWidth = bright ? 22 : 10; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.stroke(); x.lineWidth = 6; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 34 : 92; x[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } x.closePath(); x.stroke(); if (bright) { x.globalAlpha = .28; x.fillStyle = col; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.fill(); } }, { emis: 1, spec: 0, blend: true });
    PLAN.seals.forEach(([sx, sz], i) => { box(solid('#3b3948', 0, 0.4), O, sx - 96, sx + 96, 0, 5, sz - 96, sz + 96); quad(ring(SC[i], false), O, [sx - 88, 6, sz - 88], [sx + 88, 6, sz - 88], [sx + 88, 6, sz + 88], [sx - 88, 6, sz + 88]);
      const lit = ring(SC[i], true); lit.fb = 'seal' + i; lit.hide = true; quad(lit, O, [sx - 88, 7, sz - 88], [sx + 88, 7, sz - 88], [sx + 88, 7, sz + 88], [sx - 88, 7, sz + 88]);
      const beam = mat(k.glowT, { tint: SC[i], emis: 1, glow: true }); beam.fb = 'seal' + i; beam.hide = true; for (const th of [0, Math.PI / 2]) quad(beam, { x: sx, z: sz, th }, [-70, 420, 0], [70, 420, 0], [70, 0, 0], [-70, 0, 0]); });
    // the altar and what is on it
    const [ax, az] = PLAN.altar; box(mat(stoneT, { tint: '#b0a8c8', spec: 0.3 }), O, ax - 40, ax + 40, 0, 96, az - 45, az + 45); box(solid(VI, 0.6, 0.6), O, ax - 46, ax + 46, 96, 102, az - 51, az + 51);
    const gl = solid('#ffc93a', 0.8, 1); gl.fb = 'gloves'; for (const dx of [-16, 16]) { box(gl, O, ax + dx - 11, ax + dx + 11, 104, 132, az - 9, az + 9); box(gl, O, ax + dx - (dx > 0 ? -11 : 17), ax + dx + (dx > 0 ? 17 : -11), 112, 124, az - 6, az + 6); }
    const cage = mat(k.glowT, { tint: VI, emis: 1, glow: true }); cage.fb = 'cage'; for (const th of [0, Math.PI / 2]) quad(cage, { x: ax, z: az, th }, [-80, 260, 0], [80, 260, 0], [80, 90, 0], [-80, 90, 0]);
    light(O, [ax, 300, az], VI, 0.9); light(O, [ax, 480, 1000], '#8ea0ff', 0.35);
    quad(flat(1024, 256, (x, w, h) => { x.clearRect(0, 0, w, h); fitText(x, 'THREE MUST WAKE AS ONE', w / 2, 80, 64, w - 60, '#d9c8ff'); fitText(x, 'THEN ANSWER WHAT THEY SING', w / 2, 180, 52, w - 60, '#9a86d8'); }, { emis: 0.9, blend: true, spec: 0 }), S(ax, c.z1 - 2), [-330, 420, 4], [330, 420, 4], [330, 260, 4], [-330, 260, 4]);
    stat('altar', 'REACH FOR THE ALTAR', ax, az - 60, 0, 120, [ax - 50, 0, az - 55], [ax + 50, 150, az + 55], () => handlers.x2('altar'), { room2: 'chamber', hidden: true });
  }

  // ================= LASER TAG =================
  {
    const r = R.laser, CY = '#31d7ff', MG = '#ff2a7a';
    const grid = flat(256, 256, (x, w) => { x.fillStyle = '#05060c'; x.fillRect(0, 0, w, w); x.strokeStyle = '#122a44'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, w); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); } x.strokeStyle = CY; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, w - 2); }, { repeat: true, spec: 0.7, floor: true });
    const dark = flat(256, 256, (x, w) => { x.fillStyle = '#07080f'; x.fillRect(0, 0, w, w); x.fillStyle = MG; x.fillRect(0, 60, w, 4); x.fillStyle = CY; x.fillRect(0, 70, w, 2); x.fillStyle = '#10142a'; for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 4, 100, 56, 140); }, { repeat: true, spec: 0.2, emis: 0.25 });
    shell(r, dark, grid, solid('#020308', 0, 0), { n: true, s: true, w: true });
    // the course: walls of cover with lit edges (the same boxes app.js keeps you from walking through)
    const cover = PLAN.solids.filter(s => s[0] >= r.x0 && s[2] <= r.x1 && s[1] >= r.z0 && s[3] <= r.z1);
    cover.forEach(([x0, z0, x1, z1], i) => { const h = 150 + (i * 53 % 4) * 45, c = i % 2 ? CY : MG; box(solid('#0c1020', 0.05, 0.6), O, x0, x1, 0, h, z0, z1); box(solid(c, 1, 0), O, x0 - 2, x1 + 2, h, h + 6, z0 - 2, z1 + 2); box(solid(c, 1, 0), O, x0 - 2, x1 + 2, 0, 5, z0 - 2, z1 + 2); });
    // two bases
    for (const [bx, bz, c] of [[-1760, -1560, MG], [-3040, -2920, CY]]) { box(solid(c, 1, 0), O, bx - 110, bx + 110, 0, 4, bz - 110, bz + 110); box(solid('#0c1020', 0, 0.6), O, bx - 100, bx + 100, 4, 6, bz - 100, bz + 100); light(O, [bx, 260, bz], c, 0.9); }
    // targets: a dull disc always, a bright one for the target that is live
    const disc = (col, on) => flat(128, 128, (x, w) => { x.clearRect(0, 0, w, w); for (const [rr, c] of [[60, on ? col : '#1c2238'], [42, on ? '#ffffff' : '#10142a'], [22, on ? col : '#1c2238']]) { x.fillStyle = c; x.beginPath(); x.arc(64, 64, rr, 0, 7); x.fill(); } }, { emis: on ? 1 : 0.4, spec: 0, blend: true });
    const off = disc(CY, false);
    PLAN.targets.forEach(([tx, ty, tz], i) => { for (const th of [0, Math.PI / 2]) { const T = { x: tx, z: tz, th }; quad(off, T, [-52, ty + 52, 0], [52, ty + 52, 0], [52, ty - 52, 0], [-52, ty - 52, 0]); }
      const on = disc(i % 2 ? '#ffc93a' : '#35e06f', true); on.fb = 'lt' + i; on.hide = true; for (const th of [0, Math.PI / 2]) quad(on, { x: tx, z: tz, th }, [-56, ty + 56, 0.5], [56, ty + 56, 0.5], [56, ty - 56, 0.5], [-56, ty - 56, 0.5]); });
    light(O, [-2400, 480, -2250], '#3a4cff', 0.45); light(O, [-2900, 300, -1700], MG, 0.6); light(O, [-1900, 300, -2800], CY, 0.6);
    // the desk by the door, signs on both sides of the doorway
    const DK = S(-1700, -2520); box(solid('#0c1020', 0.1, 0.7), DK, -110, 110, 0, 110, 0, 60); box(solid(CY, 1, 0), DK, -112, 112, 110, 116, -2, 62);
    quad(flat(512, 256, (x, w, h) => { x.fillStyle = '#05060c'; x.fillRect(0, 0, w, h); fitText(x, 'LASER TAG', w / 2, 70, 80, w - 30, CY, MG); fitText(x, 'HIT THE LIT TARGETS', w / 2, 150, 34, w - 40, '#fff'); fitText(x, 'TAG PLAYERS FOR BONUS', w / 2, 205, 28, w - 40, '#ffc93a'); }, { emis: 0.9, spec: 0 }), DK, [-100, 250, 30], [100, 250, 30], [100, 150, 30], [-100, 150, 30]);
    stat('lasertag', 'START LASER TAG', -1700, -2600, Math.PI, 220, [-1810, 0, -2580], [-1590, 260, -2520], () => handlers.x2('laser'), { room2: 'laser' });
    sign('←  LASER TAG', CY, W(2 - DIMS.BW, -2700), 130, 440, 512); box(solid('#12121c', 0, 0.5), W(2 - DIMS.BW, -2700), -130, 130, DH, DH + 40, -6, 2);
  }

  // ================= KID ZONE =================
  const rainbow = ['#ff2a3c', '#ff7a1a', '#ffc93a', '#35e06f', '#31d7ff', '#3ea8ff', '#b06cff', '#ff4fd8'];
  {
    const r = R.kids;
    const foam = flat(256, 256, (x, w) => { const cs = ['#ffd23e', '#3ea8ff', '#ff5a7a', '#35e06f']; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = cs[(i + j * 3) % 4]; x.fillRect(i * 64, j * 64, 64, 64); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3; x.strokeRect(i * 64 + 2, j * 64 + 2, 60, 60); } }, { repeat: true, spec: 0.05 });
    const sky = flat(512, 512, (x, w) => { const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, '#5cc3ff'); g.addColorStop(.7, '#bfeaff'); g.addColorStop(.7, '#6fd66f'); g.addColorStop(1, '#3fa94a'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = '#fff'; for (const [cx, cy] of [[90, 90], [300, 60], [440, 130]]) for (const [dx, dy, rr] of [[0, 0, 30], [32, 6, 24], [-30, 8, 22]]) { x.beginPath(); x.arc(cx + dx, cy + dy, rr, 0, 7); x.fill(); } x.fillStyle = '#ffd23e'; x.beginPath(); x.arc(200, 150, 30, 0, 7); x.fill(); }, { repeat: true, spec: 0, emis: 0.35 });
    shell(r, sky, foam, solid('#fff8e0', 0.6, 0), { n: true, e: true, s: [[2300, 70]] });
    // ball pit
    const pit = [2180, -3080, 2620, -2700]; for (const [a, b, c, d] of [[pit[0], pit[2], pit[1], pit[1] + 14], [pit[0], pit[2], pit[3] - 14, pit[3]], [pit[0], pit[0] + 14, pit[1], pit[3]], [pit[2] - 14, pit[2], pit[1], pit[3]]]) box(solid('#3ea8ff', 0.3, 0.3), O, a, b, 0, 60, c, d);
    for (let i = 0; i < 70; i++) { const bx = pit[0] + 30 + (i * 97 % 380), bz = pit[1] + 30 + (i * 61 % 320); sphere(solid(rainbow[i % 8], 0.45, 0.6), O, bx, 26 + (i % 3) * 9, bz, 17); }
    // a slide with steps, soft blocks, a low table with stools, a floor piano
    const SL = N(1760, -3090); box(solid('#ffd23e', 0.3, 0.3), SL, -60, 60, 0, 150, 0, 60); for (let s = 0; s < 4; s++) box(solid('#ff5a7a', 0.3, 0.3), SL, 64 + s * 30, 94 + s * 30, 0, 144 - s * 36, 0, 60);
    for (let s = 0; s < 8; s++) box(solid('#3ea8ff', 0.35, 0.6), SL, -52, 52, 150 - (s + 1) * 18, 150 - s * 18 + 6, 60 + s * 26, 60 + (s + 1) * 26);
    [[1650, -2420, 0], [1700, -2380, 1], [1640, -2330, 3], [2050, -2420, 4], [2110, -2400, 6]].forEach(([bx, bz, c]) => box(solid(rainbow[c], 0.35, 0.3), O, bx - 26, bx + 26, 0, 52, bz - 26, bz + 26));
    box(solid('#ffffff', 0.4, 0.3), O, 1750, 1950, 60, 70, -2500, -2360); for (const [a, b] of [[1770, -2480], [1930, -2480], [1770, -2380], [1930, -2380]]) box(solid('#ff7a1a', 0.3, 0.3), O, a - 6, a + 6, 0, 60, b - 6, b + 6);
    PLAN.keys.forEach((p, i) => { box(solid(rainbow[i], 0.75, 0.2), O, p.x - 29, p.x + 29, 0, 5, p.z - 80, p.z + 80); });
    quad(flat(512, 128, (x, w, h) => { x.clearRect(0, 0, w, h); fitText(x, 'STEP ON THE KEYS', w / 2, h / 2, 60, w - 20, '#ffffff', '#ff5a7a'); }, { emis: 1, blend: true, spec: 0 }), O, [1740, 6, -2610], [2180, 6, -2610], [2180, 6, -2560], [1740, 6, -2560]);
    sign('KID ZONE', '#ffd23e', N(2100, r.z0 + 2), 260, 470); for (let i = 0; i < 8; i++) glow(rainbow[i], N(1640 + i * 130, r.z0 + 2), 0, 380, 12, 150, 150);
    light(O, [2100, 480, -2700], '#ffffff', 1); light(O, [2400, 300, -2900], '#ffd23e', 0.6); light(O, [1750, 300, -2500], '#ff9ad0', 0.5);
    stat('ballpit', 'JUMP IN THE BALL PIT', 2400, -2680, 0, 440, [pit[0], 0, pit[1]], [pit[2], 70, pit[3]], () => handlers.x2('pit'), { room2: 'kids' });
    sign('KID ZONE  →', '#ffd23e', E(DIMS.BW - 2, -2700), 130, 440, 512); box(solid('#12121c', 0, 0.5), E(DIMS.BW - 2, -2700), -130, 130, DH, DH + 40, -6, 2);
    sign('DAYCARE  ↑', '#ff9ad0', S(2300, r.z1 - 2), 110, 430, 512);
  }

  // ================= DAYCARE =================
  {
    const r = R.daycare, PK = '#ff9ad0';
    const soft = flat(256, 256, (x, w) => { x.fillStyle = '#f6e7d0'; x.fillRect(0, 0, w, w); x.fillStyle = '#efd9b8'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }, { repeat: true, spec: 0.05 });
    const wallP = flat(256, 256, (x, w) => { x.fillStyle = '#ffe9f3'; x.fillRect(0, 0, w, w); x.fillStyle = '#bfe6ff'; x.fillRect(0, w * .62, w, w * .38); x.fillStyle = '#fff'; x.fillRect(0, w * .62 - 5, w, 5); const st = ['#ffd23e', '#ff9ad0', '#9adfff']; for (let i = 0; i < 6; i++) { x.fillStyle = st[i % 3]; x.beginPath(); x.arc(22 + i * 43, 40 + (i % 2) * 70, 9, 0, 7); x.fill(); } }, { repeat: true, spec: 0, emis: 0.3 });
    shell(r, wallP, soft, solid('#fffaf0', 0.6, 0), { n: [[2300, 70]], e: true, s: true });
    // the short hall between the kid zone and the daycare
    const hall = { x0: 2230, x1: 2370, z0: -2250, z1: -2130 }; floor(soft, hall); ceil(solid('#fffaf0', 0.6, 0), hall, 400, DH); wallG(wallP, hall.x0, hall.z1, hall.x0, hall.z0, [], DH); wallG(wallP, hall.x1, hall.z0, hall.x1, hall.z1, [], DH);
    // cribs, a round play rug with toys, a toy shelf, a rocking horse, the check-in desk
    for (const cx of [1690, 1870]) { box(solid('#ffffff', 0.4, 0.3), O, cx - 80, cx + 80, 30, 46, -1420, -1300); box(solid('#bfe6ff', 0.4, 0.2), O, cx - 76, cx + 76, 46, 58, -1416, -1304); for (const [a, b] of [[-80, -1420], [72, -1420], [-80, -1308], [72, -1308]]) box(solid('#ffffff', 0.4, 0.3), O, cx + a, cx + a + 8, 0, 110, b, b + 8); for (const zz of [-1420, -1304]) for (let b = 0; b < 7; b++) box(solid('#ffffff', 0.4, 0.3), O, cx - 70 + b * 22, cx - 66 + b * 22, 46, 108, zz, zz + 4); box(solid('#ffffff', 0.4, 0.3), O, cx - 80, cx + 80, 104, 110, -1420, -1300, {}); }
    quad(flat(256, 256, (x, w) => { x.clearRect(0, 0, w, w); for (const [rr, c] of [[124, '#ff9ad0'], [96, '#ffd23e'], [66, '#9adfff'], [36, '#b8f0b0']]) { x.fillStyle = c; x.beginPath(); x.arc(128, 128, rr, 0, 7); x.fill(); } }, { blend: true, spec: 0, emis: 0.3 }), O, [1880, 2, -1900], [2180, 2, -1900], [2180, 2, -1600], [1880, 2, -1600]);
    [[1960, -1820, 0, 22], [2090, -1700, 4, 26], [1990, -1680, 2, 18], [2110, -1830, 6, 20]].forEach(([bx, bz, c, s]) => box(solid(rainbow[c], 0.4, 0.3), O, bx - s, bx + s, 2, 2 + s * 2, bz - s, bz + s)); sphere(solid('#ff5a7a', 0.4, 0.5), O, 2040, 24, -1760, 22);
    const TS = S(2310, -1340); box(solid('#ffffff', 0.4, 0.3), TS, -110, 110, 0, 150, 0, 60); for (let i = 0; i < 8; i++) box(solid(rainbow[i], 0.45, 0.3), TS, -100 + i * 26, -80 + i * 26, 20 + (i % 2) * 70, 50 + (i % 2) * 70, 44, 62);
    const RH = { x: 1700, z: -1700, th: 0.5 }; box(solid('#c98a4a', 0.2, 0.4), RH, -14, 14, 40, 78, -40, 40); box(solid('#c98a4a', 0.2, 0.4), RH, -10, 10, 78, 120, 26, 46); for (const zz of [-34, 34]) box(solid('#8a5a1e', 0.1, 0.3), RH, -22, 22, 0, 8, zz - 30, zz + 30);
    const DK = W(2620, -1950); box(solid('#ffffff', 0.4, 0.4), DK, -110, 110, 0, 104, 0, 60); box(solid(PK, 0.6, 0.3), DK, -114, 114, 104, 112, -4, 64); sphere(solid('#ffd23e', 0.6, 1), DK, 60, 124, 30, 12);
    quad(flat(512, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); fitText(x, 'DAYCARE', w / 2, 80, 96, w - 40, PK); fitText(x, 'CHECK-IN', w / 2, 180, 56, w - 40, '#3ea8ff'); }, { emis: 0.85, spec: 0 }), W(r.x1 - 2, -1950), [-150, 420, 4], [150, 420, 4], [150, 270, 4], [-150, 270, 4]);
    light(O, [2100, 480, -1700], '#fff6e6', 1); light(O, [1750, 280, -1400], '#ffd9ec', 0.5); light(O, [2500, 300, -1950], PK, 0.4);
    stat('daycare', 'DAYCARE CHECK-IN', 2540, -1950, -Math.PI / 2, 220, [2500, 0, -2060], [2620, 130, -1840], () => handlers.x2('daycare'), { room2: 'daycare' });
  }

  // ================= OUTSIDE: THE FRONT WALK AND THE PARKING LOT =================
  {
    const r = R.outside, lot = flat(256, 256, (x, w) => { x.fillStyle = '#1b1c20'; x.fillRect(0, 0, w, w); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.012})`; x.fillRect(i * 97 % w, i * 53 % w, 2, 2); } }, { repeat: true, spec: 0.12 });
    floor(lot, r, 260);
    const brick = flat(256, 256, (x, w) => { x.fillStyle = '#3a1418'; x.fillRect(0, 0, w, w); for (let j = 0; j < 8; j++) for (let i = 0; i < 5; i++) { x.fillStyle = ['#6a2a26', '#5c2420', '#73302b'][(i + j) % 3]; x.fillRect(i * 64 + (j % 2) * 32 - 32, j * 32 + 2, 60, 28); } }, { repeat: true, spec: 0.08 });
    // the building's front: brick, a lit canopy over the doors, the big sign
    wallG(brick, r.x0 - 600, r.z1 - 2, r.x1 + 600, r.z1 - 2, [[1000, 150]], 1500);
    const F = N(1000, r.z1 - 4); box(solid('#12121c', 0.1, 0.6), F, -230, 230, DH + 10, DH + 46, -150, 0); box(solid('#ffc93a', 1, 0), F, -232, 232, DH + 4, DH + 10, -152, -146); for (const sx of [-220, 220]) box(solid('#2a2a38', 0, 0.8), F, sx - 8, sx + 8, 0, DH + 10, -146, -130);
    quad(neon('BIG BANG ARCADE', '#ff2a3c', 1024, 128), { x: 1000, z: r.z1 - 6, th: Math.PI }, [-420, 640, 4], [420, 640, 4], [420, 520, 4], [-420, 520, 4]); glow('#ff2a3c', { x: 1000, z: r.z1 - 6, th: Math.PI }, 0, 580, 14, 1100, 300);
    quad(neon('OPEN LATE', '#35e06f', 512, 128), { x: 380, z: r.z1 - 6, th: Math.PI }, [-120, 330, 4], [120, 330, 4], [120, 270, 4], [-120, 270, 4]);
    for (const wx of [300, 620, 1500, 1820, 2140]) { const T = { x: wx, z: r.z1 - 6, th: Math.PI }; box(solid('#ffb400', 0.75, 0.6), T, -80, 80, 130, 300, 0, 4); box(solid('#12121c', 0, 0.5), T, -86, 86, 124, 130, 0, 8); box(solid('#12121c', 0, 0.5), T, -3, 3, 130, 300, 4, 8); }
    // sidewalk, kerb, painted stalls, an arrow
    box(solid('#8d8f96', 0.05, 0.1), O, r.x0, r.x1, 0, 8, -3520, r.z1 - 2); box(solid('#b9bbc2', 0.05, 0.1), O, r.x0, r.x1, 0, 10, -3540, -3520);
    for (const sx of [40, 360, 680, 1340, 1660, 1980, 2300]) box(solid('#f2f2f2', 0.5, 0), O, sx - 4, sx + 4, 0, 2, -4580, -4100);
    box(solid('#ffc93a', 0.6, 0), O, 900, 1100, 0, 2, -3900, -3890); for (let i = 0; i < 6; i++) box(solid('#f2f2f2', 0.5, 0), O, 880 + i * 44, 900 + i * 44, 0, 2, -3760, -3560);
    // parked cars (plain shapes: body, cabin, wheels, lamps)
    const car = (cx, cz, c) => { const T = { x: cx, z: cz, th: 0 }; box(solid(c, 0.15, 0.9), T, -95, 95, 30, 92, -210, 210); box(solid(c, 0.15, 0.9), T, -84, 84, 92, 150, -110, 130); box(solid('#0c1420', 0.2, 1), T, -86, 86, 98, 144, -112, 132, { top: solid(c, 0.15, 0.9) });
      for (const [wx, wz] of [[-95, -130], [95, -130], [-95, 130], [95, 130]]) box(solid('#0a0a0c', 0, 0.2), T, wx - 8, wx + 8, 0, 56, wz - 30, wz + 30);
      for (const lx of [-70, 70]) { box(solid('#fff6d0', 1, 0), T, lx - 16, lx + 16, 62, 78, 210, 213); box(solid('#ff2a3c', 1, 0), T, lx - 16, lx + 16, 62, 78, -213, -210); } };
    [[200, '#b0202c'], [520, '#e8e8f0'], [1500, '#1b3fa8'], [1820, '#16161c'], [2140, '#ff7a1a']].forEach(([cx, c]) => car(cx, -4340, c));
    // lamps, trees in planters, a bench, a fence and the night behind it
    const lamp = (lx, lz) => { box(solid('#2a2a38', 0, 0.8), O, lx - 7, lx + 7, 0, 470, lz - 7, lz + 7); box(solid('#2a2a38', 0, 0.8), O, lx - 60, lx + 60, 464, 476, lz - 10, lz + 10); for (const dx of [-48, 48]) { box(solid('#fff1c8', 1, 0), O, lx + dx - 16, lx + dx + 16, 456, 464, lz - 12, lz + 12); glow('#fff1c8', { x: lx + dx, z: lz, th: 0 }, 0, 450, 0, 230, 230); } light(O, [lx, 430, lz], '#ffe9c0', 1.1); };
    lamp(360, -3900); lamp(1320, -3900); lamp(2300, -3900); lamp(840, -4640); lamp(1900, -4640);
    for (const tx of [-60, 700, 1320, 2440]) { box(solid('#55575e', 0, 0.2), O, tx - 50, tx + 50, 8, 44, -3460, -3360); box(solid('#4a2a14', 0, 0.2), O, tx - 9, tx + 9, 44, 190, -3419, -3401); sphere(solid('#1f6a34', 0.2, 0.1), O, tx, 250, -3410, 78); sphere(solid('#2a8a44', 0.2, 0.1), O, tx + 30, 300, -3390, 52); }
    box(solid('#4a2a14', 0.05, 0.3), O, 380, 620, 44, 54, -3550, -3480); box(solid('#4a2a14', 0.05, 0.3), O, 380, 620, 54, 110, -3480, -3470); for (const bx of [390, 610]) box(solid('#2a2a38', 0, 0.8), O, bx - 5, bx + 5, 8, 44, -3550, -3480);
    const night = flat(1024, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05061a'); g.addColorStop(.72, '#1a1238'); g.addColorStop(1, '#3a1a3a'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(255,255,255,${0.35 + (i % 5) * 0.13})`; x.fillRect(i * 131 % w, i * 71 % (h * .68), 2, 2); } x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(820, 90, 34, 0, 7); x.fill(); x.fillStyle = '#05061a'; x.beginPath(); x.arc(806, 82, 30, 0, 7); x.fill();
      for (let i = 0; i < 26; i++) { const bw = 26 + i * 37 % 38, bh = 50 + i * 53 % 130, bx = i * 41; x.fillStyle = '#0a0a18'; x.fillRect(bx, h - bh, bw, bh); x.fillStyle = '#ffd98a'; for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) if ((i + a * 3 + b) % 3 === 0) x.fillRect(bx + 4 + b * 8, h - bh + 8 + a * 14, 4, 6); } }, { emis: 1, spec: 0 });
    const H = 1500; quad(night, O, [r.x0 - 600, H, r.z0 - 500], [r.x1 + 600, H, r.z0 - 500], [r.x1 + 600, 0, r.z0 - 500], [r.x0 - 600, 0, r.z0 - 500]);
    quad(night, O, [r.x0 - 600, H, r.z1], [r.x0 - 600, H, r.z0 - 500], [r.x0 - 600, 0, r.z0 - 500], [r.x0 - 600, 0, r.z1], [0, 0, .6, 1]); quad(night, O, [r.x1 + 600, H, r.z0 - 500], [r.x1 + 600, H, r.z1], [r.x1 + 600, 0, r.z1], [r.x1 + 600, 0, r.z0 - 500], [.4, 0, 1, 1]);
    quad(solid('#05061a', 1, 0), O, [r.x0 - 600, H, r.z1], [r.x1 + 600, H, r.z1], [r.x1 + 600, H, r.z0 - 500], [r.x0 - 600, H, r.z0 - 500]);
    quad(solid('#15171c', 0, 0.05), O, [r.x0 - 600, -1, r.z0 - 500], [r.x1 + 600, -1, r.z0 - 500], [r.x1 + 600, -1, r.z1], [r.x0 - 600, -1, r.z1]);
    for (let fx = r.x0; fx < r.x1; fx += 200) { box(solid('#2a2a38', 0, 0.7), O, fx - 4, fx + 4, 0, 120, r.z0 + 20, r.z0 + 28); box(solid('#2a2a38', 0, 0.7), O, fx, fx + 200, 104, 112, r.z0 + 22, r.z0 + 26); box(solid('#2a2a38', 0, 0.7), O, fx, fx + 200, 50, 56, r.z0 + 22, r.z0 + 26); }
    stat('outside', 'STEP OUTSIDE', 500, -3600, 0, 240, [380, 0, -3560], [620, 120, -3460], () => handlers.x2('outside'), { room2: 'outside' });
    // the way out, signed inside the game room
    const X = S(1000, 2 - DIMS.HD - DIMS.BD); sign('EXIT  ·  PARKING', '#35e06f', X, 150, 440, 512); box(solid('#12121c', 0, 0.5), X, -150, 150, DH, DH + 40, -6, 2);
  }

  // ================= IN THE BIG GAME ROOM: basketball and the machine with no name =================
  {
    // Big Bang Shoot'em: a real hoop you throw the loose balls at
    const SH = { x: PLAN.hoop.x, z: -2305, th: 0 };
    box(fb('shootem', '#16161c', 0, 0.5), SH, -110, 110, 0, 200, 0, 480); box(fb('shootem', '#ff7a1a', 0.6, 0.3), SH, -110, 110, 200, 470, 0, 30);
    MODELS.push(['shootem', [[SH, { at: [0, 0, 2], size: [null, 470, null], back: true, ry: k.RY.shootem }]]]);
    sign("BIG BANG SHOOT'EM", '#ff7a1a', { x: SH.x, z: SH.z + 20, th: 0 }, 150, 520); light(SH, [0, 330, 560], '#ffb060', 0.9);
    stat('shootem', "SHOOT'EM: THROW A BALL AT THE HOOP", SH.x, -1790, 0, 240, [SH.x - 115, 0, -2305], [SH.x + 115, 470, -1815], () => handlers.x2('shootem'), { hall2: true });
    // the ball rack
    const RK = PLAN.rack; box(solid('#2a2a38', 0, 0.8), O, RK.x - 66, RK.x + 66, 0, 8, RK.z - 60, RK.z + 60); for (const [a, b] of [[-62, -56], [56, 62]]) for (const zz of [-56, 50]) box(solid('#2a2a38', 0, 0.8), O, RK.x + a, RK.x + b, 8, 150, RK.z + zz, RK.z + zz + 6);
    for (const y of [50, 110]) { box(solid('#ff7a1a', 0.4, 0.6), O, RK.x - 62, RK.x + 62, y, y + 5, RK.z - 56, RK.z - 50); box(solid('#ff7a1a', 0.4, 0.6), O, RK.x - 62, RK.x + 62, y, y + 5, RK.z + 50, RK.z + 56); }
    quad(neon('GRAB A BALL', '#ff7a1a', 512, 128), { x: RK.x, z: RK.z, th: 0 }, [-80, 240, 0], [80, 240, 0], [80, 196, 0], [-80, 196, 0]);
    stat('ballrack', 'GRAB A BASKETBALL', RK.x, RK.z + 70, 0, 150, [RK.x - 70, 0, RK.z - 62], [RK.x + 70, 170, RK.z + 62], () => handlers.x2('ball'), { hall2: true });
    // the cabinet with no name on the end wall
    const SW = { x: -1000, z: 2 - DIMS.HD - DIMS.BD, th: 0 };
    box(fb('swordcab', '#1a1028', 0.1, 0.5), SW, -150, 150, 0, 420, 0, 250); box(fb('swordcab', '#c8d4ff', 0.9, 1), SW, -6, 6, 150, 330, 250, 262);
    MODELS.push(['swordcab', [[SW, { at: [0, 0, 2], size: [null, 500, null], back: true, ry: k.RY.swordcab }]]]);
    glow('#b06cff', SW, 0, 300, 300, 560, 620); light(SW, [0, 320, 420], '#b06cff', 1.1);
    stat('sword', 'PULL THE SWORD', SW.x, SW.z + 330, 0, 300, [SW.x - 160, 0, SW.z], [SW.x + 160, 500, SW.z + 320], () => handlers.x2('sword'), { hall2: true });
  }
  // a basketball: one round mesh, drawn wherever app.js says the balls are
  const ballT = tex(256, 128, (x, w, h) => { x.fillStyle = '#d9641a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.10)' : 'rgba(255,200,150,.10)'; x.fillRect(i * 73 % w, i * 41 % h, 2, 2); } x.strokeStyle = '#1a0f08'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); for (const u of [0, .25, .5, .75, 1]) { x.moveTo(u * w, 0); x.lineTo(u * w, h); } x.stroke(); x.lineWidth = 4; for (const u of [.125, .625]) { x.beginPath(); x.ellipse(u * w, h / 2, w * .085, h * .42, 0, 0, 7); x.stroke(); } });
  const ballM = mat(ballT, { spec: 0.25 }); ballM.sprite = true;
  { const A = 10, B = 16, pt = (i, j) => { const th = i / A * Math.PI, ph = j / B * Math.PI * 2; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
    for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) quad(ballM, O, pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j), [j / B, i / A, (j + 1) / B, (i + 1) / A]); }
  return { ballM };
}
