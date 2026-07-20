# Veiron Docker Deployment Control Plane

**Status: Mainnet Candidate / Prototype. This is not a live-mainnet declaration.**

This stack converts the Ubuntu/systemd VPS control plane into a portable Docker Compose deployment for Linux hosts.

## What is included

Default deployment:

- Veiron validation/bootstrap node;
- Veiron RPC gateway;
- filesystem index refresh worker;
- existing Veiron fleet admin service;
- web setup and operations controller;
- PostgreSQL 16;
- Caddy reverse proxy;
- Prometheus and Alertmanager;
- Grafana;
- Loki and Grafana Alloy;
- cAdvisor, node-exporter, blackbox-exporter and PostgreSQL exporter;
- scheduled encrypted backups;
- configurable Discord, Telegram and SMTP alert delivery.

Optional profiles:

- `cloudflare` — remotely managed Cloudflare Tunnel;
- `pool` — Veiron mining-pool coordinator;
- `backup` — recurring local/R2 backup agent;
- `tools` — one-shot Cloudflare, update and rollback tools.

No miner, wallet seed, signing key or recovery phrase is installed.

## Important storage rule

The blockchain consensus state is not moved into PostgreSQL.

Current services use persistent native directories:

```text
state/data/chain
state/data/mempool
state/data/indexer
state/data/node
```

PostgreSQL is provisioned for control-plane metadata and the planned PostgreSQL-backed indexer migration. The current Rust indexer remains filesystem-backed until its storage adapter is implemented.

## Security warning: Docker socket

The web operations service mounts:

```text
/var/run/docker.sock
```

This gives the service host-equivalent control. Treat access to the setup/operations interface like root access:

- keep the one-time setup token private;
- use Cloudflare Access or another identity layer in front of `control.DOMAIN`;
- do not expose port `8080` permanently;
- rotate credentials if the operations container is compromised;
- migrate later to a restricted Docker socket proxy or separate host agent.

## First installation

Requirements:

- Linux host;
- Docker Engine;
- Docker Compose v2;
- ports 80/443 if direct DNS is used;
- TCP 20787 reachable for Veiron P2P;
- outbound HTTPS access.

Run:

```bash
cd veiron-release/vps-control-plane
sudo ./scripts/install-docker-stack.sh
```

The script starts only the web installer and prints a URL similar to:

```text
http://SERVER_IP:8080/?token=ONE_TIME_TOKEN
```

Enter the required values and select **Validate and deploy**.

After the full stack is healthy, close the public bootstrap port:

```bash
docker compose -f installer.compose.yaml down
```

Ongoing operations remain available at `https://control.DOMAIN/setup/`.

## Recommended hostnames

```text
control.example.com      control panel and /setup /ops
rpc.example.com          public RPC and mining submission endpoints
fleet.example.com        sanitized fleet endpoint
grafana.example.com      Grafana
prometheus.example.com   Prometheus behind Basic Auth
pool.example.com         optional mining pool
node.example.com         DNS-only P2P endpoint on TCP 20787
```

## Cloudflare modes

### Tunnel

The installer creates or reuses a remotely-managed Cloudflare Tunnel, writes ingress configuration through the Cloudflare API, creates proxied CNAME records and stores the tunnel token as a file secret.

Required API token permissions:

- Cloudflare Tunnel / Connector: Edit;
- Zone DNS: Edit.

P2P remains a DNS-only A record because normal Cloudflare HTTP proxying is not a transparent public TCP transport for blockchain peers.

### Direct DNS

The installer creates proxied A records for HTTP services and a DNS-only A record for P2P. Caddy handles HTTPS.

### Disabled

No Cloudflare API calls are made. Configure DNS manually.

## Stack lifecycle

Status:

```bash
docker compose --env-file .env -f compose.yaml ps
```

Logs:

```bash
docker compose --env-file .env -f compose.yaml logs -f veiron-node veiron-rpc veiron-control
```

Health:

```bash
./scripts/health-check-docker.sh
```

Pool:

```bash
docker compose --env-file .env -f compose.yaml --profile pool up -d
```

Cloudflare Tunnel:

```bash
docker compose --env-file .env -f compose.yaml --profile cloudflare up -d cloudflared
```

## Updates and rollback

Use the web operations page or:

```bash
docker compose --env-file .env -f compose.yaml \
  --profile tools run --rm updater --version 1.2.3
```

The updater:

1. stores the current `.env`;
2. runs a complete backup;
3. pulls versioned GHCR images or rebuilds locally;
4. starts the stack;
5. runs health checks;
6. restores the previous configuration if verification fails.

Rollback:

```bash
docker compose --env-file .env -f compose.yaml \
  --profile tools run --rm updater --rollback
```

Use immutable version tags in production. A mutable `latest` tag cannot guarantee binary rollback.

## Backups

The backup contains:

- PostgreSQL custom-format dump;
- Compose/configuration files;
- encrypted secrets archive;
- optional consistent chain/index snapshot;
- SHA-256 checksums;
- optional Cloudflare R2/S3 upload.

Run immediately:

```bash
docker compose --env-file .env -f compose.yaml \
  --profile backup run --rm backup-agent /opt/veiron-backup/backup-now.sh
```

A consistent chain snapshot briefly stops node, RPC and indexer by default. Disable this only when accepting a best-effort live snapshot.

## Migration from the legacy systemd installation

Stop legacy services first:

```bash
sudo systemctl stop veiron-indexer-refresh.timer veiron-rpc veiron-node veiron-vps-admin
```

Copy state:

```bash
sudo ./scripts/migrate-systemd-data.sh
```

The source folders are preserved. Do not delete the legacy data until the Docker stack passes health checks and a backup has been tested.

## Validation

```bash
./scripts/validate-stack.sh
```

For a full image build:

```bash
docker compose --env-file .env -f compose.yaml build
```

For Rust release gates, continue using the repository's existing test and release scripts.

## Known limitation

The existing `veiron-vps-admin` fleet enrollment command generator was designed for the Ubuntu bundle. Docker deployment is operational locally, but the admin server still needs a dedicated code change so invitations generate Docker-agent enrollment commands instead of the legacy `install.sh` command.

Until that change is merged, add remote Docker nodes by running this same stack in `agent` role and passing the fleet controller URL, single-use enrollment token and controller P2P seed through the web installer. The container writes the token with private permissions, enrolls once, replaces it with the per-node credential and reports telemetry on the configured interval.
