import { parseLap } from "./data.js";
// Qualifying ties follow a stable driver-ID tie break, matching the displayed classification.
export function achievements(db, id) {
  let wins = 0,
    poles = 0;
  for (const event of db.events.filter((e) => e.status === "past")) {
    if (event.results?.some((r) => r.driver === id && r.position === 1)) wins++;
    const qualifying = (event.results || [])
      .filter(
        (r) =>
          Number.isFinite(parseLap(r.qualifying)) && parseLap(r.qualifying) > 0,
      )
      .sort(
        (a, b) =>
          parseLap(a.qualifying) - parseLap(b.qualifying) ||
          a.driver.localeCompare(b.driver),
      );
    if (qualifying[0]?.driver === id) poles++;
  }
  const fastest = new Map();
  for (const lap of db.laps
    .filter((l) => l.status === "approved")
    .sort(
      (a, b) =>
        a.ms - b.ms || a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    ))
    if (!fastest.has(lap.track)) fastest.set(lap.track, lap);
  const records = db.records
    ? db.records.filter((r) => r.driver_id === id).length
    : [...fastest.values()].filter((l) => l.driver === id).length;
  return { wins, poles, records };
}
export function roleFor(db, id) {
  return db.roles?.find((r) => r.driver_id === id)?.role || "";
}
