export function createChainClient({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const mode = env.VEIRON_CHAIN_MODE ?? "disabled";
  const rpcUrl = env.VEIRON_CHAIN_RPC_URL ?? null;
  const statusUrl = env.VEIRON_CHAIN_STATUS_URL ?? null;
  const statusPath = env.VEIRON_CHAIN_STATUS_PATH ?? "/status";
  const rewardsUrl = env.VEIRON_CHAIN_REWARDS_URL ?? null;
  const rewardsPath = env.VEIRON_CHAIN_REWARDS_PATH ?? "/rewards/{address}";
  const healthUrl = env.VEIRON_CHAIN_HEALTH_URL ?? rpcUrl ?? statusUrl;
  const healthTimeoutMs = parseTimeout(env.VEIRON_CHAIN_HEALTH_TIMEOUT_MS, 3000);
  const statusTimeoutMs = parseTimeout(env.VEIRON_CHAIN_STATUS_TIMEOUT_MS, healthTimeoutMs);
  const rewardsTimeoutMs = parseTimeout(env.VEIRON_CHAIN_REWARDS_TIMEOUT_MS, statusTimeoutMs);

  return {
    mode,
    rpcUrl,
    async healthCheck() {
      if (mode === "disabled") {
        return {
          ok: true,
          status: "disabled",
          mode
        };
      }

      if (mode === "mock") {
        return {
          ok: true,
          status: "mock",
          mode
        };
      }

      if (mode !== "rpc") {
        return {
          ok: false,
          status: "unsupported_mode",
          mode
        };
      }

      if (!healthUrl) {
        return {
          ok: false,
          status: "missing_rpc_url",
          mode
        };
      }

      return checkRpcHealth({ rpcUrl: healthUrl, mode, timeoutMs: healthTimeoutMs, fetchImpl });
    },
    async getNetworkStatus() {
      if (mode === "disabled") {
        return {
          ok: false,
          status: "disabled",
          mode,
          message: "Veiron chain adapter is disabled."
        };
      }

      if (mode === "mock") {
        return buildMockNetworkStatus(mode);
      }

      if (mode !== "rpc") {
        return {
          ok: false,
          status: "unsupported_mode",
          mode,
          message: `Unsupported Veiron chain mode: ${mode}`
        };
      }

      const resolvedStatusUrl = statusUrl || joinUrl(rpcUrl, statusPath);
      if (!resolvedStatusUrl) {
        return {
          ok: false,
          status: "missing_rpc_url",
          mode,
          message: "VEIRON_CHAIN_RPC_URL or VEIRON_CHAIN_STATUS_URL is required."
        };
      }

      return fetchNetworkStatus({ statusUrl: resolvedStatusUrl, mode, timeoutMs: statusTimeoutMs, fetchImpl });
    },
    async getRewardsForAddress(address) {
      const normalizedAddress = normalizeAddress(address);
      if (!normalizedAddress) {
        return {
          ok: false,
          status: "missing_wallet_address",
          mode,
          message: "A wallet address is required before rewards can be queried."
        };
      }

      if (mode === "disabled") {
        return {
          ok: false,
          status: "disabled",
          mode,
          address: normalizedAddress,
          message: "Veiron chain adapter is disabled."
        };
      }

      if (mode === "mock") {
        return buildMockRewards({ mode, address: normalizedAddress });
      }

      if (mode !== "rpc") {
        return {
          ok: false,
          status: "unsupported_mode",
          mode,
          address: normalizedAddress,
          message: `Unsupported Veiron chain mode: ${mode}`
        };
      }

      const resolvedRewardsUrl = resolveRewardsUrl({
        rpcUrl,
        rewardsUrl,
        rewardsPath,
        address: normalizedAddress
      });
      if (!resolvedRewardsUrl) {
        return {
          ok: false,
          status: "missing_rewards_url",
          mode,
          address: normalizedAddress,
          message: "VEIRON_CHAIN_RPC_URL or VEIRON_CHAIN_REWARDS_URL is required."
        };
      }

      return fetchRewards({ rewardsUrl: resolvedRewardsUrl, mode, address: normalizedAddress, timeoutMs: rewardsTimeoutMs, fetchImpl });
    }
  };
}

async function checkRpcHealth({ rpcUrl, mode, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(rpcUrl, {
      method: "GET",
      signal: controller.signal
    });

    return {
      ok: response.ok,
      status: response.ok ? "ready" : "http_error",
      mode,
      httpStatus: response.status
    };
  } catch (error) {
    return {
      ok: false,
      status: error.name === "AbortError" ? "timeout" : "error",
      mode,
      error: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNetworkStatus({ statusUrl, mode, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(statusUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        status: "http_error",
        mode,
        source: statusUrl,
        httpStatus: response.status,
        latencyMs
      };
    }

    const payload = await response.json();
    return normalizeNetworkStatus({
      payload,
      mode,
      source: statusUrl,
      latencyMs
    });
  } catch (error) {
    return {
      ok: false,
      status: error.name === "AbortError" ? "timeout" : "error",
      mode,
      source: statusUrl,
      error: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRewards({ rewardsUrl, mode, address, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(rewardsUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        status: "http_error",
        mode,
        address,
        source: rewardsUrl,
        httpStatus: response.status,
        latencyMs
      };
    }

    const payload = await response.json();
    return normalizeRewards({
      payload,
      mode,
      address,
      source: rewardsUrl,
      latencyMs
    });
  } catch (error) {
    return {
      ok: false,
      status: error.name === "AbortError" ? "timeout" : "error",
      mode,
      address,
      source: rewardsUrl,
      error: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeNetworkStatus({ payload, mode, source, latencyMs }) {
  const data = unwrapPayload(payload);
  const latestBlock = pickObject(data, ["latestBlock", "latest_block", "block", "bestBlock", "tip"]) ?? {};
  const supply = pickObject(data, ["supply", "tokenSupply", "token_supply"]) ?? {};
  const nodes = pickObject(data, ["nodes", "peers", "network"]) ?? {};

  const blockHeight = pickNumber(data, [
    "blockHeight",
    "height",
    "latestBlockHeight",
    "latest_block_height",
    "bestHeight",
    "best_height"
  ]) ?? pickNumber(latestBlock, ["height", "number", "blockHeight"]);
  const latestBlockHash = pickString(data, [
    "latestBlockHash",
    "blockHash",
    "hash",
    "bestHash",
    "best_hash"
  ]) ?? pickString(latestBlock, ["hash", "id", "blockHash"]);
  const hashRate = pickNumber(data, [
    "hashRate",
    "hashrate",
    "networkHashRate",
    "networkHashrate",
    "network_hash_rate",
    "network_hashrate",
    "hash_rate"
  ]) ?? pickNumber(nodes, ["hashRate", "hashrate"]);
  const activeNodes = pickNumber(data, [
    "activeNodes",
    "nodesActive",
    "nodeCount",
    "peerCount",
    "peers",
    "activePeers",
    "active_nodes"
  ]) ?? pickNumber(nodes, ["active", "count", "total", "peerCount"]);
  const circulatingSupply = pickNumber(data, [
    "circulatingSupply",
    "supplyCirculating",
    "circulating_supply",
    "circulating"
  ]) ?? pickNumber(supply, ["circulating", "circulatingSupply", "current"]);

  const normalized = {
    ok: true,
    status: "ready",
    mode,
    source,
    latencyMs,
    network: pickString(data, ["network", "networkName", "chain", "chainId"]) ?? "Veiron Network",
    blockHeight,
    latestBlockHash,
    hashRate,
    activeNodes,
    circulatingSupply,
    updatedAt: pickString(data, ["updatedAt", "updated_at", "timestamp", "time"]) ?? new Date().toISOString(),
    rawStatus: pickString(data, ["status", "syncStatus", "sync_status"]) ?? null
  };

  if ([blockHeight, latestBlockHash, hashRate, activeNodes, circulatingSupply].every((value) => value == null)) {
    return {
      ...normalized,
      ok: false,
      status: "invalid_response",
      message: "Chain status response did not contain known Veiron network metrics."
    };
  }

  return normalized;
}

function buildMockNetworkStatus(mode) {
  return {
    ok: true,
    status: "mock",
    mode,
    mock: true,
    source: "mock-adapter",
    network: "Veiron Mocknet",
    blockHeight: 411001,
    latestBlockHash: "0xveironmock000000000000000000000000000000000000000000000000411001",
    hashRate: 1250000000000,
    activeNodes: 42,
    circulatingSupply: 0,
    updatedAt: new Date().toISOString(),
    rawStatus: "simulated"
  };
}

function normalizeRewards({ payload, mode, address, source, latencyMs }) {
  const data = unwrapPayload(payload);
  const rewards = pickObject(data, ["rewards", "rewardTotals", "reward_totals"]) ?? {};
  const mining = pickObject(data, ["mining", "miningRewards", "mining_rewards"]) ?? {};
  const staking = pickObject(data, ["staking", "stakingRewards", "staking_rewards"]) ?? {};
  const node = pickObject(data, ["node", "nodeRewards", "node_rewards", "validator", "validatorRewards"]) ?? {};

  const miningRewards = pickRewardAmount(data, rewards, mining, ["mining", "miningRewards", "mining_rewards", "amount"]);
  const stakingRewards = pickRewardAmount(data, rewards, staking, ["staking", "stakingRewards", "staking_rewards", "amount"]);
  const nodeRewards = pickRewardAmount(data, rewards, node, ["node", "nodeRewards", "node_rewards", "validator", "validatorRewards", "amount"]);
  const totalRewards = pickNumber(data, ["totalRewards", "total_rewards", "total", "lifetimeTotal"])
    ?? pickNumber(rewards, ["total", "totalRewards", "lifetime"])
    ?? sumKnown([miningRewards, stakingRewards, nodeRewards]);
  const claimableRewards = pickNumber(data, ["claimableRewards", "claimable_rewards", "claimable", "pendingClaim"])
    ?? pickNumber(rewards, ["claimable", "claimableRewards"]);
  const pendingRewards = pickNumber(data, ["pendingRewards", "pending_rewards", "pending"])
    ?? pickNumber(rewards, ["pending", "pendingRewards"]);
  const paidRewards = pickNumber(data, ["paidRewards", "paid_rewards", "paid", "claimedRewards", "claimed"])
    ?? pickNumber(rewards, ["paid", "claimed", "paidRewards"]);

  const normalized = {
    ok: true,
    status: "ready",
    mode,
    address: pickString(data, ["address", "wallet", "walletAddress"]) ?? address,
    source,
    latencyMs,
    miningRewards,
    stakingRewards,
    nodeRewards,
    totalRewards,
    claimableRewards,
    pendingRewards,
    paidRewards,
    currency: pickString(data, ["currency", "symbol", "asset"]) ?? "VIRE",
    updatedAt: pickString(data, ["updatedAt", "updated_at", "timestamp", "time"]) ?? new Date().toISOString(),
    rawStatus: pickString(data, ["status", "rewardStatus", "reward_status"]) ?? null
  };

  if ([miningRewards, stakingRewards, nodeRewards, totalRewards, claimableRewards, pendingRewards, paidRewards].every((value) => value == null)) {
    return {
      ...normalized,
      ok: false,
      status: "invalid_response",
      message: "Rewards response did not contain known mining, staking or node reward metrics."
    };
  }

  return normalized;
}

function buildMockRewards({ mode, address }) {
  return {
    ok: true,
    status: "mock",
    mode,
    mock: true,
    address,
    source: "mock-adapter",
    miningRewards: 12.5,
    stakingRewards: 4.25,
    nodeRewards: 2,
    totalRewards: 18.75,
    claimableRewards: 3.5,
    pendingRewards: 1.25,
    paidRewards: 14,
    currency: "VIRE",
    updatedAt: new Date().toISOString(),
    rawStatus: "simulated"
  };
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.result && typeof payload.result === "object") return unwrapPayload(payload.result);
  if (payload.data && typeof payload.data === "object") return unwrapPayload(payload.data);
  if (payload.status && typeof payload.status === "object") return unwrapPayload(payload.status);
  return payload;
}

function pickObject(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return null;
}

function pickNumber(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replaceAll(",", ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickString(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickRewardAmount(root, aggregate, nested, keys) {
  return pickNumber(root, keys)
    ?? pickNumber(aggregate, keys)
    ?? pickNumber(nested, ["amount", "total", "earned", "rewards"]);
}

function sumKnown(values) {
  const known = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function normalizeAddress(address) {
  return String(address ?? "").trim();
}

function resolveRewardsUrl({ rpcUrl, rewardsUrl, rewardsPath, address }) {
  const encodedAddress = encodeURIComponent(address);
  if (rewardsUrl) {
    return String(rewardsUrl).replaceAll("{address}", encodedAddress);
  }

  if (!rpcUrl) return null;
  return joinUrl(rpcUrl, String(rewardsPath || "/rewards/{address}").replaceAll("{address}", encodedAddress));
}

function joinUrl(baseUrl, path) {
  if (!baseUrl) return null;
  const base = String(baseUrl).replace(/\/+$/, "");
  const suffix = String(path || "").replace(/^\/+/, "");
  return suffix ? `${base}/${suffix}` : base;
}

function parseTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
