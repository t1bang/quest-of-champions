# Big Bang Arcade

Free browser games from T1 Entertainment. Created by Chuck Crawley and Tone Da Boss.

The home page (`index.html`) is a walk-around 3D arcade: `room.js` draws the room, `app.js` runs the controls and panels, `art.js` holds original cover art and trailers, and `api/arcade.js` is the online database (players, tokens, closet, leaderboards, comments). **Edit `config.js`** to change game links, songs, donate links and socials, and `prizes.js` for the prize wall. The earlier simple home page is kept as `classic.html`. Each game lives in its own folder under `games/`.

Games report scores to the arcade with `parent.postMessage({ bba: 'score', score: 1234 }, '*')`.

The database uses Vercel Blob (connect a Blob store to the project) or Upstash Redis if its environment variables are present.

| Game | Folder | Own domain |
|---|---|---|
| Quest of Champions | `games/quest-of-champions/` | qoc.t1bang.com |

**Adding a game:** put it in `games/<name>/` (its own `index.html` plus assets), add a 16:9 screenshot to `assets/`, and add one entry to the `GAMES` list at the bottom of the root `index.html`.

---

## Quest of Champions

A T1 side-scrolling beat 'em up starring Tone Da Boss, the Voice of Champions. Fight through the court, the gridiron and HustleMania to the soundtrack of *Gimme My Ring*, *Victory Lap* and *Showtime*.

**Play:** https://qoc.t1bang.com

Plays in any browser. On a phone, turn it sideways.

**Controls (keyboard):** arrows/WASD move · J punch (hold to fire notes) · K kick (hold for a fireball) · S duck · Space jump · 1/2 assists · Enter pause · Shift select menu · M mute

Music, artwork and characters © T1 Entertainment.

---

## How the code is organized

A Tone Da Boss beat 'em up. Everything is one HTML file plus assets; no build step, no libraries.

### Files
- `games/quest-of-champions/index.html` — the whole game (HTML, CSS and ~1,000 lines of JavaScript). Open it in a browser, or host the folder on any static web host. Phones need landscape.
- `audio/` — `champions.mp3` (menus + intros), `ring.mp3`, `victory.mp3`, `showtime.mp3` (Levels 1–3).
- `video/victory_lap.mp4` — plays on the Level 2 win screen.
- `sprites/` — painted character frames, cut from the sprite sheets and sized so a standing pose is 200 px tall.

## Where things are in index.html
1. **Config (top of the script)** — `SONG_START`, `MENU_SONG`, `CHAMPIONS_CHORUS`, `VIDEO_LINKS`, `EMBED_VIDEO`, `STREAM_LINKS`, `SOCIALS`, `PRESS_LINK`, `CHAR_LINKS`. Change links and song start points here.
2. **Input** — `BTN` holds every on-screen button (position/size in the 960×540 logical canvas). Keyboard mapping is in `held()`.
3. **Sprite renderer** — `drawHuman()` draws any code-drawn character from an options object (skin, hair, hat, top, jersey, etc.). `drawMusicNote/Fireball/Record/Keg/Basketball/Football` draw projectiles and pickups.
4. **Characters** — `TONE`, `CHARS` (the selectable roster), `DACHAMAN`, `REF`.
5. **Levels** — `LEVELS[1..3]`: name, song, theme, length, teammate, enemy kinds, two assists, boss (HP + moves), reward, ramp signs.
6. **Game state** — `startLevel()`, `beginPlay()`, `spawnEnemy()`, `spawnBoss()`, `hurtPlayer()`, `loseLife()`, `damageEnemy()`, `finishLevel()`, link bar + embedded video helpers.
7. **Cutscenes** — `startCutscene(n)` builds the beat list for each level's intro; `updateCutscene()` / `drawCutscene()` run it.
8. **Update loop** — `update()` is the per-frame game logic: player movement, duck/jump dodges, hold-to-charge punch/kick, assists, camera, spawns, heart drops, teammate AI, enemy/ref/boss AI, lightning, projectiles, records, particles. `triggerAssist()` holds each assist move.
9. **Megatron** — `LYRICS`, `lyricScroll()`, `drawMegatron()` (one board design per stage).
10. **Backgrounds** — `drawBackground()` (court / field / arena).
11. **Painted sprites** — `SPRITES` maps a character key to frame files; `fullSheet()` builds the entry for a full sheet; `pickFrame()` picks the frame from state; `drawSprite()` draws it (falls back to `drawHuman` while loading).
12. **Drawing** — `drawLightning`, `drawSigns`, `drawHud`, `drawWorld`, `drawPlay`.
13. **Menus** — title, character select, level select, pause, select menu, victory, game over, high-score entry.
14. **Main loop** — `frame()`.

## Adding a painted character
1. Cut the frames into `sprites/<key>_<frame>.png` (idle1–6, walk1–6, strike1–6, special1–6, taunt1, hit1, down1, getup1). A standing frame should be about 200 px tall.
2. Add `SPRITES.<key>=fullSheet('<key>',150,<last strike #>,<down #>);`
3. Put `sprite:'<key>'` on that character's options object in `CHARS` (or on a teammate/assist/boss in `LEVELS`).

## Tuning cheat sheet
- Charge time: `const CH=60;` (frames) in `update()`.
- Player projectile damage: the `dmg` values on the `note` and `fire` pushes in `update()`.
- Boss HP: `hp:` on each `LEVELS[n].boss`. Assist hits on bosses: `if(e.isBoss&&assist)d=10` in `damageEnemy`.
- Ref frequency: `spawnCount%10===0` in `spawnEnemy`. Ref mic loot: `const n=e.isRef?3:1` in `damageEnemy`.
- Heart drop timer: `heartTimer>=900` (frames). Records per 1-up: `collected%20===0`.
- Scores: `addScore(25)` per hit, 200 / 400 / 1000 for guys / refs / bosses in `damageEnemy`.

## Shipping it as an app
The game is a plain static site, so it wraps directly with Capacitor (iOS/Android) or can be added to a phone's home screen from the browser. High scores and the mute setting are stored in `localStorage` on the device.

## Floor plan

The arcade has four areas: the main floor, the coming-soon hallway (back doorway), the lounge (front doorway) and the East Wing (right-wall doorway). The sizes live in one place, `DIMS` at the top of `room.js`, and `app.js` reads the same numbers for walking and map routes.

- **Cabinet slots:** six on the main back wall, four in the hallway, eight in the East Wing. Games fill the back wall first (centre out) and overflow into the wing.
- **Put a game in the East Wing:** add `room: 'east'` to its entry in `config.js`. `hallSlot` still pins a cabinet to the hallway.
- **Custom cabinet shapes:** add `style: 'racer'`, `'golf'`, `'dance'`, `'pinball'` or `'claw'` to a game's entry. The shapes are drawn in `cabs.js`. The golf bay takes two wing slots.
- Free wing slots show as lit "OPEN SLOT" floor pads until a game takes them.

## Lounge, avatars and live players

- The lounge (through the doorway at the front of the room) has a bar, couches, darts, pool, air hockey and bowling. The four games are simple timing mini-games.
- The bar and avatars use two extra API actions, `spend` and `avatar`; the token rules `minute`, `level`, `fatality` and `social` are in `api/arcade.js` too. **The Supabase `bba_arcade` function must implement the same actions** for them to work on the live site.
- Other players' avatars are shared through a Supabase Realtime broadcast channel (`bba-arcade-room`), so Realtime must be enabled on the project.
# Big Bang Arcade accounts

BigBangArcade.com is the main account platform. My Arcade brings all five games, personal scores, supported cloud saves and invite lobbies into one shared player library. Optional analytics cover the website as well as connected game events, with an owner dashboard for the entire arcade. New guest play stays local. The entrance layout is unchanged.

See [player setup and provider activation](docs/player-system-setup.md) for Google/Facebook callbacks, owner access, event coverage, privacy choices and the remaining launch steps. Social buttons stay hidden until their providers are enabled. Run `npm test` for automated checks and `npm run test:browser` against a local preview for mocked-account desktop/mobile checks.
