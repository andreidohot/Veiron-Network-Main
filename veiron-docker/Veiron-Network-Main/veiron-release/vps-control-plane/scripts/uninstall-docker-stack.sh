#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
purge=false

while (($#)); do
  case "$1" in
    --purge-data) purge=true; shift ;;
    --help|-h) echo "Usage: uninstall-docker-stack.sh [--purge-data]"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

profiles=(--profile cloudflare --profile pool --profile backup --profile tools)
docker compose --env-file .env -f compose.yaml "${profiles[@]}" down --remove-orphans || true
docker compose -f installer.compose.yaml down --remove-orphans || true

if [[ "$purge" == true ]]; then
  read -r -p "Delete all Veiron Docker state, chain data, database and backups? Type PURGE: " answer
  [[ "$answer" == "PURGE" ]] || { echo "Purge cancelled."; exit 1; }
  rm -rf state .env
fi

echo "Veiron Docker stack removed. Persistent data was $([[ "$purge" == true ]] && echo deleted || echo preserved)."
