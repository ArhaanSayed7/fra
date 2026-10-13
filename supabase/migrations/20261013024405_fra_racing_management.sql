begin;
alter table public.creators add column avatar_url text not null default '' check(avatar_url='' or (avatar_url ~ '^https://' and char_length(avatar_url)<=2048));
alter table public.creators add column sort_order integer not null default 0 check(sort_order>=0);
with ordered as(select id,row_number() over(order by name,id)-1 as n from public.creators)
update public.creators c set sort_order=o.n from ordered o where c.id=o.id;

create function private.reorder_creators(p_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 lock table public.creators in share row exclusive mode;
 if p_ids is null or cardinality(p_ids)<>(select count(*) from public.creators)
  or cardinality(p_ids)<>(select count(distinct id) from unnest(p_ids) id)
  or exists(select 1 from unnest(p_ids) id where not exists(select 1 from public.creators c where c.id=id))
 then raise exception 'Provide every creator exactly once. Refresh and try again.'; end if;
 update public.creators c set sort_order=o.n-1 from unnest(p_ids) with ordinality o(id,n) where c.id=o.id;
end;$$;
create function public.reorder_creators(p_ids uuid[]) returns void language sql security invoker set search_path='' as $$select private.reorder_creators(p_ids);$$;

create table public.driver_badges(
 driver_id uuid not null references public.drivers(id) on delete cascade,
 badge_key text not null check(badge_key in('map_developer','winner','pole','record')),
 created_at timestamptz not null default now(),primary key(driver_id,badge_key)
);
alter table public.driver_badges enable row level security;
create policy driver_badges_read on public.driver_badges for select to anon,authenticated using(exists(select 1 from public.drivers d where d.id=driver_id and d.is_registered));
revoke all on public.driver_badges from public,anon,authenticated;
grant select on public.driver_badges to anon,authenticated;
create function private.admin_set_badges(p_driver_id uuid,p_badges text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 if not exists(select 1 from public.drivers where id=p_driver_id and is_registered) then raise exception 'Choose a registered driver.'; end if;
 if p_badges is null or array_position(p_badges,null) is not null or not(p_badges <@ array['map_developer','winner','pole','record']::text[])
 then raise exception 'Choose valid display badges. Website roles are managed separately.'; end if;
 delete from public.driver_badges where driver_id=p_driver_id;
 insert into public.driver_badges(driver_id,badge_key) select p_driver_id,unnest(p_badges) on conflict do nothing;
end;$$;
create function public.admin_set_badges(p_driver_id uuid,p_badges text[]) returns void language sql security invoker set search_path='' as $$select private.admin_set_badges(p_driver_id,p_badges);$$;

-- Named sessions keep qualifying lobbies separate from race finishing order.
create table public.event_sessions(
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events(id) on delete cascade,
 kind text not null check(kind in('qualifying','race')),name text not null check(char_length(btrim(name)) between 1 and 60),
 sort_order integer not null check(sort_order>=0),unique(event_id,kind,sort_order)
);
create index event_sessions_event_idx on public.event_sessions(event_id);
create table public.event_session_results(
 session_id uuid not null references public.event_sessions(id) on delete cascade,
 driver_id uuid not null references public.drivers(id) on delete restrict,
 position integer,lap_ms integer,race_time text,
 primary key(session_id,driver_id),unique(session_id,position),
 check((lap_ms is not null and lap_ms between 1 and 5999999 and position is null and race_time is null)
   or (lap_ms is null and position is not null and position between 1 and 999 and char_length(btrim(race_time)) between 1 and 40 and race_time is not null))
);
create index event_session_results_driver_idx on public.event_session_results(driver_id);
alter table public.event_sessions enable row level security;
alter table public.event_session_results enable row level security;
create policy sessions_read on public.event_sessions for select to anon,authenticated using(true);
create policy session_results_read on public.event_session_results for select to anon,authenticated using(true);
revoke all on public.event_sessions,public.event_session_results from public,anon,authenticated;
grant select on public.event_sessions,public.event_session_results to anon,authenticated;
-- Keep the legacy per-event summary for existing profile statistics/history and Discord embeds.
alter table public.event_results drop constraint event_results_event_id_race_position_key;
alter table public.event_results alter column race_position drop not null;
alter table public.event_results alter column race_time drop not null;
alter table public.event_results alter column qualifying_ms drop not null;
insert into public.event_sessions(event_id,kind,name,sort_order)
select distinct event_id,'qualifying','Qualifying 1',0 from public.event_results;
insert into public.event_sessions(event_id,kind,name,sort_order)
select distinct event_id,'race','Race 1',0 from public.event_results;
insert into public.event_session_results(session_id,driver_id,lap_ms)
select s.id,r.driver_id,r.qualifying_ms from public.event_results r join public.event_sessions s on s.event_id=r.event_id and s.kind='qualifying' where r.qualifying_ms is not null;
insert into public.event_session_results(session_id,driver_id,position,race_time)
select s.id,r.driver_id,r.race_position,r.race_time from public.event_results r join public.event_sessions s on s.event_id=r.event_id and s.kind='race' where r.race_position is not null;

create function private.admin_save_sessions(p_event_id uuid,p_sessions jsonb) returns void language plpgsql security definer set search_path='' as $$
declare sess jsonb;r jsonb;sid uuid;n integer:=0;pos integer;did uuid;
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 perform 1 from public.events where id=p_event_id for update;
 if not found then raise exception 'Event not found.'; end if;
 if p_sessions is null or jsonb_typeof(p_sessions)<>'array' or jsonb_array_length(p_sessions)>40 then raise exception 'Provide up to 40 result sessions.'; end if;
 delete from public.event_sessions where event_id=p_event_id;
 delete from public.event_results where event_id=p_event_id;
 for sess in select value from jsonb_array_elements(p_sessions) loop
  if sess->>'kind' not in('qualifying','race') or sess->>'kind' is null then raise exception 'Choose qualifying or race.'; end if;
  if jsonb_typeof(sess->'results')<>'array' or sess->'results' is null or jsonb_array_length(sess->'results')>999 then raise exception 'Each session needs a result list with up to 999 drivers.'; end if;
  sid=gen_random_uuid();
  insert into public.event_sessions(id,event_id,kind,name,sort_order) values(sid,p_event_id,sess->>'kind',btrim(sess->>'name'),n);
  n=n+1;pos=0;
  for r in select value from jsonb_array_elements(sess->'results') loop
   did=(r->>'driver_id')::uuid;
   if not exists(select 1 from public.drivers where id=did and is_registered) then raise exception 'Results require a registered driver.'; end if;
   insert into public.event_registrations(event_id,driver_id) values(p_event_id,did) on conflict do nothing;
   pos=pos+1;
   if sess->>'kind'='qualifying' then
    if r->>'lap_ms' is null then raise exception 'Enter a qualifying lap time.'; end if;
    insert into public.event_session_results(session_id,driver_id,lap_ms) values(sid,did,(r->>'lap_ms')::integer);
   else
    insert into public.event_session_results(session_id,driver_id,position,race_time) values(sid,did,coalesce((r->>'race_position')::integer,pos),btrim(r->>'race_time'));
   end if;
  end loop;
 end loop;
 insert into public.event_results(event_id,driver_id,race_position,race_time,qualifying_ms)
 select p_event_id,reg.driver_id,
  (select r.position from public.event_session_results r join public.event_sessions s on s.id=r.session_id where s.event_id=p_event_id and s.kind='race' and r.driver_id=reg.driver_id order by r.position,s.sort_order limit 1),
  (select r.race_time from public.event_session_results r join public.event_sessions s on s.id=r.session_id where s.event_id=p_event_id and s.kind='race' and r.driver_id=reg.driver_id order by r.position,s.sort_order limit 1),
  (select min(r.lap_ms) from public.event_session_results r join public.event_sessions s on s.id=r.session_id where s.event_id=p_event_id and s.kind='qualifying' and r.driver_id=reg.driver_id)
 from public.event_registrations reg where reg.event_id=p_event_id and exists(select 1 from public.event_session_results r join public.event_sessions s on s.id=r.session_id where s.event_id=p_event_id and r.driver_id=reg.driver_id);
end;$$;
create function public.admin_save_sessions(p_event_id uuid,p_sessions jsonb) returns void language sql security invoker set search_path='' as $$select private.admin_save_sessions(p_event_id,p_sessions);$$;

-- Metadata saves do not erase session results.
create function private.admin_save_event_details(p_event jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid;
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 eid=coalesce(nullif(p_event->>'id','')::uuid,gen_random_uuid());
 insert into public.events(id,track_id,name,event_date,qualifying_time,race_time,timezone,laps,round,status,description,registration_open)
 values(eid,(p_event->>'track_id')::uuid,p_event->>'name',(p_event->>'event_date')::date,(p_event->>'qualifying_time')::time,(p_event->>'race_time')::time,
 coalesce(p_event->>'timezone','America/Toronto'),(p_event->>'laps')::integer,p_event->>'round',p_event->>'status',coalesce(p_event->>'description',''),coalesce((p_event->>'registration_open')::boolean,true))
 on conflict(id) do update set track_id=excluded.track_id,name=excluded.name,event_date=excluded.event_date,qualifying_time=excluded.qualifying_time,race_time=excluded.race_time,timezone=excluded.timezone,laps=excluded.laps,round=excluded.round,status=excluded.status,description=excluded.description,registration_open=excluded.registration_open;
 return eid;
end;$$;
create function public.admin_save_event_details(p_event jsonb) returns uuid language sql security invoker set search_path='' as $$select private.admin_save_event_details(p_event);$$;
-- Old deployed clients continue to work and populate the new session tables too.
create or replace function private.admin_save_event(p_event jsonb,p_results jsonb default '[]'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid; sessions jsonb;
begin
 if not private.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 if p_results is null or jsonb_typeof(p_results)<>'array' then raise exception 'Results must be a list.'; end if;
 if exists(select 1 from jsonb_array_elements(p_results) r group by r->>'race_position' having count(*)>1) then raise exception 'Duplicate race positions.'; end if;
 if exists(select 1 from jsonb_array_elements(p_results) r where (r->>'race_position')::integer not between 1 and 999 or r->>'race_position' is null) then raise exception 'Enter race positions.'; end if;
 eid=private.admin_save_event_details(p_event);
 select jsonb_build_array(jsonb_build_object('kind','qualifying','name','Qualifying 1','results',coalesce(jsonb_agg(jsonb_build_object('driver_id',r->>'driver_id','lap_ms',r->'qualifying_ms')),'[]'::jsonb)),
 jsonb_build_object('kind','race','name','Race 1','results',coalesce(jsonb_agg(jsonb_build_object('driver_id',r->>'driver_id','race_time',r->>'race_time','race_position',r->'race_position') order by (r->>'race_position')::integer),'[]'::jsonb))) into sessions from jsonb_array_elements(p_results) r;
 perform private.admin_save_sessions(eid,sessions);
 return eid;
end;$$;

-- A submission has either an HTTPS proof link or one owned uploaded clip.
alter table public.laps add column proof_storage_path text;
alter table public.laps drop constraint laps_proof_url_check;
alter table public.laps add constraint laps_proof_source check(
 (proof_storage_path is null and proof_url ~ '^https://' and char_length(proof_url)<=2048)
 or (proof_url='' and proof_storage_path is not null and proof_storage_path ~ ('^'||driver_id::text||'/[0-9a-f-]+\.(mp4|webm|mov)$'))
);
create unique index laps_clip_path_idx on public.laps(proof_storage_path) where proof_storage_path is not null;
grant insert(proof_storage_path) on public.laps to authenticated;
create function private.validate_clip() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.proof_storage_path is not null and not exists(select 1 from storage.objects where bucket_id='lap-clips' and name=new.proof_storage_path) then raise exception 'Upload your video clip before submitting the lap.'; end if;
 return new;
end;$$;
revoke all on function private.validate_clip() from public,anon,authenticated;
create trigger fra_validate_clip before insert on public.laps for each row execute function private.validate_clip();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('creator-media','creator-media',true,5242880,array['image/png','image/jpeg','image/webp']),
 ('lap-clips','lap-clips',false,52428800,array['video/mp4','video/webm','video/quicktime']) on conflict(id) do nothing;
create policy fra_creator_media_read on storage.objects for select to anon,authenticated using(bucket_id='creator-media');
create policy fra_creator_media_insert on storage.objects for insert to authenticated with check(bucket_id='creator-media' and (select public.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy fra_creator_media_delete on storage.objects for delete to authenticated using(bucket_id='creator-media' and (select public.is_admin()));
create policy fra_clips_read on storage.objects for select to anon,authenticated using(bucket_id='lap-clips' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin()) or exists(select 1 from public.laps l where l.proof_storage_path=name and l.status='approved')));
create policy fra_clips_insert on storage.objects for insert to authenticated with check(bucket_id='lap-clips' and (storage.foldername(name))[1]=(select auth.uid())::text and private.can_compete());
create policy fra_clips_delete_unused on storage.objects for delete to authenticated using(bucket_id='lap-clips' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.laps l where l.proof_storage_path=name));

revoke all on function private.reorder_creators(uuid[]),public.reorder_creators(uuid[]),private.admin_set_badges(uuid,text[]),public.admin_set_badges(uuid,text[]),private.admin_save_sessions(uuid,jsonb),public.admin_save_sessions(uuid,jsonb),private.admin_save_event_details(jsonb),public.admin_save_event_details(jsonb) from public,anon,authenticated;
grant execute on function private.reorder_creators(uuid[]),public.reorder_creators(uuid[]),private.admin_set_badges(uuid,text[]),public.admin_set_badges(uuid,text[]),private.admin_save_sessions(uuid,jsonb),public.admin_save_sessions(uuid,jsonb),private.admin_save_event_details(jsonb),public.admin_save_event_details(jsonb) to authenticated;
commit;
