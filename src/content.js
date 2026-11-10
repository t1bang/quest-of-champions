import { GAMES } from "../config.js";
import { PRIZES } from "../prizes.js";

export const ROOMS = [
  {
    id: "main",
    name: "Main floor",
    sub: "The headliners",
    x: 0,
    z: 1.5,
    color: "#f2bd5b",
  },
  {
    id: "lab",
    name: "The Lab",
    sub: "Next up at Big Bang",
    x: 0,
    z: -18,
    color: "#70ddd2",
  },
  {
    id: "lounge",
    name: "Music lounge",
    sub: "Pick a record. Take a seat.",
    x: -18,
    z: 3,
    color: "#e48cc7",
  },
  {
    id: "gallery",
    name: "Prize gallery",
    sub: "Play. Collect. Make it yours.",
    x: 18,
    z: 3,
    color: "#f2bd5b",
  },
];
const names = {
  vendetta: "T1 Vs.",
  guerilla: "Gorilla City 2032",
  gamerboy: "GAMEBBOY",
};
export const DEFAULT_CONTENT = {
  version: 1,
  games: GAMES.map((g, i) => ({
    ...g,
    title: names[g.id] || g.title,
    room: "main",
    slot: i,
    status: g.play ? "playable" : "coming-soon",
    blurb:
      g.id === "vendetta"
        ? "Settle the score. One on one, round after round."
        : g.blurb,
  })),
  prizes: PRIZES.map((p, i) => ({
    ...p,
    category: "Collectible",
    shelf: i % 9,
    visible: !p.real,
    image: "",
    model: "",
    scale: 1,
    rotation: 0,
  })),
  wall: {
    title: "THE PRIZE GALLERY",
    accent: "#f2bd5b",
    backdrop: "#122b2d",
    lighting: 1,
    style: "gallery",
  },
};
export const clone = (v) => structuredClone(v);
export function safeUrl(value, { model = false } = {}) {
  if (!value) return "";
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[<>"'`\s\\]/.test(value)
  )
    throw new Error("Use a valid image or game address.");
  if (/^https:\/\//.test(value)) {
    const u = new URL(value);
    if (u.username || u.password)
      throw new Error("Addresses cannot contain account details.");
    if (model && !u.pathname.toLowerCase().endsWith(".glb"))
      throw new Error("3D prizes must be GLB files.");
    return value;
  }
  if (/^(assets\/|games\/|\/assets\/)/.test(value) && !value.includes(".."))
    return value;
  throw new Error("Use HTTPS or an arcade asset address.");
}
const text = (v, max = 120) => {
  if (typeof v !== "string" || v.length > max || /[<>"`]/.test(v))
    throw new Error("Use plain text within the field length.");
  return v.trim();
};
const id = (v) => {
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(v))
    throw new Error("IDs need 2–48 lowercase letters, numbers or dashes.");
  return v;
};
const color = (v) => {
  if (!/^#[\da-f]{6}$/i.test(v)) throw new Error("Choose a valid color.");
  return v;
};
const number = (v, min, max) => {
  if (!Number.isFinite(v) || v < min || v > max)
    throw new Error(`Use a number between ${min} and ${max}.`);
  return v;
};
export function validateContent(value) {
  if (!value || !Array.isArray(value.games) || !Array.isArray(value.prizes))
    throw new Error("The arcade layout is incomplete.");
  if (value.games.length > 40 || value.prizes.length > 60)
    throw new Error("This layout supports up to 40 games and 60 prizes.");
  const ids = new Set(),
    slots = new Set();
  const games = value.games.map((g) => {
    const gid = id(g.id);
    if (
      [
        "bigbox",
        "jukebox",
        "closet",
        "prizes",
        "scores",
        "donate",
        "credits",
      ].includes(gid)
    )
      throw new Error("That game ID is reserved.");
    if (ids.has(gid)) throw new Error("Game IDs must be unique.");
    ids.add(gid);
    if (!["main", "lab"].includes(g.room)) throw new Error("Choose a room.");
    if (!["playable", "demo", "coming-soon", "hidden"].includes(g.status))
      throw new Error("Choose a game status.");
    const slot = number(g.slot, 0, 11);
    if (!Number.isInteger(slot))
      throw new Error("Choose a whole cabinet slot.");
    const place = `${g.room}:${slot}`;
    if (g.status !== "hidden" && slots.has(place))
      throw new Error("Two games cannot share a cabinet slot.");
    if (g.status !== "hidden") slots.add(place);
    const play = safeUrl(g.play);
    if (["playable", "demo"].includes(g.status) && !play)
      throw new Error("Playable games need a game address.");
    return {
      id: gid,
      title: text(g.title, 60),
      genre: text(g.genre, 30),
      color: color(g.color),
      trim: color(g.trim || g.color),
      blurb: text(g.blurb || "", 240),
      play,
      trailer: safeUrl(g.trailer),
      art: safeUrl(g.art),
      poster: safeUrl(g.poster),
      cab: safeUrl(g.cab),
      shots: (g.shots || []).slice(0, 8).map((u) => safeUrl(u)),
      room: g.room,
      slot,
      status: g.status,
    };
  });
  ids.clear();
  const prizes = value.prizes.map((p) => {
    const pid = id(p.id);
    if (ids.has(pid)) throw new Error("Prize IDs must be unique.");
    ids.add(pid);
    return {
      id: pid,
      name: text(p.name, 60),
      icon: text(p.icon || "✦", 12),
      cost: Math.floor(number(p.cost, 0, 1000000)),
      real: !!p.real,
      category: text(p.category || "Collectible", 40),
      description: text(p.description || "", 240),
      visible: p.visible !== false,
      shelf: number(p.shelf, 0, 11),
      image: safeUrl(p.image),
      model: safeUrl(p.model, { model: true }),
      scale: number(p.scale ?? 1, 0.2, 3),
      rotation: number(p.rotation ?? 0, -180, 180),
    };
  });
  const w = value.wall || {};
  const occupiedShelves = new Set();
  for (const prize of prizes.filter((p) => p.visible && !p.real)) {
    if (!Number.isInteger(prize.shelf))
      throw new Error("Choose a whole shelf number.");
    if (occupiedShelves.has(prize.shelf))
      throw new Error("Choose a separate shelf for each visible prize.");
    occupiedShelves.add(prize.shelf);
  }
  return {
    version: 1,
    games,
    prizes,
    wall: {
      title: text(w.title, 60),
      accent: color(w.accent),
      backdrop: color(w.backdrop),
      lighting: number(w.lighting, 0.3, 2),
      style: ["gallery", "neon", "studio"].includes(w.style)
        ? w.style
        : "gallery",
    },
  };
}
export const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function cabinetPosition(g) {
  const row = Math.floor(g.slot / 4),
    col = g.slot % 4;
  const z = -12 + row * 5.4;
  return {
    x:
      [-6, -2, 2, 6][col] +
      (g.room === "lounge" ? -18 : g.room === "gallery" ? 18 : 0),
    z:
      g.room === "lab" ? -26 + row * 4 : g.room === "main" ? z : -8 + row * 5.4,
  };
}
