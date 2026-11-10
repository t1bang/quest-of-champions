# Art provenance — version 2, 3 November 2026

## T1 Vendetta: enemy characters only

The six fighter sheets (Street Guy, Big D, Neil Da Ruler, Tone Da Boss, DaChaMan and Skinny) come from the user's previous T1 Vendetta project from its `src/assets/animated/` directory. Their selected animation frames are preserved in 192×144 slots. No T1 backgrounds, scenery, titles or interface assets are included in version 2.

## Blankman: 128-frame animation upgrade

Created with the built-in OpenAI image-generation tool, using the previous eight-pose Blankman sheet as the identity/costume reference. Four complete 8-column × 4-row atlases were generated: locomotion, airborne actions, combat and reactions. All four raw results and the previous identity reference (`blankman-v1-reference.png`) are in `art-source/`. Full exact prompts, provider output filenames and source paths are recorded in `art-source/generation-record.json`.

`tools/normalize-hero.py` cleans translucent background matte, keeps a shared scale per source atlas, anchors feet at y=139 and packs 128 unique images into `assets/blankman-advanced.png`. The figure is about 90 pixels tall when standing. Crouched and prone poses preserve their relative height. No extra frames are manufactured through duplicates or interpolation. `assets/hero-meta.json` defines indices and the anchor. The separate animation viewer supports inspection at varied playback speeds.

## Five new original environments

Neighborhood, elevated-rail chase, maintenance tunnels, City Hall and the final bottling factory were generated specifically for this game using the built-in OpenAI image-generation tool. Their runtime files are `neighborhood.png`, `river.png`, `sewer.png`, `civic.png` and `finale.png`. Each was normalized to 960×540 using nearest-neighbor sampling. Full prompts and generation filenames are in the generation record. The three Blankman environments from version 1 below are retained, giving eight unique stage environments.

## Opening and typography

The SNES-inspired opening uses the custom rooftop background, animated idle frames, original chunky pixel lettering, palette layers, slow scenery movement, subtle sparks and a blinking PRESS START. Its logo and menu are native game/UI code. The embedded `assets/pixel.ttf` is an original 5×7 block-letter design defined by `tools/make-pixel-font.py`; it is not copied from a console game.

## Subway environment

Provider: built-in OpenAI image generation. Source `exec-b979def5-c861-4711-a73d-45418c81f251.png`. Runtime asset `assets/subway.png`, normalized to 960×540.

> Production environment art for Blankman 1994 fan beat-em-up, late SNES/Genesis pixel-art background, widescreen 16:9. Empty gritty New York elevated subway station at night. A parked 1990s steel subway train with grime, dark windows, worn teal interior glow, riveted steel columns, overhead pipes, amber platform lamps, a few travel posters with no readable text. Pure flat side-on camera for a belt-scrolling fighting game, no perspective vanishing point along horizontal train. Very rich hand-dithered pixel clusters and color ramps, strong dark navy shadows with jade teal and muted gold. Train/architecture occupies upper 72 percent, bottom 28 percent is a flat wide empty dark platform for fighting. NO characters, NO HUD, NO text, NO logos. Consistent crisp pixel density and detailed 16-bit arcade feel.

## Rooftop environment

Provider: built-in OpenAI image generation. Source `exec-c18a4650-b7b3-4002-87a0-9751fd7cdf6d.png`. Runtime asset `assets/rooftop.png`, normalized to 960×540.

> Production environment art for Blankman 1994 fan beat-em-up, late SNES/Genesis pixel-art background, widescreen 16:9. Empty Chicago city rooftop in violet twilight, large riveted black water tower toward the left, HVAC ventilation boxes at edges, a slender TV broadcast mast toward the right, warm amber windows in brick midrise buildings and art-deco highrises in background, purple clouds and pale peach moon. Pure side-on belt-scrolling beat-em-up camera. Detailed hand-dithered pixel clusters, high-end 16-bit arcade scenic pixel art, deep navy outlines and magenta dusk with gold lights. Upper 72 percent skyline architecture, bottom 28 percent flat open charcoal rooftop fighting plane with subtle seams and puddles, no obstructions in center. NO characters, NO HUD, NO words, NO logos.

## Workshop environment

Provider: built-in OpenAI image generation. Source `exec-34bcf023-dfd9-447b-a39f-a02a13abadb1.png`. Reference: user-supplied `blankman3.jpg`. Runtime asset `assets/lab.png`, normalized to 960×540.

> Use the supplied movie frame only as reference for a homemade-inventor workshop and the comical little robot. Create a high quality 16-bit SNES/Genesis pixel-art side-scrolling beat-em-up background, widescreen 16:9. An abandoned underground station converted into Blankman's workshop, cluttered work benches, salvaged circuit boards, wrenches, oscilloscopes, coiled cables, mismatched cupboards, warm hanging lamps and jade-green monitors. On far right behind the fighting floor, place a small charming stationary helper robot made from a cream-colored wringer washer cylinder, a blue mop head, two lightbulb eyes and a black baseball cap; it is a background NPC, not dominant. Detailed crisp hand-dithered pixel art, deep teal and navy shadows with warm amber and ivory highlights. Eye-level side-on view. Upper 72 percent holds detailed workshop scenery; bottom 28 percent is an empty flat wide concrete floor for player movement. No main hero, no human characters, no text, no logo, no HUD. This is game environment art, not a screenshot or UI mockup.

## Original version 1 presentation

The initial build used native game shapes for crates, barriers, pickups, the Blankmobile and combat effects, and browser synthesis for music and sound effects. Versions 3 and 4 below replace the props and expand the audio. No ROM data, ripped commercial game sprites, movie audio or commercial game music are included. The movie screenshots remain only in the separate reference notebook.

## Version 3 — cartridge presentation and interactive props

Built-in image generation produced the original `title-v3.png` illustration and `props-v3.png` sheet on November 3, 2026. The title illustration uses the user-supplied Blankman poster as a likeness and costume reference. Both raw results are preserved in `art-source/`; exact prompts and processing notes are in `art-source/v3-generation-record.json`.

`assets/title-city.png` is a 960×540 pixel-art title backdrop. `assets/props.png` contains six transparent 128×96 frames: intact crate, damaged crate, health lunchbox, gadget battery, barricade, steam grate. A shared scale and ground anchor preserve crate consistency; `assets/props-meta.json` records frame mapping and bounds. Phaser draws transient dust, hit sparks, crate splinters and steam procedurally.

The existing 128 authored Blankman frames are retained. Version 3 improves takeoff timing, attack chaining, running kicks, enemy animation clocks, recovery and combat feedback; it does not claim new character-frame counts. All fighter enemies still use only the six T1 Vendetta sheets. No commercial game sprites, manuals, or music were added to the runtime. Official Sega and Nintendo manuals were consulted as design references; see `RETRO-STUDY.md`.

## Version 4 — combat poses, original audio, and share cover

Built-in image generation created `art-source/fighting-v4.png` using the existing combat sheet as the character reference. Four additional eight-pose sequences (uppercut, dash kick, body hurt, heavy hurt) extend the atlas to 160 unique frames. The original 128 poses remain intact. `tools/normalize-hero.py` records the shared per-sheet scale and common foot anchor. Exact prompt: `art-source/v4-generation-record.json`.

ElevenLabs generated original punch, kick, and generic nonverbal hurt sounds with `eleven_text_to_sound_v2`. Four selected samples are embedded from `audio/`; they supplement browser-synthesized swishes, bass transients, gadgets and music. No movie recording or actor voice clone is used. `AUDIO-AND-COMBAT.md` documents the YouTube review's actual limits and the sample processing.

The previously approved built-in image-generation cover is copied unchanged into `public/share/blankman-the-game-v4.png` and linked in social metadata. Its original prompt is in `art-source/share-cover-prompt.md`.

## Version 7 environment props and music

- `art-source/world-v7.png`: original output from the built-in image-generation tool, using the existing neighborhood background as a style reference; 4×4 atlas with 16 props, including intact/broken pairs. Output 1254×1254, normalized by `tools/normalize-world.py` into `assets/world-v7.png` at 512×512, fixed 128×128 cells and baseline 122. Pair scaling is shared; transparency specks are removed without repainting the art.
- Runtime micro-effects (dust, sparks, fire, water, recoil, light movement) are deterministic game rendering code, not replacement illustrations.
- `audio/music-generation-prompt.json` stores the original ElevenLabs Music v2 prompt, parameters and generation identifiers. Three 48-second generated instrumental variations and one faster bass-forward boss remix; no commercial soundtrack songs sampled. A fourth generated variation was excluded because it had long silent passages.
- `audio/v7-provenance.json` records brief movie clip source and trimming notes. Raw movie downloads and signed generation URLs are not included in the distributed project.

## Version 8 equipment and outfit sheets

The built-in image_gen tool edited the five existing hero pose groups into two consistent costumes: articulated scrap armor and a floral bloodhound cloak. Ten generated 8×4 strips provide 320 new full-character poses. A separate generated 8×7 sheet supplies 56 animated equipment frames. Reference art, generated originals and all eleven prompts are retained under `art-source/outfits-v8/` and `art-source/v8-generation-prompts.json`. The normalization tool records scales and per-pose hand sockets. Existing classic suit and share cover are unchanged.
