# Veiron Docker Control Plane — Validation Report

Date: 2026-07-20

## Passed

- YAML parsing for Compose, GitHub Actions and monitoring configuration;
- JSON parsing for the Grafana dashboard and package manifest;
- Jinja parsing for the web installer templates;
- representative rendering and TOML parsing for node, RPC, admin and pool templates;
- Python bytecode compilation for the operations controller;
- Bash syntax validation for every generated shell script;
- unified-diff structural validation for the Docker compatibility patch;
- secret-layout check confirming that `.env`, runtime `state/` and generated credentials are not included.

## Not executable in this environment

- `docker compose config`;
- Docker image builds;
- Rust compilation and tests against the complete repository;
- live Cloudflare API provisioning;
- end-to-end deployment on a Linux host.

These checks require applying the package to the full repository on a host or GitHub Actions runner with Docker. The included workflow performs Compose rendering and image builds for pull requests, and publishes GHCR images only for non-PR events.

## Known product migration still open

The existing Rust fleet invitation generator still emits the legacy Ubuntu/systemd installation command. Docker `controller`, `standalone` and `agent` roles are implemented in the web installer, including enrollment token persistence and P2P seeds, but the old invitation UI needs a dedicated Rust/UI migration before it can generate the new Docker command itself.
