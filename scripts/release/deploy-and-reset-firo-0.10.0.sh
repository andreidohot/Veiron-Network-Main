#!/usr/bin/env bash
# Deploy Linux FiroPoW 0.10.0 binaries and reset candidate chain on VPS.
set -euo pipefail

HOST="${1:-root@rpcnode.dohotstudio.com}"
KEY="${2:-/mnt/c/Users/andre/.ssh/veiron_vps_ed25519}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="${CARGO_TARGET_DIR:-/tmp/veiron-linux-target}/release"
STAMP="$(date +%Y%m%d%H%M%S)"

for b in veiron-node veiron-rpc-gateway veiron-indexer veiron-mining-pool; do
  if [[ ! -x "$BIN/$b" ]]; then
    echo "Missing $BIN/$b — build Linux release first" >&2
    exit 1
  fi
done

echo "==> Stop services"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" \
  'systemctl stop veiron-mining-pool veiron-rpc veiron-node veiron-indexer-refresh.timer 2>/dev/null || true
   systemctl stop veiron-indexer-refresh.service 2>/dev/null || true
   mkdir -p /opt/veiron/bin /etc/veiron /opt/veiron/docs/release'

echo "==> Upload binaries + genesis pins"
for b in veiron-node veiron-rpc-gateway veiron-indexer veiron-mining-pool; do
  scp -i "$KEY" "$BIN/$b" "$HOST:/tmp/$b.new"
done
scp -i "$KEY" \
  "$ROOT/docs/release/GENESIS_REVIEW.mainnet-candidate.json" \
  "$ROOT/docs/release/GENESIS_APPROVAL.mainnet-candidate.json" \
  "$HOST:/tmp/"

echo "==> Install binaries"
ssh -i "$KEY" "$HOST" bash -s -- "$STAMP" <<'REMOTE'
set -euo pipefail
stamp="$1"
for b in veiron-node veiron-rpc-gateway veiron-indexer veiron-mining-pool; do
  if [[ -f /opt/veiron/bin/$b ]]; then
    cp -a /opt/veiron/bin/$b /opt/veiron/bin/$b.bak.$stamp
  fi
  install -m 0755 /tmp/$b.new /opt/veiron/bin/$b
  rm -f /tmp/$b.new
  ls -la /opt/veiron/bin/$b
done
cp -a /tmp/GENESIS_REVIEW.mainnet-candidate.json /etc/veiron/ || true
cp -a /tmp/GENESIS_APPROVAL.mainnet-candidate.json /etc/veiron/ || true
cp -a /tmp/GENESIS_REVIEW.mainnet-candidate.json /opt/veiron/docs/release/ || true
cp -a /tmp/GENESIS_APPROVAL.mainnet-candidate.json /opt/veiron/docs/release/ || true
REMOTE

echo "==> Reset candidate chain (FiroPoW genesis)"
ssh -i "$KEY" "$HOST" bash -s -- "$STAMP" <<'REMOTE'
set -euo pipefail
stamp="$1"
ROOT=/var/lib/veiron/.veiron-mainnet
POOL=/var/lib/veiron-pool

mkdir -p /var/lib/veiron/backups
if [[ -d "$ROOT" ]]; then
  tar -C /var/lib/veiron -czf "/var/lib/veiron/backups/veiron-mainnet-pre-firo-${stamp}.tar.gz" .veiron-mainnet || true
fi
if [[ -f "$POOL/pool-state.json" ]]; then
  cp -a "$POOL/pool-state.json" "/var/lib/veiron/backups/pool-state-pre-firo-${stamp}.json" || true
fi

rm -f "$ROOT"/chain/chain.jsonl "$ROOT"/chain/chain-tip.json "$ROOT"/chain/chain.lock "$ROOT"/chain/.write_test
rm -f "$ROOT"/mempool/pending.json "$ROOT"/mempool/mempool.lock
rm -f "$ROOT"/indexer/index.json
rm -f "$ROOT"/genesis-info.json
rm -f "$ROOT"/node/runtime.json "$ROOT"/node/p2p-status.json "$ROOT"/node/peer-reputation.json
rm -f "$POOL/pool-state.json"
install -d -o veiron -g veiron -m 0750 "$ROOT"/{chain,mempool,indexer,node} 2>/dev/null || install -d -m 0750 "$ROOT"/{chain,mempool,indexer,node}
install -d -o veiron-pool -g veiron-pool -m 0750 "$POOL" 2>/dev/null || install -d -m 0750 "$POOL"
chown -R veiron:veiron "$ROOT" 2>/dev/null || true

# Prefer veiron user if present
RUN_AS=(sudo -u veiron)
if ! id veiron >/dev/null 2>&1; then RUN_AS=(); fi

CFG=/etc/veiron/node.toml
if [[ ! -f "$CFG" ]]; then CFG=/opt/veiron/configs/node.toml; fi
if [[ ! -f "$CFG" ]]; then
  echo "WARN: node.toml not found, trying start with packaged defaults"
fi

echo "==> Force-genesis with new FiroPoW binary"
if [[ -f "$CFG" ]]; then
  "${RUN_AS[@]}" /opt/veiron/bin/veiron-node \
    --config "$CFG" \
    --data-dir /var/lib/veiron/.veiron-mainnet/chain \
    --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
    start-node --force-genesis &
  NODE_PID=$!
  sleep 5
  "${RUN_AS[@]}" /opt/veiron/bin/veiron-node \
    --config "$CFG" \
    --data-dir /var/lib/veiron/.veiron-mainnet/chain \
    --mempool-dir /var/lib/veiron/.veiron-mainnet/mempool \
    shutdown 2>/dev/null || true
  sleep 2
  kill "$NODE_PID" 2>/dev/null || true
  wait "$NODE_PID" 2>/dev/null || true
fi

echo "==> Chain after reset"
ls -la /var/lib/veiron/.veiron-mainnet/chain/ || true
cat /var/lib/veiron/.veiron-mainnet/genesis-info.json 2>/dev/null || true
head -c 200 /var/lib/veiron/.veiron-mainnet/chain/chain-tip.json 2>/dev/null || true
echo

systemctl start veiron-node
sleep 2
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
systemctl start veiron-indexer-refresh.timer 2>/dev/null || true
sleep 2
systemctl is-active veiron-node veiron-rpc veiron-mining-pool || true
curl -sS http://127.0.0.1:10787/status | head -c 500; echo
REMOTE

echo "Deploy + FiroPoW chain reset complete."
