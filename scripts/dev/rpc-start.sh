#!/usr/bin/env bash
set -euo pipefail
cargo run -p veiron-rpc-gateway -- --config veiron-rpc-gateway/config/devnet-rpc.toml
