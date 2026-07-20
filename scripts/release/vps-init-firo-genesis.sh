#!/usr/bin/env bash
set -euo pipefail
KEY="${1:-/tmp/veiron_vps_ed25519}"
HOST="${2:-root@rpcnode.dohotstudio.com}"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash <<'REMOTE'
set -euo pipefail
echo "==> Locate configs"
find /etc/veiron /opt/veiron -name '*.toml' 2>/dev/null | head -50 || true
echo "==> systemd unit"
cat /etc/systemd/system/veiron-node.service 2>/dev/null || true
echo "==> Recent journal"
journalctl -u veiron-node -n 40 --no-pager 2>/dev/null || true

CFG=""
for c in /etc/veiron/node.toml /opt/veiron/configs/node.toml /opt/veiron/vps/configs/node.toml /opt/veiron/vps-control-plane/configs/node.toml; do
  if [[ -f "$c" ]]; then CFG="$c"; break; fi
done
echo "CFG=$CFG"
if [[ -z "$CFG" ]]; then
  echo "ERROR: no node.toml"
  exit 1
fi

systemctl stop veiron-mining-pool veiron-rpc veiron-node 2>/dev/null || true
sleep 1

ROOT=/var/lib/veiron/.veiron-mainnet
install -d -o veiron -g veiron -m 0750 "$ROOT"/{chain,mempool,indexer,node} 2>/dev/null || install -d -m 0750 "$ROOT"/{chain,mempool,indexer,node}
rm -f "$ROOT"/chain/* "$ROOT"/mempool/* "$ROOT"/indexer/* "$ROOT"/genesis-info.json 2>/dev/null || true
chown -R veiron:veiron "$ROOT" 2>/dev/null || true

# Extract data-dir from unit or use standard paths
DATA=/var/lib/veiron/.veiron-mainnet/chain
MEMPOOL=/var/lib/veiron/.veiron-mainnet/mempool

echo "==> force-genesis"
set +e
sudo -u veiron /opt/veiron/bin/veiron-node --config "$CFG" --data-dir "$DATA" --mempool-dir "$MEMPOOL" start-node --force-genesis > /tmp/veiron-genesis.log 2>&1 &
PID=$!
sleep 8
sudo -u veiron /opt/veiron/bin/veiron-node --config "$CFG" --data-dir "$DATA" --mempool-dir "$MEMPOOL" shutdown >> /tmp/veiron-genesis.log 2>&1
sleep 2
kill $PID 2>/dev/null
wait $PID 2>/dev/null
set -e
echo "==> genesis log"
cat /tmp/veiron-genesis.log | tail -50
echo "==> tip"
ls -la "$DATA" || true
cat "$ROOT/genesis-info.json" 2>/dev/null || true
cat "$DATA/chain-tip.json" 2>/dev/null || true
echo
systemctl start veiron-node; sleep 2; systemctl start veiron-rpc; sleep 1; systemctl start veiron-mining-pool
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool
curl -sS http://127.0.0.1:10787/status; echo
REMOTE
