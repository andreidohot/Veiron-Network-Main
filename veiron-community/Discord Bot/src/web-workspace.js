import { searchAuditEvents, writeAuditLog } from "./audit-log.js";

export const WEB_WORKSPACE_COLLECTION = "web-workspace-preferences";
export const WEB_WORKSPACE_EVENTS_COLLECTION = "web-workspace-events";

export const WEB_ROUTES = Object.freeze([
  { id: "overview", label: "Overview", group: "core", minimumRole: "VIEWER", description: "Runtime summary and global counters." },
  { id: "web", label: "Web Workspace", group: "core", minimumRole: "VIEWER", description: "Personal web cockpit, command palette, pinned routes and UX settings." },
  { id: "commands", label: "Command Center", group: "ops", minimumRole: "MODERATOR", description: "Full slash command catalog and Discord-side staff shortcuts." },
  { id: "control", label: "Control Center", group: "ops", minimumRole: "VIEWER", description: "Discord roles, channels, members, tickets and guild settings." },
  { id: "operations", label: "Bot Studio", group: "ops", minimumRole: "MODERATOR", description: "Safe console, Message Creator, approvals, templates and push history." },
  { id: "custom", label: "Custom Lab", group: "builder", minimumRole: "MODERATOR", description: "Custom commands, aliases and custom button interactions." },
  { id: "automations", label: "Automation Studio", group: "builder", minimumRole: "MODERATOR", description: "No-code trigger/action automation flows with dry-run and history." },
  { id: "modules", label: "Module Center", group: "platform", minimumRole: "MODERATOR", description: "Feature registry, risk levels, toggles and import/export bundles." },
  { id: "embeds", label: "Embeds", group: "content", minimumRole: "ADMIN", description: "Quick embed sender." },
  { id: "tickets", label: "Tickets", group: "support", minimumRole: "MODERATOR", description: "Ticket queue visibility and status history." },
  { id: "moderation", label: "Moderation", group: "safety", minimumRole: "MODERATOR", description: "Moderation cases and staff action ledger." },
  { id: "proposals", label: "Proposals", group: "community", minimumRole: "VIEWER", description: "Community proposals and announcement drafts." },
  { id: "automod", label: "Automod", group: "safety", minimumRole: "MODERATOR", description: "Automod live events and rules." },
  { id: "spam", label: "Anti-Spam", group: "safety", minimumRole: "MODERATOR", description: "Anti-spam runtime events." },
  { id: "audit", label: "Audit Log", group: "safety", minimumRole: "MODERATOR", description: "Searchable audit log for web and Discord actions." },
  { id: "economy", label: "Economy/Leveling", group: "community", minimumRole: "ADMIN", description: "XP, rank rewards, economy settings and role rewards." },
  { id: "permissions", label: "Permissions", group: "security", minimumRole: "ADMIN", description: "Runtime permission policies and allowed staff surfaces." },
  { id: "music", label: "Music", group: "optional", minimumRole: "VIEWER", description: "Music control shell and Lavalink readiness." },
  { id: "wallet", label: "Wallet/Payments", group: "optional", minimumRole: "VIEWER", description: "Optional wallet/payment surfaces, normally disabled for Discord-only deploys." },
  { id: "blockchain", label: "Blockchain Status", group: "optional", minimumRole: "VIEWER", description: "Optional Vireon chain adapter status." },
  { id: "settings", label: "Settings", group: "security", minimumRole: "VIEWER", description: "PWA install, push notification and 2FA controls." }
]);

export const WEB_QUICK_ACTIONS = Object.freeze([
  { id: "open-message-creator", label: "Open Message Creator", route: "operations", group: "content", minimumRole: "MODERATOR", description: "Jump to Bot Studio and create or request approval for a channel message." },
  { id: "open-approval-queue", label: "Review Approval Queue", route: "operations", group: "content", minimumRole: "ADMIN", description: "Open pending message approvals for admin review." },
  { id: "create-custom-command", label: "Create Custom Command", route: "custom", group: "builder", minimumRole: "ADMIN", description: "Open Custom Lab to add a prefix command, alias or response." },
  { id: "create-automation", label: "Create Automation Flow", route: "automations", group: "builder", minimumRole: "ADMIN", description: "Open Automation Studio and build a trigger/action flow." },
  { id: "manage-member-roles", label: "Manage Member Roles", route: "control", group: "ops", minimumRole: "ADMIN", description: "Open Control Center member role assignment and bulk role tools." },
  { id: "manage-channels", label: "Manage Channels", route: "control", group: "ops", minimumRole: "ADMIN", description: "Open channel/category create, delete, reorder and permission tools." },
  { id: "search-audit", label: "Search Audit Log", route: "audit", group: "safety", minimumRole: "MODERATOR", description: "Open audit search for recent staff and automation actions." },
  { id: "module-export", label: "Export Module Bundle", route: "modules", group: "platform", minimumRole: "ADMIN", description: "Open Module Center export/import tools." },
  { id: "permission-policies", label: "Edit Permission Policies", route: "permissions", group: "security", minimumRole: "ADMIN", description: "Open permission policy controls." },
  { id: "push-test", label: "Test Web Push", route: "settings", group: "security", minimumRole: "ADMIN", description: "Open settings to test admin web push alerts." }
]);

const DEFAULT_PREFERENCES = Object.freeze({
  defaultRoute: "overview",
  pinnedRoutes: ["operations", "control", "custom", "automations", "audit"],
  favoriteActions: ["open-message-creator", "create-custom-command", "create-automation", "search-audit"],
  compactMode: false,
  reduceMotion: false,
  showOptionalModules: false,
  commandPaletteEnabled: true,
  density: "comfortable"
});

const ROLE_WEIGHT = Object.freeze({
  VIEWER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4
});

export async function buildWebWorkspaceOverview({ store, guildId = null, user = null, client = null } = {}) {
  const preferences = await getWebPreferences({ store, guildId, user });
  const role = normalizeRole(user?.role ?? "VIEWER");
  const routes = WEB_ROUTES.map((route) => ({
    ...route,
    available: roleAtLeast(role, route.minimumRole),
    pinned: preferences.pinnedRoutes.includes(route.id)
  }));
  const quickActions = WEB_QUICK_ACTIONS.map((action) => ({
    ...action,
    available: roleAtLeast(role, action.minimumRole),
    favorite: preferences.favoriteActions.includes(action.id)
  }));
  const [recentAudit, webEvents] = await Promise.all([
    store ? searchAuditEvents(store, { guildId, limit: 24 }).catch(() => []) : [],
    listWebWorkspaceEvents({ store, guildId, limit: 20 }).catch(() => ({ items: [] }))
  ]);

  const availableRoutes = routes.filter((route) => route.available);
  const pinnedRoutes = preferences.pinnedRoutes
    .map((id) => routes.find((route) => route.id === id))
    .filter(Boolean)
    .filter((route) => route.available);
  const favoriteActions = preferences.favoriteActions
    .map((id) => quickActions.find((action) => action.id === id))
    .filter(Boolean)
    .filter((action) => action.available);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    brand: {
      name: "VBOS",
      longName: "Vireon Bot Operations Studio",
      adminWeb: process.env.PUBLIC_BASE_URL ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, "")}/admin/` : "/admin/"
    },
    user: user ? {
      id: user.id ?? null,
      email: user.email ?? null,
      role
    } : null,
    bot: {
      ready: Boolean(client?.isReady?.()),
      tag: client?.user?.tag ?? null,
      pingMs: Number.isFinite(client?.ws?.ping) ? client.ws.ping : null,
      uptimeMs: Number.isFinite(client?.uptime) ? client.uptime : null
    },
    preferences,
    routes,
    quickActions,
    pinnedRoutes,
    favoriteActions,
    recentAudit,
    recentWebEvents: webEvents.items,
    stats: {
      routes: routes.length,
      availableRoutes: availableRoutes.length,
      pinnedRoutes: pinnedRoutes.length,
      quickActions: quickActions.length,
      favoriteActions: favoriteActions.length,
      auditEvents: recentAudit.length,
      webEvents: webEvents.items.length
    },
    capabilities: {
      commandPalette: true,
      keyboardShortcuts: true,
      pinnedRoutes: true,
      persistedPreferences: true,
      localCacheFallback: true,
      destructiveActionsFromPalette: false,
      shellExecution: false,
      javascriptEval: false,
      audited: true
    }
  };
}

export async function getWebPreferences({ store, guildId = null, user = null } = {}) {
  const userId = user?.id ?? user?.email ?? "anonymous";
  const items = await safeList(store, WEB_WORKSPACE_COLLECTION);
  const existing = items.find((item) => item.guildId === guildId && item.userId === userId && !item.deletedAt);
  return normalizeWebPreferences(existing?.preferences ?? existing ?? DEFAULT_PREFERENCES);
}

export async function saveWebPreferences({ store, guildId = null, user = null, payload = {}, now = new Date() } = {}) {
  if (!store) throwHttpError(503, "Store is required for web preferences.");
  const userId = user?.id ?? user?.email ?? "anonymous";
  const actorTag = actorLabel(user);
  const preferences = normalizeWebPreferences(payload.preferences ?? payload);
  const items = await safeList(store, WEB_WORKSPACE_COLLECTION);
  const existing = items.find((item) => item.guildId === guildId && item.userId === userId && !item.deletedAt);

  let saved;
  if (existing) {
    saved = await store.update(
      WEB_WORKSPACE_COLLECTION,
      (item) => item.id === existing.id,
      (item) => ({
        ...item,
        preferences,
        updatedAt: now.toISOString(),
        updatedById: user?.id ?? null,
        updatedByTag: actorTag
      })
    );
  } else {
    saved = await store.add(WEB_WORKSPACE_COLLECTION, {
      guildId,
      userId,
      userEmail: user?.email ?? null,
      preferences,
      createdAt: now.toISOString(),
      createdById: user?.id ?? null,
      createdByTag: actorTag
    });
  }

  await logWebWorkspaceEvent({
    store,
    guildId,
    user,
    type: "web.preferences.save",
    title: "Web Workspace Preferences Saved",
    description: `${actorTag} updated Admin Web workspace preferences.`,
    status: "success",
    metadata: { preferences }
  });

  return { ok: true, preferences: saved.preferences ?? preferences, item: publicPreferenceRecord(saved) };
}

export async function listWebWorkspaceEvents({ store, guildId = null, limit = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 30, 100));
  const items = (await safeList(store, WEB_WORKSPACE_EVENTS_COLLECTION))
    .filter((item) => !guildId || item.guildId === guildId)
    .sort((left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0))
    .slice(0, safeLimit);
  return { ok: true, items };
}

export function normalizeWebPreferences(input = {}) {
  const allowedRoutes = new Set(WEB_ROUTES.map((route) => route.id));
  const allowedActions = new Set(WEB_QUICK_ACTIONS.map((action) => action.id));
  const density = ["compact", "comfortable", "spacious"].includes(input.density) ? input.density : DEFAULT_PREFERENCES.density;

  return {
    defaultRoute: allowedRoutes.has(input.defaultRoute) ? input.defaultRoute : DEFAULT_PREFERENCES.defaultRoute,
    pinnedRoutes: uniqueStrings(input.pinnedRoutes ?? DEFAULT_PREFERENCES.pinnedRoutes, allowedRoutes, 12),
    favoriteActions: uniqueStrings(input.favoriteActions ?? DEFAULT_PREFERENCES.favoriteActions, allowedActions, 12),
    compactMode: Boolean(input.compactMode),
    reduceMotion: Boolean(input.reduceMotion),
    showOptionalModules: Boolean(input.showOptionalModules),
    commandPaletteEnabled: input.commandPaletteEnabled !== false,
    density
  };
}

async function logWebWorkspaceEvent({ store, guildId, user, type, title, description, status = "success", metadata = {} }) {
  const event = await store.add(WEB_WORKSPACE_EVENTS_COLLECTION, {
    guildId,
    type,
    title,
    description,
    status,
    actorUserId: user?.id ?? null,
    actorTag: actorLabel(user),
    metadata,
    createdAt: new Date().toISOString()
  });

  await writeAuditLog(null, {
    guildId,
    title,
    description,
    type: "web-workspace",
    source: "admin-web",
    actorUserId: user?.id ?? null,
    actorTag: actorLabel(user),
    relatedId: event.id,
    metadata
  }, { store }).catch(() => null);

  return event;
}

async function safeList(store, collection) {
  if (!store) return [];
  return store.list(collection).catch(() => []);
}

function uniqueStrings(value, allowedSet, limit) {
  const input = Array.isArray(value) ? value : [];
  const seen = new Set();
  const output = [];
  for (const item of input) {
    const normalized = String(item ?? "").trim();
    if (!normalized || seen.has(normalized) || !allowedSet.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
    if (output.length >= limit) break;
  }
  return output.length > 0 ? output : [];
}

function publicPreferenceRecord(item) {
  if (!item) return null;
  return {
    id: item.id,
    guildId: item.guildId,
    userId: item.userId,
    userEmail: item.userEmail,
    preferences: item.preferences,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function roleAtLeast(role, minimumRole) {
  return ROLE_WEIGHT[normalizeRole(role)] >= ROLE_WEIGHT[normalizeRole(minimumRole)];
}

function normalizeRole(role) {
  return ROLE_WEIGHT[String(role ?? "").toUpperCase()] ? String(role).toUpperCase() : "VIEWER";
}

function actorLabel(user) {
  return user?.email ?? user?.displayName ?? user?.id ?? "admin-web";
}

function throwHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
