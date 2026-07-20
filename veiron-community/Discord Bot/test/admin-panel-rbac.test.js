import { describe, expect, it } from "vitest";
import { ADMIN_ROUTE_ROLES } from "../src/admin-panel.js";
import { ADMIN_ROLES } from "../src/admin-auth.js";

describe("admin panel route RBAC", () => {
  it("defines explicit minimum roles for every protected admin endpoint", () => {
    expect(ADMIN_ROUTE_ROLES).toEqual({
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
      "GET /api/push/public-key": "VIEWER",
      "POST /api/push/subscriptions": "VIEWER",
      "DELETE /api/push/subscriptions": "VIEWER",
      "POST /api/push/test": "ADMIN",
      "POST /api/embeds/send": "ADMIN"
    });
  });

  it("uses only supported admin roles", () => {
    expect(Object.values(ADMIN_ROUTE_ROLES).every((role) => ADMIN_ROLES.includes(role))).toBe(true);
  });
});
