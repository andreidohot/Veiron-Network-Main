#!/usr/bin/env bash
set -Eeuo pipefail

component="${VEIRON_COMPONENT:-}"
config_dir="${VEIRON_CONFIG_DIR:-/config}"
mkdir -p "$config_dir"

required_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || {
    echo "ERROR: missing required environment variable: $name" >&2
    exit 64
  }
}

render() {
  local src="$1"
  local dst="$2"
  envsubst < "$src" > "$dst.tmp"
  mv "$dst.tmp" "$dst"
}

export BASE_DOMAIN="${BASE_DOMAIN:-example.invalid}"
export NODE_NAME="${NODE_NAME:-veiron-node}"
export RPC_HOST="${RPC_HOST:-rpc.${BASE_DOMAIN}}"
export CONTROL_HOST="${CONTROL_HOST:-control.${BASE_DOMAIN}}"
export POOL_HOST="${POOL_HOST:-pool.${BASE_DOMAIN}}"
export P2P_HOST="${P2P_HOST:-node.${BASE_DOMAIN}}"
export CONTROLLER_URL_TOML='""'
if [[ -n "${CONTROLLER_URL:-}" ]]; then
  CONTROLLER_URL_TOML="\"${CONTROLLER_URL}\""
fi
export SEED_NODES_TOML="${SEED_NODES_TOML:-}"

case "$component" in
  node)
    render /app/templates/node.toml.template "$config_dir/node.toml"
    shutdown_node() {
      echo "Stopping Veiron node gracefully..."
      veiron-node \
        --config "$config_dir/node.toml" \
        --data-dir /data/chain \
        --mempool-dir /data/mempool \
        shutdown || true
    }
    trap shutdown_node TERM INT
    veiron-node \
      --config "$config_dir/node.toml" \
      --data-dir /data/chain \
      --mempool-dir /data/mempool \
      start-node &
    child=$!
    wait "$child"
    ;;
  rpc)
    render /app/templates/node.toml.template "$config_dir/node.toml"
    render /app/templates/rpc.toml.template "$config_dir/rpc.toml"
    exec veiron-rpc-gateway \
      --config "$config_dir/rpc.toml" \
      --node-config "$config_dir/node.toml"
    ;;
  indexer)
    interval="${INDEXER_INTERVAL_SECONDS:-15}"
    while true; do
      if veiron-indexer \
        --network mainnet-candidate \
        --chain-data-dir /data/chain \
        --index-dir /data/indexer \
        sync; then
        date -u +%FT%TZ > /data/indexer/.last-success
      else
        echo "Indexer refresh failed; retrying in ${interval}s" >&2
      fi
      sleep "$interval"
    done
    ;;
  control)
    render /app/templates/admin.toml.template "$config_dir/admin.toml"
    if [[ -n "${CONTROLLER_URL:-}" && -n "${ENROLLMENT_TOKEN:-}"           && ! -s /data/control/agent-credentials.json ]]; then
      umask 077
      printf '%s' "$ENROLLMENT_TOKEN" > /data/control/enrollment.token
    fi
    exec veiron-vps-admin --config "$config_dir/admin.toml"
    ;;
  pool)
    required_env POOL_ADDRESS
    render /app/templates/pool.toml.template "$config_dir/pool.toml"
    exec veiron-mining-pool --config "$config_dir/pool.toml"
    ;;
  *)
    echo "ERROR: VEIRON_COMPONENT must be node, rpc, indexer, control or pool." >&2
    exit 64
    ;;
esac
