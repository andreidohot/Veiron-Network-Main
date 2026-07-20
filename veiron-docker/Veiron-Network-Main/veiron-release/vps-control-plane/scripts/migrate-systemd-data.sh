#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

source_root="${1:-/var/lib/veiron/.veiron-mainnet}"
[[ $EUID -eq 0 ]] || { echo "Run with sudo to read systemd-era data." >&2; exit 77; }
[[ -d "$source_root" ]] || { echo "Source not found: $source_root" >&2; exit 66; }

if systemctl is-active --quiet veiron-node 2>/dev/null; then
  echo "Stop the legacy services before migration:" >&2
  echo "  sudo systemctl stop veiron-indexer-refresh.timer veiron-rpc veiron-node" >&2
  exit 1
fi

mkdir -p state/data/{chain,mempool,indexer,node} state/control state/pool
for name in chain mempool indexer node; do
  [[ -d "$source_root/$name" ]] && rsync -aHAX "$source_root/$name/" "state/data/$name/"
done
[[ -d /var/lib/veiron-control ]] && rsync -aHAX /var/lib/veiron-control/ state/control/
[[ -d /var/lib/veiron-pool ]] && rsync -aHAX /var/lib/veiron-pool/ state/pool/

chown -R 10001:10001 state/data state/control state/pool
echo "Legacy data migrated. The source directories were not deleted."
