import express from "express";
import helmet from "helmet";
import { ChannelType } from "discord.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdminAuthService, createAuthMiddleware, requireRole } from "./admin-auth.js";
import { searchAuditEvents } from "./audit-log.js";
import { normalizeAutomodSettings } from "./automod.js";
import { getBlockchainDashboardStatus } from "./blockchain-monitor.js";
import { getSettings, updateSettings } from "./config.js";
import { createVeironEmbed } from "./embed-factory.js";
import { normalizeEconomySettings } from "./economy.js";
import { buildHealthStatus } from "./health.js";
import { childLogger, serializeError } from "./logger.js";
import { normalizePermissionPolicies } from "./permission-controller.js";
import {
  configureWebPush,
  deletePushSubscription,
  getPushConfig,
  savePushSubscription,
  sendPushNotification
} from "./push-notifications.js";
import { normalizeXpSettings } from "./xp-leveling.js";

const logger = childLogger({ module: "admin-panel" });

export const ADMIN_ROUTE_ROLES = Object.freeze({
  "GET /auth/me": "VIEWER",
  "POST /auth/totp/setup": "VIEWER",
  "POST /auth/totp/confirm": "VIEWER",
  "POST /auth/totp/disable": "VIEWER",
  "GET /api/dashboard/summary": "VIEWER",
  "GET /api/guild": "VIEWER",
  "GET /api/settings": "VIEWER",
  "GET /api/permissions": "VIEWER",
  "PATCH /api/settings": "ADMIN",
  "PATCH /api/permissions": "ADMIN",
  "PATCH /api/xp/settings": "ADMIN",
  "PATCH /api/economy/settings": "ADMIN",
  "PATCH /api/automod/settings": "ADMIN",
  "GET /api/moderation/cases": "MODERATOR",
  "GET /api/tickets": "MODERATOR",
  "GET /api/audit/events": "MODERATOR",
  "GET /api/automod/events": "MODERATOR",
  "GET /api/anti-spam/events": "MODERATOR",
  "GET /api/proposals": "VIEWER",
  "GET /api/announcements": "VIEWER",
  "GET /api/blockchain/status": "VIEWER",
  "GET /api/push/public-key": "VIEWER",
  "POST /api/push/subscriptions": "VIEWER",
  "DELETE /api/push/subscriptions": "VIEWER",
  "POST /api/push/test": "ADMIN",
  "POST /api/embeds/send": "ADMIN"
});

export async function startAdminPanel({ client, guildId, store, permissions = null, musicManager, chainClient }) {
  if (process.env.ADMIN_PANEL_ENABLED !== "true") {
    return null;
  }

  const authService = new AdminAuthService();
  await authService.ensureDefaultSuperAdmin();
  configureWebPush();

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "128kb" }));

  const dashboardDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dashboard", "dist");
  const dashboardIndex = path.join(dashboardDir, "index.html");
  if (!existsSync(dashboardIndex)) {
    throw new Error("Dashboard build is missing. Run `npm run dashboard:build` before enabling the admin panel.");
  }

  app.use("/admin", express.static(dashboardDir));
  app.get("/", (_request, response) => response.redirect("/admin/"));
  app.get("/admin", (_request, response) => response.redirect("/admin/"));
  app.get("/admin/*", (_request, response) => response.sendFile(dashboardIndex));
  const auth = createAuthMiddleware(authService);
  const role = (method, route) => requireConfiguredRouteRole(method, route);

  app.get("/health", asyncRoute(async (_request, response) => {
    const status = await buildHealthStatus({ client, store, musicManager, chainClient });
    response.status(status.ok ? 200 : 503).json(status);
  }));

  app.post("/auth/login", asyncRoute(async (request, response) => {
    const result = await authService.login(request.body ?? {});
    response.json({ ok: true, ...result });
  }));

  app.post("/auth/refresh", asyncRoute(async (request, response) => {
    const result = await authService.refresh(request.body?.refreshToken);
    response.json({ ok: true, ...result });
  }));

  app.post("/auth/logout", asyncRoute(async (request, response) => {
    await authService.logout(request.body?.refreshToken);
    response.json({ ok: true });
  }));

  app.get("/auth/me", auth, role("GET", "/auth/me"), asyncRoute(async (request, response) => {
    response.json({ ok: true, user: request.adminUser });
  }));

  app.post("/auth/totp/setup", auth, role("POST", "/auth/totp/setup"), asyncRoute(async (request, response) => {
    const result = await authService.setupTotp(request.adminUser.id);
    response.json({ ok: true, ...result });
  }));

  app.post("/auth/totp/confirm", auth, role("POST", "/auth/totp/confirm"), asyncRoute(async (request, response) => {
    const user = await authService.confirmTotp(request.adminUser.id, request.body?.code);
    response.json({ ok: true, user });
  }));

  app.post("/auth/totp/disable", auth, role("POST", "/auth/totp/disable"), asyncRoute(async (request, response) => {
    const user = await authService.disableTotp(request.adminUser.id, request.body?.code);
    response.json({ ok: true, user });
  }));

  app.use("/api", auth);

  app.get("/api/dashboard/summary", role("GET", "/api/dashboard/summary"), asyncRoute(async (_request, response) => {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    const [cases, tickets, proposals, announcements, automodEvents, spamEvents, auditEvents] = await Promise.all([
      store.list("moderation-cases"),
      store.list("tickets"),
      store.list("proposals"),
      store.list("announcements"),
      store.list("automod-events"),
      store.list("spam-events"),
      store.list("audit-events")
    ]);

    response.json({
      ok: true,
      guild: {
        id: guild.id,
        name: guild.name,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size,
        members: guild.memberCount
      },
      counts: {
        moderationCases: cases.length,
        openTickets: tickets.filter((item) => item.status === "open").length,
        proposals: proposals.length,
        announcements: announcements.length,
        automodEvents: automodEvents.length,
        spamEvents: spamEvents.length,
        auditEvents: auditEvents.length,
        scheduledAnnouncements: announcements.filter((item) => item.scheduledAt && !item.published).length
      }
    });
  }));

  app.get("/api/guild", role("GET", "/api/guild"), asyncRoute(async (_request, response) => {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    response.json({
      id: guild.id,
      name: guild.name,
      channels: guild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildText)
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          parentId: channel.parentId
        })),
      roles: guild.roles.cache
        .filter((roleItem) => roleItem.id !== guild.id && !roleItem.managed)
        .sort((left, right) => right.position - left.position)
        .map((roleItem) => ({
          id: roleItem.id,
          name: roleItem.name,
          position: roleItem.position,
          color: roleItem.hexColor,
          managed: roleItem.managed
        }))
    });
  }));

  app.get("/api/moderation/cases", role("GET", "/api/moderation/cases"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("moderation-cases")
    });
  }));

  app.get("/api/tickets", role("GET", "/api/tickets"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("tickets")
    });
  }));

  app.get("/api/audit/events", role("GET", "/api/audit/events"), asyncRoute(async (request, response) => {
    const items = await searchAuditEvents(store, request.query ?? {});
    response.json({
      ok: true,
      items,
      filters: {
        q: request.query?.q ?? "",
        type: request.query?.type ?? "",
        source: request.query?.source ?? "",
        actorUserId: request.query?.actorUserId ?? "",
        targetUserId: request.query?.targetUserId ?? "",
        channelId: request.query?.channelId ?? "",
        from: request.query?.from ?? "",
        to: request.query?.to ?? "",
        limit: request.query?.limit ?? "100"
      }
    });
  }));

  app.get("/api/settings", role("GET", "/api/settings"), asyncRoute(async (_request, response) => {
    const settings = await getSettings(store);

    response.json({
      ok: true,
      settings: {
        ...settings,
        adminPanelEnabled: process.env.ADMIN_PANEL_ENABLED === "true",
        guildId,
        dataDir: process.env.BOT_DATA_DIR ?? "./data"
      }
    });
  }));

  app.get("/api/permissions", role("GET", "/api/permissions"), asyncRoute(async (_request, response) => {
    const settings = await getSettings(store);
    response.json({
      ok: true,
      permissions: normalizePermissionPolicies(settings.permissions)
    });
  }));

  app.patch("/api/settings", role("PATCH", "/api/settings"), asyncRoute(async (request, response) => {
    const settings = await updateSettings(store, request.body ?? {});
    permissions?.configure(settings.permissions);
    response.json({ ok: true, settings });
  }));

  app.patch("/api/permissions", role("PATCH", "/api/permissions"), asyncRoute(async (request, response) => {
    const permissionPolicies = normalizePermissionPolicies(request.body?.permissions ?? request.body ?? {});
    const settings = await updateSettings(store, { permissions: permissionPolicies });
    permissions?.configure(settings.permissions);
    response.json({ ok: true, settings, permissions: settings.permissions });
  }));

  app.patch("/api/xp/settings", role("PATCH", "/api/xp/settings"), asyncRoute(async (request, response) => {
    const xp = normalizeXpSettings(request.body?.xp ?? request.body ?? {});
    const settings = await updateSettings(store, { xp });
    response.json({ ok: true, settings, xp: settings.xp });
  }));

  app.patch("/api/economy/settings", role("PATCH", "/api/economy/settings"), asyncRoute(async (request, response) => {
    const economy = normalizeEconomySettings(request.body?.economy ?? request.body ?? {});
    const settings = await updateSettings(store, { economy });
    response.json({ ok: true, settings, economy: settings.economy });
  }));

  app.patch("/api/automod/settings", role("PATCH", "/api/automod/settings"), asyncRoute(async (request, response) => {
    const automod = normalizeAutomodSettings(request.body?.automod ?? request.body ?? {});
    const settings = await updateSettings(store, { automod });
    response.json({ ok: true, settings, automod: settings.automod });
  }));

  app.get("/api/automod/events", role("GET", "/api/automod/events"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("automod-events")
    });
  }));

  app.get("/api/anti-spam/events", role("GET", "/api/anti-spam/events"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("spam-events")
    });
  }));

  app.get("/api/proposals", role("GET", "/api/proposals"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("proposals")
    });
  }));

  app.get("/api/announcements", role("GET", "/api/announcements"), asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      items: await store.list("announcements")
    });
  }));

  app.get("/api/blockchain/status", role("GET", "/api/blockchain/status"), asyncRoute(async (_request, response) => {
    const status = await getBlockchainDashboardStatus({ store, chainClient });
    response.json(status);
  }));

  app.get("/api/push/public-key", role("GET", "/api/push/public-key"), asyncRoute(async (_request, response) => {
    const config = getPushConfig();
    response.json({
      ok: true,
      enabled: config.enabled,
      publicKey: config.publicKey
    });
  }));

  app.post("/api/push/subscriptions", role("POST", "/api/push/subscriptions"), asyncRoute(async (request, response) => {
    const subscription = await savePushSubscription(store, request.adminUser, request.body?.subscription);
    response.json({ ok: true, subscriptionId: subscription.id });
  }));

  app.delete("/api/push/subscriptions", role("DELETE", "/api/push/subscriptions"), asyncRoute(async (request, response) => {
    await deletePushSubscription(store, request.body?.endpoint);
    response.json({ ok: true });
  }));

  app.post("/api/push/test", role("POST", "/api/push/test"), asyncRoute(async (_request, response) => {
    const result = await sendPushNotification(store, {
      title: "Veiron Test Alert",
      body: "Web push notifications are enabled for the Veiron admin dashboard.",
      url: "/admin/#overview"
    }, { roles: ["ADMIN", "SUPER_ADMIN"] });
    response.json(result);
  }));

  app.post("/api/embeds/send", role("POST", "/api/embeds/send"), asyncRoute(async (request, response) => {
    const { channelId, title, description, color } = request.body ?? {};

    if (!channelId || !title || !description) {
      response.status(400).json({ ok: false, error: "channelId, title and description are required." });
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      response.status(400).json({ ok: false, error: "Target channel is not text-based." });
      return;
    }

    const message = await channel.send({
      embeds: [createVeironEmbed({ title, description, color })]
    });

    response.json({ ok: true, messageId: message.id });
  }));

  app.use(errorHandler);

  const host = process.env.ADMIN_PANEL_HOST ?? "127.0.0.1";
  const port = Number.parseInt(process.env.ADMIN_PANEL_PORT ?? "8787", 10);

  const server = app.listen(port, host, () => {
    logger.info({ host, port }, "Veiron admin panel API listening.");
  });

  return server;
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requireConfiguredRouteRole(method, route) {
  const key = `${method} ${route}`;
  const minimumRole = ADMIN_ROUTE_ROLES[key];
  if (!minimumRole) {
    throw new Error(`Missing admin route RBAC requirement for ${key}.`);
  }

  return requireRole(minimumRole);
}

function errorHandler(error, _request, response, _next) {
  logger.error({ error: serializeError(error) }, "Admin panel request failed.");
  response.status(error.statusCode ?? 500).json({
    ok: false,
    error: error.statusCode ? error.message : "Internal server error.",
    code: error.code
  });
}
