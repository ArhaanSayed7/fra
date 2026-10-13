import {
  TIRES,
  load,
  save,
  uid,
  formatLap,
  parseLap,
  date,
  esc as e,
  safeURL,
} from "./data.js";
import { countries, findCountry, flag } from "./countries.js";
import * as backend from "./backend.js";
import { carScene } from "./car.js";
import { enhanceControls, titleMotion } from "./ui.js";
import { leaderboardSetup } from "./leaderboard-filters.js";
import { sessionsForEvent, normalizeSessions } from "./event-sessions.js";
import { finishBoot, pageTransition } from "./ui.js";
import { achievements, roleFor } from "./driver-badges.js";
const demo = backend.demo,
  live = !!backend.client;
let db = demo ? load() : backend.emptyDatabase(),
  loading = live,
  loadError = "",
  refreshing = false,
  refreshQueued = false,
  writeBusy = false;
const canAdmin = () => demo || backend.identity.admin;
const currentDriver = () =>
  db.drivers.find((d) => d.id === backend.identity.user?.id);
let cleanTitle = () => {},
  cleanCar = () => {},
  adminTab = "overview",
  session = {},
  boardFilters = {
    creator: "",
    track: "",
    weather: "Dry",
    car: "Prevalents",
    custom: "",
    tire: "",
  },
  driverSearch = "",
  driverSort = "name",
  adminPreview = false,
  authMode = "login",
  authEmail = "",
  authNotice = "";
const $ = (s) => document.querySelector(s),
  app = $("#app"),
  modal = $("#modal");
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
const track = (id) => db.tracks.find((t) => t.id === id),
  driver = (id) => db.drivers.find((d) => d.id === id),
  creator = (id) => db.creators.find((c) => c.id === id);
const avatar = (d) =>
  d?.avatar && safeURL(d.avatar)
    ? `<img class="avatar" src="${e(safeURL(d.avatar))}" alt="" loading="lazy">`
    : `<span class="avatar">${e((d?.name || "?").slice(0, 2).toUpperCase())}</span>`;
const driverCell = (d) =>
  d
    ? `<button class="driver-name driver-link" data-action="profile" data-id="${e(d.id)}">${avatar(d)}<span>${e(d.name)}${badges(d.id, true)}</span></button>`
    : "Removed driver";
const options = (items, selected = "", empty = "") =>
  `${empty ? `<option value="">${e(empty)}</option>` : ""}${items
    .map((x) => {
      let [v, l] = Array.isArray(x) ? x : [x, x];
      return `<option value="${e(v)}" ${v === selected ? "selected" : ""}>${e(l)}</option>`;
    })
    .join("")}`;
const image = (t) => e(safeURL(t?.image) || "assets/coast.svg");
const notice = () =>
  demo
    ? '<div class="notice">Design preview · Drivers, events and records are sample data. Changes stay in this browser.</div>'
    : !live
      ? '<div class="notice">The FRA paddock is getting ready. Driver registration opens soon.</div>'
      : "";
function toast(s) {
  $("#toast").className = "toast";
  $("#toast").textContent = s;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    $("#toast").className = "";
    $("#toast").textContent = "";
  }, 3500);
}
function commit() {
  try {
    save(db);
    return true;
  } catch {
    db = load();
    toast("Unable to save. Browser storage may be full or unavailable.");
    return false;
  }
}
function showModal(title, body, className = "") {
  if (modal.open) modal.close();
  modal.className = className;
  modal.setAttribute("aria-labelledby", "dialog-title");
  modal.innerHTML = `<div class="modal-head"><h3 id="dialog-title">${e(title)}</h3><button class="close" data-action="close" aria-label="Close dialog">×</button></div>${body}`;
  modal.scrollTop = 0;
  modal.showModal();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    modal.animate(
      [
        { opacity: 0, transform: "translateY(22px) scale(.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 330, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  enhanceControls(modal);
}
function closeModal() {
  modal.close();
  modal.innerHTML = "";
}
modal.addEventListener("click", (ev) => {
  if (ev.target === modal) closeModal();
});
function chrome(page) {
  const registered = currentDriver()?.complete === true;
  $("#header").innerHTML =
    `<a class="brand" href="#home" aria-label="Fortnite Racing Association home"><img src="assets/fra-logo.png" alt="FRA"><span>FORTNITE RACING<br>ASSOCIATION</span></a><nav class="nav" aria-label="Main navigation">${[
      ["home", "Home"],
      ["events", "Events"],
      ["time-trials", "Time trials"],
      ["tracks", "Tracks"],
      ["drivers", "Drivers"],
    ]
      .map(
        ([id, name]) =>
          `<a class="${page === id || (page === "track" && id === "tracks") || (page === "event" && id === "events") || (page === "history" && id === "events") ? "active" : ""}" href="#${id}">${name}</a>`,
      )
      .join(
        "",
      )}${canAdmin() ? '<a class="mobile-admin" href="#admin">Admin Panel ↗</a>' : ""}</nav><div class="nav-actions">${canAdmin() ? '<a class="text-button admin-link" href="#admin">Admin Panel</a>' : ""}<a class="text-button submit-link" href="#submit">Submit Lap</a><a class="button nav-primary" href="#account" ${!registered ? 'data-action="register"' : ""}>${registered ? "MY PROFILE" : "REGISTER NOW"} ${arrow}</a><button class="menu-button" data-action="menu" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span></button></div>`;
  $("#footer").innerHTML =
    `<div class="footer-top"><a class="brand" href="#home"><img src="assets/fra-logo.png" alt="FRA"><span>FORTNITE RACING<br>ASSOCIATION</span></a><div class="footer-links"><a href="#events">Events</a><a href="#time-trials">Time trials</a><a href="#tracks">Tracks</a><a href="#drivers">Drivers</a><a href="#history">Event history</a><a href="#admin">Admin Panel ↗</a></div></div><div class="footer-bottom"><span>© 2026 Fortnite Racing Association.<br>Independent community. Not affiliated with Epic Games.</span><span>COMMUNITY BUILT.<br>RACE READY.</span></div>`;
}
function eventCard(ev) {
  let t = track(ev.track),
    mode = session[ev.id] || "race";
  return `<article class="event-card"><a href="#event/${e(ev.id)}" class="event-image" style="display:block"><img src="${image(t)}" alt="${e(t?.name)} concept circuit"><span class="tag">${ev.status === "past" ? "COMPLETED" : "UPCOMING"}</span><span class="round">R${e(ev.round)}</span></a><div class="event-content"><div class="event-meta"><span>${e(date(ev.date).toUpperCase())}</span><span>·</span><span>${e(t?.name?.toUpperCase())}</span></div><h3><a href="#event/${e(ev.id)}">${e(ev.name)}</a></h3><div class="event-bottom"><div class="session-toggle" aria-label="Session for ${e(ev.name)}">${["qualifying", "race"].map((s) => `<button data-action="session" data-id="${e(ev.id)}" data-mode="${s}" class="${mode === s ? "selected" : ""}" aria-pressed="${mode === s}">${s === "race" ? "Race" : "Qualifying"}</button>`).join("")}</div><span class="tiny muted">${e(ev.laps)} LAPS</span></div><div class="event-time"><span>${mode === "race" ? "Lights out" : "Qualifying starts"}</span><strong>${e(ev[mode])} <span>TORONTO</span></strong><a href="#event/${e(ev.id)}" aria-label="View ${e(ev.name)}">${arrow}</a></div></div></article>`;
}
function home() {
  let featuredTrack = db.tracks[0];
  let laps = db.laps
    .filter(
      (l) =>
        l.track === featuredTrack?.id &&
        l.status === "approved" &&
        l.weather === "Dry" &&
        l.car === "Prevalents",
    )
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 3);
  return `<section class="hero"><div class="hero-top"><span class="hero-pill"><i class="live-dot"></i>COMMUNITY BUILT. RACE READY.</span><span class="tiny muted">FORTNITE RACING ASSOCIATION</span></div><svg class="effect-defs" aria-hidden="true"><defs><filter id="liquid-ink"><feTurbulence type="fractalNoise" baseFrequency=".024 .055" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg><h1 class="hero-title"><span class="title-line">FIND YOUR</span><span class="title-line accent">LIMIT.</span><span class="ink-layer" aria-hidden="true"><span>FIND YOUR</span><span>LIMIT.</span></span></h1><div class="hero-aura" aria-hidden="true"></div><div class="orbit" aria-hidden="true"></div><div class="car-stage" aria-label="Interactive 3D Prevalent car. Move your pointer or drag to rotate."><div class="load-state tiny">LOADING THE PREVALENT…</div></div><div class="hero-bottom"><div class="hero-copy"><p>A better line. A faster lap. Your next great race.<br> Welcome to the home of Fortnite racing.</p><div class="hero-controls"><a class="button" href="#events">EXPLORE EVENTS ${arrow}</a><a class="text-button" href="#time-trials">Time trials ${arrow}</a></div></div><div class="hero-status"><span class="tiny muted">YOUR GRID IS WAITING</span><div><strong>${db.drivers.filter((d) => d.complete !== false).length}<small>Drivers</small></strong><strong>${db.tracks.length}<small>Circuits</small></strong></div><button id="motion" class="motion-control" aria-pressed="false">Ⅱ Pause motion</button></div></div></section><div class="ticker" aria-hidden="true"><div class="ticker-inner">${Array.from({ length: 4 }, () => "<span>RACE TOGETHER</span><b>✦</b><span>CHASE THE CLOCK</span><b>✦</b><span>FIND YOUR LIMIT</span><b>✦</b>").join("")}</div></div><section class="section"><div class="section-head"><div><div class="eyebrow">THE RACE CALENDAR</div><h2>NEXT ON THE GRID.</h2></div><a class="text-button" href="#events">ALL EVENTS ${arrow}</a></div><div class="event-grid">${
    db.events
      .filter((x) => x.status === "upcoming")
      .slice(0, 3)
      .map(eventCard)
      .join("") || '<div class="empty">The next calendar is on its way.</div>'
  }</div></section><section class="section soft"><div class="split"><div><div class="eyebrow">THE CLOCK DOESN’T LIE</div><div class="large-copy">ONE TRACK.<br>ONE SHOT.<br><span class="yellow">YOUR BEST LAP.</span></div><p class="body-copy">Find your line. Perfect your braking point. Put your name on the board. Time trials are where the smallest margins make the biggest difference.</p><a class="button" href="#time-trials">CHASE THE LEADERBOARD ${arrow}</a></div><div><div class="section-head"><div><div class="eyebrow">LAP RECORDS</div><h3>${e(featuredTrack?.name || "THE NEXT RECORD IS YOURS")}</h3><span class="tiny muted">DRY · PREVALENTS</span></div><span class="tag">TIME ATTACK</span></div><div class="mini-board">${laps.map((l, i) => `<div class="board-row"><span class="number ${i === 0 ? "yellow" : ""}">0${i + 1}</span>${driverCell(driver(l.driver))}<span class="lap ${i === 0 ? "yellow" : ""}">${formatLap(l.ms)}</span></div>`).join("")}</div><p class="helper" style="margin-top:18px">Every submission requires video proof and admin approval.</p></div></div></section><section class="community-strip"><div><div class="tiny" style="margin-bottom:13px">YOUR GRID. YOUR COMMUNITY.</div><h2>THERE’S A PLACE FOR YOU HERE.</h2></div><a href="#drivers" class="outline">MEET THE DRIVERS ${arrow}</a></section>`;
}
function pageHeading(eyebrow, title, desc = "", action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1>${desc ? `<p>${desc}</p>` : ""}</div>${action}</div>`;
}
function events(past = false) {
  return `<section class="page">${pageHeading(past ? "THE ARCHIVE" : "THE RACE CALENDAR", past ? "RACES REMEMBERED." : "YOUR NEXT CHALLENGE.", past ? "Every chequered flag has a story. Explore past events and switch between qualifying and race results." : "Find your next grid. Switch each event between qualifying and race sessions to plan your evening.", `<a class="outline" href="#${past ? "events" : "history"}">${past ? "UPCOMING EVENTS" : "EVENT HISTORY"} ${arrow}</a>`)}${notice()}<div class="event-grid">${
    db.events
      .filter((ev) => ev.status === (past ? "past" : "upcoming"))
      .sort((a, b) =>
        past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
      )
      .map(eventCard)
      .join("") ||
    '<div class="empty">No events here yet. Check back for the next race.</div>'
  }</div></section>`;
}
function eventPage(id) {
  let ev = db.events.find((x) => x.id === id);
  if (!ev) return notFound();
  let t = track(ev.track),
    mode = session[id] || "race";
  let results = [...(ev.results || [])].sort((a, b) => a.position - b.position);
  if (mode === "qualifying")
    results.sort(
      (a, b) =>
        parseLap(a.qualifying) - parseLap(b.qualifying) ||
        a.driver.localeCompare(b.driver),
    );
  return `<section class="page">${pageHeading("ROUND " + e(ev.round), e(ev.name), e(ev.description), '<a class="text-button" href="#events">← BACK TO EVENTS</a>')}${notice()}<div class="event-detail"><img src="${image(t)}" alt="${e(t?.name)} concept circuit"><div><span class="tag">${ev.status === "past" ? "COMPLETED" : "UPCOMING"}</span><h3 style="margin-top:25px"><a href="#track/${e(t?.id)}">${e(t?.name)} ↗</a></h3>${canAdmin() ? `<button class="text-button" data-action="event-results" data-id="${e(id)}">ENTER RESULTS ↗</button>` : ""}<div class="session-toggle">${["qualifying", "race"].map((s) => `<button data-action="session" data-id="${e(id)}" data-mode="${s}" class="${mode === s ? "selected" : ""}" aria-pressed="${mode === s}">${s === "race" ? "Race" : "Qualifying"}</button>`).join("")}</div><div class="detail-list"><div><span>DATE</span><strong>${date(ev.date)}</strong></div><div><span>${mode === "race" ? "LIGHTS OUT" : "SESSION START"}</span><strong>${e(ev[mode])} · Toronto</strong></div><div><span>RACE DISTANCE</span><strong>${e(ev.laps)} laps</strong></div><div><span>MAP CODE</span><strong>${e(t?.code)}</strong></div></div>${eventRegistration(ev)}</div></div>${resultTables(ev, mode)}</section>`;
}
const badgeIcons = {
  developer: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  admin:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  winner:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v5m-4 2h8M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4"/>',
  pole: '<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  map_developer:
    '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  record:
    '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v5l3 2m4-13 2 2"/>',
};
function badges(id, compact = false) {
  const role = roleFor(db, id),
    a = achievements(db, id),
    items = [];
  const manual = new Set(
    (db.badges || []).filter((b) => b.driver_id === id).map((b) => b.badge_key),
  );
  if (role === "developer") items.push(["developer", "Developer", 0]);
  else if (role === "admin") items.push(["admin", "Admin", 0]);
  if (manual.has("map_developer"))
    items.push(["map_developer", "Map Developer", 0]);
  if (!compact) {
    if (a.wins || manual.has("winner"))
      items.push(["winner", "Event Winner", a.wins]);
    if (a.poles || manual.has("pole"))
      items.push(["pole", "Event Pole", a.poles]);
    if (a.records || manual.has("record"))
      items.push(["record", "Lap Record", a.records]);
  }
  return items.length
    ? `<span class="driver-badges ${compact ? "compact-badges" : ""}">${items.map(([kind, label, n]) => `<span class="driver-badge badge-${kind}" title="${label}${n ? " · " + n : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${badgeIcons[kind]}</svg><span>${label}</span>${n > 1 ? `<b>${n}</b>` : ""}</span>`).join("")}</span>`
    : "";
}
function cover(d) {
  return `<div class="profile-cover ${d.banner && safeURL(d.banner) ? "has-banner" : ""}">${d.banner && safeURL(d.banner) ? `<img src="${e(safeURL(d.banner))}" alt="${e(d.name)} profile banner" loading="lazy">` : '<div class="cover-orbit"></div><img class="cover-mark" src="assets/fra-logo.png" alt="">'}</div>`;
}
function drivers() {
  const items = db.drivers
    .filter((d) => d.complete !== false)
    .filter((d) =>
      (d.name + " " + d.country)
        .toLowerCase()
        .includes(driverSearch.toLowerCase()),
    );
  items.sort((a, b) =>
    driverSort === "newest"
      ? b.registered.localeCompare(a.registered)
      : driverSort === "oldest"
        ? a.registered.localeCompare(b.registered)
        : a.name.localeCompare(b.name),
  );
  return `<section class="page">${pageHeading("THE DRIVERBASE", "MEET YOUR GRID.", "Different racing lines. One shared obsession.")}${notice()}<div class="filters driver-filters"><div class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="driver-search" aria-label="Search drivers by name or country" placeholder="Search drivers or countries…" value="${e(driverSearch)}"></div><select id="driver-sort" aria-label="Sort drivers">${options(
    [
      ["name", "Name: A–Z"],
      ["newest", "Newest registered"],
      ["oldest", "Oldest registered"],
    ],
    driverSort,
  )}</select><span class="tiny muted">${items.length} DRIVERS</span></div><div class="driver-directory" role="list" aria-label="Registered drivers">${
    items
      .map((d) => {
        const a = achievements(db, d.id),
          stats = db.statistics?.find((s) => s.driver_id === d.id);
        return `<article role="listitem"><button class="driver-row" data-action="profile" data-id="${e(d.id)}" aria-label="View ${e(d.name)}'s driver profile">${avatar(d)}<span class="driver-row-identity"><strong>${e(d.name)}</strong><small>${e(d.flag)} ${e(d.country)}${d.number ? " · #" + e(d.number) : ""}</small></span><span class="driver-row-badges">${badges(d.id)}</span><span class="driver-row-stats"><span><b>${stats?.events_entered ?? historyForDriver(d.id).length}</b><small>Events</small></span><span><b>${a.wins}</b><small>Wins</small></span><span><b>${a.records}</b><small>Records</small></span></span><span class="driver-row-arrow">${arrow}</span></button></article>`;
      })
      .join("") || '<div class="empty">No drivers match your search.</div>'
  }</div></section>`;
}
function bestLaps() {
  let map = new Map();
  for (let l of db.laps.filter((l) => l.status === "approved")) {
    const key = [
      l.driver,
      l.track,
      l.weather,
      l.car,
      l.custom?.toLowerCase(),
      l.tire || "",
    ].join("|");
    if (!map.has(key) || map.get(key).ms > l.ms) map.set(key, l);
  }
  return [...map.values()].sort((a, b) => a.ms - b.ms);
}
function board() {
  const setup = leaderboardSetup(db.tracks, boardFilters);
  Object.assign(boardFilters, setup.filters);
  const f = boardFilters,
    tracks = setup.tracks;
  let records = bestLaps().filter(
    (l) =>
      (!f.creator || track(l.track)?.creator === f.creator) &&
      (!f.track || l.track === f.track) &&
      (!f.weather || l.weather === f.weather) &&
      (!f.car || l.car === f.car) &&
      (!f.custom || l.custom?.toLowerCase().includes(f.custom.toLowerCase())) &&
      (!f.tire || (f.tire === "none" ? !l.tire : l.tire === f.tire)),
  );
  return `<div class="filters"><label>CREATOR<select data-filter="creator">${options(
    db.creators.map((c) => [c.id, c.name]),
    f.creator,
    "All creators",
  )}</select></label><label>TRACK<select data-filter="track">${options(
    tracks.map((t) => [t.id, t.name]),
    f.track,
    "All tracks",
  )}</select></label>${setup.showWeather ? `<label>WEATHER<select data-filter="weather">${options(setup.weather, f.weather, "All conditions")}</select></label>` : ""}${setup.showCars ? `<label>CAR CLASS<select data-filter="car">${options(setup.cars, f.car, "All cars")}</select></label>` : ""}${
    setup.showTires
      ? `<label>TIRES<select data-filter="tire">${options(
          setup.tires.map((t) => [t, t === "none" ? "No tires" : t]),
          f.tire,
          "All tires",
        )}</select></label>`
      : ""
  }${f.car === "Customs" ? `<label>CUSTOM CAR<input id="custom-filter" placeholder="Filter custom car…" value="${e(f.custom)}"></label>` : ""}</div>${setup.selected ? `<p class="track-setup-note">TRACK SETUP <span>${e([!setup.showWeather ? setup.weather[0] : "", !setup.showCars ? setup.cars[0] : "", !setup.selected.hasTires ? "No tires" : !setup.showTires ? setup.tires[0] : ""].filter(Boolean).join(" · ") || "Choose your conditions above")}</span></p>` : ""}<p class="helper">Rankings are per track, weather, car and tire compound. Filter your setup to compare like-for-like laps.</p><div class="table-wrap"><table><thead><tr><th>Position</th><th>Driver</th><th>Track</th><th>Conditions</th><th>Car</th><th>Tires</th><th>Best lap</th><th>Proof</th></tr></thead><tbody>${
    records
      .map((l) => {
        let group = records.filter(
          (r) =>
            r.track === l.track &&
            r.weather === l.weather &&
            r.car === l.car &&
            r.custom?.toLowerCase() === l.custom?.toLowerCase() &&
            (r.tire || "") === (l.tire || ""),
        );
        let rank = group.findIndex((r) => r.id === l.id) + 1;
        return `<tr><td class="number ${rank === 1 ? "yellow" : ""}">${String(rank).padStart(2, "0")}</td><td>${driverCell(driver(l.driver))}</td><td>${e(track(l.track)?.name)}</td><td>${e(l.weather)}</td><td>${e(l.custom || l.car)}</td><td>${e(tireLabel(l))}</td><td class="lap yellow">${formatLap(l.ms)}</td><td>${l.sample ? '<span class="muted">Sample</span>' : `<button class="text-button" data-action="proof" data-id="${e(l.id)}">WATCH ↗</button>`}</td></tr>`;
      })
      .join("") ||
    '<tr><td colspan="8" class="empty">A clean slate. No approved laps match these filters yet.</td></tr>'
  }</tbody></table></div>`;
}
function tireLabel(l) {
  return l.tire || (track(l.track)?.hasTires ? "Not recorded" : "No tires");
}
function recordForTrack(t) {
  return live
    ? db.laps.find(
        (l) =>
          l.id === (db.records || []).find((r) => r.track_id === t.id)?.lap_id,
      )
    : db.laps
        .filter(
          (l) =>
            l.track === t.id && l.status === "approved" && driver(l.driver),
        )
        .sort(
          (a, b) =>
            a.ms - b.ms ||
            a.date.localeCompare(b.date) ||
            a.id.localeCompare(b.id),
        )[0];
}
function lapRecord(t, compact = false) {
  const record = recordForTrack(t);
  return `<div class="lap-record ${compact ? "compact" : ""}"><div class="eyebrow">LAP RECORD</div>${record ? `<div class="record-main"><strong>${formatLap(record.ms)}</strong>${driverCell(driver(record.driver))}</div><p class="helper">${e(record.weather)} · ${e(record.custom || record.car)} · ${e(tireLabel(record))}${record.sample ? " · Sample record" : ""}</p>${compact ? "" : `<p class="helper">Fastest approved lap across all setups. ${date(record.date)}.</p>${record.sample ? "" : `<button class="text-button" data-action="proof" data-id="${e(record.id)}">WATCH RECORD LAP ↗</button>`}`}` : '<strong class="no-record">Be the first to set the record.</strong><p class="helper">Your fastest approved lap will appear here.</p>'}</div>`;
}
function trackCard(t) {
  const record = recordForTrack(t);
  const availability = [
    t.weather.length === 1
      ? t.weather[0]
      : t.weather.length + " weather options",
    t.cars.length === 1 ? t.cars[0] : t.cars.length + " car classes",
    t.hasTires ? t.tires.length + " tire compounds" : "No tires",
  ];
  return `<article class="track-card track-mini"><a class="track-visual" href="#track/${e(t.id)}"><img src="${image(t)}" alt="${e(t.name)} circuit" loading="lazy"></a><div class="event-content"><div class="track-mini-meta"><span>MAP ${e(t.code)}</span><span>${date(t.released)}</span></div><h3><a href="#track/${e(t.id)}">${e(t.name)}</a></h3><p class="track-availability">${e(availability.join(" · "))}</p><div class="track-mini-record"><span>LAP RECORD</span><strong>${record ? formatLap(record.ms) : "—"}</strong></div><div class="event-bottom"><a class="text-button" href="#track/${e(t.id)}">VIEW TRACK ${arrow}</a>${adminPreview ? `<button class="text-button" data-action="edit-track" data-id="${e(t.id)}">EDIT ↗</button>` : `<a class="text-button" href="#submit/${e(t.id)}">SET A LAP ↗</a>`}</div></div></article>`;
}
function creatorAvatar(c) {
  return c.avatar_url && safeURL(c.avatar_url)
    ? `<img class="avatar creator-avatar" src="${e(safeURL(c.avatar_url))}" alt="${e(c.name)} avatar">`
    : `<span class="avatar creator-avatar">${e(c.name.slice(0, 2).toUpperCase())}</span>`;
}
function trackDirectory() {
  return (
    db.creators
      .map(
        (c) =>
          `<div class="creator-header"><div class="creator-title">${creatorAvatar(c)}<div><h3>${e(c.name)}</h3><p>${e(c.description)}</p></div></div>${adminPreview ? `<button class="outline" data-action="add-track" data-id="${e(c.id)}">+ ADD TRACK</button>` : ""}</div><div class="track-grid">${
            db.tracks
              .filter((t) => t.creator === c.id)
              .map(trackCard)
              .join("") || '<div class="empty">No tracks yet.</div>'
          }</div>`,
      )
      .join("") ||
    '<div class="empty">The circuit directory is on its way.</div>'
  );
}
function tracksPage() {
  return `<section class="page">${pageHeading("THE CIRCUIT DIRECTORY", "KNOW YOUR TRACK.", "Every circuit, every setup, every lap record. The official track list for events and time trials.", canAdmin() ? `<button class="outline" data-action="edit-mode">${adminPreview ? "✓ EXIT EDIT MODE" : "⌘ EDIT TRACKS"}</button>` : "")}${notice()}${trackDirectory()}</section>`;
}
function trackPage(id) {
  const t = track(id);
  if (!t) return notFound();
  return `<section class="page">${pageHeading(e(creator(t.creator)?.name || "COMMUNITY CIRCUIT"), e(t.name), e(t.description), '<a class="text-button" href="#tracks">← ALL TRACKS</a>')}${notice()}<div class="track-detail-layout"><div><img class="track-detail-image" src="${image(t)}" alt="${e(t.name)} concept circuit"><div class="track-facts"><div><span class="tiny muted">MAP CODE</span><strong>${e(t.code)}</strong></div><div><span class="tiny muted">RELEASED</span><strong>${date(t.released)}</strong></div><div><span class="tiny muted">WEATHER</span><div class="track-chips">${t.weather.map((w) => `<span>${e(w)}</span>`).join("")}</div></div><div><span class="tiny muted">ALLOWED CARS</span><div class="track-chips">${t.cars.map((c) => `<span>${e(c)}</span>`).join("")}</div></div><div class="full"><span class="tiny muted">TIRES ON TRACK</span><strong>${t.hasTires ? "Available" : "No tires"}</strong>${t.hasTires ? `<div class="track-chips tire-compounds">${t.tires.map((c) => `<span class="compound ${e(c.toLowerCase())}">${e(c)}</span>`).join("")}</div>` : '<p class="helper">This track does not offer tire selection.</p>'}</div></div></div><aside><div class="form-panel">${lapRecord(t)}<div class="track-detail-actions"><a class="button" href="#submit/${e(t.id)}">SUBMIT A LAP ${arrow}</a><button class="outline" data-action="track-board" data-id="${e(t.id)}">VIEW LEADERBOARD ${arrow}</button>${canAdmin() ? `<button class="text-button" data-action="edit-track" data-id="${e(t.id)}">⌘ EDIT TRACK</button>` : ""}</div></div><div class="rule"><b>↗</b><div><strong>Race this circuit</strong>${
    db.events
      .filter((v) => v.track === t.id && v.status === "upcoming")
      .map(
        (v) =>
          `<a class="text-button" href="#event/${e(v.id)}">${e(v.name)} ↗</a>`,
      )
      .join("") || "No upcoming events on this circuit yet."
  }</div></div></aside></div></section>`;
}
function trials() {
  return `<section class="page">${pageHeading("EVERY MILLISECOND MATTERS", "CHASE THE CLOCK.", "Find your conditions and take your place on the leaderboard.", `<a class="button" href="#submit">SUBMIT A LAP ${arrow}</a>`)}${notice()}<div class="admin-toolbar"><h3>LEADERBOARD</h3><a href="#tracks" class="outline">EXPLORE TRACKS ${arrow}</a></div>${board()}</section>`;
}
function submitPage(id) {
  if (!demo && (!currentDriver()?.complete || !currentDriver()?.active))
    return accountPage("Complete your driver profile to submit a lap.");
  let t = track(id) || db.tracks[0];
  let unavailable = !t || !db.drivers.length;
  return `<section class="page">${pageHeading("PUT YOUR LAP ON THE BOARD", "MAKE YOUR MARK.", "A clean lap. The right conditions. Video proof. Show the grid what you’ve got.")}${notice()}${
    unavailable
      ? '<div class="empty">There are no tracks available for submissions yet.</div>'
      : `<div class="form-layout"><form id="lap-form" class="form-panel"><h3>LAP SUBMISSION</h3><p class="helper" style="margin-bottom:25px">${demo ? "Design preview · Choose a sample driver to test the flow." : "Submitting as " + e(currentDriver()?.name) + ". Your lap goes to the Admin Panel for review."}</p><div class="form-grid"><div class="field full"><label for="lap-driver">DRIVER</label><select id="lap-driver" name="driver" required>${options((demo ? db.drivers : [currentDriver()]).map((d) => [d.id, d.name]))}</select></div><div class="field"><label for="lap-creator">TRACK CREATOR</label><select id="lap-creator" name="creator" required>${options(
          db.creators.map((c) => [c.id, c.name]),
          t.creator,
        )}</select></div><div class="field"><label for="lap-track">TRACK</label><select id="lap-track" name="track" required>${options(
          db.tracks
            .filter((x) => x.creator === t.creator)
            .map((x) => [x.id, x.name]),
          t.id,
        )}</select></div><div class="field"><label for="lap-weather">WEATHER CONDITIONS</label><select id="lap-weather" name="weather" required>${options(t.weather)}</select></div><div class="field"><label for="lap-car">CAR CLASS</label><select id="lap-car" name="car" required>${options(t.cars)}</select></div><div class="field ${t.hasTires ? "" : "hidden"}" id="tire-field"><label for="lap-tire">TIRE COMPOUND</label><select id="lap-tire" name="tire" ${t.hasTires ? "required" : "disabled"}>${options(t.tires, "", "Select a tire compound")}</select><small>Only compounds available on this track can be used.</small></div><div class="field full ${t.cars[0] === "Customs" ? "" : "hidden"}" id="custom-field"><label for="lap-custom">CUSTOM CAR</label><input id="lap-custom" name="custom" list="custom-cars" placeholder="Type the exact car name…" maxlength="80"><datalist id="custom-cars">${[...new Set(db.laps.map((l) => l.custom).filter(Boolean))].map((c) => `<option value="${e(c)}">`).join("")}</datalist><small>Type your car name. The official custom car list can be added later.</small></div><div class="field full"><label for="lap-time">LAP TIME</label><input id="lap-time" name="time" placeholder="1:42.381" pattern="[0-9]{1,2}:[0-5][0-9]\\.[0-9]{3}" required inputmode="decimal"><small>Use M:SS.mmm — minutes, seconds, milliseconds.</small></div><fieldset class="field full proof-picker"><legend class="label">LAP VIDEO · REQUIRED</legend><div class="proof-modes"><label><input type="radio" name="proofMode" value="link" checked> Video link</label><label><input type="radio" name="proofMode" value="upload"> Upload clip</label></div><div id="proof-link-field"><label for="lap-proof">VIDEO LINK</label><input id="lap-proof" name="proof" type="url" placeholder="https://youtube.com/watch?v=…" required><small>Link a viewable, complete lap with the timer visible.</small></div><div id="proof-upload-field" hidden><label for="lap-clip">CHOOSE FROM YOUR DEVICE</label><input id="lap-clip" name="clipFile" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled><small>MP4, WebM or MOV · up to 50 MB. For larger clips, use a video link.</small></div><p class="helper" id="clip-status" role="status"></p></fieldset><div class="checks full"><label><input type="checkbox" name="confirm" required> I confirm this is a complete, unedited lap.</label></div><p id="lap-error" class="error full" role="alert"></p><button class="button full" type="submit">SUBMIT FOR REVIEW ${arrow}</button></div></form><aside><div class="track-card"><div class="track-visual"><img id="submit-image" src="${image(t)}" alt="Selected track concept"></div><div class="event-content"><span class="tiny yellow">YOUR SELECTED CIRCUIT</span><h3 id="submit-track-name" style="margin-top:15px">${e(t.name)}</h3><p id="submit-track-desc">${e(t.description)}</p></div></div><div class="rule"><b>01</b><div><strong>Match your setup</strong>Track, weather, car and tire compound must match the conditions in your video.</div></div><div class="rule"><b>02</b><div><strong>Keep it clean</strong>Record the complete lap with the timer and track visible.</div></div><div class="rule"><b>03</b><div><strong>Wait for the green light</strong>An admin reviews your proof before your best lap reaches the board.</div></div></aside></div>`
  }</section>`;
}
function admin() {
  if (!canAdmin())
    return accountPage("Admin Panel is available to FRA administrators.");
  return `<section class="page">${pageHeading("ADMIN PANEL", "ADMIN PANEL.", "Manage the grid, build the calendar, and keep the competition fair.")}${notice()}<div class="admin-nav">${["overview", "drivers", "events", "creators", "tracks", "submissions", ...(backend.identity.developer ? ["access"] : [])].map((t) => `<button data-action="admin-tab" data-tab="${t}" class="${adminTab === t ? "selected" : ""}">${t[0].toUpperCase() + t.slice(1)}${t === "submissions" ? ` (${db.laps.filter((l) => l.status === "pending").length})` : ""}</button>`).join("")}</div>${adminContent()}</section>`;
}
function adminContent() {
  if (adminTab === "access") {
    if (!backend.identity.developer)
      return '<p class="empty">Developer access required.</p>';
    return `<div class="admin-toolbar"><div><h3>Website access</h3><p class="helper">Choose who can manage drivers, events, tracks and submissions.</p></div><span class="driver-badge badge-developer"><svg viewBox="0 0 24 24" aria-hidden="true">${badgeIcons.developer}</svg>Developer only</span></div><div class="access-list">${db.drivers
      .filter((d) => d.complete)
      .map((d) => {
        const role = roleFor(db, d.id);
        return `<div class="access-row">${driverCell(d)}<span class="muted">${role === "developer" ? "Protected developer" : role === "admin" ? "Administrator" : "Driver"}</span>${role === "developer" ? '<span class="helper">Permanent owner</span>' : `<button class="${role === "admin" ? "outline" : "button"}" data-action="set-admin" data-id="${e(d.id)}" data-enabled="${role !== "admin"}" ${!d.active && role !== "admin" ? "disabled" : ""}>${role === "admin" ? "REMOVE ADMIN" : "MAKE ADMIN"} ↗</button>`}</div>`;
      })
      .join("")}</div>`;
  }

  if (adminTab === "overview")
    return `<div class="admin-stat-grid">${[
      [db.drivers.length, "REGISTERED DRIVERS"],
      [
        db.events.filter((v) => v.status === "upcoming").length,
        "UPCOMING EVENTS",
      ],
      [db.tracks.length, "CIRCUITS"],
      [db.laps.filter((v) => v.status === "pending").length, "AWAITING REVIEW"],
    ]
      .map(
        ([v, l]) =>
          `<div class="admin-stat"><strong>${v}</strong><span>${l}</span></div>`,
      )
      .join(
        "",
      )}</div><div class="form-panel"><h3>YOUR GRID. UNDER CONTROL.</h3><p class="body-copy">Manage driver profiles, schedule events and review lap submissions. Set up creators and their tracks before adding an event.</p><p class="helper">Track editing is also available directly on the Tracks page. Driver stats update from event entries, completed results and approved lap records.</p><a href="#time-trials" class="outline">OPEN TIME TRIALS ${arrow}</a></div>`;
  let cols = [],
    rows = [],
    add = "";
  if (adminTab === "drivers") {
    add = demo ? "add-driver" : "";
    cols = ["Driver", "Country", "Registered", "Actions"];
    rows = db.drivers.map((d) => [
      driverCell(d),
      e(d.country),
      date(d.registered),
      `<button class="text-button" data-action="edit-driver" data-id="${e(d.id)}">Edit ↗</button> <button class="text-button" data-action="edit-badges" data-id="${e(d.id)}">Badges ↗</button> ${demo ? `<button class="text-button danger" data-action="delete-driver" data-id="${e(d.id)}">Remove</button>` : `<span class="pill">${d.active ? "Active" : "Inactive"}</span>`}`,
    ]);
  }
  if (adminTab === "events") {
    add = "add-event";
    cols = ["Event", "Track", "Date", "Status", "Actions"];
    rows = db.events.map((v) => [
      e(v.name),
      e(track(v.track)?.name),
      date(v.date),
      e(v.status),
      `<button class="text-button" data-action="edit-event" data-id="${e(v.id)}">Edit ↗</button> <button class="text-button yellow" data-action="event-results" data-id="${e(v.id)}">Results ↗</button> <button class="text-button danger" data-action="delete-event" data-id="${e(v.id)}">Remove</button>`,
    ]);
  }
  if (adminTab === "creators") {
    add = "add-creator";
    cols = ["Creator", "Tracks", "Order", "Actions"];
    rows = db.creators.map((c, i) => [
      `<span class="creator-cell">${creatorAvatar(c)}<strong>${e(c.name)}</strong></span>`,
      db.tracks.filter((t) => t.creator === c.id).length,
      `<div class="order-controls"><button class="icon-button" data-action="creator-order" data-id="${e(c.id)}" data-direction="-1" aria-label="Move ${e(c.name)} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-button" data-action="creator-order" data-id="${e(c.id)}" data-direction="1" aria-label="Move ${e(c.name)} down" ${i === db.creators.length - 1 ? "disabled" : ""}>↓</button></div>`,
      `<button class="text-button" data-action="edit-creator" data-id="${e(c.id)}">Edit ↗</button> <button class="text-button danger" data-action="delete-creator" data-id="${e(c.id)}">Remove</button>`,
    ]);
  }
  if (adminTab === "tracks") {
    add = "add-track";
    cols = ["Track", "Creator", "Conditions", "Tires", "Actions"];
    rows = db.tracks.map((t) => [
      e(t.name),
      e(creator(t.creator)?.name),
      e(t.weather.join(", ")),
      e(t.hasTires ? t.tires.join(", ") : "No tires"),
      `<button class="text-button" data-action="edit-track" data-id="${e(t.id)}">Edit ↗</button> <button class="text-button danger" data-action="delete-track" data-id="${e(t.id)}">Remove</button>`,
    ]);
  }
  if (adminTab === "submissions") {
    cols = [
      "Driver",
      "Track / setup",
      "Lap time",
      "Submitted",
      "Status",
      "Actions",
    ];
    rows = [...db.laps]
      .sort((a, b) => (a.status !== "pending") - (b.status !== "pending"))
      .map((l) => [
        driverCell(driver(l.driver)),
        `${e(track(l.track)?.name)}<br><small class="muted">${e(l.weather)} · ${e(l.custom || l.car)} · ${e(tireLabel(l))}</small>`,
        formatLap(l.ms),
        date(l.date),
        `<span class="pill ${e(l.status)}">${e(l.status)}</span>`,
        l.sample
          ? '<span class="muted">Sample record</span>'
          : `<button class="text-button" data-action="proof" data-id="${e(l.id)}">Review ↗</button>${l.status === "pending" ? ` · <button class="text-button yellow" data-action="approve" data-id="${e(l.id)}">Approve</button> · <button class="text-button danger" data-action="reject" data-id="${e(l.id)}">Reject</button>` : ""}${l.reason ? `<br><small>${e(l.reason)}</small>` : ""}`,
      ]);
  }
  return `<div class="admin-toolbar"><h3>${adminTab.toUpperCase()}</h3>${add ? `<button class="button" data-action="${add}">+ ADD ${adminTab === "creators" ? "CREATOR" : adminTab.slice(0, -1).toUpperCase()}</button>` : ""}</div><div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="empty">Nothing here yet.</td></tr>`}</tbody></table></div>`;
}
function notFound() {
  return `<section class="page">${pageHeading("OFF THE RACING LINE", "PAGE NOT FOUND.", "Return to the paddock to find your next race.", '<a class="button" href="#home">BACK TO PADDOCK ↗</a>')}</section>`;
}
function render(scroll = false) {
  cleanTitle();
  cleanTitle = () => {};
  cleanCar();
  cleanCar = () => {};
  let [page = "home", id] = (location.hash.slice(1) || "home").split("/");
  if (!canAdmin()) adminPreview = false;
  chrome(page);
  app.innerHTML = loading
    ? statusPage("CONNECTING TO THE PADDOCK.", "Loading the grid…")
    : loadError
      ? statusPage(
          "PADDOCK TEMPORARILY UNAVAILABLE.",
          "Please try again in a moment.",
          true,
        )
      : page === "account"
        ? accountPage()
        : page === "home"
          ? home()
          : page === "events"
            ? events()
            : page === "history"
              ? events(true)
              : page === "event"
                ? eventPage(id)
                : page === "tracks"
                  ? tracksPage()
                  : page === "track"
                    ? trackPage(id)
                    : page === "drivers"
                      ? drivers()
                      : page === "time-trials"
                        ? trials()
                        : page === "submit"
                          ? submitPage(id)
                          : page === "admin"
                            ? admin()
                            : notFound();
  document.title = `${{ home: "Find your limit.", events: "Events", history: "Event history", drivers: "Driverbase", tracks: "Tracks", track: "Track details", "time-trials": "Time trials", submit: "Submit a lap", account: "My profile", admin: "Admin Panel", event: "Event details" }[page] || "Paddock"} — Fortnite Racing Association`;
  enhanceControls(app);
  pageTransition(app, page, scroll);
  if (!loading) finishBoot(!loadError);
  if (page === "home" && !loading && !loadError) {
    cleanCar = carScene($(".car-stage"));
    cleanTitle = titleMotion($(".hero-title"));
  }
  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
}
function field(
  name,
  label,
  value = "",
  type = "text",
  required = true,
  extra = "",
) {
  return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" value="${e(value)}" type="${type}" ${required ? "required" : ""} ${extra}></div>`;
}
function editor(kind, id, creatorId) {
  let obj =
    kind === "driver"
      ? driver(id)
      : kind === "track"
        ? track(id)
        : kind === "creator"
          ? creator(id)
          : db.events.find((v) => v.id === id);
  let o = obj || {};
  let fields = "";
  if (kind === "driver")
    fields =
      field(
        "name",
        "DRIVER NAME",
        o.name,
        "text",
        true,
        'minlength="3" maxlength="32"',
      ) +
      countryField(o.country) +
      field(
        "number",
        "RACE NUMBER",
        o.number,
        "text",
        false,
        'pattern="[0-9]{0,3}" maxlength="3"',
      ) +
      field("avatar", "AVATAR URL", o.avatar, "url", false) +
      field("banner", "BANNER URL", o.banner, "url", false) +
      field(
        "registered",
        "DATE REGISTERED",
        o.registered || new Date().toISOString().slice(0, 10),
        "date",
      ) +
      `<div class="field"><label for="f-active">DRIVER STATUS</label><select id="f-active" name="active">${options(
        [
          ["yes", "Active"],
          ["no", "Inactive — cannot enter or submit"],
        ],
        o.active === false ? "no" : "yes",
      )}</select></div><div class="field full"><label for="f-bio">BIO</label><textarea id="f-bio" name="bio" maxlength="500">${e(o.bio || "")}</textarea></div>`;
  if (kind === "creator")
    fields =
      field("name", "CREATOR NAME", o.name, "text", true, 'maxlength="80"') +
      field(
        "creator-avatar-url",
        "AVATAR URL · OPTIONAL",
        o.avatar_url || "",
        "url",
        false,
      ) +
      '<div class="field full"><label for="creator-avatar-file">UPLOAD CREATOR AVATAR</label><input id="creator-avatar-file" name="creatorAvatar" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP · up to 5 MB. Upload replaces the URL above.</small></div>' +
      `<div class="field full"><label for="f-description">DESCRIPTION</label><textarea id="f-description" name="description" maxlength="500">${e(o.description || "")}</textarea></div>`;
  if (kind === "track") {
    if (!db.creators.length) {
      toast("Add a track creator first.");
      return;
    }
    fields =
      `<div class="field"><label for="f-creator">TRACK CREATOR</label><select id="f-creator" name="creator" required>${options(
        db.creators.map((c) => [c.id, c.name]),
        o.creator || creatorId,
      )}</select></div>` +
      field("name", "TRACK NAME", o.name, "text", true, 'maxlength="80"') +
      field(
        "code",
        "MAP CODE",
        o.code,
        "text",
        true,
        'pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}" placeholder="1234-5678-9012"',
      ) +
      field("released", "RELEASE DATE", o.released || "2026-10-12", "date") +
      field(
        "image",
        "HERO IMAGE URL",
        o.image?.startsWith("assets/") ? "" : o.image,
        "url",
        false,
      ) +
      `<div class="field full"><label for="f-description">TRACK DESCRIPTION</label><textarea id="f-description" name="description" required maxlength="1500">${e(o.description || "")}</textarea></div><div class="field full"><span class="label">AVAILABLE WEATHER · SELECT AT LEAST ONE</span><div class="checks">${["Dry", "Light Rain", "Heavy Rain"].map((w) => `<label><input type="checkbox" name="weather" value="${w}" ${(o.weather || ["Dry"]).includes(w) ? "checked" : ""}>${w}</label>`).join("")}</div></div><div class="field full"><span class="label">ALLOWED CARS · SELECT AT LEAST ONE</span><div class="checks">${["Prevalents", "Whiplashes", "Customs"].map((w) => `<label><input type="checkbox" name="cars" value="${w}" ${(o.cars || ["Prevalents"]).includes(w) ? "checked" : ""}>${w}</label>`).join("")}</div></div><div class="field full"><label for="f-has-tires">TIRES ON TRACK</label><select id="f-has-tires" name="hasTires">${options(
        [
          ["no", "No — no tires available"],
          ["yes", "Yes — choose available compounds"],
        ],
        o.hasTires ? "yes" : "no",
      )}</select></div><fieldset class="field full tire-settings ${o.hasTires ? "" : "hidden"}" id="tire-options" ${o.hasTires ? "" : "disabled"}><legend class="label">AVAILABLE TIRE COMPOUNDS · SELECT AT LEAST ONE</legend><div class="checks">${TIRES.map((c) => `<label><input type="checkbox" name="tires" value="${c}" ${(o.tires || []).includes(c) ? "checked" : ""}><span class="compound-dot ${e(c.toLowerCase())}"></span>${c}</label>`).join("")}</div></fieldset>`;
  }
  if (kind === "event") {
    if (!db.tracks.length) {
      toast("Add a track first.");
      return;
    }
    fields =
      field("name", "EVENT NAME", o.name, "text", true, 'maxlength="100"') +
      `<div class="field"><label for="f-track">TRACK</label><select id="f-track" name="track" required>${options(
        db.tracks.map((t) => [t.id, t.name]),
        o.track || "",
        "Select a track from the list",
      )}</select><small>Manage available circuits on the <a href="#tracks">Tracks page ↗</a>.</small></div>` +
      field("date", "DATE", o.date || "2026-10-18", "date") +
      field("round", "ROUND", o.round || "01", "text", true, 'maxlength="8"') +
      field(
        "qualifying",
        "QUALIFYING · TORONTO",
        o.qualifying || "18:30",
        "time",
      ) +
      field("race", "RACE · TORONTO", o.race || "19:00", "time") +
      field(
        "laps",
        "RACE LAPS",
        o.laps || 24,
        "number",
        true,
        'min="1" max="999"',
      ) +
      `<div class="field"><label for="f-status">STATUS</label><select id="f-status" name="status">${options(
        [
          ["upcoming", "Upcoming"],
          ["past", "Past / completed"],
        ],
        o.status,
      )}</select></div><div class="field full"><label for="f-description">DESCRIPTION</label><textarea id="f-description" name="description" maxlength="1000">${e(o.description || "")}</textarea></div><div class="field"><label for="f-registration">REGISTRATION</label><select id="f-registration" name="registrationOpen">${options(
        [
          ["yes", "Open"],
          ["no", "Closed"],
        ],
        o.registrationOpen === false ? "no" : "yes",
      )}</select></div><p class="helper full">Save event details here, then use Results in the Events tab to enter qualifying lobbies and race classifications.</p>`;
  }
  showModal(
    `${obj ? "EDIT" : "ADD"} ${kind.toUpperCase()}`,
    `<form id="edit-form" data-kind="${kind}" data-id="${e(id || "")}"><div class="form-grid">${fields}</div><p class="error" id="edit-error" role="alert"></p><div class="form-actions"><button type="button" class="outline" data-action="close">CANCEL</button><button type="submit" class="button">SAVE ${kind.toUpperCase()} ↗</button></div></form>`,
  );
}
function resultRow(r = {}) {
  return `<div class="result-row" style="border:1px solid var(--line);padding:15px;margin-bottom:15px;border-radius:3px"><div class="form-grid"><div class="field"><label>DRIVER<select name="resultDriver" required>${options(
    db.drivers.map((d) => [d.id, d.name]),
    r.driver,
  )}</select></label></div><div class="field"><label>RACE POSITION<input name="resultPos" type="number" min="1" max="999" required value="${e(r.position || "")}"></label></div><div class="field"><label>RACE TIME / GAP<input name="resultTime" required value="${e(r.time || "")}" placeholder="24:12.480 or +3.214"></label></div><div class="field"><label>QUALIFYING LAP<input name="resultQuali" required value="${e(r.qualifying || "")}" placeholder="1:42.381"></label></div></div><button class="text-button danger" type="button" data-action="remove-result">Remove result</button></div>`;
}
function deletion(kind, id) {
  let collection = {
      driver: "drivers",
      track: "tracks",
      event: "events",
      creator: "creators",
    }[kind],
    obj = db[collection].find((x) => x.id === id);
  if (kind === "creator" && db.tracks.some((t) => t.creator === id)) {
    toast("Move or remove this creator’s tracks first.");
    return;
  }
  if (
    kind === "track" &&
    (db.events.some((v) => v.track === id) ||
      db.laps.some((l) => l.track === id))
  ) {
    toast("This track is used by events or lap records. Edit it instead.");
    return;
  }
  if (
    kind === "driver" &&
    (db.laps.some((l) => l.driver === id) ||
      db.events.some((v) => v.results?.some((r) => r.driver === id)))
  ) {
    toast(
      "This driver has results. Edit their profile to preserve the history.",
    );
    return;
  }
  showModal(
    "REMOVE " + kind.toUpperCase(),
    `<p class="helper">Remove ${e(obj.name)} ${demo ? "from this browser’s preview data" : "permanently"}?</p><div class="form-actions"><button class="outline" data-action="close">CANCEL</button><button class="button" data-action="confirm-delete" data-kind="${kind}" data-id="${e(id)}">REMOVE</button></div>`,
  );
}

function updateSubmit() {
  let t = track($("#lap-track").value);
  if (!t) {
    $("#lap-weather").innerHTML = "";
    $("#lap-car").innerHTML = "";
    return;
  }
  $("#lap-weather").innerHTML = options(t.weather);
  $("#lap-car").innerHTML = options(t.cars);
  $("#tire-field").classList.toggle("hidden", !t.hasTires);
  $("#lap-tire").disabled = !t.hasTires;
  $("#lap-tire").required = t.hasTires;
  $("#lap-tire").innerHTML = options(t.tires, "", "Select a tire compound");
  $("#submit-image").src = safeURL(t.image) || "assets/coast.svg";
  $("#submit-track-name").textContent = t.name;
  $("#submit-track-desc").textContent = t.description;
  updateCustom();
  enhanceControls(app);
}
function updateCustom() {
  let on = $("#lap-car").value === "Customs";
  $("#custom-field").classList.toggle("hidden", !on);
  $("#lap-custom").required = on;
  if (!on) $("#lap-custom").value = "";
}
document.addEventListener("change", (ev) => {
  let el = ev.target;
  if (el.dataset.filter) {
    boardFilters[el.dataset.filter] = el.value;
    if (el.dataset.filter === "creator") boardFilters.track = "";
    if (el.dataset.filter === "car") boardFilters.custom = "";
    render();
  }
  if (el.id === "creator-avatar-file")
    $("#f-creator-avatar-url").disabled = !!el.files?.[0]?.size;
  if (el.name === "proofMode") {
    const upload = el.value === "upload";
    $("#proof-link-field").hidden = upload;
    $("#proof-upload-field").hidden = !upload;
    $("#lap-proof").required = !upload;
    $("#lap-proof").disabled = upload;
    $("#lap-clip").disabled = !upload;
    $("#lap-clip").required = upload;
  }
  if (el.id === "driver-sort") {
    driverSort = el.value;
    render();
  }
  if (el.id === "lap-creator") {
    $("#lap-track").innerHTML = options(
      db.tracks
        .filter((t) => t.creator === el.value)
        .map((t) => [t.id, t.name]),
    );
    updateSubmit();
  }
  if (el.id === "lap-track") updateSubmit();
  if (el.id === "lap-car") updateCustom();
  if (el.id === "f-has-tires") {
    const on = el.value === "yes";
    $("#tire-options").classList.toggle("hidden", !on);
    $("#tire-options").disabled = !on;
  }
});
let filterTimer;
document.addEventListener("input", (ev) => {
  if (ev.target.id === "driver-search" || ev.target.id === "custom-filter") {
    let id = ev.target.id,
      pos = ev.target.selectionStart;
    if (id === "driver-search") driverSearch = ev.target.value;
    else boardFilters.custom = ev.target.value;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      render();
      let el = $("#" + id);
      el?.focus();
      el?.setSelectionRange(pos, pos);
    }, 180);
  }
});

function statusPage(title, message, retry = false) {
  return `<section class="page">${pageHeading("THE FRA PADDOCK", e(title), e(message))}${retry ? '<button class="button" data-action="retry">TRY AGAIN ↗</button>' : ""}</section>`;
}
function countryField(value = "") {
  return `<div class="field"><label for="country-input">COUNTRY</label><input id="country-input" name="country" list="country-list" value="${e(value)}" placeholder="Start typing your country…" required autocomplete="country-name"><datalist id="country-list">${countries.map((c) => `<option value="${e(c.name)}">${e(c.code)}</option>`).join("")}</datalist><small>Choose a country from the list.</small></div>`;
}
function accountPage(message = "") {
  const d = currentDriver();
  if (!backend.identity.user) {
    const registering = authMode === "register";
    return `<section class="page">${pageHeading("YOUR PLACE ON THE GRID", "JOIN THE FRA PADDOCK.", message || "One driver profile. Every event. Every lap.")}<div class="form-panel account-signin"><img src="assets/fra-logo.png" alt="FRA" width="80"><h3>${registering ? "CREATE YOUR ACCOUNT." : "WELCOME TO THE PADDOCK."}</h3><p class="body-copy">${registering ? "Create an account with your email and password, then choose your driver name and country." : "Sign in with your email and password or continue with Discord."}</p><div class="auth-switch" role="group" aria-label="Account action"><button type="button" data-action="auth-mode" data-mode="login" aria-pressed="${!registering}" class="${!registering ? "selected" : ""}">SIGN IN</button><button type="button" data-action="auth-mode" data-mode="register" aria-pressed="${registering}" class="${registering ? "selected" : ""}">CREATE ACCOUNT</button></div><form id="email-auth-form" data-mode="${authMode}" class="auth-form">${field("email", "EMAIL ADDRESS", authEmail, "email", true, 'autocomplete="email" maxlength="254" autocapitalize="none" spellcheck="false"')}${field("password", "PASSWORD", "", "password", true, registering ? 'autocomplete="new-password" minlength="8" maxlength="128"' : 'autocomplete="current-password"')}${registering ? '<small class="muted">At least 8 characters.</small>' : ""}<p id="account-error" class="error" role="alert"></p><p class="auth-notice" role="status">${e(authNotice)}</p><button class="button" type="submit" ${!live ? "disabled" : ""}>${registering ? "CREATE ACCOUNT" : "SIGN IN"} ↗</button></form><div class="auth-divider"><span>OR</span></div><button class="outline auth-discord" data-action="discord" ${!live ? "disabled" : ""}>CONTINUE WITH DISCORD ↗</button>${!live ? `<p class="helper">${demo ? "Account sign-in is unavailable in this design preview." : "Driver registration is opening soon."}</p>` : ""}</div></section>`;
  }
  if (!d)
    return statusPage(
      "YOUR DRIVER PROFILE IS NOT READY.",
      "Please contact FRA the Admin Panel.",
    );
  return `<section class="page">${pageHeading("YOUR DRIVER PROFILE", d.complete ? "WELCOME BACK, " + e(d.name).toUpperCase() + "." : "TAKE YOUR PLACE.", message || "Make the grid your own. Your account keeps your events and lap times together.", '<button class="outline" data-action="signout">SIGN OUT ↗</button>')}${d.active ? "" : '<div class="notice">Your driver account is inactive. Contact the Admin Panel to enter events or submit laps.</div>'}<div class="form-layout"><form id="profile-form" class="form-panel"><h3>${d.complete ? "EDIT YOUR PROFILE" : "COMPLETE REGISTRATION"}</h3><div class="form-grid">${field("name", "DRIVER NAME", d.complete ? d.name : "", "text", true, 'minlength="3" maxlength="32" autocomplete="nickname"')}${countryField(d.country)}${field("number", "RACE NUMBER · OPTIONAL", d.number, "text", false, 'pattern="[0-9]{0,3}" maxlength="3"')}<div class="field"><label for="profile-avatar">PROFILE PICTURE</label><input id="profile-avatar" name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP · up to 5 MB. A Discord picture is used when available.</small></div><div class="field full"><label for="profile-banner">BANNER · OPTIONAL</label><input id="profile-banner" name="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"><small>16:9 recommended · up to 5 MB.</small>${d.banner ? '<label class="checks"><input type="checkbox" name="removeBanner"> Remove current banner</label>' : ""}</div><div class="field full"><label for="profile-bio">BIO · OPTIONAL</label><textarea id="profile-bio" name="bio" maxlength="500">${e(d.bio)}</textarea></div><p id="profile-error" class="error full" role="alert"></p><button class="button full" type="submit">${d.complete ? "SAVE PROFILE" : "FINISH REGISTRATION"} ↗</button></div></form><aside><div class="profile-preview">${cover(d)}<div class="profile-preview-body"><div class="profile-hero">${avatar(d)}<div><h3>${e(d.complete ? d.name : "YOUR DRIVER NAME")}</h3><p>${e(d.flag)} ${e(d.country)}</p></div></div>${badges(d.id)}<button class="outline" data-action="profile" data-id="${e(d.id)}">VIEW DRIVER PROFILE ↗</button></div></div>${backend.identity.user.email ? `<form id="password-form" class="form-panel password-settings"><h3>EMAIL SIGN-IN</h3><p class="helper">${e(backend.identity.user.email)}</p><p class="body-copy">Set or update a password to sign in with this email.</p>${field("newPassword", "NEW PASSWORD", "", "password", true, 'autocomplete="new-password" minlength="8" maxlength="128"')}<small class="muted">At least 8 characters.</small><p id="password-error" class="error" role="alert"></p><button class="outline" type="submit">SAVE PASSWORD ↗</button></form>` : ""}<div class="rule"><b>01</b><div><strong>Your events</strong>${
    db.events
      .filter((v) =>
        (db.registrations || []).some(
          (r) => r.event_id === v.id && r.driver_id === d.id,
        ),
      )
      .map(
        (v) =>
          `<a class="text-button" href="#event/${e(v.id)}">${e(v.name)} ↗</a>`,
      )
      .join("") || "Your event entries will appear here."
  }</div></div></aside></div><div class="section-head" style="margin-top:40px"><h3>YOUR LAP SUBMISSIONS</h3><a class="outline" href="#submit">SUBMIT A LAP ↗</a></div><div class="table-wrap"><table><thead><tr><th>Track / setup</th><th>Lap</th><th>Status</th><th>Review note</th></tr></thead><tbody>${
    db.laps
      .filter((l) => l.driver === d.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(
        (l) =>
          `<tr><td>${e(track(l.track)?.name)}<br><small>${e(l.weather)} · ${e(l.custom || l.car)} · ${e(tireLabel(l))}</small></td><td class="lap">${formatLap(l.ms)}</td><td><span class="pill ${e(l.status)}">${e(l.status)}</span></td><td>${e(l.reason || "—")}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="4" class="empty">Your first lap starts here.</td></tr>'
  }</tbody></table></div></section>`;
}
function eventRegistration(ev) {
  const count = (db.registrations || []).filter(
    (r) => r.event_id === ev.id,
  ).length;
  if (ev.status === "past") return "";
  const closed =
    ev.registrationOpen === false ||
    ev.date <
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  if (closed) return '<div class="notice">Event registration is closed.</div>';
  if (!live) return '<div class="notice">Driver registration opens soon.</div>';
  const d = currentDriver(),
    entered = (db.registrations || []).some(
      (r) => r.event_id === ev.id && r.driver_id === d?.id,
    );
  return `<p class="helper">${count} driver${count === 1 ? "" : "s"} entered</p>${!d?.complete ? '<a class="button" href="#account">REGISTER TO RACE ↗</a>' : !d.active ? '<p class="notice">Your driver account is inactive. Contact the Admin Panel.</p>' : `<button class="${entered ? "outline" : "button"}" data-action="${entered ? "cancel-entry" : "enter-event"}" data-id="${e(ev.id)}">${entered ? "CANCEL MY ENTRY" : "ENTER THIS EVENT"} ↗</button>`}`;
}
function recordsForDriver(id) {
  if (live)
    return (db.records || [])
      .filter((r) => r.driver_id === id)
      .map((r) => db.laps.find((l) => l.id === r.lap_id))
      .filter(Boolean);
  const records = new Map();
  for (const l of db.laps
    .filter((l) => l.status === "approved")
    .sort(
      (a, b) =>
        a.ms - b.ms || a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    ))
    if (!records.has(l.track)) records.set(l.track, l);
  return [...records.values()].filter((l) => l.driver === id);
}
function historyForDriver(id) {
  if (!demo)
    return (db.history || [])
      .filter((h) => h.driver_id === id)
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  return db.events
    .filter((v) => v.results?.some((r) => r.driver === id))
    .map((v) => {
      const r = v.results.find((r) => r.driver === id);
      return {
        event_id: v.id,
        event_name: v.name,
        event_date: v.date,
        track_name: track(v.track)?.name,
        status: v.status,
        race_position: r.position,
        race_time: r.time,
        qualifying_ms: parseLap(r.qualifying),
      };
    })
    .sort((a, b) => b.event_date.localeCompare(a.event_date));
}
function profile(id) {
  const d = driver(id);
  if (!d) return;
  const records = recordsForDriver(id),
    history = historyForDriver(id),
    stats = demo
      ? {
          events_entered: history.length,
          events_won: history.filter(
            (h) => h.status === "past" && h.race_position === 1,
          ).length,
          event_podiums: history.filter(
            (h) => h.status === "past" && h.race_position <= 3,
          ).length,
          lap_records: records.length,
        }
      : db.statistics.find((s) => s.driver_id === id) || {};
  showModal(
    "DRIVER PROFILE",
    `${cover(d)}<div class="profile-body"><div class="profile-identity"><div class="profile-avatar">${avatar(d)}</div><span class="profile-number">${d.number ? "#" + e(d.number) : "FRA DRIVER"}</span></div><h2>${e(d.name)}</h2><p class="profile-country">${e(d.flag)} ${e(d.country)}</p>${badges(id)}${d.bio ? `<p class="profile-bio">${e(d.bio)}</p>` : ""}<div class="profile-stats">${[
      ["events_entered", "Events"],
      ["events_won", "Wins"],
      ["event_podiums", "Podiums"],
      ["lap_records", "Lap records"],
    ]
      .map(
        ([key, label]) =>
          `<div><strong>${stats[key] || 0}</strong><span>${label}</span></div>`,
      )
      .join(
        "",
      )}</div><details class="profile-records-section"><summary>Lap records <span>${records.length} ${arrow}</span></summary><div class="profile-records">${records.map((l) => `<a href="#track/${e(l.track)}" class="profile-record"><span>${e(track(l.track)?.name)}<small>${e(l.weather)} · ${e(l.custom || l.car)} · ${e(tireLabel(l))}</small></span><strong class="lap yellow">${formatLap(l.ms)}</strong></a>`).join("") || '<p class="helper">Your next fastest lap starts here.</p>'}</div></details>${canAdmin() ? `<button class="text-button profile-badge-edit" data-action="edit-badges" data-id="${e(id)}">EDIT BADGES ↗</button>` : ""}<div class="profile-footer"><span class="helper">On the grid since ${date(d.registered)}</span><button class="outline" data-action="driver-history" data-id="${e(id)}">HISTORY ${arrow}</button></div></div>`,
    "profile-dialog",
  );
}
function badgeEditor(id) {
  const d = driver(id);
  if (!d?.complete) {
    toast("Choose a registered driver.");
    return;
  }
  const current = new Set(
    (db.badges || []).filter((b) => b.driver_id === id).map((b) => b.badge_key),
  );
  showModal(
    "BADGES · " + d.name,
    `<form id="badge-form" data-id="${e(id)}"><p class="helper">Race achievements are awarded automatically. You can also award these display badges manually. Developer and Admin badges reflect website access roles.</p><div class="badge-choices">${[
      ["map_developer", "Map Developer"],
      ["winner", "Event Winner"],
      ["pole", "Event Pole"],
      ["record", "Lap Record"],
    ]
      .map(
        ([key, label]) =>
          `<label><input type="checkbox" name="badges" value="${key}" ${current.has(key) ? "checked" : ""}><span class="driver-badge badge-${key}"><svg viewBox="0 0 24 24" aria-hidden="true">${badgeIcons[key]}</svg>${label}</span></label>`,
      )
      .join(
        "",
      )}</div><p class="helper">Removing a manual award keeps any badge the driver has earned through results.</p><p class="error" id="badge-error" role="alert"></p><div class="form-actions"><button type="button" class="outline" data-action="close">CANCEL</button><button type="submit" class="button">SAVE BADGES ↗</button></div></form>`,
  );
}
function sessionRow(r, kind, index) {
  const name = driver(r.driver)?.name || "";
  return `<tr><td class="row-number">${index + 1}</td><td><input class="result-driver" data-driver-picker list="result-driver-options" aria-label="Driver row ${index + 1}" placeholder="Type driver name…" value="${e(name)}" autocomplete="off"></td><td><input class="result-time" aria-label="${kind === "qualifying" ? "Lap" : "Race"} time row ${index + 1}" placeholder="${kind === "qualifying" ? "1:42.381" : "24:15.000 / +3.214 / DNF"}" value="${e(kind === "qualifying" ? (r.ms ? formatLap(r.ms) : r.time || "") : r.time || "")}"></td><td><div class="order-controls"><button type="button" class="icon-button" data-action="move-session-row" data-direction="-1" aria-label="Move row up">↑</button><button type="button" class="icon-button" data-action="move-session-row" data-direction="1" aria-label="Move row down">↓</button><button type="button" class="icon-button danger" data-action="remove-session-row" aria-label="Remove result row">×</button></div></td></tr>`;
}
function sessionMarkup(s) {
  const rows = s.results || [];
  return `<section class="result-session" data-kind="${s.kind}"><div class="session-editor-head"><span class="session-kind">${s.kind === "qualifying" ? "QUALIFYING" : "RACE"}</span><input class="session-name" aria-label="Session name" maxlength="60" required value="${e(s.name)}"><button type="button" class="text-button danger" data-action="remove-result-session">REMOVE SESSION</button></div><p class="helper">${s.kind === "qualifying" ? "Enter lap times. Positions and pole are calculated from fastest to slowest." : "Rows are finishing order. Enter total time, gap, DNF or DNS. Use the arrows to reorder finishers."}</p><div class="results-table-wrap"><table class="results-entry-table"><thead><tr><th>${s.kind === "qualifying" ? "Row" : "Finish"}</th><th>Driver</th><th>${s.kind === "qualifying" ? "Lap time" : "Race time / gap"}</th><th>Order</th></tr></thead><tbody>${Array.from({ length: Math.max(8, rows.length + 2) }, (_, i) => sessionRow(rows[i] || {}, s.kind, i)).join("")}</tbody></table></div><button type="button" class="text-button" data-action="add-session-rows">+ ADD 5 ROWS</button></section>`;
}
function resultsEditor(id) {
  const ev = db.events.find((x) => x.id === id);
  if (!ev) return;
  const sessions = sessionsForEvent(ev);
  showModal(
    "RESULTS · " + ev.name,
    `<form id="results-form" data-id="${e(id)}"><p class="helper">Create separate lobbies or sessions. Blank rows are ignored. Results become achievement badges when the event is marked completed.</p><datalist id="result-driver-options">${db.drivers
      .filter((d) => d.complete)
      .map((d) => `<option value="${e(d.name)}">`)
      .join("")}</datalist><div id="result-sessions">${(sessions.length
      ? sessions
      : [
          { kind: "qualifying", name: "Qualifying 1", results: [] },
          { kind: "race", name: "Race 1", results: [] },
        ]
    )
      .map(sessionMarkup)
      .join(
        "",
      )}</div><div class="result-session-actions"><button type="button" class="outline" data-action="add-result-session" data-kind="qualifying">+ QUALIFYING LOBBY</button><button type="button" class="outline" data-action="add-result-session" data-kind="race">+ RACE SESSION</button></div><p class="error" id="results-error" role="alert"></p><div class="form-actions result-save"><button type="button" class="outline" data-action="close">CANCEL</button><button type="submit" class="button">SAVE ALL RESULTS ↗</button></div></form>`,
    "results-dialog",
  );
}
function resultTables(ev, mode) {
  const sessions = sessionsForEvent(ev).filter((s) => s.kind === mode);
  if (!sessions.length)
    return ev.status === "past"
      ? '<p class="empty">Results have not been added.</p>'
      : "";
  return sessions
    .map((s) => {
      const results = [...s.results].sort((a, b) =>
        mode === "qualifying"
          ? a.ms - b.ms || a.driver.localeCompare(b.driver)
          : a.position - b.position,
      );
      return `<div class="section-head result-heading"><h3>${e(s.name)}</h3><span class="tiny muted">${results.length} DRIVERS</span></div><div class="table-wrap"><table><thead><tr><th>Position</th><th>Driver</th><th>${mode === "race" ? "Race time / gap" : "Fastest lap"}</th></tr></thead><tbody>${results.map((r, i) => `<tr><td class="number">${i + 1}</td><td>${driverCell(driver(r.driver))}</td><td class="lap">${e(mode === "race" ? r.time : formatLap(r.ms))}</td></tr>`).join("") || '<tr><td colspan="3" class="empty">No results yet.</td></tr>'}</tbody></table></div>`;
    })
    .join("");
}
function driverHistory(id) {
  const d = driver(id);
  if (!d) return;
  showModal(
    d.name + " · EVENT HISTORY",
    `<div class="driver-history" tabindex="0" aria-label="Scrollable event history">${
      historyForDriver(id)
        .map(
          (h) =>
            `<article class="history-entry"><div><span class="tiny muted">${date(h.event_date)} · ${e(h.status === "past" ? "COMPLETED" : "UPCOMING")}</span><h3><a href="#event/${e(h.event_id)}">${e(h.event_name)} ↗</a></h3><p>${e(h.track_name)}</p></div><div><strong class="number yellow">${h.race_position ? "P" + h.race_position : "ENTERED"}</strong><p class="helper">Race: ${e(h.race_time || "Awaiting results")}<br>Qualifying: ${h.qualifying_ms ? formatLap(h.qualifying_ms) : "—"}</p></div></article>`,
        )
        .join("") || '<p class="empty">No event history yet.</p>'
    }</div><div class="form-actions"><button class="outline" data-action="profile" data-id="${e(id)}">← BACK TO PROFILE</button></div>`,
  );
}
async function refresh() {
  if (!live) return;
  if (refreshing) {
    refreshQueued = true;
    return;
  }
  refreshing = true;
  try {
    await backend.initialize();
    db = await backend.loadRemote();
    loadError = "";
  } catch (err) {
    loadError = err.message || "Connection failed.";
    console.error("FRA connection:", err.message);
  } finally {
    loading = false;
    refreshing = false;
    render();
    if (refreshQueued) {
      refreshQueued = false;
      queueMicrotask(refresh);
    }
  }
}
function requireAdmin() {
  if (!canAdmin()) throw Error("Admin access required.");
}
async function persist(kind, o) {
  if (demo) {
    const col = {
      driver: "drivers",
      event: "events",
      track: "tracks",
      creator: "creators",
    }[kind];
    const index = db[col].findIndex((v) => v.id === o.id);
    if (index < 0) db[col].push(o);
    else db[col][index] = o;
    if (!commit()) throw Error("Unable to save.");
  } else {
    await backend.saveEntity(kind, o);
    await refresh();
  }
}
async function writeAction(button, action, errorSelector) {
  if (writeBusy) return;
  writeBusy = true;
  if (button) button.disabled = true;
  try {
    await action();
  } catch (err) {
    const message =
      err.code === "23505"
        ? "This name or entry already exists."
        : err.code === "42501"
          ? "You do not have permission for that action."
          : err.message || "Unable to save. Please try again.";
    const output = errorSelector && $(errorSelector);
    if (output) output.textContent = message;
    else toast(message);
  } finally {
    writeBusy = false;
    if (button) button.disabled = false;
  }
}
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action,
    id = b.dataset.id;
  if (a === "close") return closeModal();
  if (a === "menu") {
    const open = $(".nav").classList.toggle("open");
    b.setAttribute("aria-expanded", open);
    return;
  }
  if (a === "session") {
    session[id] = b.dataset.mode;
    return render();
  }
  if (a === "profile") return profile(id);
  if (a === "edit-badges") {
    requireAdmin();
    return badgeEditor(id);
  }
  if (a === "event-results") {
    requireAdmin();
    return resultsEditor(id);
  }
  if (a === "add-result-session") {
    const list = $("#result-sessions");
    list.insertAdjacentHTML(
      "beforeend",
      sessionMarkup({
        kind: b.dataset.kind,
        name:
          (b.dataset.kind === "race" ? "Race" : "Qualifying") +
          " " +
          (list.querySelectorAll(`[data-kind="${b.dataset.kind}"]`).length + 1),
        results: [],
      }),
    );
    enhanceControls(modal);
    return;
  }
  if (a === "remove-result-session") {
    b.closest(".result-session").remove();
    return;
  }
  if (a === "add-session-rows") {
    const block = b.closest(".result-session"),
      body = block.querySelector("tbody");
    for (let n = 0; n < 5; n++)
      body.insertAdjacentHTML(
        "beforeend",
        sessionRow({}, block.dataset.kind, body.children.length),
      );
    enhanceControls(modal);
    return;
  }
  if (a === "remove-session-row" || a === "move-session-row") {
    const row = b.closest("tr"),
      body = row.parentElement;
    if (a === "remove-session-row") row.remove();
    else {
      const other =
        b.dataset.direction === "-1"
          ? row.previousElementSibling
          : row.nextElementSibling;
      if (other)
        body.insertBefore(
          b.dataset.direction === "-1" ? row : other,
          b.dataset.direction === "-1" ? other : row,
        );
    }
    [...body.children].forEach((r, i) => {
      r.querySelector(".row-number").textContent = i + 1;
      r.querySelector(".result-driver").setAttribute(
        "aria-label",
        "Driver row " + (i + 1),
      );
      r.querySelector(".result-time").setAttribute(
        "aria-label",
        (body.closest(".result-session").dataset.kind === "qualifying"
          ? "Lap"
          : "Race") +
          " time row " +
          (i + 1),
      );
    });
    return;
  }
  if (a === "creator-order")
    return writeAction(b, async () => {
      requireAdmin();
      const ids = db.creators.map((c) => c.id),
        i = ids.indexOf(id),
        j = i + Number(b.dataset.direction);
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      if (demo) {
        db.creators.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        commit();
        render();
      } else {
        await backend.reorderCreators(ids);
        await refresh();
      }
      toast("Creator order saved.");
    });
  if (a === "driver-history") return driverHistory(id);
  if (a === "retry") {
    loading = true;
    render();
    return refresh();
  }
  if (a === "register") {
    authMode = "register";
    authNotice = "";
    if (location.hash === "#account") render();
    return;
  }
  if (a === "auth-mode") {
    if (writeBusy) return;
    authEmail = $("#f-email")?.value || authEmail;
    authMode = b.dataset.mode === "register" ? "register" : "login";
    authNotice = "";
    render();
    $("#f-email")?.focus();
    return;
  }
  if (a === "discord")
    return writeAction(b, () => backend.signIn(), "#account-error");
  if (a === "signout")
    return writeAction(b, async () => {
      await backend.signOut();
      db = backend.emptyDatabase();
      loading = true;
      closeModal();
      location.hash = "#account";
      await refresh();
    });
  if (a === "enter-event" || a === "cancel-entry")
    return writeAction(b, async () => {
      if (!currentDriver()?.complete || !currentDriver()?.active)
        throw Error("Complete an active driver profile first.");
      await backend.registerEvent(id, a === "cancel-entry");
      await refresh();
      toast(
        a === "enter-event"
          ? "You’re on the grid."
          : "Your entry has been cancelled.",
      );
    });
  if (a === "track-board") {
    const t = track(id);
    boardFilters = {
      creator: t.creator,
      track: id,
      weather: t.weather[0],
      car: t.cars[0],
      custom: "",
      tire: "",
    };
    if (location.hash !== "#time-trials") location.hash = "#time-trials";
    else render();
    return;
  }
  if (a === "proof") {
    const l = db.laps.find((x) => x.id === id);
    if (!l) return;
    let uploadedURL = "";
    if (l.storagePath) {
      try {
        uploadedURL = await backend.clipURL(l.storagePath);
      } catch (err) {
        toast(err.message || "Unable to open this clip.");
        return;
      }
    }
    showModal(
      "LAP PROOF",
      `<h3>${e(driver(l.driver)?.name)} · ${formatLap(l.ms)}</h3><p class="helper">${e(track(l.track)?.name)} · ${e(l.weather)} · ${e(l.custom || l.car)} · ${e(tireLabel(l))}</p>${uploadedURL ? `<video class="lap-video" controls playsinline preload="metadata" src="${e(uploadedURL)}"></video><a class="text-button" href="${e(uploadedURL)}" target="_blank" rel="noopener noreferrer">OPEN CLIP ↗</a>` : safeURL(l.proof) ? `<a class="button" href="${e(safeURL(l.proof))}" target="_blank" rel="noopener noreferrer">OPEN VIDEO CLIP ↗</a>` : '<p class="helper">No clip attached to this sample record.</p>'}${l.status === "pending" && canAdmin() ? `<p class="helper">Check the complete lap, setup and timer before approval.</p><div class="form-actions"><button class="outline" data-action="reject" data-id="${e(id)}">REJECT LAP</button><button class="button" data-action="approve" data-id="${e(id)}">APPROVE LAP ↗</button></div>` : `<span class="pill ${e(l.status)}">${e(l.status)}</span>`}`,
    );
    return;
  }
  const adminAction =
    a === "set-admin" ||
    a === "admin-tab" ||
    a === "add-result" ||
    a === "remove-result" ||
    a.startsWith("edit-") ||
    a.startsWith("add-") ||
    a.startsWith("delete-") ||
    ["confirm-delete", "approve", "reject"].includes(a);
  if (!adminAction) return;
  return writeAction(b, async () => {
    requireAdmin();
    if (a === "set-admin") {
      if (!backend.identity.developer)
        throw Error("Developer access required.");
      await backend.setDriverAdmin(id, b.dataset.enabled === "true");
      await refresh();
      toast(
        b.dataset.enabled === "true"
          ? "Administrator added."
          : "Administrator removed.",
      );
      return;
    }
    if (a === "admin-tab") {
      adminTab = b.dataset.tab;
      render();
      return;
    }
    if (a === "edit-mode") {
      adminPreview = !adminPreview;
      render();
      return;
    }
    if (a === "add-result") {
      $("#result-rows").insertAdjacentHTML("beforeend", resultRow());
      enhanceControls(modal);
      return;
    }
    if (a === "remove-result") return b.closest(".result-row").remove();
    if (a.startsWith("edit-")) return editor(a.slice(5), id);
    if (["add-driver", "add-track", "add-event", "add-creator"].includes(a)) {
      if (!demo && a === "add-driver")
        throw Error(
          "Drivers register through the website using email or Discord.",
        );
      return editor(a.slice(4), null, id);
    }
    if (a.startsWith("delete-")) return deletion(a.slice(7), id);
    if (a === "confirm-delete") {
      const kind = b.dataset.kind;
      if (demo) {
        const col = {
          driver: "drivers",
          event: "events",
          track: "tracks",
          creator: "creators",
        }[kind];
        db[col] = db[col].filter((v) => v.id !== id);
        commit();
      } else {
        if (kind === "driver")
          throw Error("Set the driver to inactive to preserve their history.");
        await backend.deleteEntity(kind, id);
        await refresh();
      }
      closeModal();
      render();
      toast("Removed.");
      return;
    }
    if (a === "approve") {
      if (demo) {
        db.laps.find((l) => l.id === id).status = "approved";
        commit();
      } else {
        await backend.reviewLap(id, "approved");
        await refresh();
      }
      closeModal();
      render();
      toast("Lap approved. The leaderboard is updated.");
      return;
    }
    if (a === "reject")
      showModal(
        "REJECT LAP",
        `<form id="reject-form" data-id="${e(id)}"><div class="field"><label for="reject-reason">REASON</label><textarea id="reject-reason" name="reason" required maxlength="500"></textarea></div><p class="error" id="reject-error" role="alert"></p><div class="form-actions"><button class="outline" type="button" data-action="close">CANCEL</button><button class="button" type="submit">REJECT LAP</button></div></form>`,
      );
  });
});
document.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = ev.target,
    fd = new FormData(f),
    v = Object.fromEntries(fd.entries()),
    errorSelector = {
      "lap-form": "#lap-error",
      "profile-form": "#profile-error",
      "email-auth-form": "#account-error",
      "password-form": "#password-error",
      "edit-form": "#edit-error",
      "reject-form": "#reject-error",
      "badge-form": "#badge-error",
      "results-form": "#results-error",
    }[f.id];
  if (!errorSelector) return;
  $(errorSelector).textContent = "";
  writeAction(
    f.querySelector('[type="submit"]'),
    async () => {
      if (f.id === "badge-form") {
        requireAdmin();
        const assigned = fd.getAll("badges");
        if (demo) {
          db.badges = (db.badges || []).filter(
            (b) => b.driver_id !== f.dataset.id,
          );
          assigned.forEach((b) =>
            db.badges.push({ driver_id: f.dataset.id, badge_key: b }),
          );
          commit();
        } else {
          await backend.setBadges(f.dataset.id, assigned);
          await refresh();
        }
        closeModal();
        render();
        toast("Driver badges saved.");
        return;
      }
      if (f.id === "results-form") {
        requireAdmin();
        const raw = [...f.querySelectorAll(".result-session")].map((block) => ({
          kind: block.dataset.kind,
          name: block.querySelector(".session-name").value,
          results: [...block.querySelectorAll("tbody tr")].map((row) => ({
            name: row.querySelector(".result-driver").value,
            time: row.querySelector(".result-time").value,
          })),
        }));
        const sessions = normalizeSessions(raw, db.drivers);
        if (demo) {
          const ev = db.events.find((e) => e.id === f.dataset.id);
          ev.sessions = sessions;
          commit();
        } else {
          await backend.saveSessions(f.dataset.id, sessions);
          await refresh();
        }
        closeModal();
        render();
        toast("Session results saved. Badges updated.");
        return;
      }
      if (f.id === "email-auth-form") {
        authEmail = v.email.trim();
        authNotice = "";
        const registering = f.dataset.mode === "register";
        const result = registering
          ? await backend.registerWithEmail(authEmail, v.password)
          : await backend.signInWithEmail(authEmail, v.password);
        f.reset();
        if (registering && !result.session) {
          authNotice =
            "Your account is awaiting email confirmation. Contact FRA the Admin Panel to finish signing in.";
          render();
          return;
        }
        authEmail = "";
        await refresh();
        toast(
          registering
            ? "Account created. Complete your driver profile."
            : "Welcome back.",
        );
        return;
      }
      if (f.id === "password-form") {
        await backend.setPassword(v.newPassword);
        f.reset();
        toast("Password saved. You can now sign in with your email.");
        return;
      }
      if (f.id === "profile-form") {
        const d = currentDriver(),
          country = findCountry(v.country);
        if (!d) throw Error("Sign in first.");
        if (!country) throw Error("Choose a country from the list.");
        const p = {
          ...d,
          name: v.name.trim(),
          countryCode: country.code,
          country: country.name,
          number: v.number.trim(),
          bio: v.bio.trim(),
        };
        if (p.name.length < 3 || p.name.length > 32)
          throw Error("Choose a driver name between 3 and 32 characters.");
        for (const key of ["avatarFile", "bannerFile"]) {
          const file = fd.get(key);
          if (
            file?.size &&
            (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
              file.size > 5242880)
          )
            throw Error("Choose PNG, JPEG or WebP images under 5 MB.");
        }
        if (fd.get("avatarFile")?.size)
          p.avatar = await backend.uploadMedia(fd.get("avatarFile"), "avatar");
        if (v.removeBanner) p.banner = "";
        if (fd.get("bannerFile")?.size)
          p.banner = await backend.uploadMedia(fd.get("bannerFile"), "banner");
        await backend.saveProfile(p);
        await refresh();
        toast(d.complete ? "Profile saved." : "Welcome to the FRA grid.");
        return;
      }
      if (f.id === "reject-form") {
        requireAdmin();
        const reason = v.reason.trim();
        if (!reason) throw Error("Enter a rejection reason.");
        if (demo) {
          const l = db.laps.find((l) => l.id === f.dataset.id);
          l.status = "rejected";
          l.reason = reason;
          commit();
        } else {
          await backend.reviewLap(f.dataset.id, "rejected", reason);
          await refresh();
        }
        closeModal();
        render();
        toast("Lap rejected with a review note.");
        return;
      }
      if (f.id === "lap-form") {
        const t = track(v.track),
          ms = parseLap(v.time),
          d = demo ? driver(v.driver) : currentDriver();
        if (!d || (!demo && (!d.complete || !d.active)))
          throw Error("Complete an active driver profile first.");
        if (!t) throw Error("Choose a track.");
        if (!t.weather.includes(v.weather) || !t.cars.includes(v.car))
          throw Error("Choose conditions and a car available on this track.");
        if (t.hasTires && !t.tires.includes(v.tire))
          throw Error("Choose an available tire compound.");
        if (v.car === "Customs" && !v.custom.trim())
          throw Error("Enter the custom car name.");
        if (ms <= 0) throw Error("Enter a lap time such as 1:42.381.");
        const upload = v.proofMode === "upload",
          clip = fd.get("clipFile");
        if (!upload && (!/^https:\/\//i.test(v.proof) || !safeURL(v.proof)))
          throw Error("Add an HTTPS video clip link.");
        if (upload && !clip?.size)
          throw Error("Choose a video clip from your device.");
        if (upload && demo)
          throw Error("Device uploads are available on the connected website.");
        if (!v.confirm)
          throw Error("Confirm your lap is complete and unedited.");
        const l = {
          id: uid(),
          driver: d.id,
          track: t.id,
          weather: v.weather,
          car: v.car,
          custom: v.car === "Customs" ? v.custom.trim() : "",
          ms,
          tire: t.hasTires ? v.tire : "",
          proof: upload ? "" : v.proof,
          storagePath: "",
          date: new Date().toISOString().slice(0, 10),
          status: "pending",
        };
        if (demo) {
          db.laps.push(l);
          commit();
        } else {
          try {
            if (upload) {
              $("#clip-status").textContent =
                "Uploading your clip… Keep this page open.";
              l.storagePath = await backend.uploadLapClip(clip);
            }
            await backend.submitLap(l);
          } catch (error) {
            if (l.storagePath) await backend.removeUnusedClip(l.storagePath);
            throw error;
          }
          await refresh();
        }
        showModal(
          "LAP SUBMITTED.",
          `<p class="body-copy">Your ${formatLap(ms)} at ${e(t.name)} is queued for review.</p><p class="helper">Admin Panel will check your clip before publishing the lap.</p><div class="form-actions"><a class="button" href="#${demo ? "admin" : "account"}">${demo ? "VIEW SUBMISSIONS" : "MY SUBMISSIONS"} ↗</a></div>`,
        );
        adminTab = "submissions";
        f.reset();
        if ($("#lap-track")) updateSubmit();
        return;
      }
      if (f.id === "edit-form") {
        requireAdmin();
        const kind = f.dataset.kind,
          id = f.dataset.id,
          col = {
            driver: "drivers",
            track: "tracks",
            event: "events",
            creator: "creators",
          }[kind],
          old = db[col].find((x) => x.id === id),
          o = { ...old, ...v, id: id || uid() };
        for (const k of Object.keys(o))
          if (typeof o[k] === "string") o[k] = o[k].trim();
        if (kind === "driver") {
          const c = findCountry(v.country);
          if (!c) throw Error("Choose a country from the list.");
          o.countryCode = c.code;
          o.country = c.name;
          o.flag = flag(c.code);
          o.complete = true;
          o.active = v.active === "yes";
          if (
            (o.avatar && !/^https:\/\//.test(o.avatar)) ||
            (o.banner && !/^https:\/\//.test(o.banner))
          )
            throw Error("Use HTTPS image URLs.");
        }
        if (kind === "creator") {
          o.avatar_url = v["creator-avatar-url"] || "";
          if (
            o.avatar_url &&
            (!/^https:\/\//i.test(o.avatar_url) || !safeURL(o.avatar_url))
          )
            throw Error("Use an HTTPS image URL.");
          if (fd.get("creatorAvatar")?.size)
            o.avatar_url = await backend.uploadCreatorAvatar(
              fd.get("creatorAvatar"),
            );
          o.sort_order =
            old?.sort_order ??
            Math.max(-1, ...db.creators.map((c) => c.sort_order || 0)) + 1;
        }
        if (kind === "track") {
          o.weather = fd.getAll("weather");
          o.cars = fd.getAll("cars");
          o.hasTires = v.hasTires === "yes";
          o.tires = o.hasTires
            ? fd.getAll("tires").filter((c) => TIRES.includes(c))
            : [];
          o.image = v.image || old?.image || "assets/coast.svg";
          if (!o.weather.length || !o.cars.length)
            throw Error("Select at least one weather condition and car class.");
          if (o.hasTires && !o.tires.length)
            throw Error("Select at least one tire compound.");
        }
        if (kind === "event") {
          o.laps = Number(o.laps);
          o.timezone = "America/Toronto";
          o.registrationOpen = v.registrationOpen === "yes";
          if (!track(o.track)) throw Error("Choose an existing track.");
          o.results = old?.results || [];
          if (o.qualifying >= o.race)
            throw Error("Qualifying must start before the race.");
          for (const k of Object.keys(o))
            if (k.startsWith("result") && k !== "results") delete o[k];
        }
        await persist(kind, o);
        closeModal();
        render();
        toast(kind[0].toUpperCase() + kind.slice(1) + " saved.");
      }
    },
    errorSelector,
  );
});
window.addEventListener("hashchange", () => {
  closeModal();
  render(true);
});
render();
if (live) {
  refresh();
  backend.watchAuth(refresh);
}
