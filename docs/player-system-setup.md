# Big Bang Arcade player services — first release

Implemented November 10, 2026. This uses the arcade's existing Supabase project, `t1-vendetta` (`fspcfzxtohaaeoudrack`). No project, paid branch, analytics subscription, or billing upgrade was created.

## Activate Google and Facebook

The owner chose to connect provider credentials in Supabase. The app reads Supabase's enabled-provider settings and hides providers that are off. Do not paste client secrets into this repository or the browser app.

1. Open [Supabase Authentication / Providers](https://supabase.com/dashboard/project/fspcfzxtohaaeoudrack/auth/providers).
2. For Google, create or use a Web application OAuth client in your Google Cloud project. Configure the consent screen for Big Bang Arcade, add the client ID and secret to Supabase's Google provider, then enable it. Use minimal identity scopes; no contacts or unrelated account access.
3. In Google's OAuth client, add the redirect URI `https://fspcfzxtohaaeoudrack.supabase.co/auth/v1/callback`. Use `https://bigbangarcade.com` as the arcade origin if requested.
4. For Facebook, configure Facebook Login for a Meta developer app, add the same Supabase callback URI, and enter the app ID and secret in Supabase's Facebook provider. Complete Meta's production-access requirements; development apps may only admit app roles/test users. Supabase's Facebook guide requires the email permission.
5. In [Supabase URL configuration](https://supabase.com/dashboard/project/fspcfzxtohaaeoudrack/auth/url-configuration), **add** `https://bigbangarcade.com/?account=return` to the redirect allow-list. Keep the existing T1 Vendetta redirect URLs and default site URL; this is a shared project. The arcade passes its redirect explicitly.
6. Reload the arcade, enter, then click your player name / **Sign In**. The new buttons appear automatically. Complete the adult account setup, choose a nickname, and optionally claim the legacy guest profile on that browser.
7. Test with a non-admin account, sign out, and sign back in on another browser. Verify that tokens and the cloud save belong to the same player. Test private browsing, declined permission, and logout.

Primary setup references: [Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Facebook](https://supabase.com/docs/guides/auth/social-sign-in/auth-facebook), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

Apple, Discord, Microsoft and LinkedIn buttons are also prepared and appear only if their corresponding providers are enabled. ChatGPT login is not configured; it requires separate provider access. Email/password login is provided for **existing** accounts. Public email signup/password recovery is not launched: configure production SMTP first rather than relying on Supabase's limited default email service.

## What works in this release

- The entrance remains only the Big Bang Arcade logo, nickname and Enter button.
- New guests store their nickname locally and can play without creating online profiles. Older online guest records remain accessible through their existing browser secret.
- A linked adult account has one stable arcade player ID. It restores tokens, earned totals, closet, scores and avatar across browsers. Explicit legacy claims preserve existing IDs and balances; the old guest secret stops working once claimed.
- Existing per-game community leaderboards are retained. Linking an account does not create duplicate score records. Scores are still client-reported, not competition-grade verified scores.
- Blankman cloud saves are opt-in separately from analytics. Upload the current device's save once to enable automatic updates. Restoring is explicit; a differing cloud/device save never silently replaces the other. Revisions reject concurrent overwrites. Restored saves do not award tokens.
- Gameplay activity is off by default and restricted to linked adult accounts in this first release. Opting out deletes the player's activity while retaining scores and saves.
- All five cabinet launches can be counted for opted-in players. Existing score/level messages are accepted only from the active game's iframe and configured origin.
- Blankman adds ready, level start/completion, pause/resume, lives lost, helper calls, equipment changes, victory and game-over events. Active time is estimated from visible, unpaused play with recent keyboard, touch or gamepad input. Other games need their own adapter for comparable active-time and detailed-event coverage.
- Private lobbies use 12-character invite codes, allow eight recent members, and expire after 24 hours. They show nicknames and a common game selection. No lobby chat or synchronized multiplayer was added.
- The owner-only **Arcade Pulse** dashboard shows player counts, linked accounts, opt-ins, cloud saves and 30-day gameplay/event totals. Existing `t1_private.control_owners` membership controls access; no extra owner was added.
- Players can export their arcade data, turn off activity sharing, and sign out on a shared device. Full Auth-user deletion and parent-managed child accounts remain separate follow-up work.

## Data and access

New private tables: `game_saves`, `game_runs`, `game_events`, `lobbies`, `lobby_members`. Existing players gain `user_id`, `avatar`, consent and adult-setup fields. All tables have RLS enabled and no direct client grants. Private functions enforce ownership; the public wrappers are security invoker functions. Their private implementations use a fixed empty search path and validate identity before operating.

The web API forwards the signed-in player's JWT to Supabase. PostgREST verifies it; user IDs are never trusted from request bodies. There is no service-role key in browser code or these server endpoints. Account links are based on verified Auth identity and, when claiming a guest, proof of the old guest secret. Public nicknames never come from an OAuth legal name automatically.

Telemetry accepts only named events and bounded game fields. It never stores raw snapshots, exact controller inputs, passwords, email addresses or arbitrary event text. Session and event IDs deduplicate retries. Limits include 100 session starts per player per day, 30 events per batch, 120 events per run per minute, and 2,000 events per run. Event queues are bounded to 120 events and dropped on sign-out/opt-out; they are not persisted across users.

The `bba-player-retention` database job runs daily at 05:23 UTC, deleting activity older than 90 days and expired lobbies. Events cascade with their runs. A closed browser may leave a session without an explicit end; active time and dashboard counts are estimates, not proof of attention or gameplay integrity.

The project security advisor reported no new warnings for this design. Informational “RLS enabled, no policy” findings are expected for deliberately inaccessible private tables. The existing project-wide leaked-password protection warning remains; review it when enabling password-based public signup. [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The dependency audit also reports pre-existing advisories in the legacy `@vercel/blob` dependency chain. The current deployment uses Supabase, not that storage path. Upgrading/removing that fallback should be assessed separately rather than silently breaking configured legacy installations.

## Development and verification

`npm run build:player` rebuilds the locally bundled Supabase client from the exact locked version. No runtime CDN dependency is needed. `npm test` runs server-boundary, telemetry, save, observer and existing arcade tests.

`tests/player-database.sql` exercises the real Supabase functions in a rolled-back transaction: account recovery, legacy balance preservation, revoked guest secret, cross-user save/run isolation, stale save rejection, private lobby membership, dashboard authorization, event deduplication and consent erasure. Do not remove its rollback.

`npm run test:browser` uses Chrome with locally mocked sign-in/API responses; it does not create real accounts or rewards. Set `ARCADE_URL` to the local preview or deployed site. It checks guest desktop/mobile entry, linked player UI, cloud conflicts, lobbies, Blankman play and events, message-source rejection, opt-out, logout and owner visibility. Real Google/Facebook consent flow testing waits for provider activation.

Do not blindly replay the migration on another Supabase project: it builds on the existing `bba_private` schema and owner/content functions. The pre-change definitions are backed up outside the published site. If a web rollback is needed, revert the frontend/API commit; the added private tables can remain without losing player data. Linked-account security deliberately invalidates old guest secrets, so do not revert the identity resolver after real players have linked accounts.

## Next steps

1. Owner enables Google/Facebook and confirms a real sign-in/return flow.
2. Add game adapters and cloud-save validation to the remaining games, one at a time; external game domains are not automatically instrumented by the arcade shell.
3. Add per-mode/season leaderboards and authoritative score validation before competitions or real prize claims.
4. Add a reviewed parent-managed account flow before expanding connected features to children; retain local guest play.
5. Add complete account deletion, password recovery, storage/usage alerts and longer-term minimized aggregate metrics as account adoption grows.
