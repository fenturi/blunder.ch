import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, "sql");
const MIGRATION_LOCK_ID = 1_849_274_611;

export async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);

    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDirectory, migrationFile);
      const sql = await fs.readFile(migrationPath, "utf8");

      await client.query(sql);
      console.log(`Migration applied: ${migrationFile}`);
    }
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    } finally {
      client.release();
    }
  }
}
