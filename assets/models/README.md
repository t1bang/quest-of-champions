# Lobby models

Finished 3D models for the arcade room (`room.js`, section "finished 3D models"). The room first builds each piece
of furniture from boxes; when `<name>.glb` here loads, it replaces the boxes of the same name. A missing or broken
file just leaves the boxes in place.

Models were generated in Tripo on the Pro plan (see `assets/darts/README.md` for the image → 3D recipe), then made
lobby-ready: colour picture only, a few thousand triangles, plain float data (the lobby's own small loader does not
read Draco or Meshopt compression).

Places and sizes are listed in `room.js` next to the furniture they replace (`MODELS.push(...)`).
