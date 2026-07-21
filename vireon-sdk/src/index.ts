/**
 * @veiron/sdk — public read client for Veiron Mainnet Candidate.
 *
 * Scope: RPC gateway + mining pool public HTTP APIs.
 * Non-goals: smart contracts, key custody, private admin pool endpoints.
 */

export {
  VeironClient,
  VeironError,
  createVeironClient,
  VEIRON_FIRST_ACCOUNT_NONCE
} from "./client.js";
export { poolBlockMaturity, type MaturityProgress } from "./maturity.js";
export type {
  AddressAccount,
  AddressBalance,
  Atomic,
  ChainStatus,
  HealthResponse,
  NetworkLimits,
  PoolBlock,
  PoolHistory,
  PoolStatus,
  PoolWorker,
  SignedTransactionBody,
  SubmitTransactionResponse,
  VeironClientOptions
} from "./types.js";

export const VEIRON_DEFAULT_RPC_URL = "https://rpcnode.dohotstudio.com";
export const VEIRON_DEFAULT_POOL_URL = "https://rpcnode.dohotstudio.com/pool";
export const VEIRON_NETWORK_ID = "veiron-mainnet-candidate";
