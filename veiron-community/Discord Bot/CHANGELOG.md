# Changelog

## 7.19.0

- Added the active Blockchain Status panel in the React admin dashboard.
- Added `/api/blockchain/status` with VIEWER RBAC for chain health, live network metrics, uptime and history.
- Added DAL-backed blockchain monitoring snapshots for block-height and RPC-latency charts.
- Added dashboard alert state for disabled monitoring and down/unhealthy RPC nodes.
- Added tests for blockchain monitor metrics, history retention and alert generation.

## 7.18.0

- Added `/rewards` for mining, staking and node rewards tied to a linked Veiron wallet.
- Added a wallet-link lookup contract using the shared DAL `wallet-links` collection for future Phase 6 integration.
- Extended the Veiron chain client with `getRewardsForAddress(address)`.
- Added configurable `VEIRON_CHAIN_REWARDS_URL` / `VEIRON_CHAIN_REWARDS_PATH` for rewards endpoints.
- Kept wallet-link-required, disabled and mock states explicit so rewards are not presented as live until the adapter and wallet link exist.
- Added tests for rewards endpoint normalization, explicit rewards URLs, missing wallet addresses and wallet-link helper behavior.

## 7.17.0

- Added live `/veiron-status` output backed by the Veiron chain client.
- Added chain status normalization for block height, latest block hash, hash rate, active nodes and circulating supply.
- Added configurable `VEIRON_CHAIN_STATUS_URL` / `VEIRON_CHAIN_STATUS_PATH` for RPC/API status endpoints.
- Kept disabled and mock adapter states explicit so simulated data is never presented as live network data.
- Added tests for disabled, mock, RPC normalization, explicit status URL routing and invalid RPC responses.

## 7.16.0

- Added automated database backups with a cron-like runtime scheduler.
- Added manual `npm run backup` and `npm run backup:dry-run` commands.
- Added backup coverage for main DB, ledger DB and optional JSON data.
- Added SQLite file backup support plus PostgreSQL/MySQL dump command integration.
- Added S3-compatible external upload support using AWS Signature v4 PUT requests.
- Added backup retention cleanup and Docker Compose `./backups` volume.
- Added tests for backup config, cron matching, archive creation, dry-run, S3 request signing and scheduler execution.

## 7.15.0

- Added live Automod configuration from the React admin dashboard.
- Added `/api/automod/settings` for ADMIN-protected runtime updates without redeploy.
- Added editable scam keyword lists and custom regex Automod rules.
- Added configurable anti-raid join-rate detection on `guildMemberAdd`.
- Persisted anti-raid alerts into Automod events and Audit Log.
- Added critical staff push alerts for anti-raid join spikes.
- Added tests for Automod normalization, live custom rules, anti-raid thresholds, cooldowns and RBAC coverage.

## 7.14.0

- Added DAL-backed persistent audit events in the `audit-events` collection.
- Extended `writeAuditLog` so moderation, tickets, automod, anti-spam, announcements and proposals save searchable audit metadata.
- Added `/api/audit/events` with filtering by text, type, source, users, channel, date range and limit.
- Added an Audit Log panel in the React admin dashboard for MODERATOR+ users.
- Added audit event counts to the admin overview summary.
- Added tests for audit persistence, normalization, filtering/search and admin RBAC coverage.

## 7.13.0

- Added a complete Permission Controller panel in the React admin dashboard.
- Added `/api/permissions` GET/PATCH endpoints protected by admin panel RBAC.
- Added configurable permission policies for setup user IDs, manager role IDs, manager role names, Administrator and Manage Server.
- Connected saved permission policies to the runtime `PermissionController`.
- Added role picker UI using live Discord guild roles from the admin API.
- Added tests for admin RBAC coverage and configurable permission policies.

## 7.12.0

- Added an interactive Now Playing Discord button panel.
- Attached Pause/Resume, Skip and Queue buttons to `/nowplaying` responses.
- Added button interaction routing through `veiron_music:*` custom IDs.
- Reused the existing music manager for button controls instead of creating separate control paths.
- Added tests for now-playing button action routing and component generation.

## 7.11.0

- Added native Lavalink audio filter presets.
- Added `/filter preset`, `/filter status` and `/filter clear`.
- Added legacy `/music filter` compatibility.
- Added presets for bassboost, nightcore, vaporwave, karaoke, 8D and low-pass.
- Added active filter display in queue and now-playing embeds.
- Extended music health details with active filtered queue count.
- Added tests for audio filter preset normalization and payload generation.

## 7.10.0

- Added DAL-backed saved music playlists in the `music-playlists` collection.
- Added `/playlist create`, `list`, `show`, `add`, `remove`, `play` and `delete`.
- Added user playlists per guild and shared server playlists per guild.
- Restricted server playlist edits to community bot managers.
- Added saved playlist playback through the existing Lavalink music manager.
- Added tests for playlist normalization, ownership, server scope, track add/remove and soft delete.

## 7.9.0

- Added standalone music commands: `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop` and `/shuffle`.
- Kept legacy `/music ...` subcommands compatible with the same music manager.
- Added track loop and queue loop modes.
- Added queue shuffle support.
- Extended music health details with active loop queue count.
- Added unit tests for music command routing, loop behavior and shuffle behavior.

## 7.8.0

- Added repo-managed Lavalink `application.yml` for repeatable music infrastructure.
- Mounted the Lavalink config into the Docker Compose service.
- Hardened Lavalink node configuration with injectable env parsing and validation for single-node and multi-node deployments.
- Extended Lavalink health details with configured node count, ready node count, player stats and queue count.
- Added tests for Lavalink node configuration parsing and validation.

## 7.7.0

- Added `/trigger create`, `/trigger list` and `/trigger delete`.
- Added DAL-backed `custom-triggers` storage with soft delete, usage counters and persistent cooldown state.
- Added simple case-insensitive regex matching for auto-responses.
- Added message responder that sends existing custom tags when a trigger matches.
- Added cooldown handling so triggers do not spam channels.
- Added tests for trigger lifecycle, regex validation, cooldowns and message processing.

## 7.6.0

- Added `/tag create`, `/tag list`, `/tag use` and `/tag delete`.
- Added DAL-backed `custom-tags` storage with soft delete and usage counters.
- Added simple tag variables: `{user}`, `{server}` and `{mentions}`.
- Added staff/admin permission checks for tag creation and deletion.
- Added tests for tag normalization, rendering, lifecycle and usage tracking.

## 7.5.0

- Added standalone economy commands: `/daily`, `/work`, `/balance` and `/leaderboard-economy`.
- Added optional `/shop list` and `/shop buy` for cosmetic role purchases with Shards.
- Added configurable daily reward, work reward range and cooldowns.
- Added cosmetic role shop configuration to the Economy/Leveling dashboard panel.
- Added wallet cooldown fields, shop item normalization and purchase transaction records.
- Added tests for daily cooldowns, work rewards, shop purchases and duration formatting.

## 7.4.0

- Added server-only `Shards` social currency, explicitly separated from VIRE.
- Added `/shards balance`, `/shards leaderboard`, `/shards transfer`, `/shards grant` and `/shards take`.
- Added social economy wallets and transaction records in DAL-backed storage.
- Added Economy/Leveling dashboard controls for currency name, symbol, starter balance, transfers and disclaimer visibility.
- Added backend guard that rejects `VIRE` as the social currency symbol.
- Added unit tests for economy settings, wallets, transfers and leaderboard formatting.

## 7.3.0

- Added configurable XP level role rewards in the Economy/Leveling dashboard panel.
- Exposed assignable Discord roles through the admin guild API.
- Added automatic role assignment when users level up through message or voice XP.
- Added idempotent XP role reward helpers and unit tests.

## 7.2.0

- Added `/rank` slash command with optional user lookup.
- Added Veiron-styled PNG rank cards generated with `@napi-rs/canvas`.
- Added `/leaderboard` slash command with configurable result limit.
- Added rank/leaderboard sorting helpers and tests.
- Added PNG render smoke test for the visual rank card.

## 7.1.0

- Added configurable XP level engine with `linear`, `quadratic` and `exponential` curves.
- Added level progress metadata for XP awards from messages and voice sessions.
- Added `PATCH /api/xp/settings` protected by `ADMIN` role.
- Replaced the Economy/Leveling dashboard placeholder with real XP settings controls.
- Added tests for level formulas, XP settings normalization and the new RBAC route.

## 7.0.0

- Added XP/Leveling foundation with per-guild user profiles.
- Added message XP tracking with configurable cooldown anti-abuse.
- Added voice session tracking with configurable minimum duration and XP per minute.
- Added dedicated Prisma `XpProfile` models for sqlite, PostgreSQL and MySQL schemas.
- Updated the Prisma DAL so `xp-profiles` uses the dedicated table when available and JSON remains the fallback.
- Added unit tests for message cooldowns, voice XP and Prisma XP profile storage.

## 6.5.0

- Added dashboard shell routes for Economy/Leveling, Music, Wallet/Payments and Blockchain Status.
- Added reusable roadmap placeholder panels for future backend-backed dashboard modules.
- Added navigation entries for planned Phase 2/3/5/6 modules without exposing fake backend data.

## 6.4.0

- Added PWA manifest, Android install metadata and iconset for the admin dashboard.
- Added Workbox service worker through `vite-plugin-pwa`.
- Added offline read-only dashboard fallback using cached dashboard data.
- Added web push notification subscription endpoints backed by the shared DAL.
- Added VAPID configuration and `npm run push:vapid`.
- Added dashboard controls for PWA install, push subscription and admin test notification.
- Added automatic web push alerts for new tickets and critical automod events.

## 6.3.0

- Rebuilt the admin dashboard as a React + Vite SPA.
- Added hash-based dashboard routing for overview, embeds, tickets, moderation, proposals, automod, anti-spam and settings.
- Added reusable React panel components and a shared dashboard API client.
- Added role-aware dashboard loading so `VIEWER` users do not request `MODERATOR` endpoints.
- Added `dashboard:dev`, `dashboard:build` and `dashboard:preview` scripts.
- Updated Docker build to compile the dashboard SPA before runtime.

## 6.2.0

- Added explicit per-route RBAC requirements for protected admin panel endpoints.
- Changed admin API middleware so `/api` only authenticates globally; each endpoint now declares its own minimum role.
- Added a route-role contract map and unit tests for supported admin roles.
- Documented minimum roles for admin API and self-service 2FA routes.

## 6.1.0

- Added TOTP 2FA setup, confirm and disable flows for admin accounts.
- Added encrypted TOTP secret storage with `ADMIN_TOTP_ENCRYPTION_KEY`.
- Added login lockout after repeated failed password or TOTP attempts.
- Added admin dashboard controls for 2FA setup and confirmation.
- Added unit tests for TOTP login requirements and account lockout.

## 6.0.0

- Replaced static admin panel token auth with real JWT login.
- Added Prisma `User` and `RefreshToken` tables.
- Added bcrypt password hashing and refresh-token rotation.
- Added admin roles: `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `VIEWER`.
- Added `/auth/login`, `/auth/refresh`, `/auth/logout` and `/auth/me`.
- Updated dashboard login UI to use email/password and access/refresh tokens.

## 5.4.0

- Added Vitest test suite.
- Added unit tests for `config.js`, `JsonStore`/Prisma DAL contract and `PermissionController`.
- Added `npm run test`.
- Extended `npm run check` to run the unit test suite.

## 5.3.0

- Added Pino structured logging.
- Added centralized process-level error handling and admin-panel route error middleware.
- Extended `/health` with bot, database, Lavalink and chain-client status.
- Added chain-client health adapter with `disabled`, `mock` and `rpc` modes.
- Added store health checks for JSON and Prisma drivers.

## 5.2.0

- Added one-time JSON to Prisma migration script.
- Preserves existing item IDs for moderation cases, tickets, proposals, announcements, automod events and spam events.
- Added dry-run mode and collection selection for migration safety.
- Added legacy `cases.json` alias into the current `moderation-cases` collection.

## 5.1.0

- Added `DATABASE_PROVIDER=sqlite|postgresql|mysql` schema selection.
- Split Prisma into main and ledger schema groups.
- Added `DATABASE_URL_LEDGER` for isolated wallet, balance and VIRE transaction data.
- Added ledger Prisma client generation path and helper.
- Added provider-specific schema templates and Prisma select/generate/push scripts.

## 5.0.0

- Added a shared data access layer with selectable `STORAGE_DRIVER=json|prisma`.
- Added `PrismaStore` with the same `list/add/update/getSingleton/setSingleton` interface as `JsonStore`.
- Added generic Prisma models for collection items and singletons.
- Switched bot startup to `createStore()` so existing modules can use JSON or Prisma without internal rewrites.
- Added Prisma scripts and Docker client generation.

## 4.2.0

- Added a Lavalink-backed music module using Shoukaku.
- Added `/music play`, `queue`, `nowplaying`, `skip`, `pause`, `resume`, `stop`, `leave` and `volume`.
- Added `GuildVoiceStates` intent support for voice channel playback.
- Added Docker Compose Lavalink service and music environment variables.

## 4.1.1

- Standardized release versioning to `MAJOR.MEDIUM.MINOR`.
- Set package version to `4.1.1`.
- Added `VERSIONING.md`.
- Removed historical release labels from project documentation.

## 4.1.0

- Added Docker deployment files.
- Added anti-spam rate tracking with automatic timeout.
- Added welcome/goodbye community events.
- Added kick and ban moderation commands.
- Added scheduled announcements.
- Extended dashboard and admin API for anti-spam events.
