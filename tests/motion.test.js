import test from "node:test";
import assert from "node:assert/strict";
import { angleDelta, damp, stickVector, stepMotion } from "../src/motion.js";

test("camera takes the short turn across north and damping is frame-rate independent", () => {
  assert.ok(Math.abs(angleDelta(-3.13, 3.13)) < 0.03);
  const sample = (hz) => {
    let x = 0;
    for (let i = 0; i < hz; i++) x = damp(x, 1, 14, 1 / hz);
    return x;
  };
  assert.ok(Math.abs(sample(30) - sample(120)) < 1e-9);
});
test("thumbstick rejects drift, caps diagonal travel, and releases smoothly", () => {
  assert.deepEqual(stickVector(0.03, -0.04), { x: 0, y: 0 });
  const stick = stickVector(2, 2);
  assert.ok(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
  const v = { x: 0, z: 0 };
  for (let i = 0; i < 60; i++) stepMotion(v, 0, -2.8, 1 / 60);
  assert.ok(v.z < -2.7);
  for (let i = 0; i < 30; i++) stepMotion(v, 0, 0, 1 / 60);
  assert.equal(v.z, 0);
});
