export const angleDelta = (a, b) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const damp = (from, to, rate, dt) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
export function stickVector(x, y, deadzone = 0.12) {
  const length = Math.hypot(x, y);
  if (length <= deadzone) return { x: 0, y: 0 };
  const amount = Math.min(1, (length - deadzone) / (1 - deadzone));
  return { x: (x / length) * amount, y: (y / length) * amount };
}
// A short exponential ease avoids sudden strafing and frame-rate-dependent turns.
export function stepMotion(v, x, z, dt) {
  v.x = damp(v.x, x, x || z ? 12 : 20, dt);
  v.z = damp(v.z, z, x || z ? 12 : 20, dt);
  if (Math.abs(v.x) < 0.003) v.x = 0;
  if (Math.abs(v.z) < 0.003) v.z = 0;
  return v;
}
