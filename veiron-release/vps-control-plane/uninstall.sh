#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  sudo ./uninstall.sh [--purge-data] [--purge-cert]

Removes the Veiron VPS control plane from this host.
Options:
  --purge-data       Remove persisted chain/index/mempool/pool state under /var/lib/veiron*
  --purge-cert       Remove managed TLS certificates from /etc/letsencrypt/live and /etc/letsencrypt/archive
  --help             Show this help
EOF
}

purge_data=false
purge_cert=false
while (($#)); do
  case "$1" in
    --purge-data) purge_data=true; shift ;;
    --purge-cert) purge_cert=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

fail() { echo "ERROR: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail "Run with sudo."

echo "Stopping and disabling Veiron services..."
systemctl disable --now veiron-node veiron-rpc veiron-vps-admin veiron-mining-pool veiron-indexer-refresh.timer veiron-auto-update.timer 2>/dev/null || true
systemctl stop veiron-node veiron-rpc veiron-vps-admin veiron-mining-pool veiron-indexer-refresh.timer veiron-auto-update.timer 2>/dev/null || true
systemctl disable veiron-miner 2>/dev/null || true
systemctl mask veiron-miner 2>/dev/null || true
systemctl stop veiron-miner 2>/dev/null || true

rm -f /etc/systemd/system/veiron-node.service \
      /etc/systemd/system/veiron-rpc.service \
      /etc/systemd/system/veiron-vps-admin.service \
      /etc/systemd/system/veiron-mining-pool.service \
      /etc/systemd/system/veiron-indexer-refresh.timer \
      /etc/systemd/system/veiron-auto-update.service \
      /etc/systemd/system/veiron-auto-update.timer \
      /etc/systemd/system/veiron-miner.service \
      /etc/systemd/system/multi-user.target.wants/veiron-miner.service

rm -f /etc/nginx/sites-enabled/veiron /etc/nginx/sites-available/veiron
rm -f /etc/veiron-control/admin.htpasswd
rm -f /etc/veiron-control/admin.toml
rm -f /etc/veiron/node.toml /etc/veiron/rpc.toml
rm -f /etc/veiron-pool/pool.toml /etc/veiron-pool/admin.token
rm -rf /etc/veiron /etc/veiron-control /etc/veiron-pool

rm -rf /opt/veiron
rm -f /usr/local/bin/veiron* 2>/dev/null || true

if [[ "$purge_data" == true ]]; then
  echo "Removing persisted Veiron data..."
  rm -rf /var/lib/veiron /var/lib/veiron-control /var/lib/veiron-pool /var/lib/veiron-miner
fi

if [[ "$purge_cert" == true ]]; then
  echo "Removing managed TLS certificates..."
  rm -rf /etc/letsencrypt/live/* /etc/letsencrypt/archive/* /etc/letsencrypt/renewal/* 2>/dev/null || true
fi

systemctl daemon-reload 2>/dev/null || true
nginx -t 2>/dev/null || true

if id veiron >/dev/null 2>&1; then userdel -r veiron 2>/dev/null || true; fi
if id veiron-control >/dev/null 2>&1; then userdel -r veiron-control 2>/dev/null || true; fi
if id veiron-pool >/dev/null 2>&1; then userdel -r veiron-pool 2>/dev/null || true; fi

echo "Veiron VPS control plane removed from this host."
echo "Note: firewall rules and installed OS packages were not removed automatically."
