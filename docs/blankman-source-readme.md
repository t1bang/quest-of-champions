# Blankman: The Game — version 8

Play at **https://blankman.chucksi.com**. Keyboard, touch and standard-mapped gamepad controls are supported. Landscape gives phones the largest playfield; portrait provides a separate controller area.

Version 8 adds complete animated scrap-armor and bloodhound-cloak outfits, animated equipment, an interactive Gear Book and reliable equipment switching. See `V8-NOTES.md`. Play with E / OUTFIT to change suits and Q / SWAP to change weapons. The animation viewer at https://blankman.chucksi.com/equipment-lab.html includes downloadable sheets.

Version 7 added animated details and breakable scenery to all eight stages, four original hip-hop instrumental variations, brief story callouts, fixed-step physics, variable-height jumps, enemy separation, and stronger combat micro-animation. See `V7-NOTES.md` for the stage-by-stage changes. Options → Controllers offers the T1 Vendetta layout from the previous game and the familiar Blankman layout, Xbox/PlayStation labels, and vibration.

Pair a Bluetooth controller in your device settings, return to the game and press a button. Standard browser Gamepad mappings work over Bluetooth or USB. Disconnection pauses; reconnection requires releasing the controls and deliberately resuming. Physical controller hardware was not available during testing.

The seven inventions, Other Guy lifesaver, and improved cart course from version 6 remain. Choose GEAR BOOK to learn about armor, plunger, nunchucks, the belt radio, rocket boots, fork glasses and the bomb-sniffing cloak.

## Play and learn

Press Enter, controller Start/A, or tap PRESS START. Choose HOW TO PLAY to see the moves, then TRY IN WORKSHOP to practice without losing health or lives. Practice targets and crates reset automatically. Pause to return to the title; workshop play never changes your campaign save.

| Action | Keyboard | T1 layout (default) | Blankman layout | Touch |
|---|---|---|---|---|
| Move / change lanes | WASD / arrows | Stick / D-pad | Stick / D-pad | D-pad |
| Run / boost | Shift | LB / L1 | LB / LT | RUN |
| Jump / double jump | Space | Up / stick up | A / Cross | JUMP |
| Punch string | J / Z | X / Y | X / Square | PUNCH |
| Kick / flying kick | K / X | A / B / RB / RT | B / Circle | KICK |
| Gadget blast | L / C | L3 | Y / Triangle | BLAST |
| Swap melee weapon | Q | View / Create | RB / R1 | SWAP |
| Switch outfit | E | LT / L2 | R3 | OUTFIT |
| Other Guy | R | R3 | RT / R2 | CALL |
| Disarm bomb | Hold Down / S | Hold Down | Hold Down | Hold Down |
| Pause / resume | Escape / P | Menu / Options | Menu / Options | Pause |
| Menu confirm / back | Enter / Escape | A / B | A / B | Tap |

Labels and the in-game move guide update for the chosen layout. The T1 layout retains the earlier game's button locations but maps its several punch/kick strengths onto Blankman's combo system.

Line up with an enemy's lane. The third punch launches regular enemies; a running kick lunges forward. A tapped attack in the last 160 ms of another move can queue once. Special costs 35 charge, clears nearby projectiles, and refills with time and ordinary hits. A braced boss can continue an attack through a special, so dodge the warning first.

While equipped, armor absorbs most bullet damage and part of melee damage until its 60 points run out. Full radio charge saves a lethal hit automatically. Defeats and rescues recharge it.

Crates crack before breaking. Walk over a health lunchbox for 24 health a gadget battery for 25 charge, or salvaged armor for 30 armor points. Steam grates in the subway, bank approach, and finale flash before venting: jump or change lanes. The timed scrap bonus does not consume lives. The rail stage has collision damage, three lives and two checkpoints. Losing a life plays a knockdown and recovery before control returns.

Options save difficulty, music, sound effects, movie dialogue, scanlines, screen shake, touch preference, controller layout, label profile and vibration. Reduced-motion settings stop title drift and blinking and suppress shake. Checkpoints, cleared-stage marks, and high score save in the current browser; there is no cloud sync.

## Stages and art

Eight stages: The Neighborhood; Transit Trouble; Blankmobile Express; The Blank Station; The Bank Ambush; J-5 Junkyard Jam; Live from the Trap; Minelli’s Last Stand. T1 Vendetta opponents are joined by new movie-inspired enforcers and Minelli. Every level uses custom Blankman scenery.

In **Blankmobile Express**, Space/the selected controller Jump/touch Jump hops, Down ducks, Left brakes, and Right/Run boosts. The vehicle has a single jump; hold Jump briefly for extra height and follow the battery arcs. Boost consumes charge; batteries and coasting refill it. J-5 marks the midway checkpoint and the service bay provides another. A full radio rescues a missed jump once; otherwise a pit costs a life and returns you to the last checkpoint. The new cast preview is at https://blankman.chucksi.com/cast-gallery.

Each of the three outfits has 160 distinct authored poses in twenty sequences (480 total), accompanied by 56 animated item frames. Frame size: 192×144; eight columns; foot anchor (96,139). `assets/hero-meta.json` maps them. Attacks connect on the fourth pose. The separate animation viewer is at https://blankman.chucksi.com/animation-lab.

## Build and publish

Node.js 20 or newer:

```
npm ci
npm test
npm run build
```

`build/equipment-lab.html` previews all outfits and items. `build/index.html` is a self-contained offline game; `build/animation-lab.html` is its hero viewer, and `build/cast-gallery.html` is the new cast book. All engine code, images, font, audio samples, and sound logic are embedded. Serve locally with `python3 -m http.server 8848 --directory build` or open the game HTML directly.

`npm run deploy` rebuilds and publishes through Wrangler to the existing `blankman` Worker and custom domain. Use the Cloudflare account that owns chucksi.com. Public deployment contains the game, animation viewers, outfit/item PNGs, approved share cover, headers and 404 page; no credentials or research PDFs are distributed.

`src/ride.js` and `src/ride-render.js` own the rail course; `src/simulation.js` owns combat; `src/hero-animation.js` selects authored poses; `src/render.js` handles Phaser visuals; `src/main.js` handles menus, input and saves; `src/guide.js` owns the animated handbook; `src/content.js` defines stages. QA mutation hooks exist only with `?qa=1`; normal play exposes read-only diagnostics.

## Verification

73 simulation tests cover all combat stages, the rail course at three speeds, checkpoint recovery, duck collisions, dialogue frequency, rescue rewards, ally assists, normal moves and asset mappings. Browser validation covers all eight stages, complete keyboard rail play, mobile controls, saved progress, menus, audio decoding/mute and offline loading. The version 8 release also passed four atlas validations, 41 local browser checks and four live-site checks. Physical phones and physical gamepads have not been tested. The retro design study reviewed selected official manuals and video frames; it was not a hands-on playthrough of twelve commercial games.

See `RETRO-STUDY.md`, `ART-PROVENANCE.md`, and `art-source/v3-generation-record.json`, `art-source/v4-generation-record.json`, and `art-source/v5-generation-prompts.json` and `art-source/v6-generation-prompts.json`. Version 7 records are `art-source/v7-generation-prompt.txt`, `audio/music-generation-prompt.json` and `audio/v7-provenance.json`. Phaser's MIT license is in `licenses/PHASER-LICENSE.md`.

## Repository and artwork workflow

The source repository is `t1bang/blankman-the-game`. The current deployed game is version 8. Source code, runtime assets, original animation strips, audio, generation prompts and tests are included. Generated bundles, dependency folders, temporary browser reports and credentials are ignored.

To prepare the online version locally:

```sh
npm run build:deploy
python3 -m http.server 8848 --directory dist
```

Open http://localhost:8848. The build generates its image and audio manifests from the checked-in assets; no external art-generation service or API key is needed to build or play. Cloudflare publishing requires an authorized Cloudflare login and uses `wrangler.jsonc`.

The optional Python tools in `tools/` rebuild the sprite atlases from the original strips. They require Pillow and NumPy in a Python environment. They are not required for normal JavaScript builds.

[Arcade cabinet and Big Bang Arcade concepts](docs/concepts/README.md) document the proposed cabinet appearance.
