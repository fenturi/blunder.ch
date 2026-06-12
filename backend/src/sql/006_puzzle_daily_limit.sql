alter table users
  add column if not exists puzzle_daily_date date,
  add column if not exists puzzle_daily_count integer not null default 0;
