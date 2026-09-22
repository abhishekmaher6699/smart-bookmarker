import { Pool } from "pg";

const databaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    process.env.NODE_ENV === "test"
      ? "TEST_DATABASE_URL is not configured"
      : "DATABASE_URL is not configured",
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export async function disconnectDatabase() {
  await pool.end();
}