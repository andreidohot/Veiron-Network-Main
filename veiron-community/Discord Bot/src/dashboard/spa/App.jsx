import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "./components/Shell.jsx";
import {
  AntiSpamPanel,
  AuditLogPanel,
  AutomodPanel,
  BlockchainPanel,
  EconomyPanel,
  EmbedPanel,
  ModerationPanel,
  OverviewPanel,
  PermissionControllerPanel,
  ProposalsPanel,
  RoadmapPanel,
  SettingsPanel,
  TicketsPanel,
  TotpResult
} from "./components/Panels.jsx";
import { createApiClient, persistAuth, publicApi, readStoredAuth } from "./lib/api.js";

const ROLE_WEIGHT = {
  VIEWER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4
};

const ROUTES = new Set([
  "overview",
  "embeds",
  "tickets",
  "moderation",
  "proposals",
  "automod",
  "spam",
  "audit",
  "economy",
  "permissions",
  "music",
  "wallet",
  "blockchain",
  "settings"
]);

const ROADMAP_PANELS = {
  economy: {
    title: "Economy / Leveling",
    phase: "Phase 2 / Phase 3 backend",
    status: "XP and Shards backend active.",
    description: "This panel manages XP, levels, server-only social currency settings, role rewards and leaderboards.",
    items: [
      { title: "Leveling", description: "XP rules, cooldowns, level roles and rank cards." },
      { title: "Economy", description: "Server-only Shards balances, transfers and anti-confusion limits." },
      { title: "Analytics", description: "Top users, weekly activity and reward history." }
    ]
  },
  music: {
    title: "Music",
    phase: "Phase 3 dashboard API",
    status: "Shell ready, Discord command backend exists.",
    description: "The bot already has Lavalink-backed music commands. This panel reserves the UI for queue control, player state and per-guild music settings.",
    items: [
      { title: "Player", description: "Now playing, queue, skip, pause, resume, stop and volume controls." },
      { title: "Connections", description: "Voice channel state, Lavalink node state and reconnect controls." },
      { title: "Policy", description: "Allowed roles, max queue length, default volume and music channel rules." }
    ]
  },
  wallet: {
    title: "Wallet / Payments",
    phase: "Phase 6 ledger and Veiron chain adapter",
    status: "Shell ready, payment backend pending.",
    description: "This panel will manage wallet linking, custodial wallet status, payment limits and VIRE transaction review once the ledger/payment module is available.",
    items: [
      { title: "Wallets", description: "Custodial wallet status, external wallet links and verification challenges." },
      { title: "Payments", description: "Transfers, limits, risk flags and manual review queue." },
      { title: "Treasury", description: "Hot wallet limits and treasury/cold wallet operational status." }
    ]
  },
};

const EMPTY_DATA = {
  summary: {},
  channels: [],
  roles: [],
  cases: [],
  tickets: [],
  proposals: [],
  automod: [],
  spam: [],
  audit: [],
  settings: {},
  permissions: {},
  blockchain: null
};
const DASHBOARD_CACHE_KEY = "veiron_admin_dashboard_cache";

export function App() {
  const [route, setRoute] = useState(readRoute());
  const [auth, setAuthState] = useState(readStoredAuth);
  const [data, setData] = useState(EMPTY_DATA);
  const [status, setStatus] = useState("Login to load dashboard data.");
  const [totpResult, setTotpResult] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pushState, setPushState] = useState({
    supported: supportsPush(),
    subscribed: false,
    enabled: false,
    permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission
  });
  const authRef = useRef(auth);

  function setAuth(nextAuth) {
    const merged = {
      accessToken: nextAuth.accessToken ?? "",
      refreshToken: nextAuth.refreshToken ?? "",
      user: nextAuth.user ?? authRef.current.user
    };
    authRef.current = merged;
    persistAuth(merged);
    setAuthState(merged);
  }

  const apiClient = useMemo(() => createApiClient({
    getAuth: () => authRef.current,
    setAuth
  }), []);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    loadDashboard().catch((error) => setStatus(`Dashboard error: ${error.message}`));
  }, []);

  function changeRoute(nextRoute) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  async function login({ email, password, totpCode }) {
    const result = await publicApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        password,
        totpCode: totpCode.trim()
      })
    });
    setAuth(result);
    setStatus(`Logged in as ${result.user.email} (${result.user.role}).`);
    await loadDashboard(result.user);
    await refreshPushState();
  }

  async function logout() {
    await publicApi("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: authRef.current.refreshToken })
    }).catch(() => null);
    setAuth({ accessToken: "", refreshToken: "", user: null });
    setData(EMPTY_DATA);
    setTotpResult(null);
    setPushState((current) => ({ ...current, subscribed: false }));
    setStatus("Logged out.");
  }

  async function loadDashboard(existingUser = null) {
    if (!authRef.current.accessToken && !authRef.current.refreshToken) {
      setStatus("Login is required.");
      return;
    }

    if (!authRef.current.accessToken && authRef.current.refreshToken) {
      await apiClient.refreshAccessToken();
    }

    let user;
    try {
      user = existingUser ?? (await apiClient.api("/auth/me")).user;
      setAuth({ ...authRef.current, user });
    } catch (error) {
      const cached = readCachedDashboard();
      if (cached && !navigator.onLine) {
        setData(cached.data);
        setStatus(`Offline: showing read-only dashboard data cached at ${cached.cachedAt}.`);
        return;
      }
      throw error;
    }

    const canModerate = roleAtLeast(user.role, "MODERATOR");
    const baseRequests = [
      ["summary", apiClient.api("/api/dashboard/summary")],
      ["guild", apiClient.api("/api/guild")],
      ["settings", apiClient.api("/api/settings")],
      ["permissions", apiClient.api("/api/permissions")],
      ["proposals", apiClient.api("/api/proposals")],
      ["announcements", apiClient.api("/api/announcements")],
      ["blockchain", apiClient.api("/api/blockchain/status")]
    ];
    const moderatorRequests = canModerate
      ? [
          ["cases", apiClient.api("/api/moderation/cases")],
          ["tickets", apiClient.api("/api/tickets")],
          ["audit", apiClient.api("/api/audit/events?limit=100")],
          ["automod", apiClient.api("/api/automod/events")],
          ["spam", apiClient.api("/api/anti-spam/events")]
        ]
      : [];

    const loaded = await loadSettled([...baseRequests, ...moderatorRequests]);
    setData({
      summary: loaded.summary ?? {},
      channels: loaded.guild?.channels ?? [],
      roles: loaded.guild?.roles ?? [],
      cases: loaded.cases?.items ?? [],
      tickets: loaded.tickets?.items ?? [],
      proposals: loaded.proposals?.items ?? [],
      automod: loaded.automod?.items ?? [],
      spam: loaded.spam?.items ?? [],
      audit: loaded.audit?.items ?? [],
      settings: loaded.settings?.settings ?? {},
      permissions: loaded.permissions?.permissions ?? loaded.settings?.settings?.permissions ?? {},
      blockchain: loaded.blockchain?.ok === false ? null : loaded.blockchain ?? null
    });
    writeCachedDashboard({
      summary: loaded.summary ?? {},
      channels: loaded.guild?.channels ?? [],
      roles: loaded.guild?.roles ?? [],
      cases: loaded.cases?.items ?? [],
      tickets: loaded.tickets?.items ?? [],
      proposals: loaded.proposals?.items ?? [],
      automod: loaded.automod?.items ?? [],
      spam: loaded.spam?.items ?? [],
      audit: loaded.audit?.items ?? [],
      settings: loaded.settings?.settings ?? {},
      permissions: loaded.permissions?.permissions ?? loaded.settings?.settings?.permissions ?? {},
      blockchain: loaded.blockchain?.ok === false ? null : loaded.blockchain ?? null
    });
    setStatus("Dashboard loaded.");
    await refreshPushState();
  }

  async function refreshBlockchainStatus() {
    const result = await apiClient.api("/api/blockchain/status");
    const nextData = {
      ...data,
      blockchain: result
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus(result.alert ? `Blockchain alert: ${result.alert.title}` : "Blockchain status refreshed.");
  }

  async function sendEmbed(payload) {
    const result = await apiClient.api("/api/embeds/send", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setStatus(result.ok ? `Embed sent. Message ID: ${result.messageId}` : result.error);
  }

  async function searchAudit(filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value).trim());
      }
    }

    if (!params.has("limit")) {
      params.set("limit", "100");
    }

    const result = await apiClient.api(`/api/audit/events?${params.toString()}`);
    const nextData = {
      ...data,
      audit: result.items ?? []
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus(`Audit log loaded: ${nextData.audit.length} event(s).`);
  }

  async function saveXpSettings(xp) {
    const result = await apiClient.api("/api/xp/settings", {
      method: "PATCH",
      body: JSON.stringify({ xp })
    });
    const nextData = {
      ...data,
      settings: result.settings ?? {
        ...data.settings,
        xp: result.xp
      }
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus("XP settings saved.");
  }

  async function saveEconomySettings(economy) {
    const result = await apiClient.api("/api/economy/settings", {
      method: "PATCH",
      body: JSON.stringify({ economy })
    });
    const nextData = {
      ...data,
      settings: result.settings ?? {
        ...data.settings,
        economy: result.economy
      }
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus("Economy settings saved.");
  }

  async function saveAutomodSettings(automod) {
    const result = await apiClient.api("/api/automod/settings", {
      method: "PATCH",
      body: JSON.stringify({ automod })
    });
    const nextData = {
      ...data,
      settings: result.settings ?? {
        ...data.settings,
        automod: result.automod
      }
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus("Automod settings saved live.");
  }

  async function savePermissionPolicies(permissions) {
    const result = await apiClient.api("/api/permissions", {
      method: "PATCH",
      body: JSON.stringify({ permissions })
    });
    const nextData = {
      ...data,
      settings: result.settings ?? {
        ...data.settings,
        permissions: result.permissions
      },
      permissions: result.permissions
    };
    setData(nextData);
    writeCachedDashboard(nextData);
    setStatus("Permission policies saved.");
  }

  async function setupTotp() {
    const result = await apiClient.api("/auth/totp/setup", { method: "POST" });
    setTotpResult({
      title: "2FA setup started",
      lines: [
        "Add this TOTP secret in your authenticator app, then confirm with a code:",
        result.secret,
        "",
        result.otpauthUrl
      ]
    });
    setStatus("2FA setup started.");
  }

  async function confirmTotp(code) {
    const result = await apiClient.api("/auth/totp/confirm", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    setAuth({ ...authRef.current, user: result.user });
    setTotpResult({ title: "2FA enabled", lines: [`Enabled for ${result.user.email}.`] });
    setStatus("2FA enabled.");
  }

  async function disableTotp(code) {
    const result = await apiClient.api("/auth/totp/disable", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    setAuth({ ...authRef.current, user: result.user });
    setTotpResult({ title: "2FA disabled", lines: [`Disabled for ${result.user.email}.`] });
    setStatus("2FA disabled.");
  }

  async function installPwa() {
    if (!installPrompt) {
      setStatus("PWA install prompt is not available yet.");
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
    setStatus("PWA install prompt completed.");
  }

  async function refreshPushState() {
    if (!supportsPush() || !authRef.current.accessToken) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const config = await apiClient.api("/api/push/public-key");
    setPushState({
      supported: true,
      subscribed: Boolean(subscription),
      enabled: Boolean(config.enabled),
      permission: Notification.permission
    });
  }

  async function subscribePush() {
    if (!supportsPush()) {
      setStatus("Web push is not supported by this browser.");
      return;
    }

    const config = await apiClient.api("/api/push/public-key");
    if (!config.enabled || !config.publicKey) {
      setStatus("Web push is not configured on the server.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushState((current) => ({ ...current, permission }));
      setStatus("Notification permission was not granted.");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });

    await apiClient.api("/api/push/subscriptions", {
      method: "POST",
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    await refreshPushState();
    setStatus("Web push notifications enabled.");
  }

  async function unsubscribePush() {
    if (!supportsPush()) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await apiClient.api("/api/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    await refreshPushState();
    setStatus("Web push notifications disabled.");
  }

  async function sendTestPush() {
    const result = await apiClient.api("/api/push/test", { method: "POST" });
    setStatus(result.disabled
      ? "Web push is not configured on the server."
      : `Test push sent: ${result.sent}, failed: ${result.failed}.`);
  }

  const canModerate = roleAtLeast(auth.user?.role, "MODERATOR");
  const canAdmin = roleAtLeast(auth.user?.role, "ADMIN");

  return (
    <Shell
      route={route}
      onRouteChange={changeRoute}
      auth={auth}
      status={status}
      onLogin={(payload) => login(payload).catch((error) => setStatus(`Login failed: ${error.message}`))}
      onLogout={() => logout().catch((error) => setStatus(`Logout failed: ${error.message}`))}
    >
      <TotpResult result={totpResult} />
      {route === "overview" && <OverviewPanel summary={data.summary} />}
      {route === "embeds" && <EmbedPanel channels={data.channels} canSend={canAdmin} onSend={(payload) => sendEmbed(payload).catch((error) => setStatus(`Embed failed: ${error.message}`))} />}
      {route === "tickets" && <TicketsPanel tickets={data.tickets} canView={canModerate} />}
      {route === "moderation" && <ModerationPanel cases={data.cases} canView={canModerate} />}
      {route === "proposals" && <ProposalsPanel proposals={data.proposals} />}
      {route === "automod" && (
        <AutomodPanel
          events={data.automod}
          settings={data.settings}
          canView={canModerate}
          canManage={canAdmin}
          onSave={(automod) => saveAutomodSettings(automod).catch((error) => setStatus(`Automod settings failed: ${error.message}`))}
        />
      )}
      {route === "spam" && <AntiSpamPanel events={data.spam} canView={canModerate} />}
      {route === "audit" && (
        <AuditLogPanel
          events={data.audit}
          canView={canModerate}
          channels={data.channels}
          onSearch={(filters) => searchAudit(filters).catch((error) => setStatus(`Audit search failed: ${error.message}`))}
        />
      )}
      {route === "economy" && (
        <EconomyPanel
          settings={data.settings}
          roles={data.roles}
          canManage={canAdmin}
          onSave={(xp) => saveXpSettings(xp).catch((error) => setStatus(`XP settings failed: ${error.message}`))}
          onSaveEconomy={(economy) => saveEconomySettings(economy).catch((error) => setStatus(`Economy settings failed: ${error.message}`))}
        />
      )}
      {route === "permissions" && (
        <PermissionControllerPanel
          policies={data.permissions}
          roles={data.roles}
          canManage={canAdmin}
          onSave={(permissions) => savePermissionPolicies(permissions).catch((error) => setStatus(`Permission policies failed: ${error.message}`))}
        />
      )}
      {route === "music" && <RoadmapPanel {...ROADMAP_PANELS.music} />}
      {route === "wallet" && <RoadmapPanel {...ROADMAP_PANELS.wallet} />}
      {route === "blockchain" && (
        <BlockchainPanel
          status={data.blockchain}
          onRefresh={() => refreshBlockchainStatus().catch((error) => setStatus(`Blockchain refresh failed: ${error.message}`))}
        />
      )}
      {route === "settings" && (
        <SettingsPanel
          settings={data.settings}
          onTotpSetup={() => setupTotp().catch((error) => setStatus(`2FA setup failed: ${error.message}`))}
          onTotpConfirm={(code) => confirmTotp(code).catch((error) => setStatus(`2FA confirm failed: ${error.message}`))}
          onTotpDisable={(code) => disableTotp(code).catch((error) => setStatus(`2FA disable failed: ${error.message}`))}
          pwa={{
            canInstall: Boolean(installPrompt),
            pushState,
            canSendTestPush: canAdmin,
            onInstall: () => installPwa().catch((error) => setStatus(`PWA install failed: ${error.message}`)),
            onSubscribePush: () => subscribePush().catch((error) => setStatus(`Push subscribe failed: ${error.message}`)),
            onUnsubscribePush: () => unsubscribePush().catch((error) => setStatus(`Push unsubscribe failed: ${error.message}`)),
            onSendTestPush: () => sendTestPush().catch((error) => setStatus(`Test push failed: ${error.message}`))
          }}
        />
      )}
    </Shell>
  );
}

function readRoute() {
  const route = window.location.hash.replace(/^#\/?/, "");
  return ROUTES.has(route) ? route : "overview";
}

async function loadSettled(requests) {
  const entries = await Promise.all(requests.map(async ([key, promise]) => {
    try {
      return [key, await promise];
    } catch (error) {
      return [key, { ok: false, error: error.message }];
    }
  }));
  return Object.fromEntries(entries);
}

function roleAtLeast(role, minimumRole) {
  return (ROLE_WEIGHT[role] ?? 0) >= (ROLE_WEIGHT[minimumRole] ?? 0);
}

function supportsPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function writeCachedDashboard(data) {
  localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
    cachedAt: new Date().toISOString(),
    data
  }));
}

function readCachedDashboard() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
