import { getSettings } from "./config.js";

export const XP_COLLECTION = "xp-profiles";
export const XP_LEVEL_CURVES = Object.freeze(["linear", "quadratic", "exponential"]);

const DEFAULT_XP_SETTINGS = Object.freeze({
  enabled: true,
  messageXp: 15,
  messageCooldownSeconds: 60,
  voiceXpPerMinute: 5,
  minVoiceSessionSeconds: 60,
  levelCurve: "quadratic",
  levelBaseXp: 100,
  levelGrowthFactor: 1.35,
  maxLevel: 1000,
  roleRewards: []
});

const voiceSessions = new Map();

export function registerXpLeveling({ store, now = () => new Date() }) {
  return {
    handleMessage: async (message) => trackMessageXp({ store, message, now }),
    handleVoiceStateUpdate: async (oldState, newState) => trackVoiceStateXp({ store, oldState, newState, now })
  };
}

export async function trackMessageXp({ store, message, now = () => new Date() }) {
  if (!message.guildId || message.author?.bot) return null;

  const settings = await getSettings(store);
  const xpSettings = normalizeXpSettings(settings.xp);
  if (xpSettings.enabled === false) return null;

  const currentTime = now();
  const profile = await getOrCreateXpProfile(store, {
    guildId: message.guildId,
    userId: message.author.id,
    userTag: message.author.tag,
    now: currentTime
  });

  const cooldownMs = xpSettings.messageCooldownSeconds * 1000;
  const lastAwardAt = profile.lastMessageXpAt ? new Date(profile.lastMessageXpAt) : null;
  const canAward = !lastAwardAt || currentTime.getTime() - lastAwardAt.getTime() >= cooldownMs;
  const messageXp = canAward ? xpSettings.messageXp : 0;
  const award = calculateXpAward(profile, messageXp, xpSettings);

  const updated = await upsertXpProfile(store, {
    ...profile,
    userTag: message.author.tag,
    xp: award.xp,
    level: award.level,
    messageXp: profile.messageXp + messageXp,
    messageCount: profile.messageCount + 1,
    awardedMessageCount: profile.awardedMessageCount + (canAward ? 1 : 0),
    cooldownSkippedMessages: profile.cooldownSkippedMessages + (canAward ? 0 : 1),
    lastMessageAt: currentTime.toISOString(),
    lastMessageXpAt: canAward ? currentTime.toISOString() : profile.lastMessageXpAt,
    updatedAt: currentTime.toISOString()
  });

  return {
    profile: updated,
    awardedXp: messageXp,
    cooldownSkipped: !canAward,
    levelChanged: award.levelChanged,
    leveledUp: award.leveledUp,
    previousLevel: award.previousLevel,
    progress: getLevelProgress(award.xp, xpSettings)
  };
}

export async function trackVoiceStateXp({ store, oldState, newState, now = () => new Date() }) {
  const member = newState.member ?? oldState.member;
  const user = member?.user;
  const guildId = newState.guild?.id ?? oldState.guild?.id;
  const userId = user?.id ?? newState.id ?? oldState.id;

  if (!guildId || !userId || user?.bot) return null;

  const settings = await getSettings(store);
  const xpSettings = normalizeXpSettings(settings.xp);
  if (xpSettings.enabled === false) return null;

  const oldChannelId = oldState.channelId ?? null;
  const newChannelId = newState.channelId ?? null;
  if (oldChannelId === newChannelId) return null;

  const currentTime = now();
  const key = profileId(guildId, userId);
  let result = null;

  if (oldChannelId) {
    const session = voiceSessions.get(key);
    if (session) {
      result = await finishVoiceSession({
        store,
        session,
        userTag: user?.tag,
        endedAt: currentTime,
        xpSettings
      });
      voiceSessions.delete(key);
    }
  }

  if (newChannelId) {
    voiceSessions.set(key, {
      guildId,
      userId,
      userTag: user?.tag,
      channelId: newChannelId,
      joinedAt: currentTime
    });

    const profile = await getOrCreateXpProfile(store, {
      guildId,
      userId,
      userTag: user?.tag,
      now: currentTime
    });

    await upsertXpProfile(store, {
      ...profile,
      activeVoiceChannelId: newChannelId,
      activeVoiceJoinedAt: currentTime.toISOString(),
      updatedAt: currentTime.toISOString()
    });
  }

  return result;
}

export async function finishVoiceSession({ store, session, userTag, endedAt, xpSettings }) {
  const profile = await getOrCreateXpProfile(store, {
    guildId: session.guildId,
    userId: session.userId,
    userTag: userTag ?? session.userTag,
    now: endedAt
  });

  const sessionSeconds = Math.max(0, Math.floor((endedAt.getTime() - session.joinedAt.getTime()) / 1000));
  const minSeconds = xpSettings.minVoiceSessionSeconds;
  const voiceXp = sessionSeconds >= minSeconds
    ? Math.floor(sessionSeconds / 60) * xpSettings.voiceXpPerMinute
    : 0;
  const award = calculateXpAward(profile, voiceXp, xpSettings);

  const updated = await upsertXpProfile(store, {
    ...profile,
    userTag: userTag ?? session.userTag ?? profile.userTag,
    xp: award.xp,
    level: award.level,
    voiceXp: profile.voiceXp + voiceXp,
    voiceSeconds: profile.voiceSeconds + sessionSeconds,
    activeVoiceChannelId: null,
    activeVoiceJoinedAt: null,
    updatedAt: endedAt.toISOString()
  });

  return {
    profile: updated,
    awardedXp: voiceXp,
    voiceSeconds: sessionSeconds,
    levelChanged: award.levelChanged,
    leveledUp: award.leveledUp,
    previousLevel: award.previousLevel,
    progress: getLevelProgress(award.xp, xpSettings)
  };
}

export async function getOrCreateXpProfile(store, { guildId, userId, userTag = null, now = new Date() }) {
  const existing = (await store.list(XP_COLLECTION)).find(
    (item) => item.guildId === guildId && item.userId === userId
  );
  if (existing) return normalizeXpProfile(existing);

  return upsertXpProfile(store, createXpProfile({ guildId, userId, userTag, now }));
}

export async function upsertXpProfile(store, profile) {
  const normalized = normalizeXpProfile(profile);
  const updated = await store.update(
    XP_COLLECTION,
    (item) => item.id === normalized.id,
    () => normalized
  );

  return updated ?? store.add(XP_COLLECTION, normalized);
}

export function createXpProfile({ guildId, userId, userTag = null, now = new Date() }) {
  const timestamp = now instanceof Date ? now.toISOString() : String(now);
  return {
    id: profileId(guildId, userId),
    guildId,
    userId,
    userTag,
    xp: 0,
    level: 0,
    messageXp: 0,
    voiceXp: 0,
    messageCount: 0,
    awardedMessageCount: 0,
    cooldownSkippedMessages: 0,
    voiceSeconds: 0,
    lastMessageAt: null,
    lastMessageXpAt: null,
    activeVoiceChannelId: null,
    activeVoiceJoinedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function calculateLevel(xp, xpSettings = {}) {
  const settings = normalizeXpSettings(xpSettings);
  const totalXp = Math.max(0, Number(xp) || 0);
  let level = 0;

  while (level < settings.maxLevel && totalXp >= calculateXpForLevel(level + 1, settings)) {
    level += 1;
  }

  return level;
}

export function calculateXpForLevel(level, xpSettings = {}) {
  const settings = normalizeXpSettings(xpSettings);
  const targetLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (targetLevel <= 0) return 0;

  if (settings.levelCurve === "linear") {
    return Math.floor(settings.levelBaseXp * targetLevel);
  }

  if (settings.levelCurve === "exponential") {
    const growth = Math.max(1.01, settings.levelGrowthFactor);
    const xp = settings.levelBaseXp * ((growth ** targetLevel - 1) / (growth - 1));
    return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(xp));
  }

  return Math.floor(settings.levelBaseXp * targetLevel * targetLevel);
}

export function getLevelProgress(xp, xpSettings = {}) {
  const settings = normalizeXpSettings(xpSettings);
  const totalXp = Math.max(0, Number(xp) || 0);
  const level = calculateLevel(totalXp, settings);
  const currentLevelXp = calculateXpForLevel(level, settings);
  const nextLevelXp = level >= settings.maxLevel ? null : calculateXpForLevel(level + 1, settings);

  return {
    level,
    xp: totalXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: Math.max(0, totalXp - currentLevelXp),
    xpNeededForNextLevel: nextLevelXp === null ? 0 : Math.max(0, nextLevelXp - totalXp),
    percentToNextLevel: nextLevelXp === null
      ? 100
      : Math.min(100, Math.round(((totalXp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100))
  };
}

export function calculateXpAward(profile, amount, xpSettings = {}) {
  const settings = normalizeXpSettings(xpSettings);
  const awardedXp = Math.max(0, Math.floor(Number(amount) || 0));
  const currentLevel = Number(profile.level ?? 0);
  const nextXp = Number(profile.xp ?? 0) + awardedXp;
  const nextLevel = calculateLevel(nextXp, settings);

  return {
    xp: nextXp,
    level: nextLevel,
    previousLevel: currentLevel,
    levelChanged: nextLevel !== currentLevel,
    leveledUp: nextLevel > currentLevel
  };
}

export function normalizeXpSettings(settings = {}) {
  const levelCurve = XP_LEVEL_CURVES.includes(settings.levelCurve)
    ? settings.levelCurve
    : DEFAULT_XP_SETTINGS.levelCurve;

  return {
    ...DEFAULT_XP_SETTINGS,
    ...settings,
    enabled: settings.enabled !== false,
    messageXp: clampInteger(settings.messageXp, 0, 10000, DEFAULT_XP_SETTINGS.messageXp),
    messageCooldownSeconds: clampInteger(settings.messageCooldownSeconds, 0, 86400, DEFAULT_XP_SETTINGS.messageCooldownSeconds),
    voiceXpPerMinute: clampInteger(settings.voiceXpPerMinute, 0, 10000, DEFAULT_XP_SETTINGS.voiceXpPerMinute),
    minVoiceSessionSeconds: clampInteger(settings.minVoiceSessionSeconds, 0, 86400, DEFAULT_XP_SETTINGS.minVoiceSessionSeconds),
    levelCurve,
    levelBaseXp: clampInteger(settings.levelBaseXp, 1, 100000000, DEFAULT_XP_SETTINGS.levelBaseXp),
    levelGrowthFactor: clampNumber(settings.levelGrowthFactor, 1.01, 10, DEFAULT_XP_SETTINGS.levelGrowthFactor),
    maxLevel: clampInteger(settings.maxLevel, 1, 10000, DEFAULT_XP_SETTINGS.maxLevel),
    roleRewards: normalizeRoleRewards(settings.roleRewards)
  };
}

export function normalizeRoleRewards(roleRewards = []) {
  if (!Array.isArray(roleRewards)) return [];

  const seen = new Set();
  return roleRewards
    .map((reward) => {
      const level = Math.floor(Number(reward?.level));
      return {
        level: Number.isFinite(level) && level > 0 ? Math.min(10000, level) : 0,
        roleId: String(reward?.roleId ?? "").trim(),
        roleName: String(reward?.roleName ?? "").trim()
      };
    })
    .filter((reward) => reward.level > 0 && reward.roleId)
    .filter((reward) => {
      const key = `${reward.level}:${reward.roleId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.level - right.level || left.roleName.localeCompare(right.roleName))
    .slice(0, 50);
}

function normalizeXpProfile(profile) {
  return {
    ...createXpProfile({
      guildId: profile.guildId,
      userId: profile.userId,
      userTag: profile.userTag,
      now: profile.createdAt ?? new Date()
    }),
    ...profile,
    xp: Number(profile.xp ?? 0),
    level: Number(profile.level ?? 0),
    messageXp: Number(profile.messageXp ?? 0),
    voiceXp: Number(profile.voiceXp ?? 0),
    messageCount: Number(profile.messageCount ?? 0),
    awardedMessageCount: Number(profile.awardedMessageCount ?? 0),
    cooldownSkippedMessages: Number(profile.cooldownSkippedMessages ?? 0),
    voiceSeconds: Number(profile.voiceSeconds ?? 0)
  };
}

function profileId(guildId, userId) {
  return `${guildId}:${userId}`;
}

function clampInteger(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
