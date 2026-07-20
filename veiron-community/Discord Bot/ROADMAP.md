# Veiron Community Bot Roadmap

## Phase 0 - Foundation

- Single bot identity.
- Discord server setup module.
- Role onboarding buttons.
- Shared permission controller.
- Shared embed factory.
- Protected admin panel API.
- Shared DAL with JSON and Prisma drivers.
- Multi-provider Prisma setup and isolated ledger database.
- One-time JSON to Prisma migration path.
- Structured logging and extended health checks.
- Baseline unit tests for critical modules.
- JWT admin authentication with role-based access.
- TOTP 2FA and account lockout for admin authentication.
- Per-route RBAC for protected admin panel endpoints.
- React + Vite SPA dashboard with routed reusable panels.
- Android-installable PWA dashboard with offline read-only fallback.
- Optional web push foundation for admin alerts.
- Shell UI placeholders for Music and Wallet/Payments.
- Active Blockchain Status panel for chain monitoring.
- XP/Level schema and tracking foundation.
- Configurable XP level engine and Economy/Leveling admin controls.
- Rank cards and guild leaderboard commands.
- Configurable XP role rewards with automatic role assignment.
- Server-only Shards social currency foundation, separate from VIRE.
- Social economy commands: daily, work, balance, economy leaderboard and cosmetic role shop.
- Custom commands/tags with simple variables and DAL-backed storage.
- Auto-responders/custom triggers backed by tags, regex matching and cooldowns.
- Lavalink voice infrastructure with Docker service, repo-managed config and health status.
- Basic standalone music commands with loop and shuffle controls.
- Saved user/server music playlists backed by the shared DAL.
- Native Lavalink audio filter presets for music playback.
- Interactive Now Playing panel with Discord buttons.
- Complete permission controller UI with configurable runtime policies.
- Persistent audit log events backed by the shared DAL and searchable from the admin dashboard.
- Live Automod configuration with editable keywords, custom regex rules and anti-raid join-rate alerts.
- Automated main/ledger database backups with cron-like scheduling and S3-compatible uploads.
- Live `/veiron-status` command backed by the chain adapter for height, latest block hash, hash rate, nodes and circulating supply.
- `/rewards` command prepared for Phase 6 wallet links, with mining/staking/node reward reads through the chain adapter.
- Active Blockchain Status dashboard panel with uptime, RPC latency, charts and down-node alert state.

## Phase 1 - Community Operations

- Moderation commands: warn, mute, unmute, purge.
- Mod log channel integration.
- Ticket system.
- Case history.
- Anti-scam keyword/link guard.
- Discord invite blocking.
- Mass mention blocking.
- Announcement draft/list/publish flow.
- Scheduled announcements.
- Proposal creation and voting.
- Kick and ban commands.
- Welcome/goodbye messages.
- Anti-spam rate limits.
- Better role panels.

## Phase 2 - Admin Dashboard

- XP/Level user profile schema.
- Message XP tracking with cooldown anti-abuse.
- Voice-time XP tracking.
- Configurable level curve from the admin dashboard.
- `/rank` visual card and `/leaderboard` guild ranking commands.
- Auto-assigned role rewards at configured XP levels.
- Internal Shards wallets, transfers and admin configuration for future minigames.
- Daily/work Shards rewards and optional cosmetic role shop.
- Custom tag commands for reusable community responses.
- Custom trigger commands for automatic tag responses.
- SPA web UI for dashboard overview.
- SPA web UI for tickets, cases, proposals, automod events and embeds.
- Permission controller UI for setup users, manager roles and Discord permission toggles.
- Embed builder with preview.
- Channel/role management.
- Announcement publishing.
- Audit log view with filters for text, source, type, users, channel and date range.
- Live Automod controls for scam keywords, custom rules, invite blocking, mass mentions and anti-raid thresholds.
- PWA install flow and web push subscription controls.
- Placeholder shell for future backend panels.

## Phase 3 - Music

- Lavalink container managed through Docker Compose.
- Shoukaku client integrated in the bot process.
- Configurable single-node or multi-node Lavalink setup.
- Music health checks for configured nodes, ready nodes, players and queues.
- Basic playback commands: play, pause, resume, skip, stop, queue, nowplaying, volume, loop and shuffle.
- Saved playlists per user or server with database-backed storage.
- Audio filters: bassboost, nightcore, vaporwave, karaoke, 8D, low-pass and clear/status controls.
- Now Playing panel buttons for pause/resume, skip and queue preview.

## Phase 4 - Governance

- Security disclosure flow.
- Proposal workflow.
- Decision log publishing.
- Community polls.

## Phase 5 - Veiron Ecosystem Integrations

- Website/admin integration.
- Testnet status integration when real RPC exists.
- Faucet integration when testnet faucet exists.
- Explorer links when explorer exists.
- Mining pool stats when mining pool exists.

## Phase 5 - Production Hardening

- Database-backed storage hardening.
- Automated backups for main DB, ledger DB and JSON fallback data.
- Restore workflow.
- Structured event logs.
- Structured logs.
- Docker deployment.
- Health checks and monitoring.
