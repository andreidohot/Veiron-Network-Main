#!/usr/bin/env bash
set -euo pipefail
KEY="${1:-/tmp/veiron_vps_ed25519}"
HOST="${2:-root@rpcnode.dohotstudio.com}"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash <<'REMOTE'
set -euo pipefail
pkill -f '/opt/veiron/bin/veiron-node' || true
systemctl stop veiron-node veiron-rpc veiron-mining-pool || true
sleep 1
ROOT=/var/lib/veiron/.veiron-mainnet
# keep empty chain dirs
rm -f "$ROOT"/chain/* 2>/dev/null || true
chown -R veiron:veiron "$ROOT"
cd /opt/veiron
rm -f /var/lib/veiron/genesis-force.log
touch /var/lib/veiron/genesis-force.log
chown veiron:veiron /var/lib/veiron/genesis-force.log
echo "starting force-genesis..."
sudo -u veiron bash -c 'cd /opt/veiron && /opt/veiron/bin/veiron-node --config /etc/veiron/node.toml --data-dir /var/lib/veiron/.veiron-mainnet/chain --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool start-node --force-genesis' >> /var/lib/veiron/genesis-force.log 2>&1 &
echo "bg_pid=$!"
for i in $(seq 1 120); do
  if [[ -f /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json ]]; then
    echo "TIP_READY after ${i}s"
    cat /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json
    break
  fi
  if ! pgrep -f '/opt/veiron/bin/veiron-node' >/dev/null; then
    echo "process exited early at ${i}s"
    cat /var/lib/veiron/genesis-force.log
    break
  fi
  if (( i % 10 == 0 )); then
    echo "waiting ${i}s..."
    tail -5 /var/lib/veiron/genesis-force.log || true
  fi
  sleep 1
done
ls -la /var/lib/veiron/.veiron-mainnet/chain/ || true
# stop manual node then start systemd
pkill -f '/opt/veiron/bin/veiron-node' || true
sleep 2
systemctl start veiron-node
sleep 3
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool || true
journalctl -u veiron-node -n 20 --no-pager || true
curl -sS http://127.0.0.1:10787/status; echo
REMOTE
