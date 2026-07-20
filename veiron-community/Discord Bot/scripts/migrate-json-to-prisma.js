import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { childLogger } from "../src/logger.js";
import { PrismaStore } from "../src/prisma-store.js";

const logger = childLogger({ module: "migrate-json-to-prisma" });
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), "data");
const DEFAULT_COLLECTIONS = [
  { collection: "moderation-cases", files: ["moderation-cases", "cases"] },
  { collection: "tickets", files: ["tickets"] },
  { collection: "proposals", files: ["proposals"] },
  { collection: "announcements", files: ["announcements"] },
  { collection: "automod-events", files: ["automod-events"] },
  { collection: "spam-events", files: ["spam-events"] }
];
const COLLECTION_ALIASES = new Map([
  ["cases", "moderation-cases"]
]);

export async function migrateJsonToPrisma({
  dataDir = process.env.BOT_DATA_DIR ?? DEFAULT_DATA_DIR,
  collections = DEFAULT_COLLECTIONS,
  dryRun = false,
  prisma = null
} = {}) {
  const store = dryRun ? null : new PrismaStore({ prisma });
  const prismaClient = dryRun ? null : await store.getPrisma();
  const summary = [];

  for (const config of collections) {
    const source = await readCollectionFile(dataDir, config);
    if (!source) {
      summary.push({
        collection: config.collection,
        source: null,
        total: 0,
        migrated: 0,
        skipped: true
      });
      continue;
    }

    assertValidItems(config.collection, source.items);

    if (!dryRun) {
      for (const item of source.items) {
        await upsertStoreItem(prismaClient, config.collection, item);
      }
    }

    summary.push({
      collection: config.collection,
      source: source.filePath,
      total: source.items.length,
      migrated: dryRun ? 0 : source.items.length,
      skipped: false
    });
  }

  if (store) await store.disconnect();
  return summary;
}

export function parseMigrationArgs(argv) {
  const options = {
    dataDir: process.env.BOT_DATA_DIR ?? DEFAULT_DATA_DIR,
    dryRun: false,
    collections: DEFAULT_COLLECTIONS
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--data-dir") {
      options.dataDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--data-dir=")) {
      options.dataDir = path.resolve(arg.slice("--data-dir=".length));
      continue;
    }

    if (arg === "--collections") {
      options.collections = parseCollectionSelection(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--collections=")) {
      options.collections = parseCollectionSelection(arg.slice("--collections=".length));
      continue;
    }

    throw new Error(`Unknown migration argument: ${arg}`);
  }

  return options;
}

export function parseCollectionSelection(value) {
  if (!value) throw new Error("--collections requires a comma-separated value.");

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((collection) => {
      const normalized = COLLECTION_ALIASES.get(collection) ?? collection;
      const defaults = DEFAULT_COLLECTIONS.find((item) => item.collection === normalized);
      return defaults ?? { collection: normalized, files: [normalized] };
    });
}

async function readCollectionFile(dataDir, config) {
  for (const fileName of config.files) {
    const filePath = path.join(dataDir, `${fileName}.json`);

    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        filePath,
        items: normalizeItems(parsed, filePath)
      };
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }
  }

  return null;
}

function normalizeItems(parsed, filePath) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  throw new Error(`${filePath} must contain either an array or an object with an items array.`);
}

function assertValidItems(collection, items) {
  const seen = new Set();

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Collection ${collection} contains a non-object item.`);
    }

    if (!item.id || typeof item.id !== "string") {
      throw new Error(`Collection ${collection} contains an item without a string id.`);
    }

    if (seen.has(item.id)) {
      throw new Error(`Collection ${collection} contains duplicate id "${item.id}".`);
    }

    seen.add(item.id);
  }
}

async function upsertStoreItem(prisma, collection, item) {
  const createData = {
    collection,
    id: item.id,
    data: JSON.stringify(item)
  };
  const createdAt = parseDate(item.createdAt);

  if (createdAt) createData.createdAt = createdAt;

  await prisma.storeItem.upsert({
    where: {
      collection_id: {
        collection,
        id: item.id
      }
    },
    create: createData,
    update: {
      data: JSON.stringify(item)
    }
  });
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function printSummary(summary, { dryRun }) {
  const action = dryRun ? "would migrate" : "migrated";

  for (const item of summary) {
    if (item.skipped) {
      logger.info({ collection: item.collection }, "Migration skipped; source file not found.");
      continue;
    }

    logger.info({
      collection: item.collection,
      action,
      count: dryRun ? item.total : item.migrated,
      source: item.source
    }, "Migration collection processed.");
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  try {
    const options = parseMigrationArgs(process.argv.slice(2));
    const summary = await migrateJsonToPrisma(options);
    printSummary(summary, options);
  } catch (error) {
    logger.error({ error: { message: error.message, stack: error.stack } }, "Migration failed.");
    process.exitCode = 1;
  }
}
