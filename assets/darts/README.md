# Darts game models

`darts3d.js` builds every prop from simple shapes. A finished model replaces its stand-in when the file is in this
folder **and** its name is listed in `MODELS` at the top of `darts3d.js`:

`dart.glb` · `cabinet.glb` · `lamp.glb` · `trophy.glb` · `stool.glb`

## How the Tripo set was made (14 Nov 2026)

1. **Concept image first** (Tripo → Image → GPT Image, free quota). One object per image, plain light-grey
   background, even light, no cast shadow, no text, "chunky solid shapes" so thin parts survive. Three-quarter view
   for round things, straight-on for the flat wall cabinet.
2. **Generate 3D** from the best image: HD Model, Ultra Mesh Quality on, Texture 2K, PBR on, Remove Lighting on,
   Triangle topology, and the **Polycount** set low at generation time (dart 15k, cabinet 30k, props 10–12k).
   45 credits each.
3. **Export** GLB, 2K textures.
4. **Shrink for the web** (3.2 MB → about 230 KB each, 940 KB for all five):
   `gltf-transform optimize in.glb out.glb --texture-compress webp --texture-size 1024 --compress meshopt --simplify false`
   (512 textures for small props).
5. The code works out the rest when it loads a model: which way the dart points, how far forward the cabinet's
   board sits, and the scale of each prop. The scoring face of the board is always drawn by `darts-rules.js`,
   because generated boards never have straight wires or readable numbers.

## Licence check before adding a model

The five models here were generated on 14 Nov 2026 with the account on Tripo's **Pro** plan (paid plans carry
commercial rights). Models made on Tripo's Free plan are public and for non-commercial use only, so do not add
those: the arcade sells token packs.
