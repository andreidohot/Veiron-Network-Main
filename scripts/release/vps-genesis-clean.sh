#!/usr/bin/env bash
set -euo pipefail
KEY="${1:-/tmp/veiron_vps_ed25519}"
HOST="${2:-root@rpcnode.dohotstudio.com}"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash <<'REMOTE'
set -euo pipefail
systemctl stop veiron-mining-pool veiron-rpc veiron-node || true
pkill -f '/opt/veiron/bin/veiron-node' || true
sleep 2
ROOT=/var/lib/veiron/.veiron-mainnet
rm -rf "$ROOT/chain" "$ROOT/mempool" "$ROOT/indexer" "$ROOT/node" "$ROOT/genesis-info.json"
install -d -o veiron -g veiron -m 0750 "$ROOT"/{chain,mempool,indexer,node}
chown -R veiron:veiron "$ROOT"

cd /opt/veiron
echo "Running force-genesis (FiroPoW mine can take several minutes)..."
# run in foreground with timeout 10 minutes
set +e
timeout 600 sudo -u veiron bash -c 'cd /opt/veiron && /opt/veiron/bin/veiron-node --config /etc/veiron/node.toml --data-dir /var/lib/veiron/.veiron-mainnet/chain --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool start-node --force-genesis' > /var/lib/veiron/genesis-force.log 2>&1 &
PID=$!
for i in $(seq 1 300); do
  if [[ -s /var/lib/veiron/.veiron-mainnet/chain/chain.jsonl ]]; then
    echo "CHAIN_WRITTEN after ${i}s"
    break
  fi
  if ! kill -0 $PID 2>/dev/null; then
    echo "process ended at ${i}s"
    break
  fi
  if (( i % 15 == 0 )); then
    echo "still mining/init ${i}s..."
    wc -c /var/lib/veiron/genesis-force.log 2>/dev/null || true
    tail -3 /var/lib/veiron/genesis-force.log 2>/dev/null || true
  fi
  sleep 1
done
# stop if still running after chain written
if [[ -s /var/lib/veiron/.veiron-mainnet/chain/chain.jsonl ]]; then
  sudo -u veiron /opt/veiron/bin/veiron-node --config /etc/veiron/node.toml --data-dir /var/lib/veiron/.veiron-mainnet/chain --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool shutdown 2>/dev/null || true
  sleep 2
fi
kill $PID 2>/dev/null || true
wait $PID 2>/dev/null || true
set -e

echo "==> log"; cat /var/lib/veiron/genesis-force.log
echo "==> marker"; cat /var/lib/veiron/.veiron-mainnet/genesis-info.json 2>/dev/null || true
echo "==> chain"; ls -la /var/lib/veiron/.veiron-mainnet/chain/
head -c 300 /var/lib/veiron/.veiron-mainnet/chain/chain.jsonl 2>/dev/null || true
echo
cat /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json 2>/dev/null || true
echo
systemctl start veiron-node
sleep 4
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool || true
journalctl -u veiron-node -n 15 --no-pager || true
curl -sS http://127.0.0.1:10787/status; echo
REMOTE
