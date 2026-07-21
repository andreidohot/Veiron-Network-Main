import { describe, expect, it } from "vitest";
import {
  WEB_WORKSPACE_COLLECTION,
  WEB_WORKSPACE_EVENTS_COLLECTION,
  buildWebWorkspaceOverview,
  normalizeWebPreferences,
  saveWebPreferences
} from "../src/web-workspace.js";

class MemoryStore {
  constructor(seed = {}) {
    this.collections = new Map(Object.entries(seed));
  }

  async list(collection) {
    return [...(this.collections.get(collection) ?? [])];
  }

  async add(collection, item) {
    const next = {
      id: item.id ?? `${collection}-${(this.collections.get(collection)?.length ?? 0) + 1}`,
      createdAt: item.createdAt ?? "2026-01-01T00:00:00.000Z",
      ...item
    };
    this.collections.set(collection, [...(this.collections.get(collection) ?? []), next]);
    return next;
  }

  async update(collection, predicate, updater) {
    let updated = null;
    const next = (this.collections.get(collection) ?? []).map((item) => {
      if (!predicate(item)) return item;
      updated = { ...item, ...updater(item), updatedAt: "2026-01-01T00:01:00.000Z" };
      return updated;
    });
    this.collections.set(collection, next);
    return updated;
  }
}

const viewer = { id: "viewer-1", email: "viewer@example.com", role: "VIEWER" };
const admin = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("Web Workspace", () => {
  it("builds a personal Admin Web cockpit with safe capabilities", async () => {
    const store = new MemoryStore({
      "audit-events": [
        { id: "audit-1", guildId: "guild-1", title: "Role updated", type: "role", createdAt: "2026-01-01T00:00:00.000Z" }
      ]
    });

    const overview = await buildWebWorkspaceOverview({ store, guildId: "guild-1", user: admin });

    expect(overview.ok).toBe(true);
    expect(overview.brand.name).toBe("VBOS");
    expect(overview.routes.some((route) => route.id === "web")).toBe(true);
    expect(overview.quickActions.some((action) => action.id === "open-message-creator")).toBe(true);
    expect(overview.stats.availableRoutes).toBeGreaterThan(10);
    expect(overview.capabilities.commandPalette).toBe(true);
    expect(overview.capabilities.shellExecution).toBe(false);
    expect(overview.capabilities.javascriptEval).toBe(false);
  });

  it("filters route/action availability by admin role", async () => {
    const overview = await buildWebWorkspaceOverview({ store: new MemoryStore(), guildId: "guild-1", user: viewer });

    expect(overview.routes.find((route) => route.id === "overview")?.available).toBe(true);
    expect(overview.routes.find((route) => route.id === "operations")?.available).toBe(false);
    expect(overview.quickActions.find((action) => action.id === "open-message-creator")?.available).toBe(false);
  });

  it("saves normalized preferences and writes web/audit events", async () => {
    const store = new MemoryStore();
    const saved = await saveWebPreferences({
      store,
      guildId: "guild-1",
      user: admin,
      payload: {
        defaultRoute: "operations",
        pinnedRoutes: ["operations", "custom", "fake", "operations"],
        favoriteActions: ["open-message-creator", "create-custom-command", "bad"],
        compactMode: true,
        reduceMotion: true,
        density: "compact"
      }
    });

    expect(saved.preferences.defaultRoute).toBe("operations");
    expect(saved.preferences.pinnedRoutes).toEqual(["operations", "custom"]);
    expect(saved.preferences.favoriteActions).toEqual(["open-message-creator", "create-custom-command"]);
    expect(saved.preferences.compactMode).toBe(true);
    expect((await store.list(WEB_WORKSPACE_COLLECTION))).toHaveLength(1);
    expect((await store.list(WEB_WORKSPACE_EVENTS_COLLECTION))).toHaveLength(1);
    expect((await store.list("audit-events"))).toHaveLength(1);
  });

  it("normalizes invalid preferences without leaking unsupported routes", () => {
    const normalized = normalizeWebPreferences({
      defaultRoute: "missing",
      pinnedRoutes: ["overview", "missing", "audit"],
      favoriteActions: ["missing", "search-audit"],
      density: "giant"
    });

    expect(normalized.defaultRoute).toBe("overview");
    expect(normalized.pinnedRoutes).toEqual(["overview", "audit"]);
    expect(normalized.favoriteActions).toEqual(["search-audit"]);
    expect(normalized.density).toBe("comfortable");
  });
});
