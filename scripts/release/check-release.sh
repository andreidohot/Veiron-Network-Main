#!/usr/bin/env bash
set -euo pipefail

echo "Running Veiron mainnet-candidate release checks..."
cargo fmt --all --check
cargo test --workspace --tests
cargo clippy --workspace --all-targets -- -D warnings

if [[ -f veiron-explorer/package.json ]]; then
  pushd veiron-explorer >/dev/null
  npm install
  npm run build
  popd >/dev/null
fi

echo "Release checks passed."
