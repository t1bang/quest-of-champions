import RAPIER from "@dimforge/rapier3d-compat";
export const FLOOR_AREAS = [
  [-10, 10, -14, 14],
  [-26, -10, -10, 8],
  [10, 26, -10, 8],
  [-10, 10, -28, -14],
];
export const WALLS = [
  [0, 14, 20, 0.3],
  [-10, 11, 0.3, 6],
  [10, 11, 0.3, 6],
  [-10, -11.5, 0.3, 5],
  [10, -11.5, 0.3, 5],
  [-10, 5.5, 0.3, 5],
  [10, 5.5, 0.3, 5],
  [-26, -1, 0.3, 18],
  [26, -1, 0.3, 18],
  [-18, 8, 16, 0.3],
  [18, 8, 16, 0.3],
  [-18, -10, 16, 0.3],
  [18, -10, 16, 0.3],
  [-10, -21, 0.3, 14],
  [10, -21, 0.3, 14],
  [0, -28, 20, 0.3],
  [-6.5, -14, 7, 0.3],
  [6.5, -14, 7, 0.3],
];
export const inFloor = (x, z, r = 0) =>
  [
    [-r, -r],
    [-r, r],
    [r, -r],
    [r, r],
  ].every(([dx, dz]) =>
    FLOOR_AREAS.some(
      ([a, b, c, d]) =>
        x + dx >= a && x + dx <= b && z + dz >= c && z + dz <= d,
    ),
  );
export async function createNavigation(obstacles) {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const solids = [
    ...WALLS.map(([x, z, w, d]) => ({ x, z, w, d })),
    ...obstacles,
  ];
  for (const b of solids)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(b.w / 2, 3, b.d / 2).setTranslation(
        b.x,
        3,
        b.z,
      ),
    );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(40, 0.1, 40).setTranslation(0, -0.1, 0),
  );
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 10),
  );
  const collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.3),
      body,
    ),
    controller = world.createCharacterController(0.02);
  controller.setSlideEnabled(true);
  world.step();
  const free = (x, z) =>
    inFloor(x, z, 0.05) &&
    !solids.some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + 0.38 &&
        Math.abs(z - b.z) < b.d / 2 + 0.38,
    );
  function move(position, dx, dz) {
    body.setTranslation({ x: position.x, y: 0.9, z: position.z }, true);
    world.propagateModifiedBodyPositionsToColliders();
    controller.computeColliderMovement(collider, { x: dx, y: 0, z: dz });
    const m = controller.computedMovement(),
      nx = position.x + m.x,
      nz = position.z + m.z;
    if (inFloor(nx, nz, 0.02)) {
      position.x = nx;
      position.z = nz;
    }
    body.setTranslation({ x: position.x, y: 0.9, z: position.z }, true);
    world.propagateModifiedBodyPositionsToColliders();
  }
  function route(from, to) {
    const step = 0.5,
      key = (x, z) => `${x},${z}`,
      grid = (p) => ({ x: Math.round(p.x / step), z: Math.round(p.z / step) }),
      start = grid(from),
      target = grid(to);
    if (!free(target.x * step, target.z * step)) return [];
    const nodes = new Map(),
      open = [],
      first = { ...start, g: 0, f: 0, parent: null };
    nodes.set(key(start.x, start.z), first);
    open.push(first);
    let end = null;
    for (let count = 0; open.length && count < 18000; count++) {
      open.sort((a, b) => b.f - a.f);
      const n = open.pop();
      if (n.closed) continue;
      n.closed = true;
      if (n.x === target.x && n.z === target.z) {
        end = n;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const x = n.x + dx,
          z = n.z + dz;
        if (!free(x * step, z * step)) continue;
        if (
          dx &&
          dz &&
          (!free(n.x * step, z * step) || !free(x * step, n.z * step))
        )
          continue;
        const k = key(x, z),
          g = n.g + Math.hypot(dx, dz),
          old = nodes.get(k);
        if (old && old.g <= g) continue;
        const next = {
          x,
          z,
          g,
          f: g + Math.hypot(x - target.x, z - target.z),
          parent: n,
        };
        nodes.set(k, next);
        open.push(next);
      }
    }
    if (!end) return [];
    const path = [];
    while (end.parent) {
      path.unshift({ x: end.x * step, z: end.z * step });
      end = end.parent;
    }
    path.push(to);
    return path;
  }
  return { move, route, free, dispose: () => world.free() };
}
