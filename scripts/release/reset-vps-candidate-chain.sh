#!/usr/bin/env bash
# Full Mainnet Candidate chain reset on the rehearsal VPS.
# Wipes blocks, mempool, indexer, pool state. Re-inits deterministic genesis (same approval).
# Local wallets keep addresses but balances restart at zero on the new chain.
#
# Usage:
#   bash scripts/release/reset-vps-candidate-chain.sh root@rpcnode.dohotstudio.com /path/to/key
set -euo pipefail

HOST="${1:-root@rpcnode.dohotstudio.com}"
KEY="${2:-$HOME/.ssh/veiron_vps_ed25519}"
if [[ ! -f "$KEY" && -f /tmp/veiron_vps_ed25519 ]]; then
  KEY=/tmp/veiron_vps_ed25519
fi
if [[ ! -f "$KEY" && -f /mnt/c/Users/andre/.ssh/veiron_vps_ed25519 ]]; then
  cp /mnt/c/Users/andre/.ssh/veiron_vps_ed25519 /tmp/veiron_vps_ed25519
  chmod 600 /tmp/veiron_vps_ed25519
  KEY=/tmp/veiron_vps_ed25519
fi

STAMP="$(date +%Y%m%d%H%M%S)"
echo "==> Candidate chain RESET on $HOST (stamp=$STAMP)"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash -s -- "$STAMP" <<'REMOTE'
set -euo pipefail
stamp="$1"
ROOT=/var/lib/veiron/.veiron-mainnet
POOL=/var/lib/veiron-pool

echo "==> Stopping services"
systemctl stop veiron-mining-pool veiron-rpc veiron-node veiron-indexer-refresh.timer 2>/dev/null || true
systemctl stop veiron-indexer-refresh.service 2>/dev/null || true
sleep 1

echo "==> Backup state"
mkdir -p /var/lib/veiron/backups
if [[ -d "$ROOT" ]]; then
  tar -C /var/lib/veiron -czf "/var/lib/veiron/backups/veiron-mainnet-pre-reset-${stamp}.tar.gz" .veiron-mainnet || true
fi
if [[ -f "$POOL/pool-state.json" ]]; then
  cp -a "$POOL/pool-state.json" "/var/lib/veiron/backups/pool-state-pre-reset-${stamp}.json" || true
fi

echo "==> Wipe chain / mempool / indexer / genesis marker / pool state"
rm -f "$ROOT"/chain/chain.jsonl "$ROOT"/chain/chain-tip.json "$ROOT"/chain/chain.lock "$ROOT"/chain/.write_test
rm -f "$ROOT"/mempool/pending.json "$ROOT"/mempool/mempool.lock
rm -f "$ROOT"/indexer/index.json
rm -f "$ROOT"/genesis-info.json
rm -f "$ROOT"/node/runtime.json "$ROOT"/node/p2p-status.json "$ROOT"/node/peer-reputation.json
# Keep p2p-identity.key for stable peer id
rm -f "$POOL/pool-state.json"
install -d -o veiron -g veiron -m 0750 "$ROOT"/{chain,mempool,indexer,node}
install -d -o veiron-pool -g veiron-pool -m 0750 "$POOL" 2>/dev/null || install -d -m 0750 "$POOL"
chown -R veiron:veiron "$ROOT"

echo "==> Re-init genesis with force-genesis (one-shot)"
# Run node briefly with --force-genesis so deterministic genesis is written, then stop via shutdown file.
sudo -u veiron /opt/veiron/bin/veiron-node \
  --config /etc/veiron/node.toml \
  --data-dir /var/lib/veiron/.veiron-mainnet/chain \
  --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
  start-node --force-genesis &
NODE_PID=$!
sleep 3
# Request clean shutdown if supported
sudo -u veiron /opt/veiron/bin/veiron-node \
  --config /etc/veiron/node.toml \
  --data-dir /var/lib/veiron/.veiron-mainnet/chain \
  --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
  shutdown 2>/dev/null || true
sleep 2
kill "$NODE_PID" 2>/dev/null || true
wait "$NODE_PID" 2>/dev/null || true

echo "==> Chain files after init"
ls -la /var/lib/veiron/.veiron-mainnet/chain/ || true
ls -la /var/lib/veiron/.veiron-mainnet/genesis-info.json || true
cat /var/lib/veiron/.veiron-mainnet/genesis-info.json 2>/dev/null || true

echo "==> Start services"
systemctl start veiron-node
sleep 2
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
systemctl start veiron-indexer-refresh.timer 2>/dev/null || true
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool
curl -sS http://127.0.0.1:10787/status | head -c 500; echo
curl -sS http://127.0.0.1:30787/api/v1/pool/status | head -c 300; echo
REMOTE

echo "Reset complete. Public tip should be height 0 (genesis only)."
