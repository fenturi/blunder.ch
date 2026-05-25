import { pool } from "../db.js";

export async function upsertGame({
  importId,
  userId,
  provider,
  providerGameId,
  pgn,
  pgnHash,
  playedAt,
  whitePlayer,
  blackPlayer,
  result,
  timeControl,
  sourceUrl,
}) {
  const query = `
    insert into games (
      import_id,
      user_id,
      provider,
      provider_game_id,
      pgn,
      pgn_hash,
      played_at,
      white_player,
      black_player,
      result,
      time_control,
      source_url
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    on conflict (pgn_hash)
    do update set import_id = excluded.import_id,
                  analysis_status = case
                    when games.analysis_status = 'completed' then games.analysis_status
                    else 'queued'
                  end,
                  analysis_error = case
                    when games.analysis_status = 'completed' then games.analysis_error
                    else null
                  end,
                  updated_at = now()
    returning *, (xmax = 0) as inserted
  `;

  const values = [
    importId,
    userId,
    provider,
    providerGameId,
    pgn,
    pgnHash,
    playedAt,
    whitePlayer,
    blackPlayer,
    result,
    timeControl,
    sourceUrl,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function markGameAnalysis(gameId, patch) {
  const query = `
    update games
    set analysis_status = $2,
        analysis_started_at = coalesce($3, analysis_started_at),
        analysis_completed_at = coalesce($4, analysis_completed_at),
        analysis_error = $5,
        updated_at = now()
    where id = $1
    returning *
  `;

  const { rows } = await pool.query(query, [
    gameId,
    patch.status,
    patch.startedAt ?? null,
    patch.completedAt ?? null,
    patch.error ?? null,
  ]);

  return rows[0];
}

export async function getGameById(gameId) {
  const gameQuery = "select * from games where id = $1";
  const annotationsQuery = `
    select
      id,
      game_id,
      move_index,
      ply,
      san,
      from_square,
      to_square,
      fen_before,
      fen_after,
      classification,
      evaluation_before,
      evaluation_after,
      evaluation_loss,
      cp_loss,
      game_phase,
      clock_seconds,
      move_time_seconds,
      time_trouble,
      created_at
    from move_annotations
    where game_id = $1
    order by ply asc
  `;

  const [gameResult, annotationResult] = await Promise.all([
    pool.query(gameQuery, [gameId]),
    pool.query(annotationsQuery, [gameId]),
  ]);

  if (!gameResult.rows[0]) return null;

  return {
    ...gameResult.rows[0],
    annotations: annotationResult.rows,
  };
}

export async function getLatestAnalyzedGameByUser({ provider, username }) {
  const normalizedUsername = username.toLowerCase();

  const query = `
    select g.id
    from games g
    join users u on u.id = g.user_id
    where u.provider = $1
      and u.username = $2
      and g.analysis_status = 'completed'
    order by g.played_at desc nulls last, g.analysis_completed_at desc nulls last, g.created_at desc
    limit 1
  `;

  const { rows } = await pool.query(query, [provider, normalizedUsername]);
  const gameId = rows[0]?.id;

  if (!gameId) {
    return null;
  }

  return getGameById(gameId);
}

function titlePhaseByMoveCount(moveCount) {
  if (moveCount <= 10) return "Opening";
  if (moveCount <= 30) return "Middlegame";
  return "Endgame";
}

export async function getDashboardByUser({ provider, username }) {
  const normalizedUsername = username.toLowerCase();

  const gamesQuery = `
    with analyzed_games as (
      select
        g.id,
        g.provider_game_id,
        g.source_url,
        g.played_at,
        g.white_player,
        g.black_player,
        coalesce(
          substring(g.pgn from '\\[Opening "([^"]+)"\\]'),
          replace(substring(g.pgn from '\\[ECOUrl "https://www\\.chess\\.com/openings/([^"]+)"\\]'), '-', ' '),
          substring(g.pgn from '\\[ECO "([^"]+)"\\]'),
          'Unknown'
        ) as opening_name,
        coalesce(substring(g.pgn from '\\[Result "([^"]+)"\\]'), g.result, '') as display_result,
        coalesce((select max(ma2.move_index) from move_annotations ma2 where ma2.game_id = g.id), 0) as move_count,
        coalesce(
          (select ma3.fen_after from move_annotations ma3 where ma3.game_id = g.id order by ma3.ply desc limit 1),
          substring(g.pgn from '\\[CurrentPosition "([^"]+)"\\]'),
          ''
        ) as ending_fen,
        round(avg(
          case
            when ma.ply % 2 = 1 then
              greatest(0, least(100,
                case
                  when ma.cp_loss <= 0 then 100
                  else 103.1668100711649 * exp(
                    -0.04354415386753951 * greatest(0,
                      (50 + 50 * (2 / (1 + exp(-0.00368208 * greatest(-1000, least(1000, ma.evaluation_before)))) - 1))
                      -
                      (50 + 50 * (2 / (1 + exp(-0.00368208 * greatest(-1000, least(1000, ma.evaluation_after)))) - 1))
                    )
                  ) - 3.166924740191411
                end
              ))
          end
        ))::int as white_accuracy,
        round(avg(
          case
            when ma.ply % 2 = 0 then
              greatest(0, least(100,
                case
                  when ma.cp_loss <= 0 then 100
                  else 103.1668100711649 * exp(
                    -0.04354415386753951 * greatest(0,
                      (50 + 50 * (2 / (1 + exp(-0.00368208 * greatest(-1000, least(1000, -ma.evaluation_before)))) - 1))
                      -
                      (50 + 50 * (2 / (1 + exp(-0.00368208 * greatest(-1000, least(1000, -ma.evaluation_after)))) - 1))
                    )
                  ) - 3.166924740191411
                end
              ))
          end
        ))::int as black_accuracy,
        max(
          case ma.classification
            when 'miss' then 4
            when 'blunder' then 3
            when 'mistake' then 2
            when 'inaccuracy' then 1
            else 0
          end
        ) as severity
      from games g
      join users u on u.id = g.user_id
      join move_annotations ma on ma.game_id = g.id
      where u.provider = $1
        and u.username = $2
        and g.analysis_status = 'completed'
      group by g.id
    )
    select *
    from analyzed_games
    order by played_at desc nulls last, id desc
  `;

  const countsQuery = `
    select
      count(*)::int as total_games,
      count(*) filter (where g.analysis_status = 'completed')::int as analyzed_games,
      count(*) filter (where g.analysis_status = 'queued')::int as queued_games,
      count(*) filter (where g.analysis_status = 'running')::int as running_games,
      count(*) filter (where g.analysis_status = 'failed')::int as failed_games
    from games g
    join users u on u.id = g.user_id
    where u.provider = $1
      and u.username = $2
  `;

  const [gamesResult, countsResult] = await Promise.all([
    pool.query(gamesQuery, [provider, normalizedUsername]),
    pool.query(countsQuery, [provider, normalizedUsername]),
  ]);

  const sections = {
    Opening: [],
    Middlegame: [],
    Endgame: [],
  };

  for (const row of gamesResult.rows) {
    sections[titlePhaseByMoveCount(row.move_count)].push({
      id: row.id,
      gameId: row.id,
      opening: row.opening_name,
      white: row.white_player,
      black: row.black_player,
      result: row.display_result,
      moves: row.move_count,
      endingFen: row.ending_fen,
      whiteAccuracy: row.white_accuracy,
      blackAccuracy: row.black_accuracy,
      severity: row.severity,
      playedAt: row.played_at,
      sourceUrl: row.source_url || row.provider_game_id,
    });
  }

  return {
    sections,
    summary: countsResult.rows[0],
  };
}
