#!/usr/bin/env bash
set -euo pipefail
KEY="${1:-/tmp/veiron_vps_ed25519}"
HOST="${2:-root@rpcnode.dohotstudio.com}"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash <<'REMOTE'
set -euo pipefail
systemctl stop veiron-mining-pool veiron-rpc veiron-node || true
sleep 1
ROOT=/var/lib/veiron/.veiron-mainnet
rm -f "$ROOT"/chain/* "$ROOT"/mempool/* "$ROOT"/indexer/* "$ROOT"/genesis-info.json 2>/dev/null || true
install -d -o veiron -g veiron -m 0750 "$ROOT"/{chain,mempool,indexer,node}
chown -R veiron:veiron "$ROOT"
# Ensure approval is under WorkingDirectory-relative paths
mkdir -p /opt/veiron/docs/release /opt/veiron/configs
cp -a /etc/veiron/GENESIS_APPROVAL.mainnet-candidate.json /opt/veiron/docs/release/ 2>/dev/null || true
cp -a /etc/veiron/GENESIS_REVIEW.mainnet-candidate.json /opt/veiron/docs/release/ 2>/dev/null || true
ls -la /opt/veiron/configs/genesis.mainnet-candidate.toml
ls -la /opt/veiron/docs/release/GENESIS_APPROVAL.mainnet-candidate.json

cd /opt/veiron
echo "==> force-genesis"
set +e
sudo -u veiron env HOME=/var/lib/veiron \
  /opt/veiron/bin/veiron-node \
  --config /etc/veiron/node.toml \
  --data-dir /var/lib/veiron/.veiron-mainnet/chain \
  --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
  start-node --force-genesis > /tmp/veiron-genesis.log 2>&1 &
PID=$!
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if [[ -f /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json ]]; then
    echo "tip appeared after ${i}s"
    break
  fi
  sleep 1
done
sudo -u veiron /opt/veiron/bin/veiron-node \
  --config /etc/veiron/node.toml \
  --data-dir /var/lib/veiron/.veiron-mainnet/chain \
  --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
  shutdown >> /tmp/veiron-genesis.log 2>&1
sleep 2
kill $PID 2>/dev/null
wait $PID 2>/dev/null
set -e
echo "==> log"; cat /tmp/veiron-genesis.log
echo "==> files"; ls -la /var/lib/veiron/.veiron-mainnet/chain/ || true
cat /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json 2>/dev/null || true
cat /var/lib/veiron/.veiron-mainnet/genesis-info.json 2>/dev/null || true
echo
systemctl start veiron-node
sleep 3
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool || true
journalctl -u veiron-node -n 15 --no-pager || true
curl -sS http://127.0.0.1:10787/status; echo
REMOTE
