alter table study_chapters
  add column if not exists root_annotations jsonb not null default '{"arrows":[],"circles":[]}'::jsonb,
  add column if not exists revision bigint not null default 0;

create table if not exists study_collaborators (
  study_id uuid not null references studies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  invited_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (study_id, user_id)
);

create index if not exists study_collaborators_user_id_idx
  on study_collaborators(user_id);
