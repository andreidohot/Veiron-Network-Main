# Docker conversion status

## Implemented in this package

- portable Docker Compose architecture;
- local build and GHCR image modes;
- one shared Rust runtime image for node/RPC/indexer/control/pool;
- web-based initial setup and operations UI;
- automatic secret generation;
- controller, standalone and agent roles;
- Cloudflare Tunnel and direct-DNS automation;
- separate service subdomains;
- PostgreSQL provisioning;
- Caddy routing and control/Prometheus authentication;
- Prometheus, Alertmanager, Grafana, Loki, Alloy, exporters and starter dashboard;
- Discord and Telegram alert relay plus SMTP email alerts;
- local encrypted backup and optional R2/S3 upload;
- operator-triggered update, health gate and rollback;
- migration script for existing `/var/lib/veiron` state;
- multi-architecture GHCR workflow.

## Still requires Rust product work

The Docker layer cannot truthfully invent capabilities absent from the current binaries:

1. `veiron-vps-admin` still persists fleet state using its current storage model.
2. `veiron-indexer` remains filesystem-backed.
3. The fleet invitation UI still generates the legacy Ubuntu installer command. The Docker web installer fully supports `agent` role with controller URL, single-use token and P2P seeds, but invitation command generation still needs a Rust/UI migration.
4. Native Prometheus `/metrics` endpoints are not present on every Veiron binary; blackbox monitoring is used for HTTP health until instrumented metrics are added.
5. A restricted socket proxy should replace direct Docker socket access after the first operational version.

The runtime image applies `docker/patches/0001-admin-docker-runtime.patch`, which permits Docker-internal RPC addressing and derives service state from health payloads rather than `systemctl`. The build fails if upstream source drift prevents that patch from applying.

These are product-code migrations, not Compose configuration defects.
