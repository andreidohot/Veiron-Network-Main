# VPS control plane — installation and uninstall guide

This guide installs the Veiron VPS control plane on a fresh Ubuntu VPS and removes it cleanly when needed.

## What this bundle installs

- Veiron node + RPC + indexer services
- VPS admin panel behind reverse proxy auth
- fleet topology endpoints for the control plane
- optional pool coordinator when enabled
- no local miner binary on the VPS

## Installation prerequisites

Before installing, make sure:

1. The VPS runs Ubuntu 22.04/24.04.
2. DNS resolves to the VPS host.
3. Ports 80, 443 and 20787 are reachable from the internet.
4. You have root access.
5. You have the release archive and its SHA-256 file.

## 1. Download the bundle

```bash
mkdir -p /tmp/veiron-vps && cd /tmp/veiron-vps
curl -fsSL https://example.invalid/veiron-vps-control-linux-x86_64.tar.gz -o veiron-vps-control-linux-x86_64.tar.gz
curl -fsSL https://example.invalid/veiron-vps-control-linux-x86_64.tar.gz.sha256 -o veiron-vps-control-linux-x86_64.tar.gz.sha256
sha256sum -c veiron-vps-control-linux-x86_64.tar.gz.sha256
```

Replace the URLs with your release asset location.

## 2. Run the installer

The recommended flow is the interactive installer:

```bash
cd /tmp/veiron-vps
tar -xzf veiron-vps-control-linux-x86_64.tar.gz
sudo ./veiron-vps-control/vps-control-plane/install-interactive.sh
```

The installer will ask for:

- the path to the release archive
- the node name
- the public domain
- the admin email
- whether to enable the pool role
- the pool reward address and pool name when enabled
- whether to use an existing reverse proxy and whether to configure UFW

If you prefer non-interactive mode, you can still run:

```bash
sudo ./veiron-vps-control/vps-control-plane/install.sh \
  --bundle /tmp/veiron-vps/veiron-vps-control-linux-x86_64.tar.gz \
  --node-name bootstrap-eu-1 \
  --domain node1.example.org \
  --email operator@example.org \
  --release-bundle-url https://example.invalid/veiron-vps-control-linux-x86_64.tar.gz
```

### Useful installer options

- `--external-proxy` if another reverse proxy already listens on 80/443
- `--enable-pool --pool-address <address>` for a pool coordinator
- `--skip-firewall` if you manage firewall rules yourself
- `--seed /dns4/.../tcp/20787` to add bootstrap peers

## 3. Verify the installation

```bash
sudo systemctl status veiron-node veiron-rpc veiron-vps-admin
sudo systemctl status veiron-indexer-refresh.timer
sudo /opt/veiron/vps-control-plane/health-check.sh --domain node1.example.org
```

Expected endpoints:

- HTTPS RPC: https://YOUR_DOMAIN
- Fleet status: https://YOUR_DOMAIN/fleet/status
- Admin panel: https://YOUR_DOMAIN/control/

## 4. Desktop miner stability notes

The VPS control plane now uses a more stable reverse-proxy layout for desktop miner traffic:

- dedicated health/status locations
- keep-alive friendly proxy headers
- higher mining burst allowance
- longer proxy read/send timeouts

These settings reduce the disconnect/reconnect look that appears when the desktop app polls the VPS aggressively.

## Uninstall

Run the uninstall script from the unpacked bundle:

```bash
sudo ./veiron-vps-control/vps-control-plane/uninstall.sh
```

### Optional cleanup flags

```bash
sudo ./veiron-vps-control/vps-control-plane/uninstall.sh --purge-data
sudo ./veiron-vps-control/vps-control-plane/uninstall.sh --purge-data --purge-cert
```

- `--purge-data` removes persisted chain, index and pool state
- `--purge-cert` removes managed TLS certs from /etc/letsencrypt

## Notes

- The installer intentionally removes any leftover miner service from the VPS.
- The uninstall script stops services and disables them, but it does not remove unrelated system packages such as nginx or certbot unless you remove them manually.
