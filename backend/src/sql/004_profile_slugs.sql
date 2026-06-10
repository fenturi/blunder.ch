alter table users
  add column if not exists profile_slug text;

with ranked_users as (
  select
    id,
    lower(regexp_replace(username, '[^a-zA-Z0-9_-]+', '-', 'g')) as base_slug,
    lower(regexp_replace(provider, '[^a-zA-Z0-9]+', '-', 'g')) as provider_slug,
    row_number() over (partition by lower(username) order by created_at, id) as username_rank
  from users
  where profile_slug is null
)
update users
set profile_slug = case
  when ranked_users.username_rank = 1 then ranked_users.base_slug
  else ranked_users.base_slug || '-' || ranked_users.provider_slug
end
from ranked_users
where users.id = ranked_users.id;

create unique index if not exists users_profile_slug_unique_idx
  on users (profile_slug)
  where profile_slug is not null;
