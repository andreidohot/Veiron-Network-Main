# Workspace Scope and Rust Lint Policy

Status: Draft / engineering hygiene  
Related: `docs/release/NETWORK_MATURITY.md`, root `Cargo.toml`

---

## 1. Cargo workspace membership (intentional)

Root `Cargo.toml` lists only crates that:

1. Share the monorepo `Cargo.lock` and dependency versions;
2. Are exercised by `cargo test --workspace` / G1 release-gate;
3. Are pure Rust libraries or binaries (not primary Node/Gradle apps).

### In workspace

| Member | Role |
|---|---|
| `veiron-core` | Protocol |
| `veiron-node` | Node / P2P |
| `veiron-rpc-gateway` | HTTP RPC |
| `veiron-wallet` | Wallet CLI |
| `veiron-indexer` | Indexer |
| `veiron-miner` | NVIDIA CUDA-only FiroPoW miner |
| `veiron-mining-pool` | Pool prototype |
| `veiron-desktop` | egui Control Center (legacy shell) |
| `veiron-mobile-core` | FFI for Android |
| `veiron-release/vps-control-plane/admin-server` | VPS admin agent |

### Out of workspace (by design)

| Path | Why separate |
|---|---|
| `veiron-explorer` | Vite/React; own `package.json` / npm CI |
| `veiron-website` | Marketing + Node server |
| `veiron-desktop-tauri` | Nested `[workspace]` (Tauri requirement); Control Center product path |
| `veiron-android` | Gradle / NDK; consumes `veiron-mobile-core` via scripts |
| `veiron-desktop-tauri/native/keystore-helper` | Nested workspace sidecar binary |
| `veiron-sdk` | TypeScript public client (`npm run build` in-tree); not a Cargo member |
| Empty product shells (`veiron-contracts`, marketplace, …) | Reserved names; no crate / no product |

**This is not an oversight.** Mixing npm/Gradle into `cargo test --workspace` would break G1 and slow every Rust change.

### How to validate excluded trees

| Tree | Check |
|---|---|
| Explorer | `cd veiron-explorer && npm ci && npm run build` |
| Website | `cd veiron-website && npm ci && npm run build` |
| Tauri | `cd veiron-desktop-tauri && npm ci && npm run tauri build` (or check) |
| Android | `cd veiron-android && ./gradlew …` |
| Keystore helper | `cargo check` inside its directory |

---

## 2. `expect` / `unwrap` and static scan noise

### Policy

| Location | Allowed? | Notes |
|---|---|---|
| `#[cfg(test)]` modules / `tests/*.rs` | **Yes** | Prefer clear `expect("reason")` over silent unwrap |
| Production `src/` paths | **Avoid** | Prefer `?`, `map_err`, `ok_or_else` |
| `main` process boundaries | Prefer log + `exit(1)` over panic | Already done for Tauri/desktop entry |

### Why scanners over-count risk

Most `expect`/`unwrap`/`panic!` hits under `veiron-node`, `veiron-mining-pool`, etc. are **test fixtures** (e.g. `p2p.rs` `mod tests`).  
That is acceptable Rust style and does **not** mean production services panic on those lines.

### Recommended scan filters

```text
# Prefer production-only greps (examples):
rg "\.(unwrap|expect)\(" -g '*.rs' -g '!**/tests/**' 
# Then manually skip blocks under #[cfg(test)]

# Or restrict to non-test modules:
rg "\.(unwrap|expect)\(" veiron-core/src veiron-node/src veiron-rpc-gateway/src \
  veiron-wallet/src veiron-miner/src veiron-mining-pool/src veiron-indexer/src
# Exclude lines after "mod tests" in the same file when reviewing.
```

Do **not** force `clippy::unwrap_used = deny` on `--all-targets` until test modules are annotated; it inflates failures without improving production safety.

---

## 3. `#[allow(clippy::…)]` annotations

Known intentional allows:

| Site | Lint | Reason |
|---|---|---|
| `veiron-core` `Block::new_with_version` | `too_many_arguments` | Header fields map 1:1 to consensus fields; a mega-struct would be pure ceremony today |
| `veiron-core` `Transaction::new` / `new_signed` | `too_many_arguments` | Same — wire shape is the API |
| `veiron-node` `p2p` handlers | `too_many_arguments` | Swarm event context; refactor to a context struct is backlog |

When adding new allows: **comment why** next to the attribute. Prefer small context structs for new code.

---

## 4. Desktop CSP (inline styles)

Production CSP (Tauri packaged Control Center):

- **`script-src 'self'`** — no inline scripts (theme boot is an external file).
- **`style-src 'self' 'unsafe-inline'`** — still required for React `style={{ … }}` props used across the Control Center UI.

Tightening further means migrating layout props to CSS classes (large UI pass). Until then:

- Do **not** reintroduce `script-src 'unsafe-inline'` in packaged builds;
- Dev-only Vite HMR exceptions must never ship in packaged apps.

See also desktop security notes in prior CSP/IPC hardening work.

---

## 5. Analysis reports

| Report | Scope |
|---|---|
| `RUST_CODE_ANALYSIS_REPORT.md` (root) | **Superseded summary** — points here + maturity + current residual risks |
| `docs/release/PROJECT_AUDIT_COMPLETE_*.md` | Product/security audit |
| This file | Workspace + lint process |

When re-running static analysis, always state **which crates** and **whether tests are included**.
