begin;
-- Public lap rows retain timings, but never retain a proof URL or object path.
create table private.lap_proofs (
 lap_id uuid primary key references public.laps(id) on delete cascade deferrable initially deferred,
 proof_url text not null default '', proof_storage_path text unique
);
alter table private.lap_proofs enable row level security;
revoke all on private.lap_proofs from public,anon,authenticated;
create policy deny_client_access on private.lap_proofs for all to anon,authenticated using(false) with check(false);
insert into private.lap_proofs select id,proof_url,proof_storage_path from public.laps;
alter table public.laps drop constraint laps_proof_source;
update public.laps set proof_url='',proof_storage_path=null;
alter table public.laps add constraint laps_proof_redacted check(proof_url='' and proof_storage_path is null);
create function private.capture_lap_proof() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not ((new.proof_storage_path is null and new.proof_url ~ '^https://' and char_length(new.proof_url)<=2048)
  or (new.proof_url='' and new.proof_storage_path is not null and new.proof_storage_path ~ ('^'||new.driver_id::text||'/[0-9a-f-]+\.(mp4|webm|mov)$'))) then
  raise exception 'Choose a valid video link or owned uploaded clip.' using errcode='23514';
 end if;
 insert into private.lap_proofs(lap_id,proof_url,proof_storage_path) values(new.id,new.proof_url,new.proof_storage_path);
 new.proof_url='';new.proof_storage_path=null;
 return new;
end;$$;
revoke all on function private.capture_lap_proof() from public,anon,authenticated;
-- Runs after the original clip and setup validators and before RLS/constraints.
create trigger fra_zz_capture_lap_proof before insert on public.laps for each row execute function private.capture_lap_proof();

-- A deletion locks the account before media cleanup/Auth deletion; retries can finish safely.
create table private.account_deletions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_by uuid references auth.users(id) on delete set null,
 requested_at timestamptz not null default now()
);
alter table private.account_deletions enable row level security;
revoke all on private.account_deletions from public,anon,authenticated;
create policy deny_client_access on private.account_deletions for all to anon,authenticated using(false) with check(false);
create function private.account_is_deleting() returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and (not exists(select 1 from auth.users where id=(select auth.uid())) or exists(select 1 from private.account_deletions where user_id=(select auth.uid())));
$$;
revoke all on function private.account_is_deleting() from public,anon,authenticated;
grant execute on function private.account_is_deleting() to anon,authenticated;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select not private.account_is_deleting() and (exists(select 1 from private.admin_users where user_id=(select auth.uid())) or exists(select 1 from private.developer_users where user_id=(select auth.uid())));
$$;
create or replace function private.can_compete() returns boolean language sql stable security definer set search_path='' as $$
 select not private.account_is_deleting() and exists(select 1 from public.drivers where id=(select auth.uid()) and is_registered and is_active);
$$;
create policy fra_deleting_driver_block on public.drivers as restrictive for all to authenticated using(not (select private.account_is_deleting())) with check(not (select private.account_is_deleting()));
create policy fra_deleting_lap_block on public.laps as restrictive for all to authenticated using(not (select private.account_is_deleting())) with check(not (select private.account_is_deleting()));
create policy fra_deleting_entries_block on public.event_registrations as restrictive for all to authenticated using(not (select private.account_is_deleting())) with check(not (select private.account_is_deleting()));
create policy fra_deleting_storage_block on storage.objects as restrictive for all to authenticated using(not (select private.account_is_deleting())) with check(not (select private.account_is_deleting()));

create function private.clip_is_used(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.lap_proofs where proof_storage_path=p_path);
$$;
revoke all on function private.clip_is_used(text) from public,anon,authenticated;
grant execute on function private.clip_is_used(text) to authenticated;
drop policy fra_clips_read on storage.objects;
create policy fra_clips_read on storage.objects for select to authenticated using(bucket_id='lap-clips' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin())));
drop policy fra_clips_delete_unused on storage.objects;
create policy fra_clips_delete_unused on storage.objects for delete to authenticated using(bucket_id='lap-clips' and (storage.foldername(name))[1]=(select auth.uid())::text and not private.clip_is_used(name));
create function private.read_lap_proof(p_lap_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or private.account_is_deleting() or not exists(select 1 from public.laps where id=p_lap_id and (driver_id=(select auth.uid()) or private.is_admin())) then
  raise exception 'Lap proof is private to its driver and website admins.' using errcode='42501';
 end if;
 return (select jsonb_build_object('proof_url',proof_url,'proof_storage_path',proof_storage_path) from private.lap_proofs where lap_id=p_lap_id);
end;$$;
create function public.read_lap_proof(p_lap_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.read_lap_proof(p_lap_id);$$;
revoke all on function private.read_lap_proof(uuid),public.read_lap_proof(uuid) from public,anon,authenticated;
grant execute on function private.read_lap_proof(uuid),public.read_lap_proof(uuid) to authenticated;

-- Explicit account deletion removes only that driver's racing data; other laps keep their review.
alter table public.event_registrations drop constraint event_registrations_driver_id_fkey;
alter table public.event_registrations add constraint event_registrations_driver_id_fkey foreign key(driver_id) references public.drivers(id) on delete cascade;
alter table public.event_session_results drop constraint event_session_results_driver_id_fkey;
alter table public.event_session_results add constraint event_session_results_driver_id_fkey foreign key(driver_id) references public.drivers(id) on delete cascade;
alter table public.laps drop constraint laps_driver_id_fkey;
alter table public.laps add constraint laps_driver_id_fkey foreign key(driver_id) references public.drivers(id) on delete cascade;
alter table public.laps drop constraint laps_reviewed_by_fkey;
alter table public.laps add constraint laps_reviewed_by_fkey foreign key(reviewed_by) references auth.users(id) on delete set null;
create function private.prepare_driver_deletion(p_driver_id uuid,p_confirmation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.drivers; objects jsonb;
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501';end if;
 if p_driver_id=(select auth.uid()) or exists(select 1 from private.developer_users where user_id=p_driver_id) then raise exception 'This account is protected.' using errcode='42501';end if;
 if exists(select 1 from private.admin_users where user_id=p_driver_id) and not private.is_developer() then raise exception 'Only the Developer can delete an administrator.' using errcode='42501';end if;
 select * into d from public.drivers where id=p_driver_id for update;
 if not found then raise exception 'Driver not found.';end if;
 if p_confirmation is null or btrim(p_confirmation)<>d.username then raise exception 'Type the driver''s username exactly.';end if;
 insert into private.account_deletions(user_id,requested_by) values(p_driver_id,(select auth.uid())) on conflict do nothing;
 update public.drivers set is_active=false where id=p_driver_id;
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name)),'[]'::jsonb) into objects from storage.objects
 where bucket_id in('driver-media','lap-clips','creator-media') and (owner_id=p_driver_id::text or (storage.foldername(name))[1]=p_driver_id::text);
 return jsonb_build_object('objects',objects);
end;$$;
create function public.prepare_driver_deletion(p_driver_id uuid,p_confirmation text) returns jsonb language sql security invoker set search_path='' as $$select private.prepare_driver_deletion(p_driver_id,p_confirmation);$$;
revoke all on function private.prepare_driver_deletion(uuid,text),public.prepare_driver_deletion(uuid,text) from public,anon,authenticated;
grant execute on function private.prepare_driver_deletion(uuid,text),public.prepare_driver_deletion(uuid,text) to authenticated;

-- Email registrations carry the chosen profile; Discord/manual Auth accounts finish onboarding.
create or replace function private.register_discord_driver() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen_name text;chosen_country text;
begin
 if new.raw_app_meta_data->>'provider' in('email','discord') then
  if new.raw_app_meta_data->>'provider'='email' and (new.raw_user_meta_data ? 'username' or new.raw_user_meta_data ? 'country_code') then
   chosen_name=btrim(new.raw_user_meta_data->>'username');chosen_country=new.raw_user_meta_data->>'country_code';
   if chosen_name is null or char_length(chosen_name) not between 3 and 32 or not exists(select 1 from public.countries where code=chosen_country) then raise exception 'Choose a username and country.';end if;
  end if;
  insert into public.drivers(id,username,country_code,avatar_url) values(new.id,coalesce(chosen_name,'driver-'||substr(replace(new.id::text,'-',''),1,24)),chosen_country,
   case when new.raw_app_meta_data->>'provider'='discord' and new.raw_user_meta_data->>'avatar_url' ~ '^https://' then left(new.raw_user_meta_data->>'avatar_url',2048) else '' end) on conflict(id) do nothing;
 end if;return new;
end;$$;
create function private.sync_driver_display_name() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.is_registered then
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('username',new.username,'full_name',new.username,'name',new.username,'display_name',new.username,'country_code',new.country_code) where id=new.id;
 end if;return new;
end;$$;
revoke all on function private.sync_driver_display_name() from public,anon,authenticated;
create trigger fra_sync_driver_display_name after insert or update of username,country_code on public.drivers for each row execute function private.sync_driver_display_name();
update auth.users u set raw_user_meta_data=coalesce(u.raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('username',d.username,'full_name',d.username,'name',d.username,'display_name',d.username,'country_code',d.country_code) from public.drivers d where d.id=u.id and d.is_registered;
commit;
