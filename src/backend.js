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
  badges: [],
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
      event_session_results: ["session_id", "driver_id"],
      driver_badges: ["driver_id", "badge_key"],
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
export async function registerWithEmail(email, password, profile = {}) {
  if (!client) throw Error("Account registration is unavailable right now.");
  if (password.length < 8)
    throw Error("Choose a password with at least 8 characters.");
  const name = (profile.name || "").trim();
  if (name.length < 3 || name.length > 32)
    throw Error("Choose a username between 3 and 32 characters.");
  if (!countries.some((c) => c.code === profile.countryCode))
    throw Error("Choose a country from the list.");
  return check(
    await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: name,
          full_name: name,
          display_name: name,
          country_code: profile.countryCode,
        },
      },
    }),
  );
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
    "event_sessions",
    "event_session_results",
    "driver_badges",
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
    sessions,
    sessionResults,
    badges,
  ] = await Promise.all(names.map(rows));
  const roles = check(await client.rpc("driver_roles"));
  return {
    version: 1,
    roles,
    badges,
    creators: creators.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    ),
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
      sessions: sessions
        .filter((s) => s.event_id === v.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          id: s.id,
          kind: s.kind,
          name: s.name,
          results: sessionResults
            .filter((r) => r.session_id === s.id)
            .map((r) => ({
              driver: r.driver_id,
              position: r.position,
              time: r.race_time || "",
              ms: r.lap_ms,
            })),
        })),
      results: results
        .filter((r) => r.event_id === v.id)
        .map((r) => ({
          driver: r.driver_id,
          position: r.race_position,
          time: r.race_time,
          qualifying: r.qualifying_ms ? formatLap(r.qualifying_ms) : "",
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
      storagePath: l.proof_storage_path || "",
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
      await client.rpc("admin_save_event_details", {
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
      }),
    );
    return;
  }
  const table = kind === "creator" ? "creators" : "tracks",
    record =
      kind === "creator"
        ? {
            id: o.id,
            name: o.name,
            description: o.description,
            avatar_url: o.avatar_url || "",
            sort_order: o.sort_order ?? 0,
          }
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
      proof_url: l.storagePath ? "" : l.proof,
      proof_storage_path: l.storagePath || null,
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

export async function reorderCreators(ids) {
  check(await client.rpc("reorder_creators", { p_ids: ids }));
}
export async function setBadges(driverId, badges) {
  check(
    await client.rpc("admin_set_badges", {
      p_driver_id: driverId,
      p_badges: badges,
    }),
  );
}
export async function saveSessions(eventId, sessions) {
  check(
    await client.rpc("admin_save_sessions", {
      p_event_id: eventId,
      p_sessions: sessions.map((s) => ({
        kind: s.kind,
        name: s.name,
        results: s.results.map((r) => ({
          driver_id: r.driver,
          lap_ms: s.kind === "qualifying" ? r.ms : null,
          race_time: s.kind === "race" ? r.time : null,
        })),
      })),
    }),
  );
}
export async function uploadCreatorAvatar(file) {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
    file.type
  ];
  if (!ext || !file.size || file.size > 5242880)
    throw Error("Choose a PNG, JPEG or WebP image under 5 MB.");
  const path = identity.user.id + "/" + crypto.randomUUID() + "." + ext;
  check(
    await client.storage
      .from("creator-media")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return client.storage.from("creator-media").getPublicUrl(path).data.publicUrl;
}
export async function uploadLapClip(file) {
  const ext = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  }[file.type];
  if (!ext || !file.size || file.size > 52428800)
    throw Error(
      "Choose an MP4, WebM or MOV video up to 50 MB, or use a video link.",
    );
  const path = identity.user.id + "/" + crypto.randomUUID() + "." + ext;
  check(
    await client.storage
      .from("lap-clips")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return path;
}
export async function removeUnusedClip(path) {
  return client.storage.from("lap-clips").remove([path]);
}
export async function clipURL(path) {
  return check(
    await client.storage.from("lap-clips").createSignedUrl(path, 3600),
  ).signedUrl;
}

export async function readLapProof(id) {
  const proof = check(await client.rpc("read_lap_proof", { p_lap_id: id }));
  return {
    proof: proof.proof_url || "",
    storagePath: proof.proof_storage_path || "",
  };
}
export async function deleteDriver(id, confirmation) {
  const { data, error } = await client.functions.invoke("admin-delete-driver", {
    body: { driverId: id, confirmation },
  });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {}
    throw Error(message);
  }
  if (!data?.deleted)
    throw Error(data?.error || "Unable to delete this driver.");
}
