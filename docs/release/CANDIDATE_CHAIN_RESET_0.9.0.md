# Mainnet Candidate chain reset — product 0.9.0

> **Historical record — not current operator guidance.** This reset record is
> preserved as chain-history evidence. Current protocol and genesis sources are
> `../protocol/06_CONSENSUS_POW.md` and `GENESIS.md`.

**Date:** 2026-07-18  
**Status:** Mainnet Candidate / Prototype (not public Mainnet)

## Why

Difficulty had climbed to ~37 leading-zero bits while available continuous hashrate was ~100–200 MH/s.  
That made full-block ETA ~10–15 minutes for a single GPU, which felt “broken” relative to the **60-second** protocol target (`BLOCK_TIME_SECONDS`).

## What was wiped

On VPS (`rpcnode.dohotstudio.com`):

| Path | Action |
|------|--------|
| `/var/lib/veiron/.veiron-mainnet/chain/*` | Wiped (blocks / tip) |
| `/var/lib/veiron/.veiron-mainnet/mempool/*` | Wiped |
| `/var/lib/veiron/.veiron-mainnet/indexer/*` | Wiped |
| `/var/lib/veiron/.veiron-mainnet/genesis-info.json` | Removed then re-created |
| `/var/lib/veiron-pool/pool-state.json` | Wiped (shares / PPLNS state) |
| `p2p-identity.key` | **Kept** (stable peer id) |

Backups under `/var/lib/veiron/backups/`.

## What was **not** changed

- Deterministic **genesis hash** and **GENESIS_APPROVAL** (same checkpoint)
- Address derivation / wallet seeds on user devices (addresses still valid)
- On-chain balances from the old chain are **gone** (new ledger from genesis)

## Protocol tweaks (apply only with wipe)

| Parameter | Before | After 0.9.0 |
|-----------|--------|-------------|
| Target block time | 60 s | **60 s** (unchanged) |
| Genesis difficulty | 16 | **16** (unchanged) |
| Mainnet Candidate max difficulty | 40 | **34** (caps single-GPU runaway) |
| DAA solvetime clamp | 6× target | **12×** (faster recovery after slow periods) |
| Pool share difficulty defaults | 16–28 | **14–26**, start 18 |

With ~177 MH/s continuous, equilibrium net_diff is ~**33** → ~**1 minute** per full block (protocol intent).

## Operator steps after reset

1. Restart desktop miner on **Official pool**
2. Expect **fast blocks** at the start (diff 16) then DAA climbs toward ~60 s
3. Rebuild Windows **and** Linux Control Center 0.9.0 for matching product version

## Scripts

```bash
# Rebuild VPS binaries (WSL/Linux)
cargo build --release -p veiron-node -p veiron-rpc-gateway -p veiron-indexer -p veiron-mining-pool

# Deploy
bash scripts/release/deploy-vps-binaries.sh root@host /path/to/key

# Full chain reset
bash scripts/release/reset-vps-candidate-chain.sh root@host /path/to/key
```
