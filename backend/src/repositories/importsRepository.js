import { pool } from "../db.js";

export async function createImportRecord({
  userId,
  provider,
  username,
  gameTypes,
  gameCount,
  dateRange,
  plan,
}) {
  const query = `
    insert into imports (
      user_id,
      provider,
      username,
      game_types,
      game_count,
      date_range,
      plan,
      status
    )
    values ($1, $2, $3, $4, $5, $6, $7, 'queued')
    returning *
  `;
  const { rows } = await pool.query(query, [
    userId,
    provider,
    username.toLowerCase(),
    gameTypes,
    gameCount,
    dateRange,
    plan,
  ]);
  return rows[0];
}

export async function setImportStatus(importId, status, patch = {}) {
  const query = `
    update imports
    set status = $2,
        provider_job_id = coalesce($3, provider_job_id),
        total_games = coalesce($4, total_games),
        imported_games = coalesce($5, imported_games),
        duplicate_games = coalesce($6, duplicate_games),
        failed_reason = $7,
        finished_at = case when $2 in ('completed', 'failed') then now() else finished_at end,
        updated_at = now()
    where id = $1
    returning *
  `;

  const values = [
    importId,
    status,
    patch.providerJobId ?? null,
    patch.totalGames ?? null,
    patch.importedGames ?? null,
    patch.duplicateGames ?? null,
    patch.failedReason ?? null,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function getImportById(importId) {
  const { rows } = await pool.query("select * from imports where id = $1", [importId]);
  return rows[0] ?? null;
}

export async function getDailyPlanUsage(userId, plan = "free") {
  const query = `
    select
      coalesce(sum(game_count), 0)::int as used,
      min(created_at) + interval '24 hours' as reset_at
    from imports
    where user_id = $1
      and plan = $2
      and status <> 'failed'
      and created_at >= now() - interval '24 hours'
  `;
  const { rows } = await pool.query(query, [userId, plan]);
  return {
    used: rows[0]?.used ?? 0,
    resetAt: rows[0]?.reset_at ?? null,
  };
}
