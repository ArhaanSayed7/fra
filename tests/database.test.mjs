import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  incomplete = "33333333-3333-4333-8333-333333333333",
  admin = "44444444-4444-4444-8444-444444444444";
const cid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  tid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  eid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let pg;
async function as(role, id, sql, params = []) {
  await pg.exec(`reset role;set role ${role};`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  return pg.query(sql, params);
}
async function root(sql, params = []) {
  await pg.exec("reset role");
  return pg.query(sql, params);
}
const lapSQL = `insert into public.laps(driver_id,track_id,weather,car_class,custom_car,tire_compound,lap_ms,proof_url) values($1,$2,'Dry','Prevalents','',$3,102381,'https://example.com/video') returning id`;
test("FRA migration and database access rules", async (t) => {
  pg = new PGlite();
  await pg.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to anon,authenticated;`);
  for (const file of [
    "202610120001_fra.sql",
    "202610120002_access_indexes.sql",
  ])
    await pg.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  for (const id of [owner, other, incomplete, admin])
    await root(
      `insert into auth.users values($1,'{"provider":"discord"}','{"avatar_url":"https://cdn.discordapp.com/avatar.png"}')`,
      [id],
    );
  await root("insert into private.admin_users(user_id) values($1)", [admin]);
  await t.test(
    "Discord trigger creates incomplete drivers and country catalogue",
    async () => {
      assert.equal(
        (await root("select count(*)::int as n from public.countries")).rows[0]
          .n,
        250,
      );
      const d = (
        await root("select * from public.drivers where id=$1", [owner])
      ).rows[0];
      assert.equal(d.is_registered, false);
      assert.ok(d.username.length <= 32);
      assert.ok(d.avatar_url.startsWith("https://"));
    },
  );
  await t.test("profiles can edit only their own allowed columns", async () => {
    await as(
      "authenticated",
      owner,
      "update public.drivers set username='Apex',country_code='CA' where id=$1",
      [owner],
    );
    assert.equal(
      (
        await as(
          "authenticated",
          owner,
          "update public.drivers set username='Forged' where id=$1 returning id",
          [other],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      as(
        "authenticated",
        owner,
        "update public.drivers set is_active=false where id=$1",
        [owner],
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        owner,
        "update public.drivers set created_at=now() where id=$1",
        [owner],
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        owner,
        "insert into private.admin_users(user_id) values($1)",
        [owner],
      ),
      /permission denied/,
    );
    await assert.rejects(
      as("authenticated", owner, "select public.admin_update_driver($1,'{}')", [
        other,
      ]),
      /Admin access/,
    );
    await as(
      "authenticated",
      other,
      "update public.drivers set username='Rival',country_code='GB' where id=$1",
      [other],
    );
    const data = (await as("anon", null, "select id from public.drivers")).rows;
    assert.equal(data.length, 2);
  });
  await root(`insert into public.creators(id,name) values($1,'Creator')`, [
    cid,
  ]);
  await root(
    `insert into public.tracks(id,creator_id,name,map_code,released_on,weather,car_classes,has_tires,tire_compounds) values($1,$2,'Circuit','1234-5678-9012',current_date,array['Dry'],array['Prevalents','Customs'],true,array['Soft','Wet'])`,
    [tid, cid],
  );
  await root(
    `insert into public.events(id,track_id,name,event_date,qualifying_time,race_time,laps,round) values($1,$2,'Grand Prix',current_date+7,'18:30','19:00',24,'01')`,
    [eid, tid],
  );
  await t.test("only admins may change catalogue and events", async () => {
    await assert.rejects(
      as(
        "authenticated",
        owner,
        "insert into public.creators(name) values('Forged')",
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          owner,
          "update public.tracks set name='Forged' where id=$1 returning id",
          [tid],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      root(
        "insert into public.events(track_id,name,event_date,qualifying_time,race_time,laps,round) values(gen_random_uuid(),'No track',current_date,'18:30','19:00',5,'01')",
      ),
      /foreign key/,
    );
  });
  let lapId;
  await t.test("unsupported setups and inactive drivers are rejected", async () => {
    await assert.rejects(as("authenticated", owner, lapSQL.replace("'Dry'", "'Heavy Rain'"), [owner, tid, "Soft"]), /Weather is not available/);
    await assert.rejects(as("authenticated", owner, lapSQL.replace("'Prevalents'", "'Whiplashes'"), [owner, tid, "Soft"]), /Car class is not available/);
    await assert.rejects(as("authenticated", owner, lapSQL.replace("'Prevalents'", "'Customs'"), [owner, tid, "Soft"]), /custom car name/);
    await root("update public.drivers set is_active=false where id=$1", [other]);
    await assert.rejects(as("authenticated", other, lapSQL, [other, tid, "Soft"]), /row-level security/);
    await root("update public.drivers set is_active=true where id=$1", [other]);
  });
  await t.test(
    "lap ownership, setup validation, moderation and visibility",
    async () => {
      await assert.rejects(
        as("authenticated", owner, lapSQL, [other, tid, "Soft"]),
        /row-level security/,
      );
      await assert.rejects(
        as("authenticated", incomplete, lapSQL, [incomplete, tid, "Soft"]),
        /row-level security/,
      );
      await assert.rejects(
        as("authenticated", owner, lapSQL, [owner, tid, "Hard"]),
        /available tire/,
      );
      await assert.rejects(
        as("authenticated", owner, lapSQL, [owner, tid, null]),
        /available tire/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          "insert into public.laps(driver_id,track_id,weather,car_class,lap_ms,proof_url,status,tire_compound) values($1,$2,'Dry','Prevalents',102381,'https://example.com','approved','Soft')",
          [owner, tid],
        ),
        /permission denied/,
      );
      lapId = (await as("authenticated", owner, lapSQL, [owner, tid, "Soft"]))
        .rows[0].id;
      assert.equal(
        (await as("authenticated", other, "select * from public.laps")).rows
          .length,
        0,
      );
      assert.equal(
        (await as("anon", null, "select * from public.laps")).rows.length,
        0,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          "select public.review_lap($1,'approved','')",
          [lapId],
        ),
        /Admin access/,
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.review_lap($1,'rejected','')",
          [lapId],
        ),
        /reason/,
      );
      await as(
        "authenticated",
        admin,
        "select public.review_lap($1,'approved','')",
        [lapId],
      );
      assert.equal(
        (await as("anon", null, "select * from public.laps")).rows.length,
        1,
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.review_lap($1,'rejected','Changed')",
          [lapId],
        ),
        /already reviewed/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          "update public.laps set lap_ms=1 where id=$1",
          [lapId],
        ),
        /permission denied/,
      );
    },
  );
  await t.test(
    "drivers enter only as themselves, once, while registration is open",
    async () => {
      await as(
        "authenticated",
        owner,
        "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
        [eid, owner],
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
          [eid, other],
        ),
        /row-level security/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
          [eid, owner],
        ),
        /duplicate key/,
      );
      await assert.rejects(
        as(
          "authenticated",
          incomplete,
          "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
          [eid, incomplete],
        ),
        /row-level security/,
      );
      await root(
        "update public.events set registration_open=false where id=$1",
        [eid],
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
          [eid, other],
        ),
        /row-level security/,
      );
      await root(
        "update public.events set registration_open=true where id=$1",
        [eid],
      );
    },
  );
  await t.test(
    "event results save atomically and drive statistics and history",
    async () => {
      const event = {
        id: eid,
        track_id: tid,
        name: "Grand Prix",
        event_date: "2026-10-01",
        qualifying_time: "18:30",
        race_time: "19:00",
        laps: 24,
        round: "01",
        status: "past",
      };
      const result = {
        driver_id: owner,
        race_position: 1,
        race_time: "24:15.000",
        qualifying_ms: 102381,
      };
      await as(
        "authenticated",
        admin,
        "select public.admin_save_event($1,$2)",
        [JSON.stringify(event), JSON.stringify([result])],
      );
      await assert.rejects(
        as("authenticated", admin, "select public.admin_save_event($1,$2)", [
          JSON.stringify({ ...event, name: "Should roll back" }),
          JSON.stringify([result, { ...result, driver_id: other }]),
        ]),
        /duplicate key/,
      );
      assert.equal(
        (await root("select name from public.events where id=$1", [eid]))
          .rows[0].name,
        "Grand Prix",
      );
      assert.equal(
        (await root("select count(*)::int as n from public.event_results"))
          .rows[0].n,
        1,
      );
      const stats = (
        await as(
          "anon",
          null,
          "select * from public.driver_statistics where driver_id=$1",
          [owner],
        )
      ).rows[0];
      assert.deepEqual(stats, {
        driver_id: owner,
        events_entered: 1,
        events_won: 1,
        event_podiums: 1,
        lap_records: 1,
      });
      assert.equal(
        (
          await as(
            "anon",
            null,
            "select * from public.driver_event_history where driver_id=$1",
            [owner],
          )
        ).rows[0].race_position,
        1,
      );
    },
  );
  await t.test("media paths belong to the signed-in driver", async () => {
    await as(
      "authenticated",
      owner,
      "insert into storage.objects(bucket_id,name) values('driver-media',$1)",
      [owner + "/avatar.png"],
    );
    await assert.rejects(
      as(
        "authenticated",
        other,
        "insert into storage.objects(bucket_id,name) values('driver-media',$1)",
        [owner + "/forged.png"],
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          other,
          "delete from storage.objects returning id",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          owner,
          "delete from storage.objects returning id",
        )
      ).rows.length,
      1,
    );
  });
  await pg.close();
});
