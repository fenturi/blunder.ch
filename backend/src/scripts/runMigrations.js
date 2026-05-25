import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationPath = path.resolve(__dirname, "../sql/001_init.sql");

const sql = await fs.readFile(migrationPath, "utf8");

await pool.query(sql);
console.log("Migrations applied");
await pool.end();
