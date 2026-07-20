#!/usr/bin/env bash
set -Eeuo pipefail

workspace="${VEIRON_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$workspace"

compose=(docker compose --env-file .env -f compose.yaml)
profiles=(--profile backup)
[[ "${CLOUDFLARE_MODE:-disabled}" == "tunnel" ]] && profiles+=(--profile cloudflare)
[[ "${ENABLE_POOL:-false}" == "true" ]] && profiles+=(--profile pool)

deadline=$((SECONDS + ${HEALTH_TIMEOUT_SECONDS:-240}))
required=(veiron-node veiron-rpc veiron-indexer veiron-control postgres caddy prometheus grafana loki veiron-ops)

while (( SECONDS < deadline )); do
  failed=0
  for service in "${required[@]}"; do
    cid="$("${compose[@]}" "${profiles[@]}" ps -q "$service" 2>/dev/null || true)"
    if [[ -z "$cid" ]]; then
      echo "Waiting for $service container..."
      failed=1
      continue
    fi
    state="$(docker inspect -f '{{.State.Status}}' "$cid")"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
    if [[ "$state" != "running" || "$health" == "unhealthy" ]]; then
      echo "Waiting for $service: state=$state health=$health"
      failed=1
    fi
  done
  if (( failed == 0 )); then
    break
  fi
  sleep 5
done

curl -fsS http://veiron-rpc:10787/health >/dev/null 2>&1 \
  || "${compose[@]}" exec -T veiron-rpc curl -fsS http://127.0.0.1:10787/health >/dev/null
"${compose[@]}" exec -T veiron-rpc curl -fsS http://127.0.0.1:10787/status | grep -q '"height"'
"${compose[@]}" exec -T veiron-rpc curl -fsS http://127.0.0.1:10787/p2p/status >/dev/null
"${compose[@]}" exec -T veiron-rpc curl -fsS http://127.0.0.1:10787/indexer/status >/dev/null
"${compose[@]}" exec -T veiron-control curl -fsS http://127.0.0.1:10788/health >/dev/null

if [[ "${ENABLE_POOL:-false}" == "true" ]]; then
  "${compose[@]}" exec -T veiron-pool curl -fsS http://127.0.0.1:30787/health >/dev/null
fi

if "${compose[@]}" ps --services --status running | grep -qx veiron-miner; then
  echo "ERROR: a local miner must not run in the server control-plane stack." >&2
  exit 1
fi

echo "Veiron Docker stack is healthy: node, RPC, indexer, controller, database, proxy and monitoring."
