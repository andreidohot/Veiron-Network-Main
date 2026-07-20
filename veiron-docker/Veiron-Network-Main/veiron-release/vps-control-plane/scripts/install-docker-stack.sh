#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

command -v docker >/dev/null || {
  echo "Docker Engine is required. Install Docker before running this script." >&2
  exit 69
}
docker compose version >/dev/null || {
  echo "Docker Compose v2 is required." >&2
  exit 69
}

mkdir -p state/secrets state/config/generated state/ops
chmod 0700 state/secrets

docker compose -f installer.compose.yaml up -d --build veiron-installer
token="$(docker compose -f installer.compose.yaml exec -T veiron-installer sh -c 'cat /workspace/state/secrets/setup_token')"
host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
host_ip="${host_ip:-127.0.0.1}"

cat <<EOF

Veiron Docker web installer is running.

Open:
  http://${host_ip}:${OPS_BOOTSTRAP_PORT:-8080}/?token=${token}

Keep this token private. The installer has direct Docker socket access.

EOF
