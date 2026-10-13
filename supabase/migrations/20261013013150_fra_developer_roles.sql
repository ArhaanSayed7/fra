begin;
-- Developer ownership is assigned by the project owner, never by a browser.
create table private.developer_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.developer_users enable row level security;
revoke all on private.developer_users from public,anon,authenticated;
create function private.is_developer() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.developer_users where user_id=(select auth.uid()));
$$;
create function public.is_developer() returns boolean
language sql stable security invoker set search_path='' as $$select private.is_developer();$$;
-- A developer retains full administration even if their admin row is removed outside the site.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.admin_users where user_id=(select auth.uid()))
    or exists(select 1 from private.developer_users where user_id=(select auth.uid()));
$$;
-- Expose only public role badges, never the underlying private role tables.
create function private.driver_roles() returns table(driver_id uuid,role text)
language sql stable security definer set search_path='' as $$
  select d.id,case when dev.user_id is not null then 'developer' else 'admin' end
  from public.drivers d
  left join private.developer_users dev on dev.user_id=d.id
  left join private.admin_users adm on adm.user_id=d.id
  where d.is_registered and (dev.user_id is not null or adm.user_id is not null);
$$;
create function public.driver_roles() returns table(driver_id uuid,role text)
language sql stable security invoker set search_path='' as $$select * from private.driver_roles();$$;
create function private.set_driver_admin(p_driver_id uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not private.is_developer() then
    raise exception 'Only the website developer can manage administrators.' using errcode='42501';
  end if;
  if p_enabled is null then raise exception 'Choose an administrator status.'; end if;
  if exists(select 1 from private.developer_users where user_id=p_driver_id) then
    raise exception 'The developer role is protected.' using errcode='42501';
  end if;
  if not exists(select 1 from public.drivers where id=p_driver_id and is_registered) then
    raise exception 'Choose a registered driver.';
  end if;
  if p_enabled and not exists(select 1 from public.drivers where id=p_driver_id and is_active) then
    raise exception 'Activate this driver before granting admin access.';
  end if;
  if p_enabled then
    insert into private.admin_users(user_id) values(p_driver_id) on conflict do nothing;
  else
    delete from private.admin_users where user_id=p_driver_id;
  end if;
end;
$$;
create function public.set_driver_admin(p_driver_id uuid,p_enabled boolean) returns void
language sql security invoker set search_path='' as $$select private.set_driver_admin(p_driver_id,p_enabled);$$;
revoke all on function private.is_developer(),public.is_developer(),private.driver_roles(),public.driver_roles(),private.set_driver_admin(uuid,boolean),public.set_driver_admin(uuid,boolean) from public,anon,authenticated;
grant execute on function private.is_developer(),public.is_developer(),private.driver_roles(),public.driver_roles() to anon,authenticated;
grant execute on function private.set_driver_admin(uuid,boolean),public.set_driver_admin(uuid,boolean) to authenticated;
commit;
