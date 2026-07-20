# Veiron Update Policy

Status: Implemented / Mainnet Candidate

## Desktop Control Center

The supported desktop updater lives in
`veiron-desktop-tauri/src-tauri/src/updates.rs`.

- Background polling only detects and announces a newer GitHub release.
- Download and installation require an explicit action in Update Center.
- `SHA256SUMS` is mandatory and every selected asset is checked for declared
  size and SHA-256 before it is executed or installed.
- Equal or older versions are rejected.
- Managed Veiron processes stop through the operator boundary before an
  approved replacement is applied.
- The removed `auto-update-desktop.ps1` path is not supported because it applied
  executable updates without the Control Center approval boundary.

Set `VEIRON_DISABLE_AUTO_UPDATE=1` only for debugging the packaged desktop
application. A GitHub token is optional for API rate limits and must remain in
the operating-system credential environment, never in this repository.

## VPS control plane

VPS updates are intentionally unattended operator automation and are separate
from desktop user approval. The canonical implementation is
`veiron-release/vps-control-plane/auto-update.sh` plus its systemd timer.

The VPS updater accepts only an exact control-plane archive with its mandatory
checksum companion, rejects version downgrades, creates a rollback archive,
checks every required service after replacement, and restores the previous
binaries and service state on failure. The VPS package never installs a miner.

See `../../veiron-release/vps-control-plane/README.md` for installation and
release asset names.
