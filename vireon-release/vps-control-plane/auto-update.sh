#!/usr/bin/env bash
# Veiron VPS auto-update agent — no operator approval.
# Polls GitHub Releases for the latest release carrying the VPS bundle,
# verifies SHA-256, replaces node/rpc/indexer/admin/pool binaries, restarts units.
#
# Env:
#   VEIRON_GITHUB_REPO   default: andreidohot/veiron-network
#   VEIRON_UPDATE_PREFIX default: v
#   VEIRON_ASSET_NAME    default: veiron-vps-control-linux-x86_64.tar.gz
#   VEIRON_FORCE         set to 1 to re-apply the same tag
#   GITHUB_TOKEN         optional (higher API rate limits)
set -euo pipefail

REPO="${VEIRON_GITHUB_REPO:-andreidohot/veiron-network}"
TAG_PREFIX="${VEIRON_UPDATE_PREFIX:-v}"
ASSET_NAME="${VEIRON_ASSET_NAME:-veiron-vps-control-linux-x86_64.tar.gz}"
INSTALL_ROOT="${VEIRON_INSTALL_ROOT:-/opt/veiron}"
STATE_DIR="${VEIRON_UPDATE_STATE_DIR:-/var/lib/veiron-control}"
LOG_TAG="veiron-auto-update"
API="https://api.github.com/repos/${REPO}/releases?per_page=30"

log() { echo "[$LOG_TAG] $*"; logger -t "$LOG_TAG" "$*" 2>/dev/null || true; }
fail() { log "ERROR: $*"; exit 1; }

[[ $EUID -eq 0 ]] || fail "must run as root"
[[ -d "$INSTALL_ROOT/bin" ]] || fail "Veiron is not installed at $INSTALL_ROOT"

mkdir -p "$STATE_DIR/updates"
STATE_FILE="$STATE_DIR/auto-update.state"
INSTALLED_VERSION="$(tr -d '[:space:]' < "$INSTALL_ROOT/vps-control-plane/VERSION" 2>/dev/null || echo "0.0.0")"
APPLIED_TAG=""
if [[ -f "$STATE_FILE" ]]; then
  stored_tag="$(sed -n 's/^APPLIED_TAG=//p' "$STATE_FILE" | head -n 1)"
  if [[ "$stored_tag" =~ ^[A-Za-z0-9._-]+$ ]]; then
    APPLIED_TAG="$stored_tag"
  fi
fi

auth_args=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  auth_args=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

log "checking GitHub releases for ${REPO} (installed VERSION=${INSTALLED_VERSION}, applied_tag=${APPLIED_TAG:-none})"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "User-Agent: veiron-auto-update" \
  "${auth_args[@]}" \
  "$API" >"$tmp" || fail "GitHub releases API request failed"

# Pick newest non-draft release whose tag starts with the VPS prefix and has our asset.
mapfile -t selection < <(python3 - "$tmp" "$TAG_PREFIX" "$ASSET_NAME" <<'PY'
import json, sys
path, prefix, asset_name = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, encoding="utf-8") as fh:
    releases = json.load(fh)
for rel in releases:
    if rel.get("draft"):
        continue
    tag = rel.get("tag_name") or ""
    if not tag.startswith(prefix):
        continue
    for asset in rel.get("assets") or []:
        if asset.get("name") == asset_name and asset.get("browser_download_url"):
            sha = ""
            for other in rel.get("assets") or []:
                if other.get("name") == asset_name + ".sha256" and other.get("browser_download_url"):
                    sha = other["browser_download_url"]
                    break
            print(tag)
            print(asset["browser_download_url"])
            print(sha)
            print(rel.get("name") or tag)
            print(rel.get("published_at") or "")
            sys.exit(0)
sys.exit(2)
PY
) || fail "no published VPS control-plane release with asset ${ASSET_NAME}"

TAG="${selection[0]}"
BUNDLE_URL="${selection[1]}"
SHA_URL="${selection[2]}"
RELEASE_NAME="${selection[3]}"
PUBLISHED_AT="${selection[4]}"
[[ "$TAG" =~ ^[A-Za-z0-9._-]+$ ]] || fail "release returned an unsafe tag"
[[ "$BUNDLE_URL" == https://* ]] || fail "release returned a non-HTTPS bundle URL"
[[ "$SHA_URL" == https://* ]] || fail "release is missing the required HTTPS .sha256 asset"

log "latest candidate: tag=${TAG} name=${RELEASE_NAME} published=${PUBLISHED_AT}"

if [[ -n "${APPLIED_TAG:-}" && "$APPLIED_TAG" == "$TAG" && "${VEIRON_FORCE:-0}" != "1" ]]; then
  log "already on ${TAG}; nothing to do"
  exit 0
fi

# Soft version gate: accept complete product tags and independent VPS RC tags.
TAG_VERSION="$(echo "$TAG" | sed -nE 's/^(vps-control-v|v)([0-9]+\.[0-9]+\.[0-9]+).*/\2/p')"
if [[ -n "$TAG_VERSION" ]] && dpkg --compare-versions "$TAG_VERSION" lt "$INSTALLED_VERSION"; then
  log "refusing downgrade from VERSION ${INSTALLED_VERSION} to ${TAG_VERSION} (${TAG})"
  exit 0
fi
if [[ -n "$TAG_VERSION" && "$TAG_VERSION" == "$INSTALLED_VERSION" && "${VEIRON_FORCE:-0}" != "1" && -n "${APPLIED_TAG:-}" ]]; then
  # Same VERSION line but newer rc tag still upgrades binaries.
  :
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"; rm -f "$tmp"' EXIT
cd "$work"

log "downloading ${BUNDLE_URL}"
curl -fsSL -o "$ASSET_NAME" "$BUNDLE_URL" || fail "bundle download failed"
curl -fsSL -o "${ASSET_NAME}.sha256" "$SHA_URL" || fail "sha256 download failed"
sha256sum -c "${ASSET_NAME}.sha256" || fail "SHA-256 verification failed"

tar -xzf "$ASSET_NAME"
root="$work/veiron-vps-control"
[[ -d "$root" ]] || root="$work"
for required in bin/veiron-node bin/veiron-rpc-gateway bin/veiron-indexer bin/veiron-vps-admin bin/veiron-mining-pool; do
  [[ -f "$root/$required" ]] || fail "bundle missing $required"
done

# Backup current install (binaries + control plane only; keep /etc and chain data)
backup="$STATE_DIR/pre-auto-update-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -czf "$backup" -C / \
  opt/veiron/bin \
  opt/veiron/vps-control-plane \
  2>/dev/null || fail "could not create rollback archive"
log "backup: $backup"

units=(veiron-indexer-refresh.timer veiron-mining-pool veiron-vps-admin veiron-rpc veiron-node)
active=()
for unit in "${units[@]}"; do
  if systemctl is-active --quiet "$unit" 2>/dev/null; then
    active+=("$unit")
  fi
done

log "stopping services for binary swap"
systemctl stop veiron-indexer-refresh.timer veiron-mining-pool veiron-vps-admin veiron-rpc veiron-node 2>/dev/null || true

install -d -m 0755 "$INSTALL_ROOT/bin"
cp -a "$root/bin/." "$INSTALL_ROOT/bin/"
chmod 0755 "$INSTALL_ROOT/bin/"*
if [[ -d "$root/vps-control-plane" ]]; then
  rm -rf "$INSTALL_ROOT/vps-control-plane"
  cp -a "$root/vps-control-plane" "$INSTALL_ROOT/vps-control-plane"
  find "$INSTALL_ROOT/vps-control-plane" -type f -name '*.sh' -exec chmod 0755 {} +
  if [[ -d "$INSTALL_ROOT/vps-control-plane/systemd" ]]; then
    install -m 0644 "$INSTALL_ROOT/vps-control-plane/systemd/"* /etc/systemd/system/ 2>/dev/null || true
    systemctl daemon-reload || true
  fi
fi
# Optional configs/docs from bundle (do not overwrite live /etc)
if [[ -d "$root/configs" ]]; then
  install -d -m 0755 "$INSTALL_ROOT/configs"
  cp -a "$root/configs/." "$INSTALL_ROOT/configs/" 2>/dev/null || true
fi

log "starting services"
systemctl daemon-reload || true
# Policy: never run a miner on VPS
systemctl stop veiron-miner 2>/dev/null || true
systemctl disable veiron-miner 2>/dev/null || true
systemctl mask veiron-miner 2>/dev/null || true

systemctl enable veiron-node veiron-rpc veiron-vps-admin veiron-indexer-refresh.timer 2>/dev/null || true
systemctl start veiron-node veiron-rpc veiron-vps-admin veiron-indexer-refresh.timer || true
if systemctl is-enabled --quiet veiron-mining-pool 2>/dev/null; then
  systemctl start veiron-mining-pool || true
fi

sleep 3
failed=0
for unit in veiron-node veiron-rpc veiron-vps-admin veiron-indexer-refresh.timer; do
  if ! systemctl is-active --quiet "$unit"; then
    log "WARNING: $unit is not active after update"
    failed=1
  fi
done
if systemctl is-enabled --quiet veiron-mining-pool 2>/dev/null \
  && ! systemctl is-active --quiet veiron-mining-pool; then
  log "WARNING: veiron-mining-pool is enabled but not active after update"
  failed=1
fi

if [[ $failed -ne 0 ]]; then
  log "update health check failed; restoring ${backup}"
  systemctl stop veiron-indexer-refresh.timer veiron-mining-pool veiron-vps-admin veiron-rpc veiron-node 2>/dev/null || true
  tar -xzf "$backup" -C / || fail "automatic rollback extraction failed; restore ${backup} manually"
  systemctl daemon-reload || true
  for unit in "${active[@]}"; do
    systemctl start "$unit" || true
  done
  fail "update failed and previous binaries were restored from ${backup}"
fi

# Point fleet release URL at the verified, healthy asset so invitations stay current.
if [[ -f /etc/veiron-control/admin.toml ]] \
  && grep -q '^release_bundle_url' /etc/veiron-control/admin.toml; then
  sed -i "s|^release_bundle_url *=.*|release_bundle_url = \"${BUNDLE_URL}\"|" /etc/veiron-control/admin.toml
fi

NEW_VERSION="$(tr -d '[:space:]' < "$INSTALL_ROOT/vps-control-plane/VERSION" 2>/dev/null || echo "$INSTALLED_VERSION")"
printf 'APPLIED_TAG=%s\nAPPLIED_AT_UTC=%s\nAPPLIED_VERSION=%s\n' \
  "$TAG" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$NEW_VERSION" >"$STATE_FILE"
chmod 0640 "$STATE_FILE"

log "SUCCESS applied ${TAG} (VERSION ${NEW_VERSION}) — node/rpc/indexer/admin/pool binaries swapped without approval"
exit 0
