import { describe, expect, it } from "vitest";
import { createChainClient } from "../src/chain-client.js";

describe("Veiron chain client", () => {
  it("reports disabled network status without pretending live data exists", async () => {
    const client = createChainClient({
      env: { VEIRON_CHAIN_MODE: "disabled" },
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      }
    });

    await expect(client.healthCheck()).resolves.toMatchObject({
      ok: true,
      status: "disabled",
      mode: "disabled"
    });
    await expect(client.getNetworkStatus()).resolves.toMatchObject({
      ok: false,
      status: "disabled",
      mode: "disabled"
    });
  });

  it("returns clearly marked mock metrics in mock mode", async () => {
    const client = createChainClient({
      env: { VEIRON_CHAIN_MODE: "mock" },
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      }
    });

    const status = await client.getNetworkStatus();

    expect(status).toMatchObject({
      ok: true,
      status: "mock",
      mode: "mock",
      mock: true,
      network: "Veiron Mocknet"
    });
    expect(status.blockHeight).toEqual(expect.any(Number));
    expect(status.latestBlockHash).toContain("veironmock");
  });

  it("fetches and normalizes live RPC status metrics", async () => {
    const requests = [];
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_RPC_URL: "https://rpc.veiron.example/api",
        VEIRON_CHAIN_STATUS_PATH: "/network/status"
      },
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              result: {
                networkName: "Veiron Testnet",
                latestBlock: {
                  height: "123456",
                  hash: "0xabcd"
                },
                networkHashrate: "2500000000",
                nodes: { active: 17 },
                supply: { circulating: "41000000.5" },
                syncStatus: "synced",
                updated_at: "2026-07-06T18:00:00.000Z"
              }
            };
          }
        };
      }
    });

    const status = await client.getNetworkStatus();

    expect(requests[0]).toMatchObject({
      url: "https://rpc.veiron.example/api/network/status"
    });
    expect(requests[0].options.headers.accept).toBe("application/json");
    expect(status).toMatchObject({
      ok: true,
      status: "ready",
      mode: "rpc",
      source: "https://rpc.veiron.example/api/network/status",
      network: "Veiron Testnet",
      blockHeight: 123456,
      latestBlockHash: "0xabcd",
      hashRate: 2500000000,
      activeNodes: 17,
      circulatingSupply: 41000000.5,
      rawStatus: "synced"
    });
  });

  it("uses an explicit status URL when configured", async () => {
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_RPC_URL: "https://rpc.veiron.example",
        VEIRON_CHAIN_STATUS_URL: "https://explorer.veiron.example/status.json"
      },
      fetchImpl: async (url) => ({
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              height: 10,
              hashRate: 100,
              activeNodes: 2,
              circulatingSupply: 50
            },
            requestedUrl: url
          };
        }
      })
    });

    await expect(client.getNetworkStatus()).resolves.toMatchObject({
      ok: true,
      source: "https://explorer.veiron.example/status.json",
      blockHeight: 10
    });
  });

  it("can use the status URL as health fallback when no RPC URL is configured", async () => {
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_STATUS_URL: "https://explorer.veiron.example/status.json"
      },
      fetchImpl: async (url) => ({
        ok: url === "https://explorer.veiron.example/status.json",
        status: 200
      })
    });

    await expect(client.healthCheck()).resolves.toMatchObject({
      ok: true,
      status: "ready",
      mode: "rpc"
    });
  });

  it("marks unknown RPC responses as invalid instead of showing fake values", async () => {
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_RPC_URL: "https://rpc.veiron.example"
      },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async json() {
          return { result: { message: "pong" } };
        }
      })
    });

    await expect(client.getNetworkStatus()).resolves.toMatchObject({
      ok: false,
      status: "invalid_response"
    });
  });

  it("fetches and normalizes rewards for a linked wallet address", async () => {
    const requests = [];
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_RPC_URL: "https://rpc.veiron.example/api",
        VEIRON_CHAIN_REWARDS_PATH: "/wallet/{address}/rewards"
      },
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              data: {
                address: "vire_wallet_1",
                rewards: {
                  mining: "12.5",
                  staking: "4.25",
                  node: "3",
                  claimable: "5",
                  paid: "14"
                },
                pendingRewards: "0.75",
                currency: "VIRE",
                updated_at: "2026-07-06T18:00:00.000Z"
              }
            };
          }
        };
      }
    });

    const rewards = await client.getRewardsForAddress("vire_wallet_1");

    expect(requests[0]).toMatchObject({
      url: "https://rpc.veiron.example/api/wallet/vire_wallet_1/rewards"
    });
    expect(requests[0].options.headers.accept).toBe("application/json");
    expect(rewards).toMatchObject({
      ok: true,
      status: "ready",
      mode: "rpc",
      address: "vire_wallet_1",
      miningRewards: 12.5,
      stakingRewards: 4.25,
      nodeRewards: 3,
      totalRewards: 19.75,
      claimableRewards: 5,
      pendingRewards: 0.75,
      paidRewards: 14,
      currency: "VIRE"
    });
  });

  it("uses an explicit rewards URL with the address placeholder", async () => {
    const client = createChainClient({
      env: {
        VEIRON_CHAIN_MODE: "rpc",
        VEIRON_CHAIN_REWARDS_URL: "https://explorer.veiron.example/accounts/{address}/rewards.json"
      },
      fetchImpl: async (url) => ({
        ok: true,
        status: 200,
        async json() {
          return {
            result: {
              address: url.includes("vire_abc") ? "vire_abc" : "wrong",
              totalRewards: 10
            }
          };
        }
      })
    });

    await expect(client.getRewardsForAddress("vire_abc")).resolves.toMatchObject({
      ok: true,
      source: "https://explorer.veiron.example/accounts/vire_abc/rewards.json",
      totalRewards: 10
    });
  });

  it("does not query rewards without a wallet address", async () => {
    const client = createChainClient({
      env: { VEIRON_CHAIN_MODE: "mock" },
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      }
    });

    await expect(client.getRewardsForAddress("")).resolves.toMatchObject({
      ok: false,
      status: "missing_wallet_address"
    });
  });
});
