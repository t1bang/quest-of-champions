import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { GAMES, SOON } from '../config.js';
import { createReporter } from '../games/blankman/arcade-adapter.js';

test('all cabinets occupy unique slots and Blankman assets resolve locally', () => {
  assert.equal(GAMES.length, 5);
  const ids = [...GAMES, ...SOON].map(g => g.id);
  assert.equal(new Set(ids).size, ids.length);
  const slots = [...GAMES.filter(g => g.hallSlot != null).map(g => g.hallSlot), ...SOON.map((g, i) => g.hallSlot ?? i)];
  assert.deepEqual(slots.sort(), [0, 1, 2, 3]);
  const g = GAMES.find(g => g.id === 'blankman');
  for (const file of [g.art, ...g.shots, ...['side','screen','marquee','panel','coin','base','front'].map(k => `${g.cab}-${k}.jpg`), g.play + 'index.html']) {
    assert.ok(existsSync(new URL('../' + file, import.meta.url)), file);
  }
  const html = readFileSync(new URL('../games/blankman/index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('"/equipment/'));
  assert.ok(html.includes('src="arcade-adapter.js"'));
});

test('only genuine completed runs report once; practice and invalid scores do not', () => {
  const sent = [], report = createReporter(s => sent.push(s));
  report({ mode: 'clear', score: 999 });
  assert.equal(sent.length, 0);
  report({ mode: 'playing' });
  report({ mode: 'clear', score: 1234.9 });
  report({ mode: 'clear', score: 1234.9 });
  assert.deepEqual(sent, [{ bba: 'score', game: 'blankman', score: 1234 }]);
  report({ mode: 'playing', training: true });
  report({ mode: 'victory', training: true, score: 9000 });
  report({ mode: 'playing' });
  report({ mode: 'gameover', score: NaN });
  assert.equal(sent.length, 1);
  report({ mode: 'playing' });
  report({ mode: 'gameover', score: 5000 });
  assert.equal(sent.length, 2);
});
