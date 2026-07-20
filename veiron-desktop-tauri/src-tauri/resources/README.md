# Packaged runtime resources

Populated by `npm run prepare:native:sidecars` from `veiron-desktop/installer/stage`.

Expected layout after staging:

```
resources/
  bin/                 veiron-node, miner, rpc-gateway, indexer, keystore-helper
  scripts/local/       operator helpers
  configs/             genesis + local configs
  docs/release/        genesis review artifacts
  explorer/            static explorer
  veiron.ps1 / .cmd    operator entrypoints (Windows stage)
```

Development builds do not require this folder; the monorepo root is used as the workspace.
