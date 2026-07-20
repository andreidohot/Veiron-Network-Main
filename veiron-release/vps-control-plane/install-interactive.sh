#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="$SCRIPT_DIR/install.sh"

if [[ ! -f "$INSTALLER" ]]; then
  echo "Missing installer: $INSTALLER" >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Please run this script with sudo." >&2
  exit 1
fi

prompt_input() {
  local prompt="$1"
  local default_value="$2"
  local value=""
  read -r -p "$prompt${default_value:+ [$default_value]}: " value
  printf '%s' "${value:-$default_value}"
}

prompt_yes_no() {
  local prompt="$1"
  local default_value="$2"
  local value=""
  while true; do
    read -r -p "$prompt [$default_value]: " value
    value="${value:-$default_value}"
    case "${value,,}" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) echo "Please answer yes or no." >&2 ;;
    esac
  done
}

echo "Veiron VPS control plane interactive installer"
echo "--------------------------------------------"
archive_path="$(prompt_input "Path to release archive" "")"
node_name="$(prompt_input "Node name" "$(hostname -s 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -c '[:alnum:]._' '-' | head -c 32 || true)")"
domain="$(prompt_input "Public domain" "")"
email="$(prompt_input "Admin email" "")"
release_bundle_url="$(prompt_input "Release bundle URL (optional)" "")"
admin_user="$(prompt_input "Admin username for /control/" "veiron-admin")"

if prompt_yes_no "Enable pool coordinator on this VPS?" "n"; then
  enable_pool="--enable-pool"
  pool_address="$(prompt_input "Pool reward address" "")"
  pool_name="$(prompt_input "Pool name" "Veiron Reference Pool")"
else
  enable_pool=""
  pool_address=""
  pool_name=""
fi

if prompt_yes_no "Use an existing reverse proxy on 80/443?" "n"; then
  external_proxy="--external-proxy"
else
  external_proxy=""
fi

if prompt_yes_no "Configure UFW firewall?" "y"; then
  skip_firewall=""
else
  skip_firewall="--skip-firewall"
fi

args=(
  "$INSTALLER"
  --bundle "$archive_path"
  --node-name "$node_name"
  --domain "$domain"
  --email "$email"
  --admin-user "$admin_user"
)

[[ -n "$release_bundle_url" ]] && args+=(--release-bundle-url "$release_bundle_url")
[[ -n "$enable_pool" ]] && args+=(--enable-pool --pool-address "$pool_address" --pool-name "$pool_name")
[[ -n "$external_proxy" ]] && args+=(--external-proxy)
[[ -n "$skip_firewall" ]] && args+=(--skip-firewall)

exec bash "${args[@]}"
