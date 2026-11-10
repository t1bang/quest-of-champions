import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONTENT,
  ROOMS,
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
    d: 2.2,
  }));
  blocks.push(
    { x: 0, z: -5, w: 2.5, d: 1.3 },
    { x: -21, z: -7.8, w: 2.5, d: 1.2 },
  );
  const nav = await createNavigation(blocks);
  try {
    const p = { x: 0, z: -2 };
    for (let i = 0; i < 150; i++) nav.move(p, 0, -0.05);
    assert.ok(p.z >= -4.04, "kiosk blocks forward movement");
    const start = { x: -3, z: 9 };
    for (const target of [
      { x: 0, z: -18 },
      { x: -18, z: 3 },
      { x: 18, z: 3 },
      { x: -4.65, z: -8.6 },
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
    games.map((g) => ({ ...cabinetPosition(g), w: 2.25, d: 2.2 })),
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

test("expanded main floor and lobby furnishings keep all twelve cabinets reachable", async () => {
  const games = Array.from({ length: 12 }, (_, slot) => ({
    room: "main",
    slot,
  }));
  const obstacles = games.map((g) => ({
    ...cabinetPosition(g),
    w: 2.25,
    d: 2.2,
  }));
  obstacles.push(
    { x: 0, z: -5, w: 2.5, d: 1.3 },
    { x: -7.7, z: -11.5, w: 2.1, d: 1.3 },
    { x: 7.7, z: -11.5, w: 2.25, d: 1.2 },
  );
  const nav = await createNavigation(obstacles);
  try {
    for (const game of games) {
      const p = cabinetPosition(game),
        target = { x: p.x, z: p.z + 3.4 };
      assert.ok(
        nav.route({ x: 0, z: -1.5 }, target).length,
        `Main cabinet ${game.slot} has a route`,
      );
      assert.ok(nav.free(target.x, target.z));
    }
    for (const target of [
      { x: 0, z: -1.5 },
      { x: -7.7, z: -8.75 },
      { x: 7.7, z: -8.8 },
    ])
      assert.ok(nav.free(target.x, target.z));
  } finally {
    nav.dispose();
  }
});

test("all room entry points clear their furniture and display cases", async () => {
  const fixtures = [
    { x: 0, z: -5, w: 2.5, d: 1.3 },
    { x: -21, z: -7.8, w: 2.1, d: 1.3 },
    { x: -23, z: 3, w: 3.5, d: 1.7 },
    { x: -15, z: 3, w: 3.5, d: 1.7 },
    { x: -19, z: 3, w: 2.4, d: 1.1 },
    ...[13.5, 18, 22.5].map((x) => ({ x, z: -8.2, w: 4, d: 1.8 })),
  ];
  const nav = await createNavigation(fixtures);
  try {
    for (const r of ROOMS)
      assert.ok(nav.free(r.x, r.z), `${r.name} arrival is outside furniture`);
  } finally {
    nav.dispose();
  }
});
