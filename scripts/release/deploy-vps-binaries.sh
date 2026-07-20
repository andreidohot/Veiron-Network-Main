#!/usr/bin/env bash
# Deploy selected release binaries to the rehearsal VPS.
# Usage (from WSL or Linux):
#   bash scripts/release/deploy-vps-binaries.sh root@rpcnode.dohotstudio.com ~/.ssh/veiron_vps_ed25519
set -euo pipefail

HOST="${1:-root@rpcnode.dohotstudio.com}"
KEY="${2:-$HOME/.ssh/veiron_vps_ed25519}"
# Allow Windows-style key path when invoked via WSL
if [[ ! -f "$KEY" && -f /mnt/c/Users/andre/.ssh/veiron_vps_ed25519 ]]; then
  KEY=/mnt/c/Users/andre/.ssh/veiron_vps_ed25519
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN_DIR="$ROOT/target/release"
REMOTE_BIN=/opt/veiron/bin
STAMP="$(date +%Y%m%d%H%M%S)"

BINS=(veiron-node veiron-rpc-gateway veiron-indexer veiron-mining-pool)
for b in "${BINS[@]}"; do
  if [[ ! -x "$BIN_DIR/$b" ]]; then
    echo "Missing $BIN_DIR/$b — build release first" >&2
    exit 1
  fi
done

echo "==> Stopping services on $HOST"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" \
  'systemctl stop veiron-mining-pool veiron-rpc veiron-node veiron-indexer-refresh.timer 2>/dev/null || true; systemctl stop veiron-indexer-refresh.service 2>/dev/null || true; true'

echo "==> Uploading binaries"
for b in "${BINS[@]}"; do
  scp -i "$KEY" "$BIN_DIR/$b" "$HOST:/tmp/$b.new"
done

echo "==> Installing (backup + replace + permissions)"
ssh -i "$KEY" "$HOST" bash -s -- "$STAMP" <<'REMOTE'
set -euo pipefail
stamp="$1"
mkdir -p /opt/veiron/bin
for b in veiron-node veiron-rpc-gateway veiron-indexer veiron-mining-pool; do
  if [[ -f /opt/veiron/bin/$b ]]; then
    cp -a /opt/veiron/bin/$b /opt/veiron/bin/$b.bak.$stamp
  fi
  install -m 0755 /tmp/$b.new /opt/veiron/bin/$b
  rm -f /tmp/$b.new
  ls -la /opt/veiron/bin/$b
done
# Prefer sync over full rebuild when the unit supports it
if [[ -f /etc/systemd/system/veiron-indexer-refresh.service ]]; then
  if grep -q 'index-chain' /etc/systemd/system/veiron-indexer-refresh.service; then
    sed -i 's/index-chain/sync/g' /etc/systemd/system/veiron-indexer-refresh.service
    systemctl daemon-reload || true
  fi
fi
systemctl start veiron-node
sleep 1
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
systemctl start veiron-indexer-refresh.timer 2>/dev/null || true
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool
curl -sS -o /dev/null -w 'rpc_status=%{http_code}\n' http://127.0.0.1:10787/status || true
curl -sS -o /dev/null -w 'pool_status=%{http_code}\n' http://127.0.0.1:30787/api/v1/pool/status || true
curl -sS -o /dev/null -w 'pool_history=%{http_code}\n' http://127.0.0.1:30787/api/v1/pool/history || true
curl -sS http://127.0.0.1:10787/status | head -c 400; echo
REMOTE

echo "Deploy complete."
