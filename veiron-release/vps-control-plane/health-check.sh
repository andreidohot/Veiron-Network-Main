#!/usr/bin/env bash
set -euo pipefail
domain=""; local_only=false
while (($#)); do
  case "$1" in
    --domain) domain="${2:-}"; shift 2;;
    --local-only) local_only=true; shift;;
    --help|-h) echo "Usage: $0 --domain DOMAIN [--local-only]"; exit 0;;
    *) exit 2;;
  esac
done
[[ -n "$domain" ]] || { echo "--domain is required" >&2; exit 2; }
for unit in veiron-node veiron-rpc veiron-vps-admin veiron-indexer-refresh.timer; do
  systemctl is-active --quiet "$unit" || { echo "$unit is not active" >&2; exit 1; }
done
# VPS must never run a local miner (validator / RPC / pool host only).
if systemctl is-active --quiet veiron-miner 2>/dev/null; then
  echo "veiron-miner must not run on the VPS control plane" >&2
  exit 1
fi
if pgrep -x veiron-miner >/dev/null 2>&1; then
  echo "veiron-miner process found; remove local mining from this host" >&2
  exit 1
fi
curl --fail --silent --show-error http://127.0.0.1:10787/health >/dev/null
status_json="$(curl --fail --silent --show-error http://127.0.0.1:10787/status)"
echo "$status_json" | grep -Eq '"initialized"[[:space:]]*:[[:space:]]*true' \
  || { echo "RPC /status is not initialized" >&2; exit 1; }
echo "$status_json" | grep -Eq '"height"[[:space:]]*:' \
  || { echo "RPC /status is missing chain height" >&2; exit 1; }
curl --fail --silent --show-error http://127.0.0.1:10787/p2p/status >/dev/null
curl --fail --silent --show-error http://127.0.0.1:10787/indexer/status >/dev/null
curl --fail --silent --show-error http://127.0.0.1:10788/health >/dev/null
if [[ "$local_only" == false ]]; then
  curl --fail --silent --show-error "https://$domain/status" >/dev/null
  curl --fail --silent --show-error "https://$domain/fleet/status" >/dev/null
  # Public mining must remain reachable for desktop solo miners (valid address checked separately).
  code="$(curl --silent --output /dev/null --write-out '%{http_code}' "https://$domain/mining/template?miner_address=vire1invalid")"
  if [[ "$code" != "400" && "$code" != "200" ]]; then
    echo "public mining template endpoint unexpected HTTP $code" >&2
    exit 1
  fi
fi
if systemctl is-enabled --quiet veiron-mining-pool 2>/dev/null; then
  systemctl is-active --quiet veiron-mining-pool
  curl --fail --silent --show-error http://127.0.0.1:30787/health >/dev/null
fi
if [[ "$local_only" == true ]]; then
  echo "Veiron VPS services, loopback RPC, chain status, p2p, indexer and fleet agent are healthy; public proxy verification was skipped."
else
  echo "Veiron VPS services, public RPC, mining path, fleet agent and chain status are healthy."
fi
