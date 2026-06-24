import test from "node:test";
import assert from "node:assert/strict";
import { puzzleQuota } from "../src/repositories/puzzlesRepository.js";
import { calculatePuzzleRating } from "../src/services/puzzleRatingService.js";

test("fast solves earn a slightly larger gain", () => {
  const fast = calculatePuzzleRating({
    userRating: 1500,
    puzzleRating: 1500,
    solved: true,
    attempts: 40,
    elapsedMs: 8_000,
  });
  const slow = calculatePuzzleRating({
    userRating: 1500,
    puzzleRating: 1500,
    solved: true,
    attempts: 40,
    elapsedMs: 75_000,
  });

  assert.ok(fast.delta > slow.delta);
  assert.equal(slow.speedBonus, 0);
});

test("failed puzzles lower the rating without a speed adjustment", () => {
  const result = calculatePuzzleRating({
    userRating: 1500,
    puzzleRating: 1500,
    solved: false,
    attempts: 40,
    elapsedMs: 2_000,
  });

  assert.ok(result.delta < 0);
  assert.equal(result.speedBonus, 0);
});

test("new users calibrate faster than established users", () => {
  const newUser = calculatePuzzleRating({
    userRating: 1500,
    puzzleRating: 1700,
    solved: true,
    attempts: 0,
    elapsedMs: 70_000,
  });
  const establishedUser = calculatePuzzleRating({
    userRating: 1500,
    puzzleRating: 1700,
    solved: true,
    attempts: 50,
    elapsedMs: 70_000,
  });

  assert.ok(newUser.delta > establishedUser.delta);
});

test("free puzzle quota resets on a new UTC day", () => {
  const currentDay = puzzleQuota({
    is_premium: false,
    puzzle_daily_date: "2026-06-12",
    puzzle_daily_count: 3,
  }, "2026-06-12");
  const nextDay = puzzleQuota({
    is_premium: false,
    puzzle_daily_date: "2026-06-12",
    puzzle_daily_count: 25,
  }, "2026-06-13");

  assert.equal(currentDay.remainingToday, 22);
  assert.equal(nextDay.remainingToday, 25);
});

test("premium puzzle quota is unlimited", () => {
  const quota = puzzleQuota({
    is_premium: true,
    puzzle_daily_date: "2026-06-12",
    puzzle_daily_count: 99,
  }, "2026-06-12");

  assert.equal(quota.dailyLimit, null);
  assert.equal(quota.remainingToday, null);
});
