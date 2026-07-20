# VPS RPC instability for desktop miners

## Summary

The desktop miner experience is being affected by a combination of high-frequency polling from the desktop app and the VPS control-plane reverse-proxy settings. The result is a recurring appearance of broken or unstable RPC connectivity every few seconds, especially when the miner opens the desktop app and starts polling the VPS gateway.

## Problem

When the desktop app connects to the VPS RPC endpoint, the connection appears to drop and recover repeatedly every 3-4 seconds. This is not a healthy long-lived RPC session; it is a symptom of the client repeatedly hitting the same public mining/RPC path while the reverse proxy is protecting it with shared rate limiting and modest timeouts.

## Evidence from the codebase

- The desktop app refreshes telemetry very aggressively. In [veiron-desktop-tauri/src/pages/Node.tsx](veiron-desktop-tauri/src/pages/Node.tsx), the node page polls every 4 seconds.
- The mining page also performs frequent refreshes while active. See [veiron-desktop-tauri/src/pages/Mining.tsx](veiron-desktop-tauri/src/pages/Mining.tsx).
- The VPS control plane exposes the mining path through Nginx in [veiron-release/vps-control-plane/nginx/veiron.conf](veiron-release/vps-control-plane/nginx/veiron.conf). The `/mining/` location uses a shared rate-limit bucket and proxy timeouts.
- The RPC gateway config in [veiron-release/vps-control-plane/configs/rpc.toml](veiron-release/vps-control-plane/configs/rpc.toml) enables public mining exposure with `expose_mining_endpoints = true` and `access_mode = "public-submit"`.
- The repository audit notes that public RPC/mining surfaces are still protected mainly by reverse-proxy rules rather than application-level auth and rate limiting. This is consistent with the current instability.

## Root cause

The primary issue is that the desktop app is chatty and sends frequent requests to the VPS gateway, while the VPS control-plane relies on shared Nginx rate limits and proxy handling for public mining access. When those requests arrive in bursts, the gateway can briefly return throttled, stalled, or failed responses. The desktop client interprets these intermittent failures as an unstable RPC connection, which looks like a disconnect/reconnect loop.

In short:

1. The desktop app polls too aggressively for a public VPS RPC environment.
2. The VPS control plane uses shared reverse-proxy protection for mining and submit routes.
3. The current setup does not provide a stable, dedicated, low-latency path for desktop miner traffic.

## Resolution

### Recommended fix

1. Reduce the polling cadence of the desktop app for VPS-connected RPC traffic.
   - Move refresh intervals from roughly 4 seconds to 10-15 seconds for normal telemetry.
   - Use adaptive polling: slower when the gateway is busy, faster only when the user explicitly requests it.

2. Separate desktop/miner traffic from the general public mining path.
   - Add a dedicated internal or authenticated route for the desktop control-center and miner traffic.
   - Keep the public `/mining/` surface smaller and more conservative.

3. Tune the VPS reverse proxy for stability.
   - Increase the burst allowance for the desktop client or use a dedicated Nginx location for control-center traffic.
   - Keep `/health` and `/status` on a lightweight path with a short timeout and no aggressive rate limiting.
   - Use `proxy_http_version 1.1;` and `proxy_set_header Connection "";` to avoid connection churn on long-lived requests.

4. Add backoff and retry handling to the desktop app.
   - The app should retry with exponential backoff instead of treating every brief proxy stall as a fatal disconnect.
   - Temporary 429/503/504 responses should be handled as degraded service, not as a full RPC outage.

### Example Nginx direction

```nginx
location ^~ /mining/ {
    limit_req zone=veiron_rpc_submit burst=200 nodelay;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    proxy_connect_timeout 10s;
}
```

## Expected result

After reducing the desktop polling rate and isolating miner traffic behind a more stable VPS path, the RPC should stop appearing to disconnect every few seconds. The control plane will remain responsive and the desktop miner will experience a stable session instead of a repeated reconnect loop.
