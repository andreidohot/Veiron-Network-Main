# Veiron Community Bot

All-in-one Discord community bot for Veiron Network.

Current version: **7.19.0**.

The goal is one strong bot, not many disconnected bots. This release includes server setup, onboarding roles, permission control with visual admin UI, Veiron-styled embeds, moderation, tickets, live-config automod, anti-raid alerts, anti-spam, persistent audit logging, automated database backups, announcements, scheduled announcements, proposals/voting, welcome/goodbye events, XP/level tracking, server-only Shards social currency, custom tags, custom triggers, Lavalink music commands, saved playlists, audio filters, interactive now-playing controls, live Veiron chain status and reward queries via the configured adapter, Docker deployment and an installable React SPA admin dashboard.

## Current Modules

- Server setup: roles, categories, channels, permissions and starter messages.
- Role onboarding: buttons in `#roles` for `Veiron Member`, `Developer`, `Miner`, `Node Operator`, `Builder` and `Early Supporter`.
- Permission controller: one place for setup/admin/embed permissions, configurable from the admin dashboard with role and user rules.
- Embed factory: one Veiron-styled embed system used by commands and API.
- Admin dashboard: installable React + Vite PWA at `/admin/` with routed panels for overview, embeds, tickets, moderation, proposals, automod, anti-spam, audit log search, economy/leveling, permissions, music, wallet/payments, live blockchain status and settings.
- Admin panel API: protected HTTP API with JWT login, refresh tokens, per-route RBAC, TOTP 2FA and account lockout.
- PWA support: Android-installable manifest, iconset, Workbox service worker and cached read-only dashboard fallback.
- Web push foundation: VAPID-based subscription endpoints, test alerts, new-ticket alerts and critical automod alerts for subscribed admins.
- Moderation: warn, mute, unmute, purge and case history.
- Escalation moderation: kick and ban commands.
- Tickets: private support tickets with staff-only close flow.
- Automod: live-editable anti-scam keywords, custom regex rules, Discord invite blocking, mass-mention blocking and event logs.
- Anti-raid: configurable join-rate detection with persisted automod events, audit log entries and critical staff push alerts.
- Anti-spam: message-rate tracking with automatic timeout and audit log.
- Announcements: draft/list/publish/schedule flow with Veiron public status labels.
- Proposals: create/list/close proposals with Yes/No voting buttons.
- Community events: welcome/goodbye messages and optional auto role assignment.
- XP/Leveling: per-guild user XP profiles, message XP with cooldown anti-abuse, voice-time XP tracking, configurable level curves, automatic role rewards, `/rank` cards and `/leaderboard`.
- Social economy: server-only `Shards` points for daily/work rewards, transfers, leaderboards and cosmetic role shop items, clearly separated from VIRE with no blockchain or financial value.
- Custom tags: `/tag create`, `list`, `use` and `delete` backed by the shared DAL, with `{user}`, `{server}` and `{mentions}` variables.
- Custom triggers: `/trigger create`, `list` and `delete` for regex-based auto-responders with cooldowns, powered by existing tags.
- Music: Lavalink-backed player with Shoukaku, Docker Compose service, repo-managed Lavalink config, standalone `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop`, `/shuffle`, `/filter`, saved `/playlist` commands, interactive now-playing buttons and legacy `/music` subcommands.
- Audit logging: moderation, ticket, automod, anti-spam, announcement and proposal events are persisted through the shared DAL and can also be posted to `#mod-log`.
- Audit dashboard: MODERATOR+ users can search/filter persisted audit events by text, type, source, user IDs, channel and date range.
- Data access layer: selectable JSON or Prisma-backed store with the same module-facing interface.
- Local JSON storage: settings, cases, tickets, proposals, votes, announcements and automod events can be saved in `data/`.
- Prisma storage: database-backed generic collections for production migration.
- Ledger database isolation: separate Prisma schema and `DATABASE_URL_LEDGER` for wallet, balance and VIRE transaction data.
- Automated backups: cron-like scheduler plus manual `npm run backup`, covering main DB, ledger DB and optional JSON data, with S3-compatible upload support.
- Structured logging: Pino logger for runtime/admin/music events.
- Extended health check: `/health` reports bot, DB, Lavalink and chain-client status.
- Veiron chain status: `/veiron-status` reads block height, latest block hash, hash rate, active nodes and circulating supply from the configured chain adapter, with explicit mock/disabled fallback states.
- Veiron rewards: `/rewards` reads mining, staking and node rewards for the user's linked wallet address. It requires the future Phase 6 Discord <-> wallet link record before querying the chain adapter.
- Blockchain dashboard: `/admin/#blockchain` shows RPC status, uptime, latency, network metrics, block-height/latency charts and a visible alert when the configured node/RPC is down.
- Unit tests: Vitest coverage for config, storage/DAL and permission controller basics.
- Docker deployment: Dockerfile, Compose file and deployment notes.
- Status language guard: quick reminder for public wording that avoids false launch/investment claims.

## Planned Modules

- Embed builder with templates, preview and scheduled posts.
- Changelog publishing.
- Community analytics.
- Website/admin integration.
- Veiron testnet integrations when real APIs exist.

Dashboard shell placeholders are already present for future backend modules:

- Music: queue/player dashboard controls for the Lavalink module.
- Wallet/Payments: wallet linking, payment limits and VIRE transaction review.

The Blockchain Status panel is active and backed by `/api/blockchain/status`.

## What Setup Creates

Roles:

- Founder
- Core Team
- Admin
- Moderator
- Security Reviewer
- Developer
- Miner
- Node Operator
- Builder
- Partner
- Early Supporter
- Veiron Member
- Muted
- Bot

Categories and channels:

- START HERE: welcome, rules, announcements, roadmap, faq, roles
- COMMUNITY: general, romana, english, ideas, showcase, off-topic
- VEIRON DEVELOPMENT: dev-chat, protocol-design, rust-core, smart-contracts, wallet-explorer, docs-research, bugs
- MINING AND NODES: mining, node-operators, testnet-faucet, mining-pools
- ECOSYSTEM: dapps-games, nfts-assets, passport-identity, marketplace, encrypted-communication
- GOVERNANCE: proposals, governance-discussion, decision-log
- SUPPORT AND SAFETY: help, report-scam, security-disclosure
- ADMIN: admin-hq, mod-log, staff-tasks, security-room, incident-room
- VOICE: Community Lounge, Dev Room, Mining Room, Staff Voice

The setup is idempotent. Running `/setup-veiron confirm:true` again reuses existing roles and channels where possible instead of duplicating the server.

## Required Bot Permissions

When generating the invite URL in the Discord Developer Portal, include:

- Manage Roles
- Manage Channels
- Manage Server
- Manage Messages
- Moderate Members
- Kick Members
- Ban Members
- View Channels
- Send Messages
- Read Message History
- Use Slash Commands
- Connect
- Speak

For automod message scanning, enable the **Message Content Intent** in the Discord Developer Portal for the bot application.

Place the bot role above the roles it needs to create, edit or assign as XP level rewards. Discord will not allow the bot to manage roles above its own role.

## Setup

```bash
cd veiron-community/veiron-community-bot
cp .env.example .env
npm install
npm run dashboard:build
npm run check
npm run register
npm start
```

Required `.env` values:

```bash
DISCORD_TOKEN=replace_with_bot_token
DISCORD_CLIENT_ID=replace_with_application_client_id
DISCORD_GUILD_ID=replace_with_server_guild_id
LOG_LEVEL=info
```

Optional setup lock:

```bash
SETUP_ALLOWED_USER_IDS=123456789012345678,987654321098765432
```

If `SETUP_ALLOWED_USER_IDS` is empty, any server Administrator can run `/setup-veiron`.

## Admin Panel API

Keep this disabled until the bot runs behind HTTPS, a private tunnel or a trusted reverse proxy.

```bash
ADMIN_PANEL_ENABLED=false
ADMIN_PANEL_HOST=127.0.0.1
ADMIN_PANEL_PORT=8787
ADMIN_JWT_SECRET=replace_with_at_least_32_random_characters
ADMIN_JWT_TTL=15m
ADMIN_REFRESH_TOKEN_DAYS=14
ADMIN_TOTP_ENCRYPTION_KEY=replace_with_at_least_32_random_characters
ADMIN_LOCKOUT_MAX_ATTEMPTS=5
ADMIN_LOCKOUT_MINUTES=15
ADMIN_DEFAULT_EMAIL=admin@veiron.local
ADMIN_DEFAULT_PASSWORD=replace_with_long_initial_password
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:admin@veiron.local
BOT_DATA_DIR=./data
```

## Data Storage

The bot uses a shared DAL with the same interface for JSON and Prisma:

```text
list(collection)
add(collection, item)
update(collection, predicate, updater)
getSingleton(collection, defaults)
setSingleton(collection, value)
```

Default local mode:

```bash
STORAGE_DRIVER=json
BOT_DATA_DIR=./data
```

Prisma mode:

```bash
STORAGE_DRIVER=prisma
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./data/veiron-community.db
DATABASE_URL_LEDGER=file:./data/veiron-ledger.db
npm run prisma:generate
npm run prisma:generate:ledger
npm run prisma:push
npm run prisma:push:ledger
```

The Prisma adapter stores most module data in generic collection tables, so existing modules can move from JSON to Prisma without internal rewrites. XP profiles use a dedicated `XpProfile` table when `STORAGE_DRIVER=prisma`, while JSON mode stores them in the `xp-profiles` collection.

`DATABASE_PROVIDER` supports `sqlite`, `postgresql` and `mysql`. Prisma requires literal providers in schema files, so `npm run prisma:select` materializes the active main and ledger schemas before generation or push.

## Database Backups

Manual backup:

```bash
npm run backup
npm run backup:dry-run
```

Automated backup scheduler:

```bash
BACKUP_ENABLED=true
BACKUP_CRON=0 3 * * *
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=14
BACKUP_INCLUDE_JSON_DATA=true
```

`BACKUP_CRON` uses UTC 5-field cron syntax. SQLite backups copy `DATABASE_URL` and `DATABASE_URL_LEDGER` files, including WAL/SHM companions when present. PostgreSQL and MySQL backups use `pg_dump` and `mysqldump`, so those CLIs must exist in the runtime image/host.

S3-compatible upload:

```bash
BACKUP_S3_ENABLED=true
BACKUP_S3_ENDPOINT=https://s3.amazonaws.com
BACKUP_S3_REGION=auto
BACKUP_S3_BUCKET=veiron-backups
BACKUP_S3_PREFIX=veiron-community-bot
BACKUP_S3_ACCESS_KEY_ID=replace_me
BACKUP_S3_SECRET_ACCESS_KEY=replace_me
BACKUP_S3_FORCE_PATH_STYLE=true
```

The S3 target can be AWS S3, Cloudflare R2, MinIO, Wasabi or any compatible service that accepts AWS Signature v4 PUT uploads.

## XP and Leveling

The XP engine awards XP from messages and voice activity:

- message XP uses a per-user cooldown to reduce spam farming;
- voice XP is awarded by full minutes after the minimum voice session length;
- level curves are configurable from the admin dashboard Economy/Leveling panel;
- level role rewards can be configured from the same panel and are assigned automatically when users level up;
- supported curves are `linear`, `quadratic` and `exponential`;
- `ADMIN` or `SUPER_ADMIN` users can save XP settings through the dashboard.

User-facing XP commands:

```text
/rank [user]        Generates a Veiron-styled PNG rank card.
/leaderboard [limit] Shows the top XP profiles for the current guild.
```

Rank cards are generated with `@napi-rs/canvas` using a Blood Red, Charcoal and Mineral Gold visual style. The renderer uses a serif fallback when Cormorant Garamond is not available to the runtime.

## Server Social Currency

The bot includes an internal community currency named `Shards` by default. Shards are Discord server-only social points for minigames, leaderboards and community rewards.

Important separation rules:

- Shards are not VIRE.
- Shards are not stored in the isolated financial ledger database.
- Shards are not on-chain and have no financial value.
- The settings normalizer rejects `VIRE` as the social currency symbol to avoid confusion.

Commands:

```text
/daily                      Claims the daily Shards reward.
/work                       Earns a random Shards work reward.
/balance [user]             Shows a member's internal Shards balance.
/leaderboard-economy [limit] Shows the top Shards balances.
/shop list                  Lists cosmetic role shop items.
/shop buy item_id:<id>      Buys a cosmetic role with Shards.
/shards balance [user]      Shows a member's Shards balance.
/shards leaderboard [limit] Shows the top Shards balances.
/shards transfer            Transfers Shards between members if enabled.
/shards grant               Staff-only grant command.
/shards take                Staff-only removal command.
```

Admins can configure the social currency name, symbol, starter balance, daily/work rewards, cooldowns, transfer limits, cosmetic role shop items and disclaimer visibility from the Economy/Leveling dashboard panel.

## Custom Tags

Custom tags are reusable community responses stored through the same JSON/Prisma DAL as the rest of the bot.

Commands:

```text
/tag create name:<name> content:<text>  Staff-only creation.
/tag list                              Lists active tags.
/tag use name:<name> [mentions]        Sends the rendered tag.
/tag delete name:<name>                Staff-only soft delete.
```

Supported variables:

- `{user}` renders the member who used the tag.
- `{server}` renders the current Discord server name.
- `{mentions}` injects the optional `mentions` argument from `/tag use`.

## Custom Triggers

Triggers are automatic responders that watch normal Discord messages, match a simple case-insensitive regex and send an existing tag as the response.

Commands:

```text
/trigger create name:<name> pattern:<regex> tag:<tag> [cooldown_seconds]
/trigger list
/trigger delete name:<name>
```

Notes:

- Trigger creation and deletion require staff/admin bot management permission.
- Cooldown is global per trigger and persists in storage.
- Only the first matching trigger responds to a message, reducing spam.
- Trigger responses reuse tag variables. In auto-responses, `{mentions}` renders users/roles mentioned in the triggering message.

### JSON to Prisma Migration

After generating and pushing the Prisma schema, migrate existing JSON data with:

```bash
npm run migrate:json-to-prisma:dry-run
npm run migrate:json-to-prisma
```

The migration reads `data/*.json`, preserves existing item IDs and upserts:

```text
moderation-cases, tickets, proposals, announcements, automod-events, spam-events
```

Legacy `cases.json` is accepted and migrated into the current `moderation-cases` collection.

Open the dashboard:

```text
http://127.0.0.1:8787/admin/
```

The admin panel serves the built SPA from `src/dashboard/dist`. Run this after dashboard source changes and before enabling the admin panel:

```bash
npm run dashboard:build
```

For frontend-only development, use:

```bash
npm run dashboard:dev
```

The dashboard is installable on Android when served over HTTPS or localhost. It includes a Workbox service worker, manifest, iconset and read-only cached dashboard data for offline viewing.

Optional web push notifications require VAPID keys:

```bash
npm run push:vapid
WEB_PUSH_VAPID_PUBLIC_KEY=generated_public_key
WEB_PUSH_VAPID_PRIVATE_KEY=generated_private_key
WEB_PUSH_SUBJECT=mailto:admin@veiron.local
```

Current automatic push alerts:

```text
New ticket -> MODERATOR, ADMIN, SUPER_ADMIN
Critical automod event -> MODERATOR, ADMIN, SUPER_ADMIN
Large transaction alert -> reserved for the future ledger/payment module
```

Login with the seeded admin account. On first run, set `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD`; the bot creates a `SUPER_ADMIN` user if the users table is empty.

Admin authentication always uses the main Prisma database tables, even if community module storage still runs with `STORAGE_DRIVER=json`.

After login, enable 2FA from the dashboard settings section. The bot generates an otpauth URL and secret, then requires a valid authenticator code to confirm. When 2FA is enabled, `/auth/login` requires `totpCode`. Failed password or TOTP attempts increment account lockout counters.

Admin roles:

```text
SUPER_ADMIN, ADMIN, MODERATOR, VIEWER
```

Auth endpoints:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/totp/setup
POST /auth/totp/confirm
POST /auth/totp/disable
```

Protected endpoints and minimum roles:

```text
GET   /auth/me                  VIEWER
POST  /auth/totp/setup          VIEWER
POST  /auth/totp/confirm        VIEWER
POST  /auth/totp/disable        VIEWER
GET   /api/dashboard/summary    VIEWER
GET   /api/guild                VIEWER
GET   /api/settings             VIEWER
PATCH /api/settings             ADMIN
GET   /api/moderation/cases     MODERATOR
GET   /api/tickets              MODERATOR
GET   /api/automod/events       MODERATOR
GET   /api/anti-spam/events     MODERATOR
GET   /api/proposals            VIEWER
GET   /api/announcements        VIEWER
GET   /api/blockchain/status    VIEWER
GET   /api/push/public-key      VIEWER
POST  /api/push/subscriptions   VIEWER
DELETE /api/push/subscriptions  VIEWER
POST  /api/push/test            ADMIN
POST  /api/embeds/send          ADMIN
```

Use the access token returned by `/auth/login` as a Bearer token:

```bash
curl -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" http://127.0.0.1:8787/api/dashboard/summary
```

`/health` is intentionally not under `/api`; it returns HTTP `200` when all required components are healthy and `503` when the bot is degraded. It includes:

```text
bot, database, lavalink, chain
```

Chain client health modes:

```bash
VEIRON_CHAIN_MODE=disabled
VEIRON_CHAIN_MODE=mock
VEIRON_CHAIN_MODE=rpc
VEIRON_CHAIN_HEALTH_URL=https://rpc.example/health
VEIRON_CHAIN_RPC_URL=https://rpc.example
VEIRON_CHAIN_STATUS_PATH=/status
# or override the exact status endpoint:
VEIRON_CHAIN_STATUS_URL=https://rpc.example/status
VEIRON_CHAIN_REWARDS_PATH=/rewards/{address}
# or override the exact rewards endpoint:
VEIRON_CHAIN_REWARDS_URL=https://rpc.example/rewards/{address}
```

`/veiron-status` uses the same chain adapter. In `rpc` mode it expects a JSON response containing known network metrics such as `height`/`blockHeight`, `latestBlock.hash`, `hashRate`, `activeNodes`/`peerCount` and `circulatingSupply`/`supply.circulating`. Until a real Veiron RPC/testnet endpoint exists, use `VEIRON_CHAIN_MODE=mock` only for clearly marked simulated values.

`/rewards` uses a verified record from the shared DAL collection `wallet-links`, expected to be created by the future Phase 6 wallet-link flow. In `rpc` mode it expects reward metrics such as `mining`, `staking`, `node`, `claimable`, `pending`, `paid` or `totalRewards`. In `mock` mode the command marks the values as simulated.

Send an embed:

```bash
curl -X POST http://127.0.0.1:8787/api/embeds/send \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channelId":"123","title":"Veiron Update","description":"Draft update text.","color":"#d4af37"}'
```

## Commands

```text
/setup-veiron confirm:true
/send-embed channel:#announcements title:"Veiron Update" description:"Draft update text."
/warn user:@member reason:"Reason"
/mute user:@member minutes:30 reason:"Reason"
/unmute user:@member reason:"Reason"
/kick user:@member reason:"Reason"
/ban user:@member reason:"Reason" delete_message_days:1
/purge amount:20 reason:"Cleanup"
/cases user:@member
/ticket open topic:"Need help"
/ticket close
/ticket list
/announce publish title:"Update" body:"Draft update text." status:Draft
/announce draft title:"Draft" body:"Draft text."
/announce schedule title:"Update" body:"Text" scheduled_at:"2026-07-05T12:00:00.000Z"
/announce list
/proposal create title:"Idea" summary:"Proposal text." type:community
/proposal list
/proposal close id:"proposal-id"
/play query:"song name or URL"
/pause
/resume
/skip
/stop
/queue
/nowplaying
/volume percent:70
/loop mode:queue
/shuffle
/filter preset preset:bassboost
/filter status
/filter clear
/playlist create name:"focus" scope:user
/playlist add name:"focus" query:"song name or URL"
/playlist play name:"focus"
/music play query:"song name or URL"   # legacy grouped form still supported
/veiron-status                         # live chain adapter status: height, hash rate, nodes, supply
/rewards                               # mining/staking/node rewards for a linked wallet
```

## Music / Lavalink

The music module uses Lavalink through Shoukaku. The bot does not encode audio in the Discord process, and Docker Compose runs Lavalink as a separate service.

Primary slash commands:

- `/play query:"song name or URL"`
- `/pause`, `/resume`, `/skip`, `/stop`
- `/queue`, `/nowplaying`, `/volume percent:70`
- `/nowplaying` sends an interactive panel with Pause/Resume, Skip and Queue buttons
- `/loop mode:off|track|queue` or `/loop` to cycle modes
- `/shuffle`
- `/filter preset preset:bassboost|nightcore|vaporwave|karaoke|eightd|lowpass|off`
- `/filter status`, `/filter clear`
- `/playlist create|list|show|add|remove|play|delete`

The older grouped `/music ...` commands remain available for compatibility.

Audio filters use native Lavalink filters through Shoukaku. Supported presets are `bassboost`, `nightcore`, `vaporwave`, `karaoke`, `eightd`, `lowpass` and `off`.

Saved playlists are stored through the shared DAL, so they work with both JSON storage and Prisma-backed production storage. User playlists belong to the creator; server playlists are shared per guild and require community bot management permission to create, edit or delete.

```bash
MUSIC_ENABLED=true
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_DEFAULT_VOLUME=70
```

For Docker Compose, keep `LAVALINK_HOST=lavalink` or leave the Compose default in place. The Lavalink container mounts `lavalink/application.yml`, so source settings, buffering and logging stay versioned with the bot.

For multi-node deployments, set `LAVALINK_NODES` to a JSON array and skip the single-node host/port variables:

```json
[
  { "name": "primary", "url": "http://lavalink-a:2333", "auth": "password-a" },
  { "name": "backup", "url": "http://lavalink-b:2333", "auth": "password-b" }
]
```

`/health` reports configured Lavalink nodes, ready nodes, active players and queue count.

## Tests

```bash
npm run test
npm run check
```

`npm run check` runs syntax checks, builds the React dashboard and runs the Vitest suite.

## Honest Readiness Rating

This release is a usable alpha for a private or early community server.

Current realistic rating: **7.8/10**.

Remaining work before a public, serious crypto community:

- user management UI for admin accounts;
- backup and restore workflows;
- monitoring and uptime checks.

## Safety Notes

- Never commit `.env`.
- Never share the bot token.
- Do not present VIRE as an investment or guaranteed return.
- Do not mark mainnet, wallet, explorer, mining pool, DAO or marketplace as live until each one is implemented, verified and documented.
- Security disclosures should go to the private security channels.
