# Veiron VPS Control Plane

**Status: Mainnet Candidate / Prototype. This is not a live-mainnet declaration.**

This is the only active Ubuntu VPS bundle. `veiron-release/vps/` is legacy and
frozen; do not copy new product, deployment, or security changes into it.

## Installed Components

- Non-mining Veiron full validation/bootstrap node.
- Loopback-only RPC gateway exposed through HTTPS.
- Read-only indexer and refresh timer.
- Loopback-only `veiron-vps-admin` agent/controller.
- Authenticated web panel at `https://DOMAIN/control/`.
- Sanitized fleet endpoint at `https://DOMAIN/fleet/status`.
- Token-protected VPS enrolment and telemetry reports.
- Optional loopback mining-pool coordinator exposed at `/pool/` only when enabled explicitly.

The panel reports machines and direct validated-peer observations, not human users. Fleet totals are controller observations, not a guaranteed global network census. Enrolment does not grant consensus, wallet, mining or remote shell rights.

## Build Locally

```bash
bash scripts/release/build-vps-control-plane-bundle.sh
```

Output: `release-artifacts/veiron-vps-control-linux-x86_64.tar.gz` and its SHA-256 file.

## Automated GitHub Release

The VPS control plane can ship inside the complete product candidate release (`vVERSION-candidate.N`) or through its independent `vps-control-vVERSION-rc.N` sequence. The updater selects only releases that contain the exact control-plane archive and companion SHA-256 asset.

On an authenticated Windows operator workstation, one command scans, commits, rebases from `origin/main`, runs the Rust release gates, pushes `main`, creates the next RC tag, waits for GitHub Actions and verifies the published assets:

```powershell
.\scripts\github\sync-and-release-vps.ps1 -Message "release(vps): describe the change"
```

Linux operators may run:

```bash
./scripts/github/sync-and-release-vps.sh "release(vps): describe the change"
```

GitHub CLI authentication remains in the operating-system credential store. Never put a GitHub token in this repository or pass one as a script argument. Merge conflicts and failed security/release checks stop publication instead of being resolved or bypassed automatically.

For a normal verified commit/pull/push that must not create a VPS release, use:

```powershell
.\scripts\github\sync-and-release-vps.ps1 -SyncOnly -Message "chore: describe the change"
```

The release mode also refuses to create a second VPS tag for the same commit.

## Install the First Controller

DNS must resolve to the VPS before installation. Ports `80`, `443` and `20787` must be reachable.

For the full step-by-step install and uninstall workflow, see [INSTALL_AND_UNINSTALL.md](INSTALL_AND_UNINSTALL.md).

The recommended entry point is the interactive installer:

```bash
sudo ./veiron-vps-control/vps-control-plane/install-interactive.sh
```

It will prompt for the domain, email, pool wallet address and the other values required to run the VPS control plane.

```bash
tar -xzf veiron-vps-control-linux-x86_64.tar.gz
sudo ./veiron-vps-control/vps-control-plane/install.sh \
  --bundle ./veiron-vps-control-linux-x86_64.tar.gz \
  --node-name bootstrap-eu-1 \
  --domain node1.example.org \
  --email operator@example.org \
  --release-bundle-url https://github.com/OWNER/REPOSITORY/releases/download/TAG/veiron-vps-control-linux-x86_64.tar.gz
```

The installer prints a generated Basic Auth password once. Store it in an operator password manager.

If the VPS already uses 1Panel, OpenResty, Caddy or another reverse proxy on ports `80/443`, add `--external-proxy`. This preserves the existing proxy and certificate services, performs local health checks, and leaves `/control/`, `/fleet/` and optional `/pool/` routing to the operator. Do not run the managed-Nginx mode beside an existing listener on those ports.

To enable the reference pool role on one dedicated coordinator, add `--enable-pool --pool-address vire1...`. Do not enable the role on every validation VPS. Pool-wallet signing remains separate from the public service.

## Uninstall

To remove the control plane from a host, run:

```bash
sudo ./veiron-vps-control/vps-control-plane/uninstall.sh
```

Use `--purge-data` to remove persisted chain/index/mempool state and `--purge-cert` to remove managed TLS certificates.

## Add Another VPS

Open `/control/`, choose **Add VPS**, and enter the new VPS DNS name and ACME email. Run the generated command on the new Ubuntu host. It contains a 15-minute, single-use enrolment token. After enrolment the agent replaces that token with a unique per-node credential stored with mode `0600`.

## Admin panel (`/control/`)

The control-plane operator UI is served by `veiron-vps-admin` (static assets embedded):

| View | Purpose |
|---|---|
| Overview | Fleet KPIs, services, chain, pool pulse |
| Chain / Services | Local RPC tip + systemd units |
| Topology / Nodes | Observed inventory, node detail drawer, remove from ledger |
| **Add node** | Multi-step enrollment wizard (DNS → SSH → one-time install → verify) |
| Invitations | Pending / used / expired tokens with revoke |
| Pool | Reference pool status (when enabled) |

New admin APIs (behind reverse-proxy auth header):

- `GET/POST /api/invitations`, `DELETE /api/invitations/:id`
- `GET/DELETE /api/nodes/:id`
- `GET /api/fleet/summary`

Enrollment still grants **fleet telemetry only** — not consensus or shell rights.

## Security Boundaries

- RPC and admin bind to loopback only.
- The web panel requires reverse-proxy authentication.
- Enrolment tokens expire, are single use and are stored only as SHA-256 hashes.
- Agent credentials are unique per VPS and remain outside the repository.
- The public fleet endpoint excludes credentials and filesystem paths.
- No miner, wallet, private key or recovery phrase is installed.
- Install explicitly stops/masks/removes any leftover `veiron-miner` unit or binary.
- Existing chain state under `/var/lib/veiron/.veiron-mainnet/` is preserved.

## Operator Checks

```bash
sudo systemctl status veiron-node veiron-rpc veiron-vps-admin
sudo systemctl status veiron-indexer-refresh.timer
sudo /opt/veiron/vps-control-plane/health-check.sh --domain node1.example.org
sudo journalctl -u veiron-vps-admin -f
```
