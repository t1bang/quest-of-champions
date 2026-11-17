# Lobby models

Finished 3D models for the arcade room (`room.js`, section "finished 3D models"). The room first builds each piece
of furniture from boxes; when `<name>.glb` here loads, it replaces the boxes of the same name. A missing or broken
file just leaves the boxes in place.

Models were generated in Tripo on the Pro plan (see `assets/darts/README.md` for the image → 3D recipe), then made
lobby-ready: colour picture only, a few thousand triangles, plain float data (the lobby's own small loader does not
read Draco or Meshopt compression).

Places and sizes are listed in `room.js` next to the furniture they replace (`MODELS.push(...)`).

## Many-part models (Nov 16 2026)

`shootem.glb`, `slamcab.glb` and `swordcab.glb` were built from many separate parts and materials, which the lobby's
loader cannot read. `tools/lobby_model.py` bakes such a model into one mesh with one atlas picture:

    python3 tools/lobby_model.py in.glb assets/models/name.glb [--tile 256] [--drop part-name] [--flipv part-name] [--swap N=picture.png]

- `shootem`: the scoreboard and marquee labels were upside down in the source (`--flipv marquee --flipv score`).
- `swordcab`: the three pictures inside the source were replaced with original art (`--swap`) and the gold crest
  parts left out (`--drop Gold_crest`), so the cabinet carries no other game's marks.
