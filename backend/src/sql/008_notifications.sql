create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  href text not null default '',
  entity_key text not null,
  available_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, entity_key)
);

create index if not exists notifications_user_available_idx
  on notifications(user_id, available_at desc);

create index if not exists notifications_user_unread_idx
  on notifications(user_id, available_at desc)
  where read_at is null;
