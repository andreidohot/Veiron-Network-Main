export class PrismaStore {
  constructor({ prisma = null } = {}) {
    this.prisma = prisma;
  }

  async list(collection) {
    const prisma = await this.getPrisma();
    if (isXpProfileCollection(collection, prisma)) {
      const rows = await prisma.xpProfile.findMany({
        orderBy: { createdAt: "asc" }
      });
      return rows.map(serializeXpProfile);
    }

    const rows = await prisma.storeItem.findMany({
      where: { collection },
      orderBy: { createdAt: "asc" }
    });

    return rows.map((row) => parseStoredJson(row.data));
  }

  async add(collection, item) {
    const prisma = await this.getPrisma();
    const nextItem = {
      id: item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: item.createdAt ?? new Date().toISOString(),
      ...item
    };

    if (isXpProfileCollection(collection, prisma)) {
      await prisma.xpProfile.create({
        data: toXpProfileData(nextItem)
      });
      return nextItem;
    }

    await prisma.storeItem.create({
      data: {
        collection,
        id: nextItem.id,
        data: stringifyStoredJson(nextItem)
      }
    });

    return nextItem;
  }

  async update(collection, predicate, updater) {
    const prisma = await this.getPrisma();
    const items = await this.list(collection);
    const currentItem = items.find((item) => predicate(item));

    if (!currentItem) return null;

    const updatedItem = {
      ...currentItem,
      ...updater(currentItem),
      updatedAt: new Date().toISOString()
    };

    if (isXpProfileCollection(collection, prisma)) {
      await prisma.xpProfile.update({
        where: { id: updatedItem.id },
        data: toXpProfileData(updatedItem)
      });
      return updatedItem;
    }

    await prisma.storeItem.upsert({
      where: {
        collection_id: {
          collection,
          id: updatedItem.id
        }
      },
      create: {
        collection,
        id: updatedItem.id,
        data: stringifyStoredJson(updatedItem)
      },
      update: {
        data: stringifyStoredJson(updatedItem)
      }
    });

    return updatedItem;
  }

  async getSingleton(collection, defaults = {}) {
    const prisma = await this.getPrisma();
    const row = await prisma.storeSingleton.findUnique({
      where: { collection }
    });

    return {
      ...defaults,
      ...(row ? parseStoredJson(row.data) : {})
    };
  }

  async setSingleton(collection, value) {
    const prisma = await this.getPrisma();
    const nextValue = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    await prisma.storeSingleton.upsert({
      where: { collection },
      create: {
        collection,
        data: stringifyStoredJson(nextValue)
      },
      update: {
        data: stringifyStoredJson(nextValue)
      }
    });

    return nextValue;
  }

  async disconnect() {
    const prisma = await this.getPrisma();
    await prisma.$disconnect();
  }

  async healthCheck() {
    const prisma = await this.getPrisma();
    await prisma.storeItem.count();

    return {
      ok: true,
      status: "ready",
      driver: "prisma",
      provider: process.env.DATABASE_PROVIDER ?? "sqlite"
    };
  }

  async getPrisma() {
    if (this.prisma) return this.prisma;

    const clientModule = await import("@prisma/client");
    if (!clientModule.PrismaClient) {
      throw new Error("PrismaClient is not generated. Run `npm run prisma:generate` before using STORAGE_DRIVER=prisma.");
    }

    this.prisma = new clientModule.PrismaClient();
    return this.prisma;
  }
}

function parseStoredJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid stored JSON payload: ${error.message}`);
  }
}

function stringifyStoredJson(value) {
  return JSON.stringify(value);
}

function isXpProfileCollection(collection, prisma) {
  return collection === "xp-profiles" && Boolean(prisma.xpProfile);
}

function serializeXpProfile(row) {
  return {
    ...row,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    lastMessageAt: toIsoString(row.lastMessageAt),
    lastMessageXpAt: toIsoString(row.lastMessageXpAt),
    activeVoiceJoinedAt: toIsoString(row.activeVoiceJoinedAt)
  };
}

function toXpProfileData(item) {
  return {
    id: item.id,
    guildId: item.guildId,
    userId: item.userId,
    userTag: item.userTag ?? null,
    xp: Number(item.xp ?? 0),
    level: Number(item.level ?? 0),
    messageXp: Number(item.messageXp ?? 0),
    voiceXp: Number(item.voiceXp ?? 0),
    messageCount: Number(item.messageCount ?? 0),
    awardedMessageCount: Number(item.awardedMessageCount ?? 0),
    cooldownSkippedMessages: Number(item.cooldownSkippedMessages ?? 0),
    voiceSeconds: Number(item.voiceSeconds ?? 0),
    lastMessageAt: toDateOrNull(item.lastMessageAt),
    lastMessageXpAt: toDateOrNull(item.lastMessageXpAt),
    activeVoiceChannelId: item.activeVoiceChannelId ?? null,
    activeVoiceJoinedAt: toDateOrNull(item.activeVoiceJoinedAt)
  };
}

function toDateOrNull(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function toIsoString(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}
