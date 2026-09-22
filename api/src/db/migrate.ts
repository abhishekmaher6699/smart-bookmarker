import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

async function getMigrationFiles() {
  const files = await fs.readdir(migrationsDir);

  return files
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function getAppliedMigrations() {
  const result = await pool.query<{
    version: string;
  }>(`
    SELECT version
    FROM schema_migrations
  `);

  return new Set(result.rows.map((row) => row.version));
}

async function runMigration(
  version: string,
  sql: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(sql);

    await client.query(
      `
        INSERT INTO schema_migrations (version)
        VALUES ($1)
      `,
      [version],
    );

    await client.query("COMMIT");

    logger.info("Migration applied", {
      version,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    logger.error("Migration failed", {
      version,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  } finally {
    client.release();
  }
}

async function migrate() {
  logger.info("Starting database migrations");

  await ensureMigrationTable();

  const files = await getMigrationFiles();
  const applied = await getAppliedMigrations();

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");

    if (applied.has(version)) {
      logger.info("Migration already applied", {
        version,
      });

      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, "utf8");

    await runMigration(version, sql);
  }

  logger.info("Database migrations completed");
}

migrate()
  .catch((error) => {
    logger.error("Migration process failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });