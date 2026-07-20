$ErrorActionPreference = "Stop"
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo run -p veiron-rpc-gateway -- --config veiron-rpc-gateway/config/devnet-rpc.toml
