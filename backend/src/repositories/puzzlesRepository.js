import { withTransaction } from "../db.js";
import { calculatePuzzleRating } from "../services/puzzleRatingService.js";

export const FREE_DAILY_PUZZLE_LIMIT = 5;

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function puzzleQuota(user, today = utcDateString()) {
  if (user?.is_premium) {
    return {
      dailyLimit: null,
      usedToday: 0,
      remainingToday: null,
      resetsAt: null,
    };
  }

  const storedDate = user?.puzzle_daily_date
    ? new Date(user.puzzle_daily_date).toISOString().slice(0, 10)
    : null;
  const usedToday = storedDate === today
    ? Number(user?.puzzle_daily_count ?? 0)
    : 0;
  const reset = new Date(`${today}T00:00:00.000Z`);
  reset.setUTCDate(reset.getUTCDate() + 1);

  return {
    dailyLimit: FREE_DAILY_PUZZLE_LIMIT,
    usedToday,
    remainingToday: Math.max(0, FREE_DAILY_PUZZLE_LIMIT - usedToday),
    resetsAt: reset.toISOString(),
  };
}

export function puzzleProgress(user) {
  return {
    rating: Number(user?.puzzle_rating ?? 1500),
    attempts: Number(user?.puzzle_attempts ?? 0),
    solved: Number(user?.puzzle_solved ?? 0),
    quota: puzzleQuota(user),
  };
}

export async function claimPuzzleSlot(userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `
        select
          is_premium,
          puzzle_rating,
          puzzle_attempts,
          puzzle_solved,
          puzzle_daily_date,
          puzzle_daily_count
        from users
        where id = $1
        for update
      `,
      [userId]
    );
    const user = rows[0];

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (user.is_premium) {
      return {
        claimed: false,
        progress: puzzleProgress(user),
      };
    }

    const quota = puzzleQuota(user);

    if (quota.remainingToday <= 0) {
      const error = new Error("Free accounts include 5 puzzles per day. Upgrade to Pro for unlimited puzzles.");
      error.status = 429;
      error.details = { quota };
      throw error;
    }

    const updateResult = await client.query(
      `
        update users
        set puzzle_daily_date = (now() at time zone 'UTC')::date,
            puzzle_daily_count = case
              when puzzle_daily_date = (now() at time zone 'UTC')::date
                then puzzle_daily_count + 1
              else 1
            end
        where id = $1
        returning
          is_premium,
          puzzle_rating,
          puzzle_attempts,
          puzzle_solved,
          puzzle_daily_date,
          puzzle_daily_count
      `,
      [userId]
    );

    return {
      claimed: true,
      progress: puzzleProgress(updateResult.rows[0]),
    };
  });
}

export async function refundPuzzleSlot(userId) {
  await withTransaction(async (client) => {
    await client.query(
      `
        update users
        set puzzle_daily_count = greatest(0, puzzle_daily_count - 1)
        where id = $1
          and not is_premium
          and puzzle_daily_date = (now() at time zone 'UTC')::date
      `,
      [userId]
    );
  });
}

export async function recordPuzzleResult({
  userId,
  attemptId,
  puzzleRating,
  solved,
  elapsedMs,
}) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `
        select
          is_premium,
          puzzle_rating,
          puzzle_attempts,
          puzzle_solved,
          puzzle_daily_date,
          puzzle_daily_count,
          puzzle_last_attempt_id,
          puzzle_last_delta
        from users
        where id = $1
        for update
      `,
      [userId]
    );
    const user = rows[0];

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (user.puzzle_last_attempt_id === attemptId) {
      return {
        ...puzzleProgress(user),
        delta: Number(user.puzzle_last_delta ?? 0),
        speedBonus: 0,
        applied: false,
      };
    }

    const current = puzzleProgress(user);
    const result = calculatePuzzleRating({
      userRating: current.rating,
      puzzleRating,
      solved,
      attempts: current.attempts,
      elapsedMs,
    });
    const updateResult = await client.query(
      `
        update users
        set puzzle_rating = $2,
            puzzle_attempts = puzzle_attempts + 1,
            puzzle_solved = puzzle_solved + case when $3 then 1 else 0 end,
            puzzle_last_attempt_id = $4,
            puzzle_last_delta = $5
        where id = $1
        returning
          is_premium,
          puzzle_rating,
          puzzle_attempts,
          puzzle_solved,
          puzzle_daily_date,
          puzzle_daily_count
      `,
      [userId, result.rating, solved, attemptId, result.delta]
    );

    return {
      ...puzzleProgress(updateResult.rows[0]),
      delta: result.delta,
      speedBonus: result.speedBonus,
      applied: true,
    };
  });
}
