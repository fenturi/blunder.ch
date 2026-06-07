import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, "../sql");
const migrationFiles = (await fs.readdir(migrationsDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

for (const migrationFile of migrationFiles) {
  const migrationPath = path.join(migrationsDirectory, migrationFile);
  const sql = await fs.readFile(migrationPath, "utf8");

  await pool.query(sql);
  console.log(`Migration applied: ${migrationFile}`);
}

await pool.end();
