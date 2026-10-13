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
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text);
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
  const emailDriver = "55555555-5555-4555-8555-555555555555";
  await root(
    `insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,'{"provider":"email"}','{}')`,
    [emailDriver],
  );
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261012224350_fra_email_registration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261013013150_fra_developer_roles.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261013024405_fra_racing_management.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.exec(`insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','{"provider":"email"}','{}');
  update public.drivers set username='Migration Racer',country_code='CA' where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  insert into public.creators(id,name) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Migration Creator');
  insert into public.tracks(id,creator_id,name,map_code,released_on,weather,car_classes) values('ffffffff-ffff-4fff-8fff-ffffffffffff','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Migration Track','1111-1111-1111','2026-10-13',array['Dry'],array['Prevalents']);
  insert into public.laps(id,driver_id,track_id,weather,car_class,lap_ms,proof_url,status) values('99999999-9999-4999-8999-999999999999','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','ffffffff-ffff-4fff-8fff-ffffffffffff','Dry','Prevalents',90000,'https://example.com/old-proof','approved');`);
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261013141855_fra_accounts_and_private_proof.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (
      await root(
        "select proof_url from private.lap_proofs where lap_id='99999999-9999-4999-8999-999999999999'",
      )
    ).rows[0].proof_url,
    "https://example.com/old-proof",
  );
  assert.equal(
    (
      await root(
        "select proof_url from public.laps where id='99999999-9999-4999-8999-999999999999'",
      )
    ).rows[0].proof_url,
    "",
  );
  await root(
    "delete from auth.users where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'",
  );
  await root(
    "delete from public.tracks where id='ffffffff-ffff-4fff-8fff-ffffffffffff'",
  );
  await root(
    "delete from public.creators where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'",
  );

  for (const id of [owner, other, incomplete, admin])
    await root(
      `insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,'{"provider":"discord"}','{"avatar_url":"https://cdn.discordapp.com/avatar.png"}')`,
      [id],
    );
  await root("insert into private.admin_users(user_id) values($1)", [admin]);
  await t.test(
    "email profiles are backfilled and new email users get the same onboarding and ownership rules",
    async () => {
      assert.equal(
        (
          await root("select is_registered from public.drivers where id=$1", [
            emailDriver,
          ])
        ).rows[0].is_registered,
        false,
      );
      const fresh = "66666666-6666-4666-8666-666666666666";
      await root(
        `insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,'{"provider":"email"}','{"admin":true,"provider":"discord","avatar_url":"https://example.com/fake.png"}')`,
        [fresh],
      );
      const d = (
        await root("select * from public.drivers where id=$1", [fresh])
      ).rows[0];
      assert.equal(d.is_registered, false);
      assert.equal(d.avatar_url, "");
      assert.equal(
        (await as("authenticated", fresh, "select public.is_admin() as admin"))
          .rows[0].admin,
        false,
      );
      assert.equal(
        (
          await as(
            "authenticated",
            fresh,
            "update public.drivers set username='Email Racer',country_code='CA' where id=$1 returning is_registered",
            [fresh],
          )
        ).rows[0].is_registered,
        true,
      );
      assert.equal(
        (
          await as(
            "authenticated",
            fresh,
            "update public.drivers set username='Stolen' where id=$1 returning id",
            [owner],
          )
        ).rows.length,
        0,
      );
      await root("delete from public.drivers where id=$1", [fresh]);
      await root("delete from auth.users where id=$1", [fresh]);
    },
  );
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
  await t.test(
    "unsupported setups and inactive drivers are rejected",
    async () => {
      await assert.rejects(
        as("authenticated", owner, lapSQL.replace("'Dry'", "'Heavy Rain'"), [
          owner,
          tid,
          "Soft",
        ]),
        /Weather is not available/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          lapSQL.replace("'Prevalents'", "'Whiplashes'"),
          [owner, tid, "Soft"],
        ),
        /Car class is not available/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          lapSQL.replace("'Prevalents'", "'Customs'"),
          [owner, tid, "Soft"],
        ),
        /custom car name/,
      );
      await root("update public.drivers set is_active=false where id=$1", [
        other,
      ]);
      await assert.rejects(
        as("authenticated", other, lapSQL, [other, tid, "Soft"]),
        /row-level security/,
      );
      await root("update public.drivers set is_active=true where id=$1", [
        other,
      ]);
    },
  );
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
        /Duplicate race positions|duplicate key/,
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
  await t.test(
    "only the protected developer can grant or revoke website admin access",
    async () => {
      await root("insert into private.developer_users(user_id) values($1)", [
        owner,
      ]);
      assert.equal(
        (await as("authenticated", owner, "select public.is_developer() as ok"))
          .rows[0].ok,
        true,
      );
      assert.equal(
        (await as("authenticated", owner, "select public.is_admin() as ok"))
          .rows[0].ok,
        true,
      );
      assert.equal(
        (await as("authenticated", other, "select public.is_developer() as ok"))
          .rows[0].ok,
        false,
      );
      await assert.rejects(
        as("anon", null, "select public.set_driver_admin($1,true)", [other]),
        /permission denied/,
      );
      await assert.rejects(
        as("authenticated", other, "select public.set_driver_admin($1,true)", [
          other,
        ]),
        /Only the website developer/,
      );
      await assert.rejects(
        as("authenticated", admin, "select public.set_driver_admin($1,true)", [
          other,
        ]),
        /Only the website developer/,
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into private.developer_users(user_id) values($1)",
          [other],
        ),
        /permission denied/,
      );
      await assert.rejects(
        as("authenticated", owner, "select public.set_driver_admin($1,false)", [
          owner,
        ]),
        /protected/,
      );
      await assert.rejects(
        as("authenticated", owner, "select public.set_driver_admin($1,true)", [
          incomplete,
        ]),
        /registered driver/,
      );
      await root("update public.drivers set is_active=false where id=$1", [
        other,
      ]);
      await assert.rejects(
        as("authenticated", owner, "select public.set_driver_admin($1,true)", [
          other,
        ]),
        /Activate this driver/,
      );
      await root("update public.drivers set is_active=true where id=$1", [
        other,
      ]);
      await as(
        "authenticated",
        owner,
        "select public.set_driver_admin($1,true)",
        [other],
      );
      assert.equal(
        (await as("authenticated", other, "select public.is_admin() as ok"))
          .rows[0].ok,
        true,
      );
      await assert.rejects(
        as("authenticated", other, "select public.set_driver_admin($1,true)", [
          incomplete,
        ]),
        /Only the website developer/,
      );
      const roles = (
        await as(
          "anon",
          null,
          "select * from public.driver_roles() order by driver_id",
        )
      ).rows;
      assert.deepEqual(roles, [
        { driver_id: owner, role: "developer" },
        { driver_id: other, role: "admin" },
      ]);
      await assert.rejects(
        as("anon", null, "select * from private.developer_users"),
        /permission denied/,
      );
      await assert.rejects(
        as("authenticated", other, "select * from private.admin_users"),
        /permission denied/,
      );
      await as(
        "authenticated",
        owner,
        "select public.set_driver_admin($1,false)",
        [other],
      );
      assert.equal(
        (await as("authenticated", other, "select public.is_admin() as ok"))
          .rows[0].ok,
        false,
      );
      assert.deepEqual(
        (await as("anon", null, "select * from public.driver_roles()")).rows,
        [{ driver_id: owner, role: "developer" }],
      );
    },
  );

  await t.test(
    "creator order and manual display badges require admin access without granting roles",
    async () => {
      const c2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
      await root(
        "insert into public.creators(id,name) values($1,'Second Creator')",
        [c2],
      );
      await assert.rejects(
        as("authenticated", other, "select public.reorder_creators($1)", [
          [c2, cid],
        ]),
        /Admin access/,
      );
      await as("authenticated", admin, "select public.reorder_creators($1)", [
        [c2, cid],
      ]);
      assert.deepEqual(
        (
          await root("select id from public.creators order by sort_order")
        ).rows.map((r) => r.id),
        [c2, cid],
      );
      await assert.rejects(
        as("authenticated", admin, "select public.reorder_creators($1)", [
          [cid, cid],
        ]),
        /exactly once/,
      );
      await assert.rejects(
        as("authenticated", other, "select public.admin_set_badges($1,$2)", [
          other,
          ["map_developer"],
        ]),
        /Admin access/,
      );
      await as(
        "authenticated",
        admin,
        "select public.admin_set_badges($1,$2)",
        [other, ["map_developer", "winner"]],
      );
      assert.equal(
        (
          await as(
            "anon",
            null,
            "select count(*)::int n from public.driver_badges where driver_id=$1",
            [other],
          )
        ).rows[0].n,
        2,
      );
      await assert.rejects(
        as("authenticated", admin, "select public.admin_set_badges($1,$2)", [
          other,
          ["developer"],
        ]),
        /valid display badges/,
      );
      assert.equal(
        (await as("authenticated", other, "select public.is_admin() ok"))
          .rows[0].ok,
        false,
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into public.driver_badges values($1,'record')",
          [other],
        ),
        /permission denied/,
      );
      await as(
        "authenticated",
        admin,
        "select public.admin_set_badges($1,$2)",
        [other, []],
      );
      await root("delete from public.creators where id=$1", [c2]);
    },
  );
  await t.test(
    "multiple qualifying and race lobbies save atomically and retain compatible event summaries",
    async () => {
      const sessions = [
        {
          kind: "qualifying",
          name: "Lobby A",
          results: [
            { driver_id: owner, lap_ms: 61000 },
            { driver_id: other, lap_ms: 60000 },
          ],
        },
        {
          kind: "qualifying",
          name: "Lobby B",
          results: [{ driver_id: owner, lap_ms: 59000 }],
        },
        {
          kind: "race",
          name: "Race A",
          results: [
            { driver_id: other, race_time: "12:00.000" },
            { driver_id: owner, race_time: "+2.000" },
          ],
        },
        {
          kind: "race",
          name: "Race B",
          results: [{ driver_id: owner, race_time: "11:58.000" }],
        },
      ];
      await assert.rejects(
        as("authenticated", other, "select public.admin_save_sessions($1,$2)", [
          eid,
          JSON.stringify(sessions),
        ]),
        /Admin access/,
      );
      await as(
        "authenticated",
        admin,
        "select public.admin_save_sessions($1,$2)",
        [eid, JSON.stringify(sessions)],
      );
      assert.equal(
        (
          await root(
            "select count(*)::int n from public.event_sessions where event_id=$1",
            [eid],
          )
        ).rows[0].n,
        4,
      );
      const summary = (
        await root(
          "select race_position,qualifying_ms from public.event_results where event_id=$1 and driver_id=$2",
          [eid, owner],
        )
      ).rows[0];
      assert.deepEqual(summary, { race_position: 1, qualifying_ms: 59000 });
      assert.equal(
        (
          await root(
            "select count(*)::int n from public.event_results where event_id=$1 and race_position=1",
            [eid],
          )
        ).rows[0].n,
        2,
      );
      const broken = structuredClone(sessions);
      broken[0].results.push(broken[0].results[0]);
      await assert.rejects(
        as("authenticated", admin, "select public.admin_save_sessions($1,$2)", [
          eid,
          JSON.stringify(broken),
        ]),
        /duplicate key/,
      );
      assert.equal(
        (
          await root(
            "select count(*)::int n from public.event_sessions where event_id=$1",
            [eid],
          )
        ).rows[0].n,
        4,
      );
      await as(
        "authenticated",
        admin,
        "select public.admin_save_sessions($1,$2)",
        [
          eid,
          JSON.stringify([
            {
              kind: "qualifying",
              name: "Qualifying only",
              results: [{ driver_id: owner, lap_ms: 58000 }],
            },
          ]),
        ],
      );
      assert.equal(
        (
          await root(
            "select race_position from public.event_results where event_id=$1",
            [eid],
          )
        ).rows[0].race_position,
        null,
      );
      const event = {
        id: eid,
        track_id: tid,
        name: "Keep sessions",
        event_date: "2026-10-01",
        qualifying_time: "18:30",
        race_time: "19:00",
        laps: 24,
        round: "01",
        status: "past",
      };
      await as(
        "authenticated",
        admin,
        "select public.admin_save_event_details($1)",
        [JSON.stringify(event)],
      );
      assert.equal(
        (
          await root(
            "select count(*)::int n from public.event_sessions where event_id=$1",
            [eid],
          )
        ).rows[0].n,
        1,
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into public.event_sessions(event_id,kind,name,sort_order) values($1,'race','Forged',9)",
          [eid],
        ),
        /permission denied/,
      );
    },
  );
  await t.test(
    "uploaded proof is private to owner/admin even after approval",
    async () => {
      const path = owner + "/99999999-9999-4999-8999-999999999999.mp4";
      await root("update public.drivers set is_active=true where id=$1", [
        owner,
      ]);
      await as(
        "authenticated",
        owner,
        "insert into storage.objects(bucket_id,name) values('lap-clips',$1)",
        [path],
      );
      assert.equal(
        (
          await as(
            "anon",
            null,
            "select * from storage.objects where name=$1",
            [path],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into storage.objects(bucket_id,name) values('lap-clips',$1)",
          [owner + "/bad.mp4"],
        ),
        /row-level security/,
      );
      const inserted = await as(
        "authenticated",
        owner,
        `insert into public.laps(driver_id,track_id,weather,car_class,custom_car,tire_compound,lap_ms,proof_url,proof_storage_path) values($1,$2,'Dry','Prevalents','','Soft',100001,'',$3) returning id`,
        [owner, tid, path],
      );
      assert.equal(
        (
          await as(
            "authenticated",
            owner,
            "delete from storage.objects where name=$1 returning id",
            [path],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await as(
            "authenticated",
            other,
            "select * from storage.objects where name=$1",
            [path],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await as(
            "authenticated",
            admin,
            "select * from storage.objects where name=$1",
            [path],
          )
        ).rows.length,
        1,
      );
      await as(
        "authenticated",
        admin,
        "select public.review_lap($1,'approved','')",
        [inserted.rows[0].id],
      );
      assert.equal(
        (
          await as(
            "anon",
            null,
            "select * from storage.objects where name=$1",
            [path],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          `insert into public.laps(driver_id,track_id,weather,car_class,custom_car,tire_compound,lap_ms,proof_url) values($1,$2,'Dry','Prevalents','','Soft',100002,'')`,
          [owner, tid],
        ),
        /valid video link|check constraint/,
      );
      await assert.rejects(
        as(
          "authenticated",
          owner,
          `insert into public.laps(driver_id,track_id,weather,car_class,custom_car,tire_compound,lap_ms,proof_url,proof_storage_path) values($1,$2,'Dry','Prevalents','','Soft',100002,'',$3)`,
          [owner, tid, owner + "/88888888-8888-4888-8888-888888888888.mp4"],
        ),
        /Upload your video/,
      );
      await assert.rejects(
        as(
          "authenticated",
          other,
          "insert into storage.objects(bucket_id,name) values('creator-media',$1)",
          [other + "/avatar.png"],
        ),
        /row-level security/,
      );
      await as(
        "authenticated",
        admin,
        "insert into storage.objects(bucket_id,name) values('creator-media',$1)",
        [admin + "/avatar.png"],
      );
    },
  );

  await t.test(
    "private proof links never appear in public lap rows and checked RPC denies other drivers",
    async () => {
      const lap = (
        await root(
          "select id,driver_id from public.laps where status='approved' limit 1",
        )
      ).rows[0];
      const row = (
        await as(
          "anon",
          null,
          "select proof_url,proof_storage_path from public.laps where id=$1",
          [lap.id],
        )
      ).rows[0];
      assert.deepEqual(row, { proof_url: "", proof_storage_path: null });
      await assert.rejects(
        as("anon", null, "select public.read_lap_proof($1)", [lap.id]),
        /permission denied/,
      );
      const stranger = incomplete;
      await assert.rejects(
        as("authenticated", stranger, "select public.read_lap_proof($1)", [
          lap.id,
        ]),
        /private/,
      );
      assert.ok(
        (
          await as(
            "authenticated",
            admin,
            "select public.read_lap_proof($1) as proof",
            [lap.id],
          )
        ).rows[0].proof,
      );
      await assert.rejects(
        as("authenticated", stranger, "select * from private.lap_proofs"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "registration metadata creates complete drivers and display names follow profile edits",
    async () => {
      const id = "77777777-7777-4777-8777-777777777777";
      await root(
        'insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,\'{"provider":"email"}\',\'{"username":"New Racer","country_code":"CA"}\')',
        [id],
      );
      assert.equal(
        (
          await root("select is_registered from public.drivers where id=$1", [
            id,
          ])
        ).rows[0].is_registered,
        true,
      );
      assert.equal(
        (
          await root(
            "select raw_user_meta_data->>'full_name' as name from auth.users where id=$1",
            [id],
          )
        ).rows[0].name,
        "New Racer",
      );
      await as(
        "authenticated",
        id,
        "update public.drivers set username='Renamed Racer' where id=$1",
        [id],
      );
      assert.equal(
        (
          await root(
            "select raw_user_meta_data->>'display_name' as name from auth.users where id=$1",
            [id],
          )
        ).rows[0].name,
        "Renamed Racer",
      );
      await assert.rejects(
        root(
          'insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values(gen_random_uuid(),\'{"provider":"email"}\',\'{"username":"Bad Racer","country_code":"XX"}\')',
        ),
        /username and country/,
      );
    },
  );
  await t.test(
    "deletion protects roles, locks writes immediately and cascades only the chosen racing account",
    async () => {
      const id = "77777777-7777-4777-8777-777777777777";
      await assert.rejects(
        as(
          "authenticated",
          incomplete,
          "select public.prepare_driver_deletion($1,'Renamed Racer')",
          [id],
        ),
        /Admin access/,
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.prepare_driver_deletion($1,'Admin')",
          [admin],
        ),
        /protected/,
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.prepare_driver_deletion($1,'Developer')",
          [owner],
        ),
        /protected/,
      );
      await root(
        "insert into private.admin_users(user_id) values($1) on conflict do nothing",
        [other],
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.prepare_driver_deletion($1,'Admin')",
          [other],
        ),
        /Developer/,
      );
      await assert.rejects(
        as(
          "authenticated",
          admin,
          "select public.prepare_driver_deletion($1,'Wrong name')",
          [id],
        ),
        /username exactly/,
      );
      await root(
        "insert into public.event_registrations(event_id,driver_id) values($1,$2)",
        [eid, id],
      );
      const lap = (await as("authenticated", id, lapSQL, [id, tid, "Soft"]))
        .rows[0].id;
      const session = (
        await root(
          "insert into public.event_sessions(event_id,kind,name,sort_order) values($1,'race','Deletion Test',20) returning id",
          [eid],
        )
      ).rows[0].id;
      await root(
        "insert into public.event_session_results(session_id,driver_id,position,race_time) values($1,$2,9,'DNF')",
        [session, id],
      );
      await as(
        "authenticated",
        admin,
        "select public.prepare_driver_deletion($1,'Renamed Racer')",
        [id],
      );
      assert.equal(
        (
          await as(
            "authenticated",
            id,
            "update public.drivers set username='Escape' where id=$1 returning id",
            [id],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        as(
          "authenticated",
          id,
          "insert into storage.objects(bucket_id,name) values('driver-media',$1)",
          [id + "/new.png"],
        ),
        /row-level security/,
      );
      await root("delete from auth.users where id=$1", [id]);
      assert.equal(
        (await root("select id from public.drivers where id=$1", [id])).rows
          .length,
        0,
      );
      assert.equal(
        (await root("select id from public.laps where id=$1", [lap])).rows
          .length,
        0,
      );
      assert.equal(
        (
          await root("select lap_id from private.lap_proofs where lap_id=$1", [
            lap,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await root(
            "select driver_id from public.event_registrations where driver_id=$1",
            [id],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await root(
            "select driver_id from public.event_session_results where driver_id=$1",
            [id],
          )
        ).rows.length,
        0,
      );
      assert.ok(
        (await root("select id from public.drivers where id=$1", [owner])).rows
          .length,
      );
      await assert.rejects(
        as(
          "authenticated",
          id,
          "insert into storage.objects(bucket_id,name) values('driver-media',$1)",
          [id + "/stale-token.png"],
        ),
        /row-level security/,
      );
    },
  );
  await pg.close();
});
