// Darts: the board and its scoring. No drawing library needed, so the rules can be tested on their own.
// Board units: 1 = the outside edge of the double ring (170 mm on a real board). x is right, y is up, the bull is 0,0.
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];   // clockwise from the top
const MM = 1 / 170;
export const RINGS = { bull: 6.35 * MM, outerBull: 15.9 * MM, trebleIn: 99 * MM, trebleOut: 107 * MM, doubleIn: 162 * MM, doubleOut: 1, edge: 225.5 * MM };

// What a dart at (x, y) scores: { score, mult, seg, label, ring }
export function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (!(r <= RINGS.doubleOut)) return { score: 0, mult: 0, seg: 0, label: r <= RINGS.edge ? 'OFF THE NUMBERS' : 'MISSED THE BOARD', ring: r <= RINGS.edge ? 'edge' : 'miss' };
  if (r <= RINGS.bull) return { score: 50, mult: 2, seg: 25, label: 'BULLSEYE!', ring: 'bull' };
  if (r <= RINGS.outerBull) return { score: 25, mult: 1, seg: 25, label: 'OUTER BULL', ring: 'outer' };
  let a = Math.atan2(x, y); if (a < 0) a += Math.PI * 2;                                        // 0 at the top, growing clockwise
  const seg = ORDER[Math.floor((a + Math.PI / 20) / (Math.PI / 10)) % 20];
  if (r >= RINGS.doubleIn) return { score: seg * 2, mult: 2, seg, label: 'DOUBLE ' + seg, ring: 'double' };
  if (r >= RINGS.trebleIn && r <= RINGS.trebleOut) return { score: seg * 3, mult: 3, seg, label: 'TREBLE ' + seg, ring: 'treble' };
  return { score: seg, mult: 1, seg, label: String(seg), ring: 'single' };
}
// The middle of a bed, for tests and aiming help: where(20, 3) is the treble 20.
export function where(seg, mult = 1) {
  if (seg === 25) return [0, mult === 2 ? 0 : (RINGS.bull + RINGS.outerBull) / 2];
  const i = ORDER.indexOf(seg), a = i * Math.PI / 10, r = mult === 3 ? (RINGS.trebleIn + RINGS.trebleOut) / 2 : mult === 2 ? (RINGS.doubleIn + 1) / 2 : (RINGS.trebleOut + RINGS.doubleIn) / 2;
  return [Math.sin(a) * r, Math.cos(a) * r];
}

// Paint the board face on a square canvas (the whole board, number ring included, fills the canvas).
export function drawBoard(c, S) {
  const cx = S / 2, k = (S / 2) / RINGS.edge, R = v => v * k, TAU = Math.PI * 2, W = Math.PI / 10;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#121214'; c.beginPath(); c.arc(cx, cx, S / 2, 0, TAU); c.fill();
  const wedge = (r0, r1, i, col) => { const a0 = -Math.PI / 2 + i * W - W / 2; c.fillStyle = col; c.beginPath(); c.arc(cx, cx, R(r1), a0, a0 + W); c.arc(cx, cx, R(r0), a0 + W, a0, true); c.closePath(); c.fill(); };
  for (let i = 0; i < 20; i++) {
    const dark = i % 2 === 0, bed = dark ? '#17171a' : '#ecdfc0', ring = dark ? '#d3202f' : '#1f8a45';
    wedge(RINGS.outerBull, RINGS.trebleIn, i, bed); wedge(RINGS.trebleIn, RINGS.trebleOut, i, ring); wedge(RINGS.trebleOut, RINGS.doubleIn, i, bed); wedge(RINGS.doubleIn, 1, i, ring);
  }
  c.fillStyle = '#1f8a45'; c.beginPath(); c.arc(cx, cx, R(RINGS.outerBull), 0, TAU); c.fill();
  c.fillStyle = '#d3202f'; c.beginPath(); c.arc(cx, cx, R(RINGS.bull), 0, TAU); c.fill();
  // the wire "spider"
  c.strokeStyle = '#c9ccd4'; c.lineWidth = Math.max(1, S / 520);
  for (const r of [RINGS.bull, RINGS.outerBull, RINGS.trebleIn, RINGS.trebleOut, RINGS.doubleIn, 1]) { c.beginPath(); c.arc(cx, cx, R(r), 0, TAU); c.stroke(); }
  for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i * W - W / 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * R(RINGS.outerBull), cx + Math.sin(a) * R(RINGS.outerBull)); c.lineTo(cx + Math.cos(a) * R(1.035), cx + Math.sin(a) * R(1.035)); c.stroke(); }
  // numbers
  c.fillStyle = '#f2f2f5'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${Math.round(S * 0.062)}px "Arial Narrow",Arial,sans-serif`;
  for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i * W, r = R((1 + RINGS.edge) / 2 + 0.012); c.save(); c.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r); c.rotate(a + Math.PI / 2 + (i > 5 && i < 15 ? Math.PI : 0)); c.fillText(String(ORDER[i]), 0, 0); c.restore(); }
}
