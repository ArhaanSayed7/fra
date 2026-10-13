-- Keep the existing trigger/function identity so Discord profiles remain intact.
-- Provider comes from trusted app metadata; user-editable metadata is cosmetic only.
create or replace function private.register_discord_driver()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data->>'provider' in ('discord', 'email') then
    insert into public.drivers(id, username, avatar_url)
    values (
      new.id,
      'driver-' || substr(replace(new.id::text, '-', ''), 1, 24),
      case when new.raw_app_meta_data->>'provider' = 'discord'
        and new.raw_user_meta_data->>'avatar_url' ~ '^https://'
        then left(new.raw_user_meta_data->>'avatar_url', 2048)
        else '' end
    ) on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.register_discord_driver() from public, anon, authenticated;

-- Repair any earlier email accounts that did not receive a driver profile.
insert into public.drivers(id, username, avatar_url, created_at)
select u.id,
  'driver-' || substr(replace(u.id::text, '-', ''), 1, 24),
  '', u.created_at
from auth.users u
where u.raw_app_meta_data->>'provider' = 'email'
  and not exists (select 1 from public.drivers d where d.id = u.id)
on conflict (id) do nothing;
