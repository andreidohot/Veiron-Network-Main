#!/usr/bin/env bash
set -Eeuo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

require_docker=false
if [[ "${1:-}" == "--require-docker" ]]; then
  require_docker=true
fi

[[ -f .env ]] || cp .env.example .env
mkdir -p state/secrets state/config/generated
for secret in admin_password postgres_password grafana_password setup_token cloudflare_api_token cloudflare_tunnel_token pool_admin_token backup_passphrase r2_secret_access_key discord_webhook telegram_bot_token database_url postgres_exporter_dsn smtp_password; do
  [[ -f "state/secrets/$secret" ]] || printf 'validation-placeholder\n' > "state/secrets/$secret"
done
[[ -f state/config/generated/alertmanager.yml ]] || cp monitoring/alertmanager/alertmanager.yml state/config/generated/alertmanager.yml

python3 - <<'PY'
import json
from pathlib import Path
import yaml

root = Path('.')
for path in [
    root / 'compose.yaml',
    root / 'installer.compose.yaml',
    root / 'monitoring/prometheus/prometheus.yml',
    root / 'monitoring/prometheus/alerts.yml',
    root / 'monitoring/alertmanager/alertmanager.yml',
    root / 'monitoring/blackbox/blackbox.yml',
    root / 'monitoring/loki/loki.yml',
    root / 'monitoring/grafana/provisioning/datasources/datasources.yml',
    root / 'monitoring/grafana/provisioning/dashboards/dashboard-provider.yml',
]:
    with path.open('r', encoding='utf-8') as handle:
        yaml.safe_load(handle)

with (root / 'monitoring/grafana/dashboards/veiron-overview.json').open('r', encoding='utf-8') as handle:
    json.load(handle)
PY

python3 -m py_compile docker/ops/app.py
find scripts docker -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n

echo "Static YAML, JSON, Python and Bash validation passed."

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose --env-file .env -f compose.yaml config >/dev/null
  docker compose -f installer.compose.yaml config >/dev/null
  echo "Docker Compose rendering passed."
elif [[ "$require_docker" == true ]]; then
  echo "Docker Compose v2 is required for full validation." >&2
  exit 127
else
  echo "WARNING: Docker is unavailable; Compose rendering and image builds were not executed." >&2
fi
