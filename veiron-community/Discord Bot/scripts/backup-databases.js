import "dotenv/config";
import { runDatabaseBackup } from "../src/backup.js";
import { childLogger, serializeError } from "../src/logger.js";

const logger = childLogger({ module: "backup-script" });
const dryRun = process.argv.includes("--dry-run") || process.env.BACKUP_DRY_RUN === "true";

try {
  const result = await runDatabaseBackup({ env: process.env, dryRun });
  logger.info({
    dryRun,
    archivePath: result.archivePath,
    archiveName: result.archiveName,
    sources: result.sources.length,
    upload: result.upload
  }, "Database backup script completed.");
} catch (error) {
  logger.error({ error: serializeError(error) }, "Database backup script failed.");
  process.exitCode = 1;
}
