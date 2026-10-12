begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.countries (code text primary key check (code ~ '^[A-Z]{2}$'), name text not null unique);
insert into public.countries(code,name) values
('AF','Afghanistan'),
('AX','Åland Islands'),
('AL','Albania'),
('DZ','Algeria'),
('AS','American Samoa'),
('AD','Andorra'),
('AO','Angola'),
('AI','Anguilla'),
('AQ','Antarctica'),
('AG','Antigua and Barbuda'),
('AR','Argentina'),
('AM','Armenia'),
('AW','Aruba'),
('AU','Australia'),
('AT','Austria'),
('AZ','Azerbaijan'),
('BS','Bahamas'),
('BH','Bahrain'),
('BD','Bangladesh'),
('BB','Barbados'),
('BY','Belarus'),
('BE','Belgium'),
('BZ','Belize'),
('BJ','Benin'),
('BM','Bermuda'),
('BT','Bhutan'),
('BO','Bolivia'),
('BQ','Bonaire, Sint Eustatius and Saba'),
('BA','Bosnia and Herzegovina'),
('BW','Botswana'),
('BV','Bouvet Island'),
('BR','Brazil'),
('IO','British Indian Ocean Territory'),
('BN','Brunei Darussalam'),
('BG','Bulgaria'),
('BF','Burkina Faso'),
('BI','Burundi'),
('KH','Cambodia'),
('CM','Cameroon'),
('CA','Canada'),
('CV','Cape Verde'),
('KY','Cayman Islands'),
('CF','Central African Republic'),
('TD','Chad'),
('CL','Chile'),
('CX','Christmas Island'),
('CC','Cocos (Keeling) Islands'),
('CO','Colombia'),
('KM','Comoros'),
('CK','Cook Islands'),
('CR','Costa Rica'),
('CI','Cote d''Ivoire'),
('HR','Croatia'),
('CU','Cuba'),
('CW','Curaçao'),
('CY','Cyprus'),
('CZ','Czech Republic'),
('CD','Democratic Republic of the Congo'),
('DK','Denmark'),
('DJ','Djibouti'),
('DM','Dominica'),
('DO','Dominican Republic'),
('EC','Ecuador'),
('EG','Egypt'),
('SV','El Salvador'),
('GQ','Equatorial Guinea'),
('ER','Eritrea'),
('EE','Estonia'),
('SZ','Eswatini'),
('ET','Ethiopia'),
('FK','Falkland Islands (Malvinas)'),
('FO','Faroe Islands'),
('FJ','Fiji'),
('FI','Finland'),
('FR','France'),
('GF','French Guiana'),
('PF','French Polynesia'),
('TF','French Southern Territories'),
('GA','Gabon'),
('GE','Georgia'),
('DE','Germany'),
('GH','Ghana'),
('GI','Gibraltar'),
('GR','Greece'),
('GL','Greenland'),
('GD','Grenada'),
('GP','Guadeloupe'),
('GU','Guam'),
('GT','Guatemala'),
('GG','Guernsey'),
('GN','Guinea'),
('GW','Guinea-Bissau'),
('GY','Guyana'),
('HT','Haiti'),
('HM','Heard Island and McDonald Islands'),
('VA','Holy See (Vatican City State)'),
('HN','Honduras'),
('HK','Hong Kong'),
('HU','Hungary'),
('IS','Iceland'),
('IN','India'),
('ID','Indonesia'),
('IQ','Iraq'),
('IE','Ireland'),
('IR','Islamic Republic of Iran'),
('IM','Isle of Man'),
('IL','Israel'),
('IT','Italy'),
('JM','Jamaica'),
('JP','Japan'),
('JE','Jersey'),
('JO','Jordan'),
('KZ','Kazakhstan'),
('KE','Kenya'),
('KI','Kiribati'),
('XK','Kosovo'),
('KW','Kuwait'),
('KG','Kyrgyzstan'),
('LA','Lao People''s Democratic Republic'),
('LV','Latvia'),
('LB','Lebanon'),
('LS','Lesotho'),
('LR','Liberia'),
('LY','Libya'),
('LI','Liechtenstein'),
('LT','Lithuania'),
('LU','Luxembourg'),
('MO','Macao'),
('MG','Madagascar'),
('MW','Malawi'),
('MY','Malaysia'),
('MV','Maldives'),
('ML','Mali'),
('MT','Malta'),
('MH','Marshall Islands'),
('MQ','Martinique'),
('MR','Mauritania'),
('MU','Mauritius'),
('YT','Mayotte'),
('MX','Mexico'),
('FM','Micronesia, Federated States of'),
('MD','Moldova, Republic of'),
('MC','Monaco'),
('MN','Mongolia'),
('ME','Montenegro'),
('MS','Montserrat'),
('MA','Morocco'),
('MZ','Mozambique'),
('MM','Myanmar'),
('NA','Namibia'),
('NR','Nauru'),
('NP','Nepal'),
('NL','Netherlands'),
('NC','New Caledonia'),
('NZ','New Zealand'),
('NI','Nicaragua'),
('NE','Niger'),
('NG','Nigeria'),
('NU','Niue'),
('NF','Norfolk Island'),
('KP','North Korea'),
('MP','Northern Mariana Islands'),
('NO','Norway'),
('OM','Oman'),
('PK','Pakistan'),
('PW','Palau'),
('PA','Panama'),
('PG','Papua New Guinea'),
('PY','Paraguay'),
('CN','People''s Republic of China'),
('PE','Peru'),
('PH','Philippines'),
('PN','Pitcairn'),
('PL','Poland'),
('PT','Portugal'),
('PR','Puerto Rico'),
('QA','Qatar'),
('CG','Republic of the Congo'),
('GM','Republic of The Gambia'),
('RE','Reunion'),
('RO','Romania'),
('RU','Russian Federation'),
('RW','Rwanda'),
('BL','Saint Barthélemy'),
('SH','Saint Helena'),
('KN','Saint Kitts and Nevis'),
('LC','Saint Lucia'),
('MF','Saint Martin (French part)'),
('PM','Saint Pierre and Miquelon'),
('VC','Saint Vincent and the Grenadines'),
('WS','Samoa'),
('SM','San Marino'),
('ST','Sao Tome and Principe'),
('SA','Saudi Arabia'),
('SN','Senegal'),
('RS','Serbia'),
('SC','Seychelles'),
('SL','Sierra Leone'),
('SG','Singapore'),
('SX','Sint Maarten (Dutch part)'),
('SK','Slovakia'),
('SI','Slovenia'),
('SB','Solomon Islands'),
('SO','Somalia'),
('ZA','South Africa'),
('GS','South Georgia and the South Sandwich Islands'),
('KR','South Korea'),
('SS','South Sudan'),
('ES','Spain'),
('LK','Sri Lanka'),
('PS','State of Palestine'),
('SD','Sudan'),
('SR','Suriname'),
('SJ','Svalbard and Jan Mayen'),
('SE','Sweden'),
('CH','Switzerland'),
('SY','Syrian Arab Republic'),
('TW','Taiwan, Province of China'),
('TJ','Tajikistan'),
('TH','Thailand'),
('MK','The Republic of North Macedonia'),
('TL','Timor-Leste'),
('TG','Togo'),
('TK','Tokelau'),
('TO','Tonga'),
('TT','Trinidad and Tobago'),
('TN','Tunisia'),
('TR','Türkiye'),
('TM','Turkmenistan'),
('TC','Turks and Caicos Islands'),
('TV','Tuvalu'),
('UG','Uganda'),
('UA','Ukraine'),
('AE','United Arab Emirates'),
('GB','United Kingdom'),
('TZ','United Republic of Tanzania'),
('UM','United States Minor Outlying Islands'),
('US','United States of America'),
('UY','Uruguay'),
('UZ','Uzbekistan'),
('VU','Vanuatu'),
('VE','Venezuela'),
('VN','Vietnam'),
('VG','Virgin Islands, British'),
('VI','Virgin Islands, U.S.'),
('WF','Wallis and Futuna'),
('EH','Western Sahara'),
('YE','Yemen'),
('ZM','Zambia'),
('ZW','Zimbabwe');

create table public.drivers (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (char_length(btrim(username)) between 3 and 32),
 country_code text references public.countries(code),
 avatar_url text not null default '' check (avatar_url='' or (avatar_url ~ '^https://' and char_length(avatar_url)<=2048)),
 banner_url text not null default '' check (banner_url='' or (banner_url ~ '^https://' and char_length(banner_url)<=2048)),
 bio text not null default '' check (char_length(bio)<=500),
 race_number text not null default '' check (race_number ~ '^[0-9]{0,3}$'),
 is_active boolean not null default true,
 is_registered boolean generated always as (country_code is not null) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index drivers_username_unique on public.drivers(lower(username));
create table private.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admin_users where user_id=(select auth.uid()));
$$;
create or replace function private.can_compete() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.drivers where id=(select auth.uid()) and is_registered and is_active);
$$;

create table public.creators (id uuid primary key default gen_random_uuid(),name text not null check(char_length(btrim(name)) between 1 and 80),description text not null default '' check(char_length(description)<=500));
create table public.tracks (
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 1 and 80),map_code text not null check(map_code ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}$'),
 released_on date not null,hero_image_url text not null default 'assets/coast.svg' check(hero_image_url ~ '^(https://|assets/)' and char_length(hero_image_url)<=2048),
 description text not null default '' check(char_length(description)<=1500),
 weather text[] not null check(cardinality(weather)>0 and weather <@ array['Dry','Light Rain','Heavy Rain']::text[] and array_position(weather,null) is null),
 car_classes text[] not null check(cardinality(car_classes)>0 and car_classes <@ array['Prevalents','Whiplashes','Customs']::text[] and array_position(car_classes,null) is null),
 has_tires boolean not null default false,tire_compounds text[] not null default '{}',
 constraint tracks_tires_valid check(tire_compounds <@ array['Ultrasoft','Soft','Medium','Hard','Ultrahard','Intermediate','Wet']::text[] and array_position(tire_compounds,null) is null and ((has_tires and cardinality(tire_compounds)>0) or (not has_tires and cardinality(tire_compounds)=0)))
);
create table public.events (
 id uuid primary key default gen_random_uuid(),track_id uuid not null references public.tracks(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 1 and 100),event_date date not null,
 qualifying_time time not null,race_time time not null check(race_time>qualifying_time),timezone text not null default 'America/Toronto',
 laps integer not null check(laps between 1 and 999),round text not null check(char_length(round) between 1 and 8),
 status text not null default 'upcoming' check(status in ('upcoming','past')),description text not null default '' check(char_length(description)<=1000),
 registration_open boolean not null default true
);
create table public.event_registrations (
 event_id uuid not null references public.events(id) on delete cascade,driver_id uuid not null references public.drivers(id) on delete restrict,
 created_at timestamptz not null default now(),primary key(event_id,driver_id)
);
create index registrations_driver_idx on public.event_registrations(driver_id);
create table public.event_results (
 event_id uuid not null,driver_id uuid not null,race_position integer not null check(race_position between 1 and 999),
 race_time text not null check(char_length(btrim(race_time)) between 1 and 40),qualifying_ms integer not null check(qualifying_ms between 1 and 5999999),
 primary key(event_id,driver_id),foreign key(event_id,driver_id) references public.event_registrations(event_id,driver_id) on delete cascade,
 unique(event_id,race_position)
);
create table public.laps (
 id uuid primary key default gen_random_uuid(),driver_id uuid not null references public.drivers(id) on delete restrict,
 track_id uuid not null references public.tracks(id) on delete restrict,weather text not null,car_class text not null,
 custom_car text not null default '' check(char_length(custom_car)<=80),tire_compound text,
 lap_ms integer not null check(lap_ms between 1 and 5999999),proof_url text not null check(proof_url ~ '^https://' and char_length(proof_url)<=2048),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),review_note text not null default '' check(char_length(review_note)<=500),
 created_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id)
);
create index laps_board_idx on public.laps(track_id,weather,car_class,tire_compound,lap_ms) where status='approved';
create index laps_owner_idx on public.laps(driver_id,created_at desc);

-- Use a short collision-resistant temporary name until onboarding completes.
create or replace function private.register_discord_driver() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'provider'='discord' then
  insert into public.drivers(id,username,avatar_url) values(new.id,'driver-'||substr(replace(new.id::text,'-',''),1,24),
   case when new.raw_user_meta_data->>'avatar_url' ~ '^https://' then left(new.raw_user_meta_data->>'avatar_url',2048) else '' end);
 end if;
 return new;
end;
$$;
create trigger fra_register_discord_driver after insert on auth.users for each row execute function private.register_discord_driver();
create function private.touch_driver() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now(); return new; end;$$;
create trigger fra_touch_driver before update on public.drivers for each row execute function private.touch_driver();
create function private.validate_lap() returns trigger language plpgsql set search_path='' as $$
declare t public.tracks;
begin
 select * into t from public.tracks where id=new.track_id;
 if not found then raise exception 'Choose an existing track.'; end if;
 if not(new.weather=any(t.weather)) then raise exception 'Weather is not available on this track.'; end if;
 if not(new.car_class=any(t.car_classes)) then raise exception 'Car class is not available on this track.'; end if;
 if new.car_class='Customs' and btrim(new.custom_car)='' then raise exception 'Enter the custom car name.'; end if;
 if new.car_class<>'Customs' and new.custom_car<>'' then raise exception 'Custom car must be blank for this car class.'; end if;
 if t.has_tires and (new.tire_compound is null or not(new.tire_compound=any(t.tire_compounds))) then raise exception 'Choose an available tire compound.'; end if;
 if not t.has_tires and new.tire_compound is not null then raise exception 'This track has no tire selection.'; end if;
 return new;
end;
$$;
create trigger fra_validate_lap before insert on public.laps for each row execute function private.validate_lap();

alter table public.countries enable row level security;
alter table public.drivers enable row level security;
alter table public.creators enable row level security;
alter table public.tracks enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_results enable row level security;
alter table public.laps enable row level security;
create policy countries_read on public.countries for select to anon,authenticated using(true);
create policy drivers_read on public.drivers for select to anon,authenticated using(is_registered or id=(select auth.uid()) or (select public.is_admin()));
create policy drivers_update_self on public.drivers for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy creators_read on public.creators for select to anon,authenticated using(true);
create policy creators_admin on public.creators for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy tracks_read on public.tracks for select to anon,authenticated using(true);
create policy tracks_admin on public.tracks for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy events_read on public.events for select to anon,authenticated using(true);
create policy events_admin on public.events for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy registrations_read on public.event_registrations for select to anon,authenticated using(true);
create policy registrations_insert_self on public.event_registrations for insert to authenticated with check(driver_id=(select auth.uid()) and private.can_compete() and exists(select 1 from public.events e where e.id=event_id and e.status='upcoming' and e.registration_open and e.event_date>=(now() at time zone e.timezone)::date));
create policy registrations_delete_self on public.event_registrations for delete to authenticated using(driver_id=(select auth.uid()) and exists(select 1 from public.events e where e.id=event_id and e.status='upcoming' and e.event_date>=(now() at time zone e.timezone)::date));
create policy registrations_admin on public.event_registrations for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy results_read on public.event_results for select to anon,authenticated using(true);
create policy results_admin on public.event_results for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy laps_read on public.laps for select to anon,authenticated using(status='approved' or driver_id=(select auth.uid()) or (select public.is_admin()));
create policy laps_insert_self on public.laps for insert to authenticated with check(driver_id=(select auth.uid()) and status='pending' and private.can_compete());
-- Review and deletion use checked RPCs. There is no client UPDATE or DELETE grant on laps.

create function public.admin_update_driver(p_id uuid,p_profile jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 update public.drivers set username=p_profile->>'username',country_code=nullif(p_profile->>'country_code',''),avatar_url=coalesce(p_profile->>'avatar_url',''),
 banner_url=coalesce(p_profile->>'banner_url',''),bio=coalesce(p_profile->>'bio',''),race_number=coalesce(p_profile->>'race_number',''),
 is_active=coalesce((p_profile->>'is_active')::boolean,true),created_at=coalesce((p_profile->>'created_at')::timestamptz,created_at) where id=p_id;
 if not found then raise exception 'Driver not found.'; end if;
end;
$$;
create function public.review_lap(p_id uuid,p_status text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 if p_status not in ('approved','rejected') then raise exception 'Invalid review decision.'; end if;
 if p_status='rejected' and btrim(p_note)='' then raise exception 'A rejection reason is required.'; end if;
 update public.laps set status=p_status,review_note=left(p_note,500),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id and status='pending';
 if not found then raise exception 'Lap not found or already reviewed. Refresh the queue.'; end if;
end;
$$;
create function public.admin_save_event(p_event jsonb,p_results jsonb default '[]'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare eid uuid; r jsonb;
begin
 if not public.is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 if jsonb_typeof(p_results)<>'array' then raise exception 'Results must be a list.'; end if;
 eid=coalesce(nullif(p_event->>'id','')::uuid,gen_random_uuid());
 insert into public.events(id,track_id,name,event_date,qualifying_time,race_time,timezone,laps,round,status,description,registration_open)
 values(eid,(p_event->>'track_id')::uuid,p_event->>'name',(p_event->>'event_date')::date,(p_event->>'qualifying_time')::time,(p_event->>'race_time')::time,
 coalesce(p_event->>'timezone','America/Toronto'),(p_event->>'laps')::integer,p_event->>'round',p_event->>'status',coalesce(p_event->>'description',''),coalesce((p_event->>'registration_open')::boolean,true))
 on conflict(id) do update set track_id=excluded.track_id,name=excluded.name,event_date=excluded.event_date,qualifying_time=excluded.qualifying_time,race_time=excluded.race_time,timezone=excluded.timezone,laps=excluded.laps,round=excluded.round,status=excluded.status,description=excluded.description,registration_open=excluded.registration_open;
 delete from public.event_results where event_id=eid;
 for r in select value from jsonb_array_elements(p_results) loop
  if not exists(select 1 from public.drivers where id=(r->>'driver_id')::uuid and is_registered) then raise exception 'Results require a registered driver.'; end if;
  insert into public.event_registrations(event_id,driver_id) values(eid,(r->>'driver_id')::uuid) on conflict do nothing;
  insert into public.event_results(event_id,driver_id,race_position,race_time,qualifying_ms) values(eid,(r->>'driver_id')::uuid,(r->>'race_position')::integer,r->>'race_time',(r->>'qualifying_ms')::integer);
 end loop;
 return eid;
end;
$$;

create view public.track_records with(security_invoker=true) as
 select distinct on(track_id) id as lap_id,track_id,driver_id,lap_ms,weather,car_class,custom_car,tire_compound,created_at from public.laps where status='approved' order by track_id,lap_ms,created_at,id;
create view public.driver_statistics with(security_invoker=true) as
 select d.id as driver_id,
 (select count(*)::integer from public.event_registrations r where r.driver_id=d.id) as events_entered,
 (select count(*)::integer from public.event_results r join public.events e on e.id=r.event_id where r.driver_id=d.id and r.race_position=1 and e.status='past') as events_won,
 (select count(*)::integer from public.event_results r join public.events e on e.id=r.event_id where r.driver_id=d.id and r.race_position<=3 and e.status='past') as event_podiums,
 (select count(*)::integer from public.track_records r where r.driver_id=d.id) as lap_records
 from public.drivers d;
create view public.driver_event_history with(security_invoker=true) as
 select reg.driver_id,e.id as event_id,e.name as event_name,e.event_date,e.status,t.name as track_name,r.race_position,r.race_time,r.qualifying_ms
 from public.event_registrations reg join public.events e on e.id=reg.event_id join public.tracks t on t.id=e.track_id left join public.event_results r on r.event_id=reg.event_id and r.driver_id=reg.driver_id;

-- Remove Supabase's broad default API grants, then allow only required operations.
revoke all on public.countries,public.drivers,public.creators,public.tracks,public.events,public.event_registrations,public.event_results,public.laps from anon,authenticated;
grant select on public.countries,public.drivers,public.creators,public.tracks,public.events,public.event_registrations,public.event_results,public.laps,public.track_records,public.driver_statistics,public.driver_event_history to anon,authenticated;
grant update(username,country_code,avatar_url,banner_url,bio,race_number) on public.drivers to authenticated;
grant insert,update,delete on public.creators,public.tracks,public.events,public.event_results to authenticated;
grant insert(event_id,driver_id),delete on public.event_registrations to authenticated;
grant insert(driver_id,track_id,weather,car_class,custom_car,tire_compound,lap_ms,proof_url) on public.laps to authenticated;
revoke all on function public.is_admin(),public.admin_update_driver(uuid,jsonb),public.review_lap(uuid,text,text),public.admin_save_event(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.admin_update_driver(uuid,jsonb),public.review_lap(uuid,text,text),public.admin_save_event(jsonb,jsonb) to authenticated;
-- Policies may call this boolean helper but cannot read its private tables.
grant usage on schema private to authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.can_compete() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('driver-media','driver-media',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy fra_media_read on storage.objects for select to anon,authenticated using(bucket_id='driver-media');
create policy fra_media_insert_own on storage.objects for insert to authenticated with check(bucket_id='driver-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy fra_media_delete_own on storage.objects for delete to authenticated using(bucket_id='driver-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
