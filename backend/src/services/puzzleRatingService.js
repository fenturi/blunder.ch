const MIN_RATING = 600;
const MAX_RATING = 3000;
const FAST_SOLVE_MS = 10_000;
const BONUS_CUTOFF_MS = 60_000;
const MAX_SPEED_BONUS = 0.15;

function kFactor(attempts) {
  if (attempts < 10) return 48;
  if (attempts < 30) return 32;
  return 24;
}

function solveSpeedBonus(elapsedMs) {
  if (elapsedMs <= FAST_SOLVE_MS) return MAX_SPEED_BONUS;
  if (elapsedMs >= BONUS_CUTOFF_MS) return 0;

  const remaining = BONUS_CUTOFF_MS - elapsedMs;
  return MAX_SPEED_BONUS * (remaining / (BONUS_CUTOFF_MS - FAST_SOLVE_MS));
}

export function calculatePuzzleRating({
  userRating,
  puzzleRating,
  solved,
  attempts,
  elapsedMs,
}) {
  const expected = 1 / (1 + 10 ** ((puzzleRating - userRating) / 400));
  const speedBonus = solved ? solveSpeedBonus(elapsedMs) : 0;
  const baseDelta = kFactor(attempts) * ((solved ? 1 : 0) - expected);
  const adjustedDelta = baseDelta > 0 ? baseDelta * (1 + speedBonus) : baseDelta;
  const roundedDelta = Math.round(adjustedDelta);
  const delta = solved ? Math.max(1, roundedDelta) : Math.min(-1, roundedDelta);
  const rating = Math.max(MIN_RATING, Math.min(MAX_RATING, userRating + delta));

  return {
    rating,
    delta: rating - userRating,
    speedBonus,
  };
}
