import { backend, ownerAllowed } from "./src/backend.js";
import {
  DEFAULT_CONTENT,
  ROOMS,
  clone,
  validateContent,
  escapeHtml as e,
} from "./src/content.js";
const $ = (s) => document.querySelector(s);
let content = clone(DEFAULT_CONTENT),
  revision = 1,
  tab = "games",
  selected = 0,
  dirty = false,
  busy = false,
  noticeTimer;
const titles = {
  games: ["Game floor", "Your games, ready for their next player."],
  prizes: ["Prize collection", "A collection worth coming back for."],
  wall: ["Gallery design", "Give your prize wall its own personality."],
  history: [
    "Published versions",
    "Bring a previous arcade layout back as a draft.",
  ],
};
function notice(t) {
  $("#notice").textContent = t;
  $("#notice").classList.add("on");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $("#notice").classList.remove("on"), 4500);
}
function changed() {
  dirty = true;
  $("#save-state").textContent = "Unsaved changes · only visible to you";
}
function setBusy(on) {
  busy = on;
  for (const id of ["save", "publish", "preview"]) $("#" + id).disabled = on;
}
async function start() {
  if (!(await ownerAllowed())) return false;
  const { data, error } = await backend
    .from("bba_content")
    .select("*")
    .eq("id", "draft")
    .single();
  if (error) throw error;
  content = validateContent(data.content);
  revision = data.revision;
  const {
    data: { user },
  } = await backend.auth.getUser();
  $("#owner-email").textContent = user.email;
  $("#login-screen").hidden = true;
  $("#editor").hidden = false;
  $("#save-state").textContent = "Draft saved · ready when you are";
  render();
  return true;
}
$("#login-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const button = ev.target.querySelector("button");
  button.disabled = true;
  $("#login-status").textContent = "Checking owner access…";
  try {
    const f = new FormData(ev.target),
      { error } = await backend.auth.signInWithPassword({
        email: f.get("email").trim(),
        password: f.get("password"),
      });
    if (error) throw new Error("Check your email and password.");
    if (!(await start())) {
      await backend.auth.signOut();
      throw new Error("This account does not have owner access.");
    }
    ev.target.reset();
  } catch (err) {
    $("#login-status").textContent = err.message;
  } finally {
    button.disabled = false;
  }
};
$("#logout").onclick = async () => {
  await backend.auth.signOut();
  location.reload();
};
try {
  if ((await backend.auth.getSession()).data.session) await start();
} catch (err) {
  $("#login-status").textContent = err.message;
}
for (const b of document.querySelectorAll("nav button"))
  b.onclick = () => {
    tab = b.dataset.tab;
    selected = 0;
    render();
  };
function field(label, key, value, type = "text", extra = "") {
  return `<label>${e(label)}<input data-field="${key}" type="${type}" value="${e(value)}" ${extra}></label>`;
}
function select(label, key, value, options) {
  return `<label>${e(label)}<select data-field="${key}">${options.map(([id, name]) => `<option value="${e(id)}" ${String(value) === String(id) ? "selected" : ""}>${e(name)}</option>`).join("")}</select></label>`;
}
function render() {
  for (const b of document.querySelectorAll("nav button"))
    b.classList.toggle("active", b.dataset.tab === tab);
  $("#section-title").textContent = titles[tab][0];
  $("#section-description").textContent = titles[tab][1];
  $("#revision").textContent = "DRAFT / " + String(revision).padStart(3, "0");
  if (tab === "history") {
    history();
    return;
  }
  if (tab === "wall") {
    wall();
    bind();
    return;
  }
  const list = content[tab];
  selected = Math.max(0, Math.min(selected, list.length - 1));
  const item = list[selected];
  $("#workspace").innerHTML =
    `<div class="toolbar"><p>${list.length} ${tab === "games" ? "games · up to 12 cabinets per game room" : "prizes · choose what appears in the gallery"}</p><button id="add">+ Add ${tab === "games" ? "game" : "prize"}</button></div><div class="split"><div class="item-list">${list.map((p, i) => `<button class="item ${selected === i ? "active" : ""}" data-select="${i}">${p.art || p.image ? `<img src="${e(p.art || p.image)}" alt="">` : `<span class="symbol">${e(p.icon || "◈")}</span>`}<span><strong>${e(p.title || p.name)}</strong><small>${tab === "games" ? e(p.room) + " / " + e(p.status) : p.visible ? e(p.cost) + " tokens · shelf " + (p.shelf + 1) : "Hidden from gallery"}</small></span></button>`).join("")}</div><div class="form-card">${item ? (tab === "games" ? gameFields(item) : prizeFields(item)) : '<p class="empty">Start your collection with something great.</p>'}</div></div>`;
  $("#add").onclick = () => {
    const occupied = new Set(list.map((p) => p.id));
    let i = list.length + 1,
      id;
    do {
      id = (tab === "games" ? "game-" : "prize-") + i++;
    } while (occupied.has(id));
    if (tab === "games") {
      const taken = new Set(
        list
          .filter((g) => g.room === "lab" && g.status !== "hidden")
          .map((g) => g.slot),
      );
      const slot = Array.from({ length: 12 }, (_, n) => n).find(
        (n) => !taken.has(n),
      );
      list.push({
        id,
        title: "New game",
        genre: "Arcade",
        color: "#79c9bf",
        trim: "#397d77",
        blurb: "The next chapter at Big Bang.",
        play: "",
        trailer: "",
        art: "",
        poster: "",
        cab: "",
        shots: [],
        room: "lab",
        slot: slot ?? 0,
        status: slot === undefined ? "hidden" : "coming-soon",
      });
    } else
      list.push({
        id,
        name: "New collectible",
        icon: "✦",
        cost: 50,
        category: "Collectible",
        description: "",
        visible: false,
        real: false,
        shelf: 0,
        image: "",
        model: "",
        scale: 1,
        rotation: 0,
      });
    selected = list.length - 1;
    changed();
    render();
  };
  for (const b of document.querySelectorAll("[data-select]"))
    b.onclick = () => {
      selected = +b.dataset.select;
      render();
    };
  bind();
}
function gameFields(g) {
  return `<h2>${e(g.title)}</h2><p>Keep a game's ID when moving its cabinet so its scores and comments follow it.</p>${g.art ? `<img class="cover-preview" src="${e(g.art)}" alt="Game artwork">` : ""}<div class="fields">${field("Game title", "title", g.title, "text", 'maxlength="60"')}${field("Permanent game ID", "id", g.id, "text", 'pattern="[a-z][a-z0-9-]{1,47}"')}${select(
    "Room",
    "room",
    g.room,
    ROOMS.filter((r) => ["main", "lab"].includes(r.id)).map((r) => [
      r.id,
      r.name,
    ]),
  )}${select(
    "Cabinet slot",
    "slot",
    g.slot,
    Array.from({ length: 12 }, (_, i) => [i, "Cabinet " + (i + 1)]),
  )}${select("Status", "status", g.status, [
    ["playable", "Ready to play"],
    ["demo", "Playable demo"],
    ["coming-soon", "In development"],
    ["hidden", "Hidden"],
  ])}${field("Genre", "genre", g.genre)}${field("Cabinet color", "color", g.color, "color")}${field("Cabinet trim", "trim", g.trim || g.color, "color")}<div class="span2">${field("Playable game address", "play", g.play, "text", 'placeholder="https://… or games/…"')}<label>About the game<textarea data-field="blurb" maxlength="240">${e(g.blurb)}</textarea></label>${field("Cover artwork address", "art", g.art)}${field("Trailer address (optional)", "trailer", g.trailer)}<label class="upload">Upload cover artwork<input type="file" data-upload="art" accept="image/png,image/jpeg,image/webp"></label><p class="help">PNG, JPEG or WebP, up to 4 MB. Your existing games and their code stay separate.</p></div></div><button class="danger" id="remove">Remove cabinet from this layout</button>`;
}
function prizeFields(p) {
  return `<h2>${e(p.name)}</h2><p>Digital collectibles go into the player's collection. Physical prize redemption remains unavailable.</p>${p.image ? `<img class="cover-preview" src="${e(p.image)}" alt="Prize artwork">` : ""}<div class="fields">${field("Prize name", "name", p.name, "text", 'maxlength="60"')}${field("Permanent prize ID", "id", p.id)}${field("Token price", "cost", p.cost, "number", 'min="0" max="1000000" step="1"')}${field("Category", "category", p.category)}${field("Badge symbol", "icon", p.icon, "text", 'maxlength="12"')}${select(
    "Display shelf",
    "shelf",
    p.shelf,
    Array.from({ length: 12 }, (_, i) => [
      i,
      `${i + 1} · ${["Left", "Center", "Right"][i % 3]}, row ${Math.floor(i / 3) + 1}`,
    ]),
  )}${field("Display size", "scale", p.scale, "number", 'min="0.2" max="3" step="0.1"')}${field("Rotation", "rotation", p.rotation, "number", 'min="-180" max="180" step="5"')}<div class="span2"><label><input data-field="visible" type="checkbox" ${p.visible ? "checked" : ""}>Show on the prize wall</label><br><label>Description<textarea data-field="description" maxlength="240">${e(p.description || "")}</textarea></label>${field("Image address (optional)", "image", p.image)}${field("3D model address (optional)", "model", p.model)}<label class="upload">Upload an image or 3D prize<input type="file" data-upload="prize" accept="image/png,image/jpeg,image/webp,.glb"></label><p class="help">Image up to 4 MB, or self-contained GLB up to 12 MB. A 3D model takes priority over an image.</p></div></div><button class="danger" id="remove">Remove from this layout</button>`;
}
function wall() {
  const w = content.wall;
  $("#workspace").innerHTML =
    `<div class="split"><div class="form-card"><h2>Make the wall yours.</h2><p>Warm brass, a darker backdrop, and space for every collectible.</p>${field("Gallery title", "title", w.title)}<div class="fields">${field("Accent color", "accent", w.accent, "color")}${field("Wall color", "backdrop", w.backdrop, "color")}${select(
      "Display mood",
      "style",
      w.style,
      [
        ["gallery", "Classic gallery"],
        ["neon", "Neon nights"],
        ["studio", "The studio"],
      ],
    )}${field("Light intensity", "lighting", w.lighting, "number", 'min="0.3" max="2" step="0.1"')}</div></div><div><div class="gallery-sample" style="--accent:${w.accent};--backdrop:${w.backdrop}"><span class="kicker">BIG BANG / COLLECTIBLES</span><h2>${e(w.title)}</h2><div class="shelf-sample">${content.prizes
      .filter((p) => p.visible)
      .slice(0, 3)
      .map((p) =>
        p.image
          ? `<img src="${e(p.image)}" alt="">`
          : `<span>${e(p.icon)}</span>`,
      )
      .join(
        "",
      )}</div><p>Win something worth showing off.</p></div><p>Use Preview changes to walk around your full gallery before publishing.</p></div></div>`;
}
function bind() {
  const item = tab === "wall" ? content.wall : content[tab]?.[selected];
  for (const input of document.querySelectorAll("[data-field]"))
    input.oninput = () => {
      const key = input.dataset.field;
      item[key] =
        input.type === "checkbox"
          ? input.checked
          : ["number", "range"].includes(input.type) ||
              ["slot", "shelf"].includes(key)
            ? +input.value
            : input.value;
      if (tab === "wall") {
        const sample = $(".gallery-sample");
        sample.style.setProperty("--accent", item.accent);
        sample.style.setProperty("--backdrop", item.backdrop);
        sample.querySelector("h2").textContent = item.title;
      }
      changed();
    };
  $("#remove")?.addEventListener("click", () => {
    content[tab].splice(selected, 1);
    changed();
    render();
  });
  for (const input of document.querySelectorAll("[data-upload]"))
    input.onchange = () => upload(input, item);
}
async function upload(input, item) {
  const file = input.files[0];
  if (!file) return;
  try {
    setBusy(true);
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const ext = file.name.split(".").pop().toLowerCase(),
      isModel = ext === "glb";
    if (
      isModel
        ? file.size > 12 * 1024 * 1024 ||
          String.fromCharCode(...bytes.slice(0, 4)) !== "glTF"
        : file.size > 4 * 1024 * 1024 ||
          !["png", "jpg", "jpeg", "webp"].includes(ext)
    )
      throw new Error("Choose a supported image (4 MB) or GLB (12 MB).");
    if (isModel) {
      const all = await file.arrayBuffer(),
        view = new DataView(all);
      if (
        view.getUint32(4, true) !== 2 ||
        view.getUint32(8, true) !== file.size ||
        view.getUint32(16, true) !== 0x4e4f534a
      )
        throw new Error("Use a valid GLB 2.0 model.");
      const json = JSON.parse(
        new TextDecoder().decode(
          new Uint8Array(all, 20, view.getUint32(12, true)),
        ),
      );
      const external = (v) =>
        v &&
        typeof v === "object" &&
        Object.entries(v).some(
          ([k, x]) =>
            (k === "uri" && typeof x === "string" && !x.startsWith("data:")) ||
            external(x),
        );
      if (external(json))
        throw new Error("Embed all textures and buffers inside the GLB.");
    }
    if (!isModel) {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 8192 || bitmap.height > 8192) {
        bitmap.close();
        throw new Error("Images must be smaller than 8192 pixels per side.");
      }
      bitmap.close();
    }
    const { data: bucket } = await backend.storage.getBucket("bba-assets");
    if (!bucket) {
      const { error } = await backend.storage.createBucket("bba-assets", {
        public: true,
        fileSizeLimit: 12582912,
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/webp",
          "model/gltf-binary",
          "application/octet-stream",
        ],
      });
      if (error && !/exists/i.test(error.message)) throw error;
    }
    const path = crypto.randomUUID() + "." + ext;
    const { error } = await backend.storage
      .from("bba-assets")
      .upload(path, file, {
        contentType: isModel ? "model/gltf-binary" : file.type,
        upsert: false,
      });
    if (error) throw error;
    const { data } = backend.storage.from("bba-assets").getPublicUrl(path);
    item[input.dataset.upload === "art" ? "art" : isModel ? "model" : "image"] =
      data.publicUrl;
    changed();
    render();
    notice("Artwork uploaded. Preview it before publishing.");
  } catch (err) {
    notice(err.message);
  } finally {
    setBusy(false);
    input.value = "";
  }
}
async function save(publish = false) {
  if (busy) return;
  try {
    const valid = validateContent(content);
    setBusy(true);
    $("#save-state").textContent = publish
      ? "Publishing the arcade…"
      : "Saving your draft…";
    const { data, error } = await backend.rpc("bba_save_content", {
      p_content: valid,
      p_expected: revision,
      p_publish: publish,
    });
    if (error) throw error;
    revision = data.revision;
    content = valid;
    dirty = false;
    $("#save-state").textContent = publish
      ? "Published · visitors see this layout on their next visit"
      : "Draft saved · published arcade unchanged";
    render();
    notice(publish ? "Your arcade layout is published." : "Draft saved.");
  } catch (err) {
    $("#save-state").textContent = "Not saved · " + err.message;
    notice(err.message);
  } finally {
    setBusy(false);
  }
}
$("#save").onclick = () => save(false);
$("#publish").onclick = () => save(true);
$("#preview").onclick = () => {
  try {
    const valid = validateContent(content),
      key = crypto.randomUUID();
    localStorage.setItem(
      "bba-draft-preview",
      JSON.stringify({ key, at: Date.now(), content: valid }),
    );
    $("#preview-dialog iframe").src = `/?preview=${key}`;
    $("#preview-dialog").showModal();
  } catch (err) {
    notice(err.message);
  }
};
function closePreview() {
  $("#preview-dialog").close();
  $("#preview-dialog iframe").src = "about:blank";
}
$("#close-preview").onclick = closePreview;
$("#preview-dialog").addEventListener("cancel", closePreview);
$("#export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "big-bang-arcade-layout.json";
  a.click();
  URL.revokeObjectURL(url);
};
async function history() {
  const { data, error } = await backend
    .from("bba_content_history")
    .select("revision,created_at,content")
    .order("revision", { ascending: false })
    .limit(20);
  if (tab !== "history") return;
  if (error) {
    $("#workspace").textContent = error.message;
    return;
  }
  $("#workspace").innerHTML =
    `<div class="form-card"><h2>Every great arcade evolves.</h2><p>Restore a version into your draft, preview it, then publish when you're ready.</p>${data.length ? data.map((v, i) => `<div class="version-row"><span><strong>Layout ${v.revision}</strong><small>${new Date(v.created_at).toLocaleString()} · ${v.content.games.length} games · ${v.content.prizes.length} prizes</small></span><button data-restore="${i}">Restore as draft</button></div>`).join("") : '<p class="empty">Your first published update will appear here.</p>'}</div>`;
  for (const b of document.querySelectorAll("[data-restore]"))
    b.onclick = () => {
      content = validateContent(data[+b.dataset.restore].content);
      changed();
      tab = "games";
      selected = 0;
      render();
      notice("Version restored to your draft. Preview before publishing.");
    };
}
addEventListener("beforeunload", (ev) => {
  if (dirty) {
    ev.preventDefault();
    ev.returnValue = "";
  }
});
