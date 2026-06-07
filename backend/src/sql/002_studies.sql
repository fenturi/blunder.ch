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
