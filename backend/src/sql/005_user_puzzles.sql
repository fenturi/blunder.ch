alter table users
  add column if not exists puzzle_rating integer not null default 1500,
  add column if not exists puzzle_attempts integer not null default 0,
  add column if not exists puzzle_solved integer not null default 0,
  add column if not exists puzzle_last_attempt_id text,
  add column if not exists puzzle_last_delta integer not null default 0;
