alter table users
  add column if not exists avatar_preset text not null default 'white-knight',
  add column if not exists avatar_data_url text;
