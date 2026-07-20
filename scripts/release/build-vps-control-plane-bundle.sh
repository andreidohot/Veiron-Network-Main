#!/usr/bin/env bash
set -euo pipefail

workspace="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
target="${CARGO_TARGET_DIR:-$workspace/target}"
stage="$workspace/release-artifacts/vps-control-stage/veiron-vps-control"
output="$workspace/release-artifacts/veiron-vps-control-linux-x86_64.tar.gz"

cd "$workspace"
cargo build --locked --release -p veiron-node -p veiron-rpc-gateway -p veiron-indexer -p veiron-vps-admin -p veiron-mining-pool
rm -rf "$(dirname "$stage")"
mkdir -p "$stage/bin" "$stage/configs" "$stage/docs/release"
for binary in veiron-node veiron-rpc-gateway veiron-indexer veiron-vps-admin veiron-mining-pool; do
  install -m 0755 "$target/release/$binary" "$stage/bin/$binary"
done
install -m 0644 configs/genesis.mainnet-candidate.toml "$stage/configs/"
install -m 0644 docs/release/GENESIS_APPROVAL.mainnet-candidate.json "$stage/docs/release/"
cp -a veiron-release/vps-control-plane "$stage/vps-control-plane"
find "$stage/vps-control-plane" -type f -name '*.sh' -exec chmod 0755 {} +
rm -rf "$stage/vps-control-plane/admin-server"
tar --create --gzip --file "$output" --directory "$(dirname "$stage")" "$(basename "$stage")"
(cd "$(dirname "$output")" && sha256sum "$(basename "$output")" > "$(basename "$output").sha256")
echo "$output"
