#!/usr/bin/env bash
set -euo pipefail
export PATH=/root/.cargo/bin:$PATH
STAMP=$(date +%Y%m%d%H%M%S)
echo "==> Extract sources"
mkdir -p /opt/veiron/src
cd /opt/veiron/src
tar -xzf /tmp/veiron-vps-src-0.10.2.tar.gz
grep -m1 version veiron-mining-pool/Cargo.toml
grep -m1 version veiron-core/Cargo.toml

echo "==> cargo build --release (pool + node + rpc + indexer)"
if ! command -v cc >/dev/null; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq build-essential pkg-config libssl-dev
fi
cargo build --release -p veiron-mining-pool -p veiron-node -p veiron-rpc-gateway -p veiron-indexer

echo "==> Stop services"
systemctl stop veiron-mining-pool veiron-rpc veiron-node veiron-indexer-refresh.timer 2>/dev/null || true
systemctl stop veiron-indexer-refresh.service 2>/dev/null || true

echo "==> Install binaries"
mkdir -p /opt/veiron/bin
for b in veiron-mining-pool veiron-node veiron-rpc-gateway veiron-indexer; do
  if [[ -f /opt/veiron/bin/$b ]]; then
    cp -a /opt/veiron/bin/$b /opt/veiron/bin/$b.bak.$STAMP
  fi
  install -m 0755 /opt/veiron/src/target/release/$b /opt/veiron/bin/$b
  ls -la /opt/veiron/bin/$b
done

echo "==> Update pool.toml (preserve address/name/public_url)"
POOL=/etc/veiron-pool/pool.toml
cp -a "$POOL" "/etc/veiron-pool/pool.toml.bak.$STAMP"
POOL_NAME=$(grep -E '^pool_name\s*=' "$POOL" | head -1 | sed 's/.*=\s*"\(.*\)"/\1/')
POOL_ADDR=$(grep -E '^pool_address\s*=' "$POOL" | head -1 | sed 's/.*=\s*"\(.*\)"/\1/')
PUBLIC_URL=$(grep -E '^public_url\s*=' "$POOL" | head -1 | sed 's/.*=\s*"\(.*\)"/\1/')
cat > "$POOL" <<EOF
bind_host = "127.0.0.1"
bind_port = 30787
network_id = "veiron-mainnet-candidate"
status_label = "Mainnet Candidate / Public Pool"
pool_name = "${POOL_NAME}"
pool_address = "${POOL_ADDR}"
upstream_rpc_url = "http://127.0.0.1:10787"
public_url = "${PUBLIC_URL}"
data_dir = "/var/lib/veiron-pool"
admin_token_file = "/etc/veiron-pool/admin.token"
share_difficulty_leading_zero_bits = 14
vardiff_enabled = true
min_share_difficulty_leading_zero_bits = 10
max_share_difficulty_leading_zero_bits = 26
# Share must be easier than network so multiple miners earn shares between blocks.
share_network_gap_bits = 4
target_share_seconds = 12
vardiff_window_shares = 16
pool_fee_basis_points = 100
pplns_window_shares = 10000
block_maturity_confirmations = 12
minimum_payout_atomic = 100000000
job_cache_seconds = 15
hashrate_window_seconds = 60
worker_timeout_seconds = 120
max_stored_shares = 100000
max_workers_per_address = 64
max_work_requests_per_minute = 240
max_share_requests_per_minute = 600
invalid_share_ban_threshold = 20
ban_seconds = 600
allow_public_pool_prototype = false
EOF
chown root:veiron-pool "$POOL"
chmod 640 "$POOL"
echo "--- pool.toml ---"
cat "$POOL"

echo "==> Start services"
systemctl start veiron-node
sleep 2
systemctl start veiron-rpc
sleep 1
systemctl start veiron-mining-pool
systemctl start veiron-indexer-refresh.timer 2>/dev/null || true
sleep 3
systemctl is-active veiron-node veiron-rpc veiron-mining-pool
echo "==> Health checks"
curl -sS -o /dev/null -w 'rpc_status=%{http_code}\n' http://127.0.0.1:10787/status || true
curl -sS -o /dev/null -w 'rpc_health=%{http_code}\n' http://127.0.0.1:10787/health || true
curl -sS -o /dev/null -w 'pool_status=%{http_code}\n' http://127.0.0.1:30787/api/v1/pool/status || true
curl -sS http://127.0.0.1:30787/api/v1/pool/status | python3 -c "import sys,json; d=json.load(sys.stdin); print('pool', d.get('pool_name'), 'fee', d.get('pool_fee_basis_points'), 'workers', d.get('connected_workers'), 'shares', d.get('accepted_shares'), 'blocks', d.get('blocks_found'))" 2>/dev/null || true
curl -sS http://127.0.0.1:10787/status | python3 -c "import sys,json; d=json.load(sys.stdin); print('chain height', d.get('height'), 'tip', str(d.get('tip_hash') or d.get('best_block_hash'))[:24])" 2>/dev/null || true
journalctl -u veiron-mining-pool -n 20 --no-pager
echo "DEPLOY_OK stamp=$STAMP"
