import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONTENT,
  clone,
  validateContent,
  safeUrl,
  cabinetPosition,
} from "../src/content.js";
import { createNavigation, WALLS } from "../src/navigation.js";

test("published layout preserves game IDs and rejects executable addresses", () => {
  const c = validateContent(DEFAULT_CONTENT);
  assert.deepEqual(
    c.games.map((g) => g.id),
    ["quest", "vendetta", "guerilla", "gamerboy"],
  );
  assert.equal(c.games[1].title, "T1 Vs.");
  for (const u of [
    "javascript:alert(1)",
    'https://site.com/"onload=1',
    "//evil.test/x",
    "games/../../secret",
  ])
    assert.throws(() => safeUrl(u));
  const bad = clone(c);
  bad.games[1].slot = 0;
  assert.throws(() => validateContent(bad), /share/);
  bad.games[1].slot = 1;
  bad.games[1].id = "bigbox";
  assert.throws(() => validateContent(bad), /reserved/);
});
test("motion cannot cross the kiosk or walls and every room has a navigable route", async () => {
  const blocks = DEFAULT_CONTENT.games.map((g) => ({
    ...cabinetPosition(g),
    w: 2.25,
    d: 1.9,
  }));
  blocks.push(
    { x: 0, z: 5, w: 2.5, d: 1.3 },
    { x: -21, z: -7.8, w: 2.5, d: 1.2 },
  );
  const nav = await createNavigation(blocks);
  try {
    const p = { x: 0, z: 8 };
    for (let i = 0; i < 150; i++) nav.move(p, 0, -0.05);
    assert.ok(p.z >= 5.96, "kiosk blocks forward movement");
    const start = { x: -3, z: 9 };
    for (const target of [
      { x: 0, z: -18 },
      { x: -18, z: 3 },
      { x: 18, z: 3 },
      { x: -6, z: -8.95 },
    ]) {
      const path = nav.route(start, target);
      assert.ok(path.length > 0, JSON.stringify(target));
      const q = { ...start };
      for (const waypoint of path) {
        for (
          let t = 0;
          t < 80 && Math.hypot(q.x - waypoint.x, q.z - waypoint.z) > 0.06;
          t++
        ) {
          const dx = waypoint.x - q.x,
            dz = waypoint.z - q.z,
            d = Math.hypot(dx, dz);
          nav.move(
            q,
            (dx / d) * Math.min(0.05, d),
            (dz / d) * Math.min(0.05, d),
          );
        }
      }
      assert.ok(
        Math.hypot(q.x - target.x, q.z - target.z) < 0.15,
        "route reaches destination",
      );
    }
    const w = { x: 0, z: 13 };
    for (let i = 0; i < 60; i++) nav.move(w, 0, 0.08);
    assert.ok(w.z < 13.6, "outer wall blocks motion");
  } finally {
    nav.dispose();
  }
});

test("a fully populated Lab keeps every cabinet reachable", async () => {
  const games = Array.from({ length: 12 }, (_, slot) => ({
    room: "lab",
    slot,
  }));
  const nav = await createNavigation(
    games.map((g) => ({ ...cabinetPosition(g), w: 2.25, d: 1.9 })),
  );
  try {
    for (const game of games) {
      const p = cabinetPosition(game),
        target = { x: p.x, z: p.z + 2 };
      const path = nav.route({ x: 0, z: 1.5 }, target);
      assert.ok(
        path.length > 0,
        `Lab slot ${game.slot + 1} has an approach path`,
      );
      assert.ok(path.every((p) => nav.free(p.x, p.z)));
    }
  } finally {
    nav.dispose();
  }
});
