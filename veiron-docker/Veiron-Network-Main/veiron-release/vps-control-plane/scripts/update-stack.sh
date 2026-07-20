#!/usr/bin/env bash
set -Eeuo pipefail

workspace="${VEIRON_WORKSPACE:-/workspace}"
cd "$workspace"
version=""
rollback=false

while (($#)); do
  case "$1" in
    --version) version="${2:-}"; shift 2 ;;
    --rollback) rollback=true; shift ;;
    --help|-h)
      echo "Usage: update-stack.sh [--version VERSION] [--rollback]"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

mkdir -p state/rollback
latest_file="state/rollback/latest.env"

profiles=(--profile backup)
[[ "${CLOUDFLARE_MODE:-disabled}" == "tunnel" ]] && profiles+=(--profile cloudflare)
[[ "${ENABLE_POOL:-false}" == "true" ]] && profiles+=(--profile pool)
compose=(docker compose --env-file .env -f compose.yaml)

if [[ "$rollback" == true ]]; then
  [[ -s "$latest_file" ]] || { echo "No rollback environment is available." >&2; exit 66; }
  cp "$latest_file" .env
  "${compose[@]}" "${profiles[@]}" up -d --remove-orphans
  /workspace/scripts/health-check-docker.sh
  echo "Rollback completed."
  exit 0
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
cp .env "state/rollback/.env.$stamp"
cp .env "$latest_file"

# Always take a backup before an application update.
docker compose --env-file .env -f compose.yaml --profile backup run --rm backup-agent /opt/veiron-backup/backup-now.sh

if [[ -n "$version" ]]; then
  python3 - "$version" <<'PY'
from pathlib import Path
import re, sys
path = Path(".env")
text = path.read_text()
version = sys.argv[1]
if re.search(r"^VEIRON_VERSION=", text, flags=re.M):
    text = re.sub(r"^VEIRON_VERSION=.*$", f"VEIRON_VERSION='{version}'", text, flags=re.M)
else:
    text += f"\nVEIRON_VERSION='{version}'\n"
path.write_text(text)
PY
fi

set +e
"${compose[@]}" "${profiles[@]}" pull
pull_rc=$?
set -e
if [[ "$pull_rc" -ne 0 && "${DEPLOYMENT_SOURCE:-build}" == "ghcr" ]]; then
  echo "Image pull failed. Restoring previous environment." >&2
  cp "$latest_file" .env
  exit "$pull_rc"
fi

up_args=(up -d --remove-orphans)
[[ "${DEPLOYMENT_SOURCE:-build}" == "build" ]] && up_args+=(--build)
"${compose[@]}" "${profiles[@]}" "${up_args[@]}"

if /workspace/scripts/health-check-docker.sh; then
  echo "Update completed successfully."
else
  echo "Health check failed; rolling back." >&2
  cp "$latest_file" .env
  "${compose[@]}" "${profiles[@]}" up -d --remove-orphans
  /workspace/scripts/health-check-docker.sh || true
  exit 1
fi
