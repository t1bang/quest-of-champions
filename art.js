// Original pixel art for Big Bang Arcade: cover art (SVG) and animated trailers (canvas).
const HERO = [
  '....KKKKKK....', '...KKKKKKKK...', '...KKKKKKKK...', '..LSSSSSSSSL..', '..LGGSSGGSSL..',
  '..LSSSSSSSSL..', '..LSBBBBBBSL..', '..L.BBBBBB.L..', '..LRRRBBRRRL..', '.LRRRRRRRRRRL.',
  '.rRRRRRRRRRRr.', 'SSRRRRRRRRRRSS', 'M..RRRRRRRR...', 'M..RRRRRRRR...', '...DDDDDDDD...',
  '...DDD..DDD...', '...DDD..DDD...', '...DDD..DDD...', '..TTTT..TTTT..', '..TTTT..TTTT..',
];
const KID = [
  '..CCCCCC..', '.CCCCCCCCC', '..SSSSSS..', '..SWSSWS..', '..SSSSSS..', '.RRRRRRRR.',
  'SRRRRRRRRS', '.RRRRRRRR.', '..DDDDDD..', '..DD..DD..', '..TT..TT..',
];
const PAL = {
  hero: { K: '#111', L: '#1a1a1a', r: '#ff2a3c', S: '#8a5a3c', G: '#ff2a3c', B: '#0d0d0d', R: '#e01226', D: '#23232b', T: '#c98a3a', M: '#d9d9e0' },
  rival: { K: '#3b2a6b', L: '#3b2a6b', r: '#3b2a6b', S: '#c98f6a', G: '#111', B: '#c98f6a', R: '#6d3bff', D: '#15151c', T: '#eee', M: '#6d3bff' },
  rebel: { K: '#0f5a2c', L: '#111', r: '#35e06f', S: '#8a5a3c', G: '#111', B: '#0d0d0d', R: '#1d7a3e', D: '#2b2b22', T: '#111', M: '#1d7a3e' },
  kid: { C: '#3ea8ff', S: '#b9794f', W: '#fff', R: '#ffd23e', D: '#2a3a8a', T: '#e01226' },
};
const svgSprite = (rows, pal, x, y, s, flip) => {
  let o = '';
  rows.forEach((row, j) => [...row].forEach((c, i) => {
    if (pal[c]) o += `<rect x="${x + (flip ? row.length - 1 - i : i) * s}" y="${y + j * s}" width="${s + 0.4}" height="${s + 0.4}" fill="${pal[c]}"/>`;
  }));
  return o;
};
const skyline = (y, fill, seed) => {
  let o = '';
  for (let i = 0; i < 12; i++) { const h = 30 + ((i * seed) % 7) * 14; o += `<rect x="${i * 26 - 4}" y="${y - h}" width="22" height="${h}" fill="${fill}"/>`; }
  return o;
};
const title = (lines, fill, shadow, y, size) => lines.map((t, i) =>
  `<text x="150" y="${y + i * size * 1.05}" text-anchor="middle" font-family="Bungee,Impact,'Arial Black',sans-serif" font-size="${size}" fill="${shadow}" transform="translate(3 4)">${t}</text>` +
  `<text x="150" y="${y + i * size * 1.05}" text-anchor="middle" font-family="Bungee,Impact,'Arial Black',sans-serif" font-size="${size}" fill="${fill}" stroke="#000" stroke-width="1.2">${t}</text>`).join('');
const frame = (genre, color, body) =>
  `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" role="img">${body}` +
  `<rect x="0" y="0" width="300" height="26" fill="#000"/><text x="10" y="18" font-family="'Press Start 2P',monospace" font-size="9" fill="${color}">${genre.toUpperCase()}</text>` +
  `<text x="290" y="18" text-anchor="end" font-family="'Press Start 2P',monospace" font-size="7" fill="#fff">BIG BANG ARCADE</text>` +
  `<rect x="0" y="378" width="300" height="22" fill="#000"/><text x="150" y="393" text-anchor="middle" font-family="'Press Start 2P',monospace" font-size="7" fill="#fff">T1 ENTERTAINMENT</text>` +
  `<rect x="2" y="2" width="296" height="396" fill="none" stroke="${color}" stroke-width="4"/></svg>`;

export const COVERS = {
  quest: frame('Action', '#ff2a3c',
    `<defs><linearGradient id="cq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b0a3d"/><stop offset="1" stop-color="#e01226"/></linearGradient></defs>
     <rect width="300" height="400" fill="url(#cq)"/>
     <circle cx="150" cy="170" r="95" fill="#ffc93a"/><circle cx="150" cy="170" r="70" fill="none" stroke="#e39a12" stroke-width="5"/><circle cx="150" cy="170" r="42" fill="none" stroke="#e39a12" stroke-width="4"/><circle cx="150" cy="170" r="14" fill="#2b0a3d"/>
     ${skyline(300, '#12060f', 5)}<rect y="300" width="300" height="100" fill="#12060f"/>
     ${svgSprite(HERO, PAL.hero, 94, 118, 8)}
     <text x="34" y="150" font-size="34" fill="#fff">♪</text><text x="236" y="120" font-size="28" fill="#fff">♫</text><text x="246" y="220" font-size="22" fill="#ffc93a">♪</text>
     ${title(['QUEST OF', 'CHAMPIONS'], '#ffc93a', '#7a0010', 322, 31)}`),
  vendetta: frame('Fighting', '#ffb400',
    `<rect width="300" height="400" fill="#101014"/><polygon points="0,0 300,0 0,400" fill="#c40d1e"/>
     <polygon points="150,60 172,150 142,150 166,250 120,140 150,140" fill="#ffb400" stroke="#000" stroke-width="2"/>
     ${svgSprite(HERO, PAL.hero, 14, 120, 8)}${svgSprite(HERO, PAL.rival, 174, 120, 8, true)}
     <text x="150" y="112" text-anchor="middle" font-family="Bungee,Impact,sans-serif" font-size="40" fill="#fff" stroke="#000" stroke-width="2">VS</text>
     <rect y="290" width="300" height="110" fill="#000" opacity=".55"/>
     ${title(['T1', 'VERSUS'], '#ffb400', '#c40d1e', 326, 36)}`),
  guerilla: frame('Open World', '#35e06f',
    `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03130a"/><stop offset="1" stop-color="#0f5a2c"/></linearGradient></defs>
     <rect width="300" height="400" fill="url(#cg)"/><circle cx="226" cy="84" r="34" fill="#d8ffe6" opacity=".9"/>
     ${skyline(250, '#0a2e18', 3)}${skyline(280, '#061a0e', 11)}
     <g stroke="#35e06f" stroke-width="1.5" opacity=".7">${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${150 + (i - 3) * 16}" y1="280" x2="${150 + (i - 3) * 90}" y2="400"/>`).join('')}${[0, 1, 2, 3].map(i => `<line x1="0" y1="${292 + i * i * 9}" x2="300" y2="${292 + i * i * 9}"/>`).join('')}</g>
     ${svgSprite(HERO, PAL.rebel, 98, 112, 7.5)}
     <path d="M52 150 a16 16 0 1 1 32 0 c0 12 -16 30 -16 30 s-16 -18 -16 -30z" fill="#35e06f" stroke="#000" stroke-width="2"/><circle cx="68" cy="150" r="6" fill="#03130a"/>
     ${title(['GUERILLA', 'CITY'], '#35e06f', '#03130a', 322, 34)}`),
  gamerboy: frame('Adventure', '#3ea8ff',
    `<rect width="300" height="400" fill="#10286e"/>
     ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => `<rect x="${(i * 53) % 290}" y="${34 + (i * 71) % 250}" width="4" height="4" fill="#fff" opacity=".7"/>`).join('')}
     <rect x="62" y="48" width="176" height="252" rx="16" fill="#d7dbe6" stroke="#000" stroke-width="3"/>
     <rect x="80" y="66" width="140" height="120" rx="6" fill="#0d1b3d" stroke="#000" stroke-width="3"/>
     <rect x="86" y="158" width="46" height="8" fill="#35e06f"/><rect x="146" y="140" width="40" height="8" fill="#35e06f"/><rect x="196" y="120" width="20" height="8" fill="#35e06f"/>
     ${svgSprite(KID, PAL.kid, 148, 96, 4)}
     <rect x="200" y="100" width="8" height="8" fill="#ffd23e" transform="rotate(45 204 104)"/><rect x="100" y="134" width="8" height="8" fill="#ffd23e" transform="rotate(45 104 138)"/>
     <rect x="92" y="216" width="42" height="14" fill="#23232b"/><rect x="106" y="202" width="14" height="42" fill="#23232b"/>
     <circle cx="190" cy="232" r="11" fill="#e01226" stroke="#000" stroke-width="2"/><circle cx="216" cy="214" r="11" fill="#e01226" stroke="#000" stroke-width="2"/>
     <rect x="120" y="268" width="24" height="6" rx="3" fill="#8a90a3"/><rect x="156" y="268" width="24" height="6" rx="3" fill="#8a90a3"/>
     ${title(['GAMERBOY'], '#ffd23e', '#0d1b3d', 350, 36)}`),
};

// ---------- animated trailers ----------
const spr = (c, rows, pal, x, y, s, flip) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
  if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(Math.round(x + (flip ? row.length - 1 - i : i) * s), Math.round(y + j * s), s, s); }
}));
const txt = (c, t, x, y, size, fill, align = 'center') => {
  c.font = `${size}px "Press Start 2P",monospace`; c.textAlign = align;
  c.fillStyle = '#000'; c.fillText(t, x + 2, y + 2); c.fillStyle = fill; c.fillText(t, x, y);
};
const city = (c, off, base, col, seed, W) => {
  c.fillStyle = col;
  for (let i = -1; i < 16; i++) { const k = i + Math.floor(off / 40), h = 30 + ((((k * seed) % 7) + 7) % 7) * 12; c.fillRect(i * 40 - (off % 40), base - h, 34, h); }
};
const SCENES = {
  quest(c, t, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b0a3d'); g.addColorStop(1, '#e01226'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    city(c, t * 20, 200, '#3a0d2e', 5, W); city(c, t * 50, 215, '#12060f', 3, W);
    c.fillStyle = '#1b1b22'; c.fillRect(0, 215, W, 55); c.fillStyle = '#ffc93a';
    for (let i = 0; i < 9; i++) c.fillRect(i * 70 - ((t * 160) % 70), 240, 34, 4);
    for (let i = 0; i < 3; i++) { const x = W + 60 - ((t * 110 + i * 190) % (W + 160)); c.fillStyle = '#ffc93a'; c.beginPath(); c.arc(x, 120 + Math.sin(t * 4 + i) * 12, 11, 0, 7); c.fill(); c.fillStyle = '#2b0a3d'; c.beginPath(); c.arc(x, 120 + Math.sin(t * 4 + i) * 12, 3, 0, 7); c.fill(); }
    const ex = W + 40 - ((t * 90) % (W + 120)); spr(c, HERO, PAL.rival, ex, 138 + Math.sin(t * 12) * 2, 4, true);
    spr(c, HERO, PAL.hero, 70, 138 + Math.abs(Math.sin(t * 10)) * -5, 4);
    const nx = 130 + ((t * 260) % 300); txt(c, '♪', nx, 172, 18, '#fff');
    txt(c, 'RECORDS x' + String(Math.floor(t * 2.4)).padStart(2, '0'), 12, 24, 10, '#ffc93a', 'left');
  },
  vendetta(c, t, W, H) {
    c.fillStyle = '#101014'; c.fillRect(0, 0, W, H); c.fillStyle = '#c40d1e'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(0, H); c.fill();
    c.fillStyle = '#1e1e26'; c.fillRect(0, 210, W, 60); c.fillStyle = '#ffb400'; c.fillRect(0, 208, W, 4);
    const a = Math.sin(t * 5), hit = a > 0.85 || a < -0.85;
    spr(c, HERO, PAL.hero, 150 + Math.max(0, a) * 46, 124, 4.5); spr(c, HERO, PAL.rival, 268 + Math.min(0, a) * 46, 124, 4.5, true);
    if (hit) { c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) c.fillRect(238 + Math.cos(i) * 22, 150 + Math.sin(i * 2) * 22, 6, 6); }
    const hp = 1 - ((t / 12) % 1);
    c.fillStyle = '#000'; c.fillRect(18, 18, 184, 16); c.fillRect(W - 202, 18, 184, 16);
    c.fillStyle = '#35e06f'; c.fillRect(20, 20, 180 * (0.4 + hp * 0.6), 12); c.fillStyle = '#ffb400'; c.fillRect(W - 20 - 180 * hp, 20, 180 * hp, 12);
    txt(c, String(99 - Math.floor(t * 4) % 99), W / 2, 34, 14, '#fff');
  },
  guerilla(c, t, W, H) {
    c.fillStyle = '#16301f'; c.fillRect(0, 0, W, H);
    const ox = (t * 90) % 120, oy = (t * 30) % 100;
    for (let i = -1; i < 6; i++) for (let j = -1; j < 5; j++) {
      c.fillStyle = (i + j) % 2 ? '#0f5a2c' : '#1d7a3e'; c.fillRect(i * 120 - ox + 14, j * 100 - oy + 12, 92, 76);
      c.fillStyle = '#0a2e18'; c.fillRect(i * 120 - ox + 30, j * 100 - oy + 28, 26, 22);
    }
    c.save(); c.translate(W / 2, H / 2 + 10); c.rotate(Math.sin(t * 1.5) * 0.25);
    c.fillStyle = '#000'; c.fillRect(-21, -12, 42, 24); c.fillStyle = '#35e06f'; c.fillRect(-19, -10, 38, 20); c.fillStyle = '#03130a'; c.fillRect(2, -8, 10, 16); c.restore();
    c.fillStyle = '#000'; c.fillRect(W - 96, H - 96, 84, 84); c.strokeStyle = '#35e06f'; c.strokeRect(W - 96, H - 96, 84, 84);
    c.fillStyle = '#35e06f'; c.fillRect(W - 60 + Math.sin(t) * 20, H - 60 + Math.cos(t * 0.7) * 20, 6, 6);
    txt(c, 'WANTED ' + '★'.repeat(1 + Math.floor(t / 3) % 5), 12, 26, 10, '#35e06f', 'left');
  },
  gamerboy(c, t, W, H) {
    c.fillStyle = '#10286e'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1b3fa8'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(i * 130 - ((t * 25) % 130), 250, 90, 0, 7); c.fill(); }
    const sp = t * 100, hop = Math.abs(Math.sin(t * 4.2));
    for (let i = 0; i < 8; i++) {
      const x = i * 110 - (sp % 110) - 30, y = 196 - ((i + Math.floor(sp / 110)) % 3) * 22;
      c.fillStyle = '#35e06f'; c.fillRect(x, y, 78, 12); c.fillStyle = '#1d7a3e'; c.fillRect(x, y + 12, 78, 8);
      c.save(); c.translate(x + 39, y - 26 - Math.sin(t * 5 + i) * 4); c.rotate(0.785); c.fillStyle = '#ffd23e'; c.fillRect(-6, -6, 12, 12); c.restore();
    }
    spr(c, KID, PAL.kid, 120, 118 - hop * 46, 5);
    txt(c, 'GEMS ' + String(Math.floor(t * 3)).padStart(3, '0'), 12, 26, 10, '#ffd23e', 'left');
  },
};
const CAPTIONS = {
  quest: ['GRAB THE MIC', 'COLLECT THE RECORDS', 'COURT. GRIDIRON. HUSTLEMANIA.', 'BECOME A CHAMPION'],
  vendetta: ['T1 VERSUS', '21 FIGHTERS', 'ROUND 1... FIGHT!', 'SETTLE THE SCORE'],
  guerilla: ['ONE BIG CITY', 'GO ANYWHERE', 'RUN THE STREETS', 'OWN THE MAP'],
  gamerboy: ['TONE DA BOSS + ENTRE LUCHÉ', 'JUMP THE ENEMIES', 'COLLECT THE RECORDS', 'RACE TO THE FLAGPOLE'],
};
// Plays a looping 12-second trailer on a canvas. Returns a stop function. onLoop fires each time it finishes.
// shots = real screenshots/artwork: shown as a slow-zoom slideshow instead of the drawn scene.
export function playTrailer(canvas, id, titleText, onLoop, shots) {
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height, t0 = performance.now();
  const pics = (shots || []).map(src => { const im = new Image(); im.src = src; return im; });
  let raf, loops = 0;
  const tick = now => {
    const T = Math.max(0, now - t0) / 1000, t = T % 12;
    if (Math.floor(T / 12) > loops) { loops++; onLoop && onLoop(); }
    if (pics.length) {
      c.imageSmoothingEnabled = true; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const seg = 10 / pics.length, k = Math.min(pics.length - 1, Math.floor(t / seg)), im = pics[k], u = (t - k * seg) / seg;
      if (im.complete && im.naturalWidth) { const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (1.04 + u * 0.12), w = im.naturalWidth * s, h = im.naturalHeight * s; c.globalAlpha = Math.min(1, u * 6, (1 - u) * 6 + 0.2); c.drawImage(im, (W - w) / 2 + (k % 2 ? -1 : 1) * u * 14, (H - h) / 2, w, h); c.globalAlpha = 1; }
    } else { c.imageSmoothingEnabled = false; SCENES[id](c, t, W, H); }
    if (t < 10) { const k = Math.floor(t / 2.5); if (t % 2.5 > 0.3) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, H - 34, W, 34); txt(c, CAPTIONS[id][k], W / 2, H - 12, 12, '#fff'); } }
    else { c.fillStyle = 'rgba(0,0,0,.8)'; c.fillRect(0, 0, W, H); txt(c, titleText.toUpperCase(), W / 2, H / 2 - 8, 18, '#ffc93a'); if (t % 0.6 > 0.25) txt(c, 'PLAY NOW AT BIG BANG ARCADE', W / 2, H / 2 + 26, 9, '#fff'); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
