/**
 * Keep these aligned with `veiron-sdk-rust` / `@veiron/sdk` (TS in veiron-sdk/) / `veiron-core` Mainnet Candidate defaults.
 * Rust desktop shell reads the same values from `veiron_sdk_rust::DEFAULT_*` constants.
 */
export const RPC_URL = "https://rpcnode.dohotstudio.com";
export const LOCAL_RPC_URL = "http://127.0.0.1:10787";
export const POOL_URL = `${RPC_URL}/pool`;
export const NETWORK_ID = "veiron-mainnet-candidate";
export const STATUS_LABEL = "Planned / Mainnet Candidate";
export const ADDRESS_PREFIX = "vire";
export const TICKER = "VIRE";
/** Default network snapshot poll. VPS gateways need ≥10s (see vps-fix.md). */
export const REFRESH_INTERVAL_MS = 12_000;
/** Floor when the configured RPC is remote (not loopback). */
export const REMOTE_REFRESH_MIN_MS = 10_000;
/** Floor for local loopback RPC. */
export const LOCAL_REFRESH_MIN_MS = 3_000;
export const LIVE_LOG_INTERVAL_MS = 5_000;
export const APP_VERSION = "1.0.0";
export const APP_NAME = "Veiron Control Center";
