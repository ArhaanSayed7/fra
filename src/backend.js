import { createClient } from "@supabase/supabase-js";
import { countries, flag } from "./countries.js";
import { formatLap, parseLap } from "./data.js";
const config = window.FRA_CONFIG || {};
export const demo = config.demo === true;
export const client =
  config.supabaseUrl && config.supabaseKey
    ? createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
export const identity = { user: null, admin: false, developer: false };
export const emptyDatabase = () => ({
  version: 1,
  creators: [],
  tracks: [],
  drivers: [],
  events: [],
  laps: [],
  registrations: [],
  statistics: [],
  history: [],
  roles: [],
});
function check(result) {
  if (result.error) throw result.error;
  return result.data;
}
async function rows(table) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    let query = client.from(table).select("*");
    const keys = {
      event_results: ["event_id", "driver_id"],
      event_registrations: ["event_id", "driver_id"],
      driver_statistics: ["driver_id"],
      driver_event_history: ["event_id", "driver_id"],
      track_records: ["track_id"],
    }[table] || ["id"];
    for (const key of keys) query = query.order(key);
    const data = check(await query.range(from, from + 999));
    all.push(...data);
    if (data.length < 1000) return all;
  }
}
export async function initialize() {
  if (!client) return;
  const url = new URL(location.href),
    code = url.searchParams.get("code"),
    error = url.searchParams.get("error_description");
  if (error) {
    history.replaceState(null, "", location.pathname + "#account");
    throw Error(error);
  }
  if (code) {
    check(await client.auth.exchangeCodeForSession(code));
    const saved = sessionStorage.getItem("fra-return");
    const next = saved?.startsWith("#") ? saved : "#account";
    sessionStorage.removeItem("fra-return");
    history.replaceState(null, "", location.pathname + next);
  }
  const session = check(await client.auth.getSession());
  identity.user = session.session?.user || null;
  if (identity.user) {
    identity.user = check(await client.auth.getUser()).user;
    identity.admin = check(await client.rpc("is_admin")) === true;
    identity.developer = check(await client.rpc("is_developer")) === true;
  } else {
    identity.admin = false;
    identity.developer = false;
  }
}
export function watchAuth(callback) {
  if (client)
    client.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event))
        setTimeout(callback, 0);
    });
}
export async function signIn() {
  if (!client) throw Error("Discord registration is coming soon.");
  sessionStorage.setItem(
    "fra-return",
    location.hash.startsWith("#admin")
      ? "#admin"
      : location.hash.startsWith("#submit") ||
          location.hash.startsWith("#event/")
        ? location.hash
        : "#account",
  );
  check(
    await client.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: location.origin + location.pathname },
    }),
  );
}
export async function signInWithEmail(email, password) {
  if (!client) throw Error("Account sign-in is unavailable right now.");
  return check(
    await client.auth.signInWithPassword({ email: email.trim(), password }),
  );
}
export async function registerWithEmail(email, password) {
  if (!client) throw Error("Account registration is unavailable right now.");
  if (password.length < 8)
    throw Error("Choose a password with at least 8 characters.");
  return check(await client.auth.signUp({ email: email.trim(), password }));
}
export async function setPassword(password) {
  if (!client || !identity.user) throw Error("Sign in first.");
  if (password.length < 8)
    throw Error("Choose a password with at least 8 characters.");
  check(await client.auth.updateUser({ password }));
}
export async function signOut() {
  if (client) check(await client.auth.signOut());
  identity.user = null;
  identity.admin = false;
  identity.developer = false;
}
export async function loadRemote() {
  const names = [
    "creators",
    "tracks",
    "drivers",
    "events",
    "laps",
    "event_results",
    "event_registrations",
    "driver_statistics",
    "driver_event_history",
    "track_records",
  ];
  const [
    creators,
    tracks,
    drivers,
    events,
    laps,
    results,
    registrations,
    statistics,
    eventHistory,
    records,
  ] = await Promise.all(names.map(rows));
  const roles = check(await client.rpc("driver_roles"));
  return {
    version: 1,
    roles,
    creators,
    tracks: tracks.map((t) => ({
      id: t.id,
      creator: t.creator_id,
      name: t.name,
      code: t.map_code,
      released: t.released_on,
      image: t.hero_image_url,
      description: t.description,
      weather: t.weather,
      cars: t.car_classes,
      hasTires: t.has_tires,
      tires: t.tire_compounds,
    })),
    drivers: drivers.map((d) => ({
      id: d.id,
      name: d.username,
      countryCode: d.country_code,
      country: countries.find((c) => c.code === d.country_code)?.name || "",
      flag: flag(d.country_code),
      avatar: d.avatar_url,
      banner: d.banner_url,
      bio: d.bio,
      number: d.race_number,
      registered: d.created_at.slice(0, 10),
      active: d.is_active,
      complete: d.is_registered,
    })),
    events: events.map((v) => ({
      id: v.id,
      track: v.track_id,
      name: v.name,
      date: v.event_date,
      qualifying: v.qualifying_time.slice(0, 5),
      race: v.race_time.slice(0, 5),
      timezone: v.timezone,
      laps: v.laps,
      round: v.round,
      status: v.status,
      description: v.description,
      registrationOpen: v.registration_open,
      results: results
        .filter((r) => r.event_id === v.id)
        .map((r) => ({
          driver: r.driver_id,
          position: r.race_position,
          time: r.race_time,
          qualifying: formatLap(r.qualifying_ms),
        })),
    })),
    laps: laps.map((l) => ({
      id: l.id,
      driver: l.driver_id,
      track: l.track_id,
      weather: l.weather,
      car: l.car_class,
      custom: l.custom_car,
      tire: l.tire_compound || "",
      ms: l.lap_ms,
      proof: l.proof_url,
      status: l.status,
      reason: l.review_note,
      date: l.created_at.slice(0, 10),
    })),
    registrations,
    statistics,
    history: eventHistory,
    records,
  };
}
export async function saveEntity(kind, o) {
  if (kind === "driver") {
    check(
      await client.rpc("admin_update_driver", {
        p_id: o.id,
        p_profile: {
          username: o.name,
          country_code: o.countryCode,
          avatar_url: o.avatar || "",
          banner_url: o.banner || "",
          bio: o.bio || "",
          race_number: o.number || "",
          is_active: o.active,
          created_at: o.registered + "T12:00:00Z",
        },
      }),
    );
    return;
  }
  if (kind === "event") {
    check(
      await client.rpc("admin_save_event", {
        p_event: {
          id: o.id,
          track_id: o.track,
          name: o.name,
          event_date: o.date,
          qualifying_time: o.qualifying,
          race_time: o.race,
          timezone: "America/Toronto",
          laps: o.laps,
          round: o.round,
          status: o.status,
          description: o.description,
          registration_open: o.registrationOpen,
        },
        p_results: o.results.map((r) => ({
          driver_id: r.driver,
          race_position: r.position,
          race_time: r.time,
          qualifying_ms: parseLap(r.qualifying),
        })),
      }),
    );
    return;
  }
  const table = kind === "creator" ? "creators" : "tracks",
    record =
      kind === "creator"
        ? { id: o.id, name: o.name, description: o.description }
        : {
            id: o.id,
            creator_id: o.creator,
            name: o.name,
            map_code: o.code,
            released_on: o.released,
            hero_image_url: o.image,
            description: o.description,
            weather: o.weather,
            car_classes: o.cars,
            has_tires: o.hasTires,
            tire_compounds: o.tires,
          };
  check(await client.from(table).upsert(record));
}
export async function deleteEntity(kind, id) {
  check(
    await client
      .from({ creator: "creators", track: "tracks", event: "events" }[kind])
      .delete()
      .eq("id", id),
  );
}
export async function reviewLap(id, status, note = "") {
  check(
    await client.rpc("review_lap", {
      p_id: id,
      p_status: status,
      p_note: note,
    }),
  );
}
export async function submitLap(l) {
  check(
    await client.from("laps").insert({
      driver_id: identity.user.id,
      track_id: l.track,
      weather: l.weather,
      car_class: l.car,
      custom_car: l.custom,
      tire_compound: l.tire || null,
      lap_ms: l.ms,
      proof_url: l.proof,
    }),
  );
}
export async function registerEvent(id, cancel = false) {
  if (cancel)
    check(
      await client
        .from("event_registrations")
        .delete()
        .eq("event_id", id)
        .eq("driver_id", identity.user.id),
    );
  else
    check(
      await client
        .from("event_registrations")
        .insert({ event_id: id, driver_id: identity.user.id }),
    );
}
export async function uploadMedia(file, kind) {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
    file.type
  ];
  if (!ext || file.size > 5242880)
    throw Error("Choose a PNG, JPEG or WebP image under 5 MB.");
  const path =
    identity.user.id + "/" + kind + "-" + crypto.randomUUID() + "." + ext;
  check(
    await client.storage
      .from("driver-media")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return client.storage.from("driver-media").getPublicUrl(path).data.publicUrl;
}
export async function saveProfile(p) {
  check(
    await client
      .from("drivers")
      .update({
        username: p.name,
        country_code: p.countryCode,
        avatar_url: p.avatar || "",
        banner_url: p.banner || "",
        bio: p.bio || "",
        race_number: p.number || "",
      })
      .eq("id", identity.user.id)
      .select("id")
      .single(),
  );
}

export async function setDriverAdmin(driverId, enabled) {
  if (!client || !identity.developer) throw Error("Developer access required.");
  check(
    await client.rpc("set_driver_admin", {
      p_driver_id: driverId,
      p_enabled: enabled,
    }),
  );
}
