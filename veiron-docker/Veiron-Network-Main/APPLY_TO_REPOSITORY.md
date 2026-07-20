# Apply this package to Veiron-Network-Main

This archive mirrors repository paths.

Copy its contents into the root of:

```text
andreidohot/Veiron-Network-Main
```

Then review and commit:

```bash
git checkout -b agent/docker-control-plane-stack
cp -a /path/to/archive/Veiron-Network-Main/. .
git status
cd veiron-release/vps-control-plane
./scripts/validate-stack.sh
cd ../../..
git add .github/workflows/docker-control-plane-images.yml \
  veiron-release/vps-control-plane
git commit -m "feat(vps): add Docker deployment control plane"
git push -u origin agent/docker-control-plane-stack
```

Open a draft pull request into `main`.

The package is additive: it does not delete the existing Ubuntu/systemd installer. Keep the legacy path until Docker migration and restore testing are complete.


## Important review points

- The runtime Dockerfile applies a narrow Docker compatibility patch to the existing Rust admin service.
- The existing fleet invitation generator still emits the legacy Ubuntu command; use the Docker web installer in `agent` role until that Rust/UI migration is completed.
- Do not remove the legacy systemd installer until a real host migration, restore test and rollback drill pass.
