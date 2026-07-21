#!/usr/bin/env bash
set -Eeuo pipefail

workspace="${VEIRON_WORKSPACE:-/workspace}"
cd "$workspace"
backup_root="$workspace/state/backups"
metrics_dir="$workspace/state/metrics"
mkdir -p "$backup_root" "$metrics_dir"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$backup_root/$stamp"
mkdir -p "$dest"

pg_password="$(cat /run/secrets/postgres_password)"
export PGPASSWORD="$pg_password"
pg_dump \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "${POSTGRES_USER:-veiron}" \
  -d "${POSTGRES_DB:-veiron}" \
  -Fc \
  -f "$dest/postgres.dump"

tar -C "$workspace" -czf "$dest/config.tar.gz" \
  .env compose.yaml monitoring docker scripts

if [[ -d "$workspace/state/secrets" ]]; then
  tar -C "$workspace/state" -czf - secrets \
    | openssl enc -aes-256-cbc -salt -pbkdf2 \
        -pass file:/run/secrets/backup_passphrase \
        -out "$dest/secrets.tar.gz.enc"
fi

if [[ "${CHAIN_SNAPSHOT_ENABLED:-true}" == "true" ]]; then
  compose=(docker compose --env-file .env -f compose.yaml)
  stopped=false
  if [[ "${CHAIN_SNAPSHOT_STOP_SERVICES:-true}" == "true" ]]; then
    "${compose[@]}" stop veiron-indexer veiron-rpc veiron-node
    stopped=true
  fi
  cleanup() {
    if [[ "$stopped" == true ]]; then
      "${compose[@]}" up -d veiron-node veiron-rpc veiron-indexer || true
    fi
  }
  trap cleanup EXIT
  tar -C "$workspace/state/data" -czf "$dest/chain-state.tar.gz" chain mempool indexer node
  cleanup
  stopped=false
  trap - EXIT
fi

sha256sum "$dest"/* > "$dest/SHA256SUMS"

if [[ "${BACKUP_REMOTE_ENABLED:-false}" == "true" ]]; then
  : "${R2_ENDPOINT:?R2_ENDPOINT is required for remote backup}"
  : "${R2_BUCKET:?R2_BUCKET is required for remote backup}"
  : "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required for remote backup}"
  r2_secret="$(cat /run/secrets/r2_secret_access_key)"
  export RCLONE_CONFIG_R2_TYPE=s3
  export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
  export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$r2_secret"
  export RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT"
  export RCLONE_CONFIG_R2_REGION="${R2_REGION:-auto}"
  rclone copy "$dest" "r2:${R2_BUCKET}/veiron/$stamp" --checksum --immutable
fi

find "$backup_root" -mindepth 1 -maxdepth 1 -type d \
  -mtime "+${BACKUP_RETENTION_DAYS:-30}" -exec rm -rf {} +

cat > "$metrics_dir/veiron_backup.prom" <<EOF
# HELP veiron_backup_last_success_unixtime Last successful Veiron backup.
# TYPE veiron_backup_last_success_unixtime gauge
veiron_backup_last_success_unixtime $(date +%s)
# HELP veiron_backup_last_size_bytes Size of the last Veiron backup.
# TYPE veiron_backup_last_size_bytes gauge
veiron_backup_last_size_bytes $(du -sb "$dest" | awk '{print $1}')
EOF

echo "Backup completed: $dest"
