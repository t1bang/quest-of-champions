import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAt, where, ORDER, RINGS } from '../darts-rules.js';

test('the board is laid out like a real dartboard', () => {
  assert.equal(ORDER.length, 20); assert.equal(new Set(ORDER).size, 20); assert.equal(ORDER[0], 20);
  assert.equal(scoreAt(0, 0.4).seg, 20);            // straight up
  assert.equal(scoreAt(0.4, 0).seg, 6);             // right
  assert.equal(scoreAt(0, -0.4).seg, 3);            // down
  assert.equal(scoreAt(-0.4, 0).seg, 11);           // left
});
test('every bed scores what it should', () => {
  assert.deepEqual([scoreAt(0, 0).score, scoreAt(0, 0).label], [50, 'BULLSEYE!']);
  assert.equal(scoreAt(0.06, 0).score, 25);
  for (const seg of ORDER) {
    assert.equal(scoreAt(...where(seg, 1)).score, seg);
    assert.equal(scoreAt(...where(seg, 2)).score, seg * 2);
    assert.equal(scoreAt(...where(seg, 3)).score, seg * 3);
  }
  assert.equal(scoreAt(...where(20, 3)).label, 'TREBLE 20');
});
test('off the numbers and off the board score nothing', () => {
  assert.equal(scoreAt(0, 1.1).score, 0); assert.equal(scoreAt(0, 1.1).ring, 'edge');
  assert.equal(scoreAt(2.5, 0.3).score, 0); assert.equal(scoreAt(2.5, 0.3).ring, 'miss');
  assert.equal(scoreAt(NaN, 0).score, 0);
  assert.ok(RINGS.edge > 1);
});
