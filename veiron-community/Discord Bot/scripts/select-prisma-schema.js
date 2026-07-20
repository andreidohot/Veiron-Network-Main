import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { childLogger } from "../src/logger.js";

const logger = childLogger({ module: "select-prisma-schema" });

const SUPPORTED_PROVIDERS = new Set(["sqlite", "postgresql", "mysql"]);
const provider = process.env.DATABASE_PROVIDER ?? "sqlite";

if (!SUPPORTED_PROVIDERS.has(provider)) {
  throw new Error(`Unsupported DATABASE_PROVIDER "${provider}". Use sqlite, postgresql or mysql.`);
}

const root = process.cwd();
const mainSource = path.join(root, "prisma", "main", `schema.${provider}.prisma`);
const ledgerSource = path.join(root, "prisma", "ledger", `schema.${provider}.prisma`);
const mainTarget = path.join(root, "prisma", "schema.prisma");
const ledgerTarget = path.join(root, "prisma", "ledger", "schema.prisma");

await mkdir(path.dirname(ledgerTarget), { recursive: true });
await copyFile(mainSource, mainTarget);
await copyFile(ledgerSource, ledgerTarget);

logger.info({ provider }, "Selected Prisma schemas.");
