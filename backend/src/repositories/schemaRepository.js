import { pool } from "../db.js";

let bestMoveColumnsReady = false;

export async function ensureBestMoveColumns() {
  if (bestMoveColumnsReady) return;

  await pool.query(`
    alter table move_annotations
      add column if not exists best_move_uci text,
      add column if not exists best_move_san text
  `);

  bestMoveColumnsReady = true;
}
