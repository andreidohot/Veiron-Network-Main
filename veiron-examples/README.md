# veiron-examples

Runnable scripts for **Veiron Mainnet Candidate** using `@veiron/sdk`.

## Setup

```bash
cd ../veiron-sdk
npm install
npm run build

cd ../veiron-examples
# no install required — scripts import the built SDK from ../veiron-sdk/dist
```

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run chain-status` | Gateway health + tip height |
| `npm run pool-status` | Public pool workers / hashrate / blocks |
| `npm run pool-maturity` | Why pool blocks are immature (conf progress) |
| `npm run address-lookup -- vire1…` | Balance + next nonce |

Optional env:

```bash
export VEIRON_RPC_URL=https://rpcnode.dohotstudio.com
export VEIRON_POOL_URL=https://rpcnode.dohotstudio.com/pool
```

## Notes

- Network is **Mainnet Candidate / Prototype**, not public live Mainnet.
- Scripts are **read-only** — no key material, no contract ABI.
