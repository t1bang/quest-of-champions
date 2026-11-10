# Big Bang Arcade

A four-room, walkable Three.js arcade: the main floor, The Lab, music lounge, and prize gallery. It preserves the embedded Quest of Champions, external T1 Vs. game, player nicknames, tokens, closet, comments, leaderboards, trailers, music and credits.

## Run and deploy

- `npm ci`
- `npm run dev` (includes the local arcade API)
- `npm test` (real Rapier collision and route traversal, content validation)
- `npm run build` (Vite bundles; original assets and game files are copied unchanged)
- `vercel deploy --target preview` from the linked T1Bang project.

`vercel.json` is deployment-scoped. Existing production remains on its current build until the preview is explicitly promoted or the branch is merged. Existing game code under `games/` is unchanged. The two newer upstream music commits are included.

## Owner Control Room

Open `/owner.html`. The two existing T1 owner accounts are checked by their authenticated user IDs against `t1_private.control_owners`. Player nicknames grant no editing access. There are no passwords or service-role keys in this repository.

- **Game floor:** add/hide games, set HTTPS or local game addresses and artwork, choose a room and cabinet slot. The main floor and Lab each have 12 positions. Keep IDs stable to retain scores and comments.
- **Prize collection:** names, descriptions, category, token prices, badge symbols, shelf positions, image uploads, self-contained GLB models, scale, rotation, and visibility. Twelve physical shelf positions, with up to 60 catalog items. Physical rewards remain disabled, as before.
- **Gallery design:** title, accent/backdrop, mood and light intensity.
- **Save draft:** private draft only. Optimistic revisions reject stale saves from another window.
- **Preview:** an isolated local draft preview, not a public URL. Preview never awards tokens or makes purchases.
- **Publish:** atomically updates the published layout and keeps the previous published version.
- **Published versions:** restore an earlier version into a draft; preview and publish separately.
- **Backup:** download the current layout as JSON.

Uploads go through the Supabase Storage API into `bba-assets`. Public artwork can be read by visitors; only the two owners can upload/change files. Images are capped at 4 MB / 8192 pixels; GLBs at 12 MB and must embed resources. Owner roles, draft writes and publish authorization are enforced in the database, not just hidden by the interface.

## Data and token economy

The Supabase project is `t1-vendetta` (`fspcfzxtohaaeoudrack`). This addition uses new `bba_*` public objects and the isolated `bba_private` schema. It does not change any T1 game, analytics, profile or control-room table.

The original T1Bang arcade had no Redis/Blob storage environment configured. `/api/arcade` therefore uses `bba_arcade`, a public security-invoker wrapper around a private, credential-checking implementation. Player credentials stay in the existing `bba-auth` browser key. Player rows and credential hashes are never publicly selectable. Token changes lock a player's row. Daily rewards are idempotent, purchases use published prices, duplicate collectibles are rejected, and score awards only count improvements, capped at 200 per day.

Redis/Blob-backed deployments retain the existing storage path if those credentials are configured. This preview starts its isolated player store; no old account data was available in the T1Bang deployment to import. Nickname-based profiles are browser-local credentials, not cross-device verified accounts. Scores reported by games remain client-reported and are suitable for arcade collectibles, not cash prizes or competitive anti-cheat.

## Controls and browser behavior

The November 10 visual pass uses the supplied boutique arcade concepts as its reference: walnut slats, brass edging, a dark stone floor, warm pendant lights, mint framing, closer headliner cabinets and an arched jukebox. It is a real-time interpretation, not a pixel-identical image reproduction. The low game table keeps the cabinet screens visible. The lobby preview and full prize gallery both use the published prize collection.

Camera turns and movement ease independently of frame rate. Thumbstick input has a radial deadzone and separate pointer ownership from drag-to-look. Opening a menu, changing rooms or losing focus clears held movement. The map and persistent Games button provide alternatives to walking; room arrivals avoid furniture. Picking checks intervening walls and uses a short target for the low table so it cannot intercept cabinet taps above it.

Desktop uses softened floor reflections; phones omit the extra reflection pass. Static meshes are batched, while jukebox equalizers and cabinet lights remain animated. Reduced-motion preferences disable ornamental motion and room fades. Development-only canvas diagnostics are excluded from production builds.

WASD / arrows, drag to look, E / Enter to interact, M for map, Shift to move faster. Phone uses a thumbstick and drag-to-look. Standard-mapped Xbox and PS5 pads use the two sticks, A/cross to interact, B/circle to close menus, and Y/triangle for map. Bluetooth versus wired transport is not reliably available to the browser. Actual hardware pairing is performed in device settings.

Rapier handles movement and collision. A* routes around walls and cabinets; the map can jump to a room. Input pauses under menus, the entrance and games. The arcade stops rendering while a game iframe is open or the tab is hidden. Game messages must originate from the active game frame and match its expected origin. Music begins after the entry gesture to comply with browser autoplay rules.

There is no multiplayer avatar room or redemption/shipping workflow in this release. The existing games retain their own online capabilities. Gorilla City and GAMEBBOY remain visibly in development until their playable addresses are provided through the editor.

### Visual-pass validation

Seven automated checks cover content validation, real Rapier collisions and routes through every room, all 12 slots on each game floor, clear room entry points, camera angle wrapping, frame-rate-independent easing and thumbstick deadzone/release. Production build and production dependency audit pass (zero reported vulnerabilities). The existing large Rapier bundle still produces Vite's size advisory.

Browser checks covered desktop movement and stopping at furniture, cabinet auto-walk, all four room visits, T1 game launch and exit, phone joystick release and drag-to-look, portrait menus down to 320 CSS pixels, and compact landscape controls. No horizontal overflow was observed. Browser console had no warnings or errors during these checks. Simultaneous two-finger input and physical Xbox/PS5 controllers still require real-device testing; neither is claimed as verified by browser emulation.

## Source safety

The checked-in migration creates only new arcade objects. The hosted migration has already been applied and verified; do not reapply it blindly. RLS on private credential/score/comment tables intentionally has no direct policies: access is exclusively via validated functions. Existing unrelated security advisories are not changed by this work.
