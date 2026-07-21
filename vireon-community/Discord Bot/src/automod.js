import { PermissionFlagsBits } from "discord.js";
import { writeAuditLog } from "./audit-log.js";
import { getSettings } from "./config.js";
import { sendPushNotification } from "./push-notifications.js";

const AUTOMOD_COLLECTION = "automod-events";

export const DEFAULT_AUTOMOD_SETTINGS = {
  enabled: true,
  deleteBlockedMessages: true,
  blockDiscordInvites: true,
  blockMassMentions: true,
  maxMentions: 6,
  blockScamKeywords: true,
  scamKeywords: [
    "airdrop",
    "free mint",
    "claim reward",
    "seed phrase",
    "private key",
    "guaranteed profit",
    "guaranteed returns",
    "investment opportunity",
    "double your",
    "wallet verification"
  ],
  customRules: [],
  antiRaid: {
    enabled: true,
    joinWindowSeconds: 60,
    maxJoins: 8,
    alertCooldownMinutes: 5
  }
};

export function registerAutomod({ store, permissions }) {
  return async function handleMessage(message) {
    if (!message.guild || message.author.bot) return;
    if (message.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;
    if (permissions.hasStaffRoleFromMember(message.member)) return;

    const settings = await getSettings(store);
    const automodSettings = normalizeAutomodSettings(settings.automod);
    if (!automodSettings.enabled) return;

    const violation = detectViolation(message, automodSettings);
    if (!violation) return;

    if (automodSettings.deleteBlockedMessages && message.deletable) {
      await message.delete().catch(() => null);
    }

    const event = await store.add(AUTOMOD_COLLECTION, {
      guildId: message.guildId,
      channelId: message.channelId,
      userId: message.author.id,
      userTag: message.author.tag,
      reason: violation.reason,
      matched: violation.matched,
      contentPreview: message.content.slice(0, 500)
    });

    await writeAuditLog(message.guild, {
      title: "Automod Action",
      description: `Event ${event.id}`,
      fields: [
        { name: "User", value: message.author.tag, inline: true },
        { name: "Channel", value: `<#${message.channelId}>`, inline: true },
        { name: "Reason", value: violation.reason, inline: false },
        { name: "Matched", value: violation.matched, inline: false }
      ],
      color: 0xeb5757,
      type: "automod",
      source: "automod",
      targetUserId: message.author.id,
      targetTag: message.author.tag,
      channelId: message.channelId,
      relatedId: event.id,
      metadata: {
        reason: violation.reason,
        matched: violation.matched,
        contentPreview: message.content.slice(0, 500)
      }
    }, { store });

    if (isCriticalViolation(violation)) {
      await sendPushNotification(store, {
        title: "Critical Automod Alert",
        body: `${message.author.tag}: ${violation.reason}`,
        url: "/admin/#automod"
      }, { roles: ["MODERATOR", "ADMIN", "SUPER_ADMIN"] });
    }
  };
}

function detectViolation(message, automodSettings) {
  const content = message.content ?? "";
  const lower = content.toLowerCase();

  if (automodSettings.blockDiscordInvites && /discord\.gg\/|discord\.com\/invite\//i.test(content)) {
    return { reason: "Discord invite link blocked", matched: "discord invite" };
  }

  if (
    automodSettings.blockMassMentions &&
    message.mentions.users.size + message.mentions.roles.size >= automodSettings.maxMentions
  ) {
    return {
      reason: "Mass mention blocked",
      matched: `${message.mentions.users.size + message.mentions.roles.size} mentions`
    };
  }

  if (automodSettings.blockScamKeywords) {
    const keyword = automodSettings.scamKeywords.find((item) => lower.includes(item.toLowerCase()));
    if (keyword) {
      return { reason: "Scam keyword blocked", matched: keyword };
    }
  }

  const customRule = automodSettings.customRules.find((rule) => {
    if (!rule.enabled || !rule.pattern) return false;
    try {
      return new RegExp(rule.pattern, rule.flags).test(content);
    } catch {
      return false;
    }
  });
  if (customRule) {
    return {
      reason: customRule.reason || "Custom automod rule matched",
      matched: customRule.label || customRule.pattern,
      ruleId: customRule.id
    };
  }

  return null;
}

function isCriticalViolation(violation) {
  return ["Scam keyword blocked", "Mass mention blocked"].includes(violation.reason);
}

export function normalizeAutomodSettings(input = {}) {
  const merged = {
    ...DEFAULT_AUTOMOD_SETTINGS,
    ...(input ?? {}),
    antiRaid: {
      ...DEFAULT_AUTOMOD_SETTINGS.antiRaid,
      ...(input?.antiRaid ?? {})
    }
  };

  return {
    enabled: merged.enabled !== false,
    deleteBlockedMessages: merged.deleteBlockedMessages !== false,
    blockDiscordInvites: merged.blockDiscordInvites !== false,
    blockMassMentions: merged.blockMassMentions !== false,
    maxMentions: clampInteger(merged.maxMentions, 2, 100, DEFAULT_AUTOMOD_SETTINGS.maxMentions),
    blockScamKeywords: merged.blockScamKeywords !== false,
    scamKeywords: normalizeStringList(merged.scamKeywords).slice(0, 250),
    customRules: normalizeCustomRules(merged.customRules).slice(0, 50),
    antiRaid: {
      enabled: merged.antiRaid.enabled !== false,
      joinWindowSeconds: clampInteger(merged.antiRaid.joinWindowSeconds, 10, 3600, DEFAULT_AUTOMOD_SETTINGS.antiRaid.joinWindowSeconds),
      maxJoins: clampInteger(merged.antiRaid.maxJoins, 2, 500, DEFAULT_AUTOMOD_SETTINGS.antiRaid.maxJoins),
      alertCooldownMinutes: clampInteger(merged.antiRaid.alertCooldownMinutes, 1, 1440, DEFAULT_AUTOMOD_SETTINGS.antiRaid.alertCooldownMinutes)
    }
  };
}

function normalizeCustomRules(value) {
  const rules = Array.isArray(value) ? value : [];

  return rules
    .map((rule, index) => {
      const id = normalizeRuleId(rule?.id) || `rule-${index + 1}`;
      const pattern = String(rule?.pattern ?? "").trim();
      const flags = normalizeRegexFlags(rule?.flags);

      return {
        id,
        label: String(rule?.label ?? id).trim().slice(0, 80) || id,
        pattern: pattern.slice(0, 500),
        flags,
        reason: String(rule?.reason ?? "Custom automod rule matched").trim().slice(0, 160) || "Custom automod rule matched",
        enabled: rule?.enabled !== false,
        valid: pattern ? isValidRegex(pattern, flags) : false
      };
    })
    .filter((rule) => rule.pattern && rule.valid);
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRegexFlags(value) {
  const raw = String(value ?? "i").replace(/[^dgimsuvy]/g, "");
  return [...new Set(raw.split(""))].join("") || "i";
}

function normalizeRuleId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isValidRegex(pattern, flags) {
  try {
    new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
