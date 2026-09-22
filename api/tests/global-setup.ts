import { existsSync } from "node:fs";
import { Client } from "pg";

const TEST_LOCK_NAME = "smart_bookmarker_test_suite";

export default async function globalSetup() {
  if (existsSync(".env")) {
    process.loadEnvFile(".env");
  }

  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is not configured");
  }

  // Test files intentionally clear shared tables. Hold this session-level lock
  // for the full Vitest process so concurrent local/CI runs cannot delete each
  // other's fixtures when they point at the same test database.
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [TEST_LOCK_NAME]);

  return async () => {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [TEST_LOCK_NAME]);
    await client.end();
  };
}
