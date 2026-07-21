import { PermissionFlagsBits } from "discord.js";
import { ROLE_NAMES } from "./template.js";

const STAFF_ROLE_NAMES = new Set([
  ROLE_NAMES.founder,
  ROLE_NAMES.coreTeam,
  ROLE_NAMES.admin
]);

export const DEFAULT_PERMISSION_POLICIES = Object.freeze({
  allowAdministrator: true,
  allowManageGuild: true,
  setupAllowedUserIds: [],
  managerRoleIds: [],
  managerRoleNames: [...STAFF_ROLE_NAMES]
});

export class PermissionController {
  constructor({ setupAllowedUserIds = [], policies = {} } = {}) {
    this.baseSetupAllowedUserIds = new Set(setupAllowedUserIds);
    this.configure(policies);
  }

  configure(policies = {}) {
    this.policies = normalizePermissionPolicies(policies);
    this.setupAllowedUserIds = new Set([
      ...this.baseSetupAllowedUserIds,
      ...this.policies.setupAllowedUserIds
    ]);
    this.managerRoleIds = new Set(this.policies.managerRoleIds);
    this.managerRoleNames = new Set(this.policies.managerRoleNames);
    return this.policies;
  }

  canRunSetup(interaction) {
    return this.isAllowedSetupUser(interaction) || (
      this.policies.allowAdministrator && this.hasAdministrator(interaction)
    );
  }

  canManageCommunityBot(interaction) {
    return (
      this.isAllowedSetupUser(interaction) ||
      (this.policies.allowAdministrator && this.hasAdministrator(interaction)) ||
      this.hasStaffRole(interaction) ||
      (this.policies.allowManageGuild && this.hasPermission(interaction, PermissionFlagsBits.ManageGuild))
    );
  }

  isAllowedSetupUser(interaction) {
    return this.setupAllowedUserIds.size > 0 && this.setupAllowedUserIds.has(interaction.user.id);
  }

  hasAdministrator(interaction) {
    return this.hasPermission(interaction, PermissionFlagsBits.Administrator);
  }

  hasPermission(interaction, permission) {
    return interaction.memberPermissions?.has(permission) ?? false;
  }

  hasStaffRole(interaction) {
    return interaction.member?.roles?.cache?.some((role) =>
      this.managerRoleIds.has(role.id) || this.managerRoleNames.has(role.name)
    ) ?? false;
  }

  hasStaffRoleFromMember(member) {
    return member?.roles?.cache?.some((role) =>
      this.managerRoleIds.has(role.id) || this.managerRoleNames.has(role.name)
    ) ?? false;
  }
}

export function normalizePermissionPolicies(policies = {}) {
  return {
    allowAdministrator: policies.allowAdministrator !== false,
    allowManageGuild: policies.allowManageGuild !== false,
    setupAllowedUserIds: normalizeIdList(policies.setupAllowedUserIds),
    managerRoleIds: normalizeIdList(policies.managerRoleIds),
    managerRoleNames: normalizeNameList(policies.managerRoleNames, [...STAFF_ROLE_NAMES])
  };
}

function normalizeIdList(values) {
  return normalizeStringList(values)
    .map((value) => value.replace(/[^0-9]/g, ""))
    .filter((value) => value.length > 0);
}

function normalizeNameList(values, fallback = []) {
  const normalized = normalizeStringList(values);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStringList(values) {
  const source = Array.isArray(values)
    ? values
    : String(values ?? "")
      .split(/[\n,]/g);

  return [...new Set(source
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))];
}
