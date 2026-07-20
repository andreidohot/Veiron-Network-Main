# Veiron Project Audit — 2026-07-17

> **Historical record — not current implementation guidance.** This dated audit
> is retained unchanged below for traceability. Use current component READMEs,
> `../DOCUMENTATION_INVENTORY.md`, and `NETWORK_MATURITY.md` for current status.

> **Raportul complet (catalog de probleme + remedieri):**  
> [`PROJECT_AUDIT_COMPLETE_2026-07-17.md`](./PROJECT_AUDIT_COMPLETE_2026-07-17.md)

## Verdict (actualizat post-audit)

**Protocol / VPS candidate:** operabil ca Mainnet Candidate, **nu** ca mainnet public live.

**Desktop:** un singur path de produs — **`veiron-desktop-tauri`**. Arborele Electron a fost **eliminat** din monorepo.

**Probleme majore încă deschise (P0/P1 rămase):**

| ID | Problemă | Status |
|---|---|---|
| A-C01 | Wallet `private_key_hex` plaintext pe disc | Open |
| A-C02 | Multiple desktop stacks / packaging greșit | **Closed** — Electron removed; Windows installer → Tauri |
| A-H01 | RPC `public-submit` expune mining fără auth app | Open |
| A-H08 | Keystore helper + mnemonic prin WebView | Open (Tauri only) |
| A-H09 | Version skew; updater Tauri off | Partial — product version 0.7.0; updater still honest/off |
| A-H10 | CI pe Electron | **Closed** — Tauri-only workflows; assert no Electron artifacts |

## Platform maturity (scurt)

| Surface | State |
|---|---|
| Windows Tauri 0.7.0 | Product Control Center |
| Linux Tauri (deb/AppImage/rpm/PKGBUILD) | Product path; host smoke still recommended |
| Electron | **Removed** from repository |
| egui `veiron-desktop` | Non-ship CLI shell only |
| Android | Prototype (fără sign/submit) |
| Pool / indexer reorg | Prototype / incomplete |

## Next

Urmează backlog-ul **P0 → P1 → P2** din raportul complet, secțiunea 6 (fără reintroducere Electron).
