#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${1:-}" == "/opt/veiron-backup/backup-now.sh" || "${1:-}" == "backup-now" ]]; then
  exec /opt/veiron-backup/backup-now.sh
fi

interval="${BACKUP_INTERVAL_SECONDS:-86400}"
while true; do
  /opt/veiron-backup/backup-now.sh || echo "Backup failed; retrying at the next interval." >&2
  sleep "$interval"
done
