create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  username text not null,
  email text,
  password_hash text,
  device_id text,
  is_premium boolean not null default false,
  premium_redeemed_at timestamptz,
  avatar_preset text not null default 'white-knight',
  avatar_data_url text,
  profile_slug text,
  created_at timestamptz not null default now(),
  unique (provider, username)
);

alter table users
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists device_id text,
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_redeemed_at timestamptz,
  add column if not exists avatar_preset text not null default 'white-knight',
  add column if not exists avatar_data_url text,
  add column if not exists profile_slug text;

create unique index if not exists users_profile_slug_unique_idx on users (profile_slug) where profile_slug is not null;

create unique index if not exists users_email_unique_idx on users (lower(email)) where email is not null;
create unique index if not exists users_device_id_unique_idx on users (device_id) where device_id is not null;

create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  username text not null,
  game_types text[] not null default array['rapid', 'blitz']::text[],
  game_count integer not null default 5,
  date_range text not null default '30d',
  plan text not null default 'free',
  provider_job_id text,
  status text not null,
  total_games integer not null default 0,
  imported_games integer not null default 0,
  duplicate_games integer not null default 0,
  failed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table imports
  add column if not exists game_types text[] not null default array['rapid', 'blitz']::text[],
  add column if not exists game_count integer not null default 5,
  add column if not exists date_range text not null default '30d',
  add column if not exists plan text not null default 'free';

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references imports(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_game_id text,
  pgn text not null,
  pgn_hash text not null unique,
  played_at timestamptz,
  white_player text not null default '',
  black_player text not null default '',
  result text not null default '',
  time_control text not null default '',
  source_url text not null default '',
  analysis_status text not null default 'queued',
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  analysis_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_user_id_idx on games(user_id);
create index if not exists games_analysis_status_idx on games(analysis_status);

create table if not exists move_annotations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  move_index integer not null,
  ply integer not null,
  san text not null,
  from_square text not null default '',
  to_square text not null default '',
  fen_before text not null,
  fen_after text not null,
  classification text not null,
  evaluation_before integer not null,
  evaluation_after integer not null,
  evaluation_loss integer not null,
  cp_loss integer not null default 0,
  game_phase text not null,
  clock_seconds integer,
  move_time_seconds integer,
  time_trouble boolean not null default false,
  created_at timestamptz not null default now()
);

alter table move_annotations
  add column if not exists from_square text not null default '',
  add column if not exists to_square text not null default '',
  add column if not exists cp_loss integer not null default 0,
  add column if not exists clock_seconds integer,
  add column if not exists move_time_seconds integer;

alter table move_annotations
  drop column if exists best_move,
  drop column if exists best_move_uci,
  drop column if exists best_move_san,
  drop column if exists best_line,
  drop column if exists played_rank,
  drop column if exists best_move_gap,
  drop column if exists best_move_gap_win_percent,
  drop column if exists move_signal,
  drop column if exists explanation;

create index if not exists move_annotations_game_id_idx on move_annotations(game_id);
create index if not exists move_annotations_classification_idx on move_annotations(classification);

create table if not exists studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null default 'Untitled study',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studies_user_id_idx on studies(user_id);

create table if not exists study_chapters (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  name text not null default 'Chapter 1',
  root_fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_chapters_study_id_idx on study_chapters(study_id);
