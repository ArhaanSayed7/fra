begin;
-- The role table has no browser grants; RLS adds a further boundary.
alter table private.admin_users enable row level security;
create index drivers_country_idx on public.drivers(country_code);
create index tracks_creator_idx on public.tracks(creator_id);
create index events_track_idx on public.events(track_id);
create index laps_reviewer_idx on public.laps(reviewed_by);
-- Public reads need no second admin SELECT policy.
drop policy creators_admin on public.creators;
create policy creators_admin_insert on public.creators for insert to authenticated with check((select public.is_admin()));
create policy creators_admin_update on public.creators for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy creators_admin_delete on public.creators for delete to authenticated using((select public.is_admin()));
drop policy tracks_admin on public.tracks;
create policy tracks_admin_insert on public.tracks for insert to authenticated with check((select public.is_admin()));
create policy tracks_admin_update on public.tracks for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy tracks_admin_delete on public.tracks for delete to authenticated using((select public.is_admin()));
drop policy events_admin on public.events;
create policy events_admin_insert on public.events for insert to authenticated with check((select public.is_admin()));
create policy events_admin_update on public.events for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy events_admin_delete on public.events for delete to authenticated using((select public.is_admin()));
-- Administrative historical entries/results are written by the checked event RPC.
drop policy registrations_admin on public.event_registrations;
drop policy results_admin on public.event_results;
revoke insert,update,delete on public.event_results from authenticated;
-- Privileged implementations stay in the unexposed private schema.
alter function public.is_admin() set schema private;
alter function public.admin_update_driver(uuid,jsonb) set schema private;
alter function public.review_lap(uuid,text,text) set schema private;
alter function public.admin_save_event(jsonb,jsonb) set schema private;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$select private.is_admin();$$;
create function public.admin_update_driver(p_id uuid,p_profile jsonb) returns void language sql security invoker set search_path='' as $$select private.admin_update_driver(p_id,p_profile);$$;
create function public.review_lap(p_id uuid,p_status text,p_note text default '') returns void language sql security invoker set search_path='' as $$select private.review_lap(p_id,p_status,p_note);$$;
create function public.admin_save_event(p_event jsonb,p_results jsonb default '[]'::jsonb) returns uuid language sql security invoker set search_path='' as $$select private.admin_save_event(p_event,p_results);$$;
revoke all on function public.is_admin(),public.admin_update_driver(uuid,jsonb),public.review_lap(uuid,text,text),public.admin_save_event(jsonb,jsonb) from public,anon,authenticated;
revoke all on function private.is_admin(),private.admin_update_driver(uuid,jsonb),private.review_lap(uuid,text,text),private.admin_save_event(jsonb,jsonb) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function public.is_admin(),private.is_admin() to anon,authenticated;
grant execute on function public.admin_update_driver(uuid,jsonb),public.review_lap(uuid,text,text),public.admin_save_event(jsonb,jsonb),private.admin_update_driver(uuid,jsonb),private.review_lap(uuid,text,text),private.admin_save_event(jsonb,jsonb) to authenticated;
commit;
