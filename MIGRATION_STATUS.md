# Veiron status — VPS public network + desktop

> **Historical record — not current operational guidance.** Host heights,
> service state, and version details below were a 2026-07-17 snapshot. Use live
> health checks and `docs/release/NETWORK_MATURITY.md` for current status.

**Date:** 2026-07-17 (updated evening deploy)  
**Mode:** Public **Mainnet Candidate** (operational). Not a rebrand to a new genesis / not “Mainnet Live” marketing claim.

## Packaging rule (mandatory)

- **Canonical VPS tree:** `veiron-release/vps-control-plane/` only  
- **`veiron-release/vps/` is LEGACY / FROZEN** — do not patch product/security there (see `AGENTS.md`)

## Live VPS (`rpcnode.dohotstudio.com` / `144.91.81.81`)

| Service | State |
|---|---|
| `veiron-node` | **active** — height **650**, tip live |
| `veiron-rpc` | **active** — public HTTPS, `access_mode=public-submit` |
| `veiron-mining-pool` | **active** — public `https://rpcnode.dohotstudio.com/pool/` |
| `veiron-vps-admin` | **active** — `/control/` Basic Auth |
| OpenResty (1Panel) | proxies RPC + fleet + control + **pool** |

### Public endpoints (verified)

- `GET https://rpcnode.dohotstudio.com/status` → 200  
- `GET https://rpcnode.dohotstudio.com/mining/template?miner_address=vire1…` → 200  
- `GET https://rpcnode.dohotstudio.com/pool/api/v1/pool/status` → 200, upstream healthy  
- `GET https://rpcnode.dohotstudio.com/pool/api/v1/work?miner_address=…&worker_name=…` → 200  
- `GET https://rpcnode.dohotstudio.com/addresses/{addr}/account` → **200** (balance + next_nonce + tip)  

### Critical fixes (2026-07-17 audit)

| Bug | Fix |
|---|---|
| Wallet prepare required **local chain** | Keystore uses remote `/addresses/.../account` |
| No remote account API | New RPC `GET /addresses/:address/account` (deployed) |
| Health required local stack scripts | Core health = keystore + dirs + miner (VPS-first) |
| Mining pool down / 404 | Enabled + OpenResty `/pool/` + binary |
| Bad P2P seeds / sticky invalid peers | Code + config; redeployed node |
| Pool CORS only GET | POST/OPTIONS allowed (deployed) |

### How miners stay synchronized

1. **Solo miners (desktop / CLI)**  
   - Work source: `https://rpcnode.dohotstudio.com` (`/mining/template` + `/mining/submit`)  
   - All miners see the **same tip** from VPS RPC after each accepted block  

2. **Pool miners**  
   - Work source: `https://rpcnode.dohotstudio.com/pool`  
   - Pool pulls templates from loopback RPC, issues VarDiff shares, submits full blocks upstream  
   - All pool workers share the same job height  

3. **Full nodes (extra VPS)**  
   - Seed: `rpcnode.dohotstudio.com:20787` or `/dns4/rpcnode.dohotstudio.com/tcp/20787`  
   - Must run **same** `network_id` + P2P `protocol_version=2`  
   - Do **not** use `dimitrius.ombra-net.com` until it speaks the same protocol  

### P2P fixes (deployed binary)

- Drop peers that advertise no `/veiron/.../sync` protocols  
- Redial seeds when no **validated** peer (not only when peer list empty)  
- Timeout disconnect for unvalidated handshakes (30s)  
- Bootstrap must **not** self-dial (causes `Local peer ID` errors)

### Pool enablement (was broken)

- Service was **disabled**, no `/etc/veiron-pool`, no OpenResty `/pool/`  
- Fixed: config + systemd + OpenResty location + redeployed pool binary (CORS allows POST)

## Desktop (Tauri)

- Default RPC: `https://rpcnode.dohotstudio.com`  
- Default pool: `https://rpcnode.dohotstudio.com/pool`  
- Local node/RPC stack **disabled** in remote mode  
- Miner spawns against configured gateway/pool  

## What “mainnet” means here (honest)

| Claim | Status |
|---|---|
| Public chain with fixed genesis + mining + RPC | **Yes (Mainnet Candidate)** |
| Network id | `veiron-mainnet-candidate` (frozen; changing = fork) |
| Protocol status_label | `Planned / Mainnet Candidate` (code-enforced) |
| Independent genesis audit / “Mainnet Live” marketing | **Still required** before that claim |
| Multi-host soak of P2P between many full nodes | Partial — bootstrap is healthy; second host must run matching build |

## Operator commands

```powershell
# SSH
ssh -i $env:USERPROFILE\.ssh\veiron_vps_ed25519 root@rpcnode.dohotstudio.com

# Desktop miner (solo against VPS)
# Settings RPC = https://rpcnode.dohotstudio.com
# Miner mode = solo

# Pool miner
# Mode = pool, URL = https://rpcnode.dohotstudio.com/pool
```

```bash
# On VPS
systemctl status veiron-node veiron-rpc veiron-mining-pool veiron-vps-admin
curl -fsS http://127.0.0.1:10787/status
curl -fsS http://127.0.0.1:30787/api/v1/pool/status
```
