# Veiron Network — Audit complet al proiectului

> **Historical record — not current implementation guidance.** This dated audit
> is retained in its original language and state for traceability. It describes
> removed CPU/OpenCL and desktop paths. Use current component READMEs,
> `../DOCUMENTATION_INVENTORY.md`, and `NETWORK_MATURITY.md` for current status.

| | |
|---|---|
| **Data** | 2026-07-17 |
| **Scope** | Monorepo `Veiron_Network` (protocol, node, wallet, RPC, miner, pool, desktop, Android, explorer, website, VPS, CI) |
| **Metoda** | Citire cod sursă + config + CI + docs de securitate; verificare pe căi concrete (nu doar pe rapoarte vechi) |
| **Status rețea** | Mainnet Candidate / Prototype — **nu** mainnet public live |
| **Verdict** | Protocolul local + VPS pot opera ca **candidate**, dar există **probleme Critical/High** pe stocare chei, expunere RPC mining, updater inactiv și maturitate P2P/reorg end-to-end. **Nu** declarați „production mainnet” până la remedierea P0–P1. |

> **Post-audit update:** `veiron-desktop-electron` a fost **șters** din monorepo. Control Center = **doar Tauri** (`veiron-desktop-tauri` 0.7.0).  
> Secțiunile de mai jos care încă menționează Electron ca „legacy în repo / CI” sunt **istoric al auditului**; statusul curent e **Removed**.

**Supersede:** actualizează și completează `docs/release/PROJECT_AUDIT_2026-07-17.md`.

---

## 1. Rezumat executiv

### Ce funcționează (puteri reale)

- Workspace Rust coerent: `veiron-core`, `node`, `wallet`, `rpc-gateway`, `indexer`, `miner`, `mining-pool`, `desktop` (egui), `mobile-core`, VPS admin.
- Gates Mainnet Candidate: `allow_mainnet_candidate`, network ID / port / magic separate, reset refusal, genesis pin.
- PoW Blake3, validări mempool (fee, signature, zero-amount, cap), duplicate tx-hash.
- Node: reorg parțial (`adopt_candidate_chain`), mempool reconcile, P2P libp2p (TCP+Noise+Yamux) — **nu** încă product multi-node complet.
- Desktop **Tauri 0.6.1**: UI modern, dual theme, miner scene data-bound, VPS-first RPC.
- Linux package script: **Tauri** (`scripts/release/build-linux-desktop.sh`).
- Politică secrets + scripturi hygiene; wallet material în afara repo (`~/.veiron-mainnet/wallets/`).

### Ce blochează un launch serios

| Prioritate | Temă | Impact |
|---|---|---|
| **P0** | Wallet / keystore plaintext sau helper nesecurizat | Pierdere fonduri |
| **P0** | RPC `public-submit` + mining endpoints fără auth | Abuz template/submit pe VPS |
| **P0** | 3 clienți desktop + Windows installer pe egui/Electron | Artefacte greșite / versiuni false |
| **P1** | Indexer + pool ne-reorg-aware; storage JSONL O(n) | Date greșite după fork |
| **P1** | P2P fără peer score/header-first/bootstrap public | Sync fragil multi-host |
| **P1** | Updater Tauri off; `latest.yml` vechi Electron | Utilizatori pe build-uri stale |
| **P2** | Android fără sign/submit; i18n; teste UI/E2E | Produs incomplet pe alte platforme |
| **P2** | Docs de risc învechite vs cod | Decizie greșită pe maturitate |

### Scor pe zone (0–5, 5 = gata producție publică)

| Zonă | Scor | Notă |
|---|:---:|---|
| Protocol / consensus local | 3.5 | Coinbase dual-rule; nonce model slab |
| Node + storage | 3.0 | Reorg există; JSONL full-rewrite; unchecked append |
| P2P | 2.5 | Transport real; lipsesc bans/header-first/soak public |
| RPC gateway | 2.5 | Profile + body/CORS; fără auth app; mining pe public-submit |
| Wallet / keys | 1.5 | Hex plaintext pe disc; mnemonic pe IPC Tauri |
| Miner CPU/GPU | 3.5 | Parity Blake3 rezonabilă; legat de template RPC |
| Mining pool | 2.0 | Prototype; admission in-memory; fără HSM payout |
| Indexer / explorer | 2.5 | Rebuild full; non-atomic write; explorer fără teste |
| Desktop Tauri | 3.5 | Cel mai matur UI; keystore/CSP/updater/release path |
| Desktop Electron/egui | 1.0 | Legacy; încă în CI/release Windows |
| Android | 1.5 | Monitor/select; cleartext; fără tx |
| Website | 2.5 | Marketing + admin; env defaults |
| CI / release | 2.0 | Rust solid; desktop CI încă Electron; Windows installer greșit |
| Docs / memory | 3.0 | Bogate dar uneori stale vs cod |

---

## 2. Inventar monorepo

### Crate-uri / pachete active (cu cod)

| Path | Rol |
|---|---|
| `veiron-core` | Protocol, PoW, address, emission, consensus, state |
| `veiron-node` | Node, JSONL chain, mempool, P2P, mine helpers |
| `veiron-wallet` | CLI wallet, mnemonic, sign/submit |
| `veiron-rpc-gateway` | HTTP RPC (read / submit / mining profiles) |
| `veiron-indexer` | Index JSON din chain |
| `veiron-miner` | Miner CPU + OpenCL GPU |
| `veiron-mining-pool` | Pool prototype |
| `veiron-desktop` | Control Center egui (legacy packaging) |
| `veiron-desktop-tauri` | **Produs țintă** Control Center 0.6.1 |
| `veiron-desktop-electron` | Legacy 0.3.5, încă în CI release |
| `veiron-explorer` | UI static explorer |
| `veiron-android` + `veiron-mobile-core` | Client mobil early |
| `veiron-website` | Site + server admin |
| `veiron-release/` | VPS scripts, control-plane, apps |

### Placeholder / draft (README only sau minim)

`veiron-benchmarks`, `veiron-community`, `veiron-contracts`, `veiron-examples`, `veiron-faucet`, `veiron-governance`, `veiron-infra`, `veiron-marketplace`, `veiron-monitoring`, `veiron-ops`, `veiron-passport`, `veiron-research`, `veiron-sdk`, `veiron-security`, `veiron-tests` — **nu** se livrează ca produs; pot umfla percepția de maturitate.

---

## 3. Probleme identificate (catalog)

Severitate: **Critical** > **High** > **Medium** > **Low** > **Info**.  
ID-urile (`A-…`) pot fi folosite ca tracking în backlog.

### 3.1 Critical

#### A-C01 — Chei private wallet în plaintext pe disc
| | |
|---|---|
| **Component** | `veiron-wallet` |
| **Path** | `veiron-wallet/src/storage.rs` — `StoredWallet.private_key_hex`, `write_wallet_with_metadata` |
| **Problemă** | Wallet-ul se salvează ca JSON cu private key hex, fără parolă, fără AEAD, fără restricții explicite de permisiuni fișier. |
| **Impact** | Compromitere disc / backup / malware = pierdere fonduri. |
| **Remediere** | Keystore criptat (Argon2id + AEAD), zeroize în memorie, permisiuni 0600 / ACL Windows, migrare fișiere vechi. **Gate** pentru orice claim non-local. |

#### A-C02 — Trei stack-uri desktop + installer Windows greșit
| | |
|---|---|
| **Component** | Release / desktop |
| **Path** | `veiron-desktop-tauri` (0.6.1), `veiron-desktop-electron` (0.3.5), `veiron-desktop` (egui 0.1.0); `scripts/release/build-windows-installer.ps1` |
| **Problemă** | Scriptul Windows construiește **egui** `veiron-desktop`, stage Inno Setup, și citește versiunea din **Electron** `package.json`. Nu apelează Tauri 0.6.1. |
| **Impact** | Pachete „oficiale” pot fi vechi/greșite; utilizatori pe CLI egui sau Electron în timp ce dezvoltarea e pe Tauri. |
| **Remediere** | Un singur path: `prepare-native` + `tauri build --bundles nsis,msi`; versiune din `tauri.conf.json`; archive Electron/egui ca `legacy/`. |

---

### 3.2 High

#### A-H01 — RPC `public-submit` expune mining fără autentificare aplicație
| | |
|---|---|
| **Component** | `veiron-rpc-gateway` + VPS |
| **Path** | `veiron-rpc-gateway/src/config.rs` (`allows_mining_endpoints`); `app.rs` rute `/mining/*`; `veiron-release/vps/configs/rpc.vps.toml` `access_mode = "public-submit"` |
| **Problemă** | Profilul permite template + submit mining pe rețeaua expusă (nginx rate-limit, dar fără token miner). |
| **Impact** | Oricine cu acces HTTP poate trage template-uri / încerca submit. |
| **Remediere** | Mining doar `Local` sau token miner; deny nginx pe `/mining/` public; aliniere README/teste. |

#### A-H02 — Fără auth / rate-limit la nivel de aplicație RPC
| | |
|---|---|
| **Component** | `veiron-rpc-gateway` |
| **Path** | `app.rs`, `config.rs` |
| **Problemă** | Controale: bind, body size, CORS, access_mode. Lipsesc API key/JWT, rate limit in-process, quotas. |
| **Impact** | Expunere greșită = abuz; dependență totală de nginx. |
| **Remediere** | Rate limit in-process; auth opțional pe submit/mining; respinge CORS `*` în non-local. |

#### A-H03 — Indexer nu urmează reorg; scriere non-atomică
| | |
|---|---|
| **Component** | `veiron-indexer` |
| **Path** | `index.rs` (rebuild full); `storage.rs` (`File::create` truncate-write) |
| **Problemă** | După reorg pe node, indexul rămâne stale până la reindex manual; crash mid-write poate corupe `index.json`. |
| **Impact** | Explorer/RPC views greșite; corupție index. |
| **Remediere** | Detect tip mismatch → rollback/rebuild; atomic write + fsync (ca node). |

#### A-H04 — JSONL chain: rewrite complet + `append_unchecked`
| | |
|---|---|
| **Component** | `veiron-node` |
| **Path** | `storage.rs` — `write_blocks_atomically`, `append_block` → unchecked |
| **Problemă** | Fiecare append rescrie lanțul (scală O(n)); API public unchecked poate lega tip invalid. |
| **Impact** | Performanță, risc corupție tip la misuse. |
| **Remediere** | Doar `append_validated` în producție; `pub(crate)` unchecked; plan storage pe height-indexed. |

#### A-H05 — P2P incomplet pentru multi-node public
| | |
|---|---|
| **Component** | `veiron-node` |
| **Path** | `p2p.rs`; draft `docs/protocol/12_P2P_NETWORKING_DRAFT.md` |
| **Problemă** | Există transport + fork adoption; lipsesc peer scoring/bans, header-first sync, resume, DHT/bootstrap public, NAT, soak multi-host. Cap reorg staged 2048. |
| **Impact** | Sync fragil; Sybil/abuse; deep fork policy neclară. |
| **Remediere** | TM-402…411 din `memory/NEXT_STEPS.md`; multi-host soak obligatoriu. |

#### A-H06 — Reorg node ≠ reorg end-to-end (indexer/pool/explorer)
| | |
|---|---|
| **Component** | node + consumers |
| **Path** | `devnet.rs` `adopt_candidate_chain`; mempool reconcile; **fără** notificare automată către indexer/pool |
| **Problemă** | Reorg unit-testat pe node; consumatorii nu se aliniază automat. |
| **Impact** | Vizibilitate greșită, payout/maturity greșite pe pool. |
| **Remediere** | Event reorg + reconcilieri; teste multi-serviciu. |

#### A-H07 — Mining pool nu e production-ready
| | |
|---|---|
| **Component** | `veiron-mining-pool` |
| **Path** | `app.rs` admission in-memory; `store.rs` JSON; `docs/security/MINING_POOL_RISKS.md` |
| **Problemă** | State process-local; fără DB tranzacțională; maturity prin poll; fără signer offline/HSM integrat. |
| **Impact** | Pierderi/accounting greșit la restart/multi-instance/reorg. |
| **Remediere** | Storage producție; reorg stream; payout offline; keep status Prototype până soak. |

#### A-H08 — Keystore helper: subprocess + mnemonic prin WebView
| | |
|---|---|
| **Component** | `veiron-desktop-tauri` |
| **Path** | `src-tauri/src/keystore.rs`; `native/keystore-helper/src/main.rs`; `RecoveryPhraseImport.tsx` |
| **Problemă** | Helper stdin/stdout fără autentificare părinte; `import_phrase` / `sign_submit` pot fi invocate de orice proces local care rulează binary-ul; phrase trece React → invoke → helper. |
| **Impact** | Escaladare locală; XSS/memory scrape pe phrase. |
| **Remediere** | In-process keyring sau pipe cu secret; import nativ fără phrase în JS; OS presence pentru sign. |

#### A-H09 — Version skew + updater mort
| | |
|---|---|
| **Component** | Desktop / release |
| **Path** | Tauri **0.6.1**; Electron **0.3.5**; `release-artifacts` 0.2–0.4.3; `latest.yml` **0.3.1**; `tauri.conf.json` `createUpdaterArtifacts: false`; `updates.rs` → phase `unavailable` |
| **Problemă** | Canal de update mincinos / vechi; UI update fără feed semnat. |
| **Impact** | Utilizatori pe build-uri cu bug-uri vechi. |
| **Remediere** | O singură versiune canonică; feed semnat Tauri sau ascunde UI update; curăță `release-artifacts`. |

#### A-H10 — CI release încă pe Electron
| | |
|---|---|
| **Component** | `.github/workflows` |
| **Path** | `candidate-release.yml`, `linux-desktop-ci.yml` (paths/Electron); `linux-desktop.yml` apelează script Tauri dar cache lockfile Electron |
| **Problemă** | Pipeline-uri nu reflectă Tauri ca produs unic. |
| **Impact** | Release greșit automat. |
| **Remediere** | Workflow-uri Tauri-only; fail dacă se buildează Electron package. |

---

### 3.3 Medium

#### A-M01 — Coinbase: consensus vs state
| | |
|---|---|
| **Path** | `veiron-core/src/consensus.rs` (`coinbase > max` permite underpay); `state.rs` (exact `==`) |
| **Notă** | `Chain::append_block` rulează ambele → underpay e respins în practică; implementări doar-consensus ar diverge. |
| **Fix** | Egalitate exactă în ambele + test under/over. |

#### A-M02 — Nonce nu e enforced consensus per-account
| | |
|---|---|
| **Path** | `state.rs` (balance + hash set); helpers `next_account_nonce` doar client-side |
| **Fix** | Document model clar sau sequential nonces în consensus. |

#### A-M03 — CSP Tauri prea larg pe `connect-src`
| | |
|---|---|
| **Path** | `tauri.conf.json` — `connect-src … https:` (orice HTTPS) |
| **Fix** | Pin RPC hosts + localhost (model mai strict ca Electron prod). |

#### A-M04 — Compat nonce fallback = 1
| | |
|---|---|
| **Path** | `keystore-helper` `fetch_remote_account_compat` → `next_nonce: 1` |
| **Impact** | Tx invalide / confuzie pe gateway vechi. |
| **Fix** | Fail closed fără `/account`. |

#### A-M05 — Theme dual persistence
| | |
|---|---|
| **Path** | `theme.ts` localStorage + `settings.json` |
| **Fix** | Single source of truth la boot. |

#### A-M06 — i18n RO incomplet
| | |
|---|---|
| **Path** | `src/shared/i18n.ts` — doar labels parțiale |
| **Fix** | Catalog complet sau ascunde limba până e gata. |

#### A-M07 — Teste UI / E2E absente
| | |
|---|---|
| **Path** | Tauri: câteva unit tests pure; fără Playwright pe binary |
| **Fix** | Smoke E2E: create wallet → prepare/sign → miner start. |

#### A-M08 — Android prototype
| | |
|---|---|
| **Path** | cleartext traffic; fără sign/submit |
| **Fix** | Label prototype; disable cleartext release; parity wallet. |

#### A-M09 — CORS `*` acceptat pe RPC
| | |
|---|---|
| **Path** | `rpc-gateway` `app.rs` |
| **Fix** | Respinge `*` dacă nu e Local. |

#### A-M10 — Control-plane admin = header spoofable
| | |
|---|---|
| **Path** | `admin-server` trust `x-veiron-admin-authenticated` (mitigat de bind loopback) |
| **Fix** | Shared secret / mTLS / Unix socket. |

#### A-M11 — P2P identity key permissions
| | |
|---|---|
| **Path** | `p2p.rs` `load_or_create_identity` — default FS perms |
| **Fix** | 0600 Unix + ACL Windows. |

#### A-M12 — `/p2p/status` pe toate profilele RPC
| | |
|---|---|
| **Fix** | Detalii peers doar Local; public = counters coarse. |

#### A-M13 — Checkpoint doar height 0
| | |
|---|---|
| **Path** | `veiron-core/src/checkpoint.rs` |
| **Fix** | Checkpoints intermediare pe măsură ce chain maturează. |

#### A-M14 — Mainnet checklist încă deschis
| | |
|---|---|
| **Path** | `docs/release/MAINNET_CANDIDATE_CHECKLIST.md`, SECURITY_GATE |
| **Fix** | Nu claim „mainnet live” până independent review + multi-node + storage. |

#### A-M15 — Pool admin token fișier plaintext
| | |
|---|---|
| **Fix** | Secret manager + rotație. |

#### A-M16 — Docs securitate stale
| | |
|---|---|
| **Path** | `PRODUCTION_RISKS.md` încă „no reorg” / P2P slab vs cod actual |
| **Fix** | Refresh după fiecare milestone (vezi A-I01). |

---

### 3.4 Low / Info

| ID | Severity | Problemă | Path / notă |
|---|---|---|---|
| A-L01 | Low | RPC default hardcodat `https://rpcnode.dohotstudio.com` | Cuplare infra |
| A-L02 | Low | Website `VITE_API_BASE_URL` fallback localhost | Fail build prod fără env |
| A-L03 | Low | Explorer fără teste | Contract smoke |
| A-L04 | Low | `keystore_helper_path` fallback Electron tree | Scoate după cutover |
| A-L05 | Low | Stub crates umflă suprafața percepută | Marchează non-shipped în root README |
| A-L06 | Low | Pool CORS GET Any | Origins explicite |
| A-L07 | Low | Mining template store process-local | Document HA |
| A-I01 | Info | `PROJECT_AUDIT_2026-07-17.md` spunea Linux=Electron — **actual** script e Tauri | Actualizat de acest raport |
| A-I02 | Info | Secret policy = hygiene repo, nu encryption runtime | Vezi A-C01 |
| A-I03 | Info | Settings Tauri persistate bine în AppData | Adaugă schema version |
| A-I04 | Info | Electron CSP mai strict decât Tauri — model de portat | |
| A-I05 | Info | `memory/OPEN_QUESTIONS.md` — fee/VM/sharding/validator 2500 VIRE nerezolvate | Nu închide silent |

---

## 4. CI / release matrix

| Workflow | Ce face | Problemă |
|---|---|---|
| `rust-ci.yml` / `rust.yml` | fmt, test, clippy workspace | OK pentru Rust |
| `explorer-ci.yml` | Explorer | OK; fără contract deep |
| `android-ci.yml` | Android | Early |
| `linux-desktop-ci.yml` | **Electron** paths | Depășit |
| `linux-desktop.yml` | Apelează script **Tauri** | Cache/docs încă Electron-ish |
| `candidate-release.yml` | Build **Electron** packages | **Greșit** față de produs Tauri |
| `vps-control-plane-release.yml` | VPS | Separat OK |
| `release-gate.yml` | Gate | Trebuie legat de Tauri + security items |

**Artefacte locale `release-artifacts/`:** mix 0.2–0.4.x, fără 0.6.1 semnat vizibil — risc confuzie operator.

---

## 5. Maturitate pe platformă

| Surface | Versiune semnal | Stare | Gap principal |
|---|---|---|---|
| Windows Tauri | 0.6.1 | Candidate UI | Keystore, updater, code-sign, E2E |
| Linux Tauri | script gata | Packaging path OK | Smoke CI real pe AppImage/deb |
| Windows Electron | 0.3.5 | Legacy | Încă în release CI |
| egui desktop | 0.1.0 | Legacy installer | `build-windows-installer.ps1` |
| Android | — | Prototype | Sign/submit, cleartext, brand |
| Explorer | 0.1.0 | Bundled helper | Tests |
| Website | 0.1.0 | Marketing | Env prod hardening |
| VPS control-plane | — | Thin | Admin trust model, depth UI |

---

## 6. Backlog prioritizat (pentru reparații viitoare)

### P0 — securitate & release truth (1–2 săptămâni focus)

1. **A-C01** — Keystore criptat (CLI + desktop).  
2. **A-H08** — Scoate mnemonic din WebView; harden helper.  
3. **A-H01 / A-H02** — Mining local-only sau auth; rate limit app.  
4. **A-C02 / A-H09 / A-H10** — Un singur desktop: Tauri; fix Windows installer + CI; versiune unică; updater onest.  

### P1 — protocol reliability (înainte de „public multi-node”)

5. **A-M01** — Coinbase exact match.  
6. **A-H03 / A-H06** — Indexer reorg-aware + atomic.  
7. **A-H04** — Elimină unchecked append din path-uri prod.  
8. **A-H05** — P2P scoring, header-first, multi-host soak.  
9. **A-H07** — Pool storage + reorg sau rămâne explicit Prototype.  

### P2 — produs & calitate

10. **A-M03** — CSP strict.  
11. **A-M04** — Fail closed pe account RPC.  
12. **A-M07** — E2E wallet/miner.  
13. **A-M08** — Android parity sau label.  
14. **A-M05 / A-M06** — Theme + i18n.  
15. **A-M16 / A-I01** — Refresh docs security.  
16. Code-sign Authenticode; scaling QA 100/125/150%; reduced-motion.  

### P3 — research / non-goals

- Smart contracts, staking, DAO, marketplace, Passport — rămân non-goals până la decizie explicită (`OPEN_QUESTIONS`, README).  
- Validator 2500 VIRE — **nu** implementa fără design aprobat.

---

## 7. Checklist quick-verify (operator)

```text
[ ] wallet files conțin private_key_hex? → da (A-C01 deschis)
[ ] tauri.conf version == package.json == Cargo.toml? → 0.6.1 OK
[ ] build-windows-installer.ps1 apelează tauri? → NU (A-C02)
[ ] candidate-release.yml builds Electron? → DA (A-H10)
[ ] rpc.vps.toml access_mode? → public-submit (A-H01)
[ ] createUpdaterArtifacts? → false (A-H09)
[ ] consensus coinbase == state coinbase rule? → NU (A-M01)
[ ] indexer atomic + reorg? → NU (A-H03)
[ ] Linux build script = Tauri? → DA (OK)
```

---

## 8. Referințe interne

| Document | Rol |
|---|---|
| `docs/security/PRODUCTION_RISKS.md` | Riscuri (parțial stale) |
| `docs/security/MINING_POOL_RISKS.md` | Pool |
| `docs/security/SECRET_HANDLING.md` | Hygiene repo |
| `docs/security/SECURITY_GATE.md` | Gate release |
| `docs/release/MAINNET_CANDIDATE_CHECKLIST.md` | Checklist launch |
| `docs/release/RELEASE_GATE.md` | Gate |
| `memory/NEXT_STEPS.md` | Coadă priorități |
| `memory/OPEN_QUESTIONS.md` | Decizii nerezolvate |
| `RUST_CODE_ANALYSIS_REPORT.md` | Analiză Rust 2026-07-02 (verifică vs cod curent) |
| `veiron-desktop-tauri/MIGRATION.md` | Decizie Tauri |

---

## 9. Concluzie

Proiectul are o **bază protocol solidă pentru un Mainnet Candidate local/VPS**, cu gates de pornire, PoW, validări de bază, miner GPU și un Control Center Tauri modern.  

**Nu** este încă „production mainnet”: cheile pot fi citite de pe disc, mining RPC poate fi abuzat pe profilul public-submit, clienții desktop și pipeline-ul Windows mint pe care e „produsul real”, iar reorg/P2P/indexer/pool nu sunt închise end-to-end.

**Recomandare:**  
1. Blochează orice claim public de mainnet / pool live.  
2. Execută **P0** din secțiunea 6 ca epic de reparații.  
3. Folosește ID-urile `A-*` din acest raport ca listă de tracking (issues/TASK_MASTER).  
4. Re-rulează un audit scurt după P0 (diff pe A-C01, A-C02, A-H01, A-H08, A-H09, A-H10).

---

*Generat din audit cod 2026-07-17. Nu înlocuiește un security review independent extern.*

---

## 10. P0 implementation status (same day)

| ID | Status | What landed |
|---|---|---|
| **A-C02** | **Done** | `build-windows-installer.ps1` → Tauri 0.6.1 only (NSIS/MSI/portable) |
| **A-H10** | **Done** | `candidate-release.yml`, `linux-desktop-ci.yml`, `linux-desktop.yml` → Tauri; Electron latest.yml blocked |
| **A-H01** | **Done** | Mining off by default for `public-submit`; `expose_mining_endpoints`; VPS nginx `403` on `/mining/` |
| **A-H02** (partial) | **Partial** | CORS `*` rejected outside Local; mining bind `0.0.0.0` blocked when exposed |
| **A-H08** | **Done** | WebView import disabled; native dialog only; parent token on keystore helper; nonce fail-closed |
| **A-H09** | **Partial** | Updater messages honest; README 0.6.1; no Electron feed in new release path |
| **A-C01** | **Done (CLI)** | Mainnet-candidate wallets AES-256-GCM + Argon2id (`VEIRON_WALLET_PASSPHRASE`); Desktop already OS keyring |
| Electron | **Removed** | `veiron-desktop-electron/` deleted from monorepo; do not reintroduce |

**Tests:** `veiron-wallet` 14/14, `veiron-rpc-gateway` 20/20, Tauri vitest 15/15.

---

## 11. P1 implementation status

| ID | Status | What landed |
|---|---|---|
| **A-M01** | **Done** | Consensus coinbase = exact amount (same as state); under/over tests |
| **A-H03** | **Done** | Indexer atomic write (`atomic-write-file`); `ensure_index_matches_chain`; RPC auto-reindex on tip mismatch |
| **A-H04** | **Done** | `append_block` tip-link check; `append_block_unchecked` only for deliberate fixtures |
| **A-H05** | **Partial→Done (candidate)** | P2P v3: peer reputation + bans (persisted), header-first branch verify, identity mode 0600 |
| **A-H06** | **Partial** | Indexer ensure + pool immature reorg void (not full payout reorg) |
| **A-H07** | **Partial** | Public bind gate, early orphan on hash mismatch, tip rewind void, atomic fsync; still single-process JSON |

**Tests (P1 crates):** core 52, node 39+7, indexer 12, rpc 20 — all pass.

### P2P v3 notes
- Protocol version bumped **2 → 3** (breaking with old peers; controlled candidate network).
- Reputation file: `peer-reputation.json` under node runtime dir.
- Flow: FindAncestor → Headers (link check) → Blocks (must match headers) → adopt.
