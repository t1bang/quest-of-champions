# Blankman at Big Bang Arcade

Blankman: The Game v8 is hosted at `/games/blankman/` in its existing hallway cabinet (slot 2). The other three hallway cabinets retain slots 0, 1, and 3. Four original machines remain in the main room.

The entrance promotes the new cabinet. Now Playing walks the player to it. Map, Big Bang Box, scores, comments, and the fallback game list all include Blankman. The Big Bang Box display fits five covers. The original jukebox, lounge, prizes, and other games are preserved.

## Source and import

Game source: https://github.com/t1bang/blankman-the-game at `e0c23573a3aa6533fb25bd5a5883c38a5741fc8b` (v8).

Build that checkout with `npm ci && npm run build`, then run `node tools/import-blankman.mjs /path/to/blankman-the-game` from this repository. The script preserves the game build, changes online equipment URLs to relative URLs for this subdirectory, and attaches the arcade adapter. The original standalone game remains at https://blankman.chucksi.com/.

The adapter reports completed runs and game-over scores. Practice does not report scores. The parent checks the message source, origin, active game, and score bounds before sending to the arcade API. Existing server-side token caps remain in force. Exit destroys the game frame and resumes the lobby music.

## Cabinet art

Four flat comic textures generated with OpenAI's built-in image generation tool using the approved Blankman cabinet concept as a visual reference. Prompts: `blankman-art-prompts.json`. JPEGs are resized versions of those generated textures. Coin door reused from the existing arcade wrap. The screen and preview show actual game captures. No external service credentials are included.

## Backend

The API fallback uses the existing Supabase public RPC. Its allowlist comes from `bba_content.content.games`, rather than the source config. Blankman was appended to both draft and published content with an idempotent update, preserving all other entries and incrementing revisions. No table privileges, RLS policies, or database functions changed. Play rewards, score improvements, and duplicate-score handling were verified in a rolled-back transaction, leaving no test players or scores.

## Checks

Run `node --test tests/*.test.mjs`. Browser review covers entrance, map, hallway approach, game launch, keyboard movement/jump, Blankmobile, outfit switching, exit, five-game selector, and mobile touch launch. Desktop and mobile screenshots are kept with the release review, outside the public website.
