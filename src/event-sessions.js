import { parseLap, formatLap } from "./data.js";
export function sessionsForEvent(event) {
  if (event.sessions?.length) return structuredClone(event.sessions);
  if (!event.results?.length) return [];
  return [
    {
      kind: "qualifying",
      name: "Qualifying 1",
      results: event.results
        .filter((r) => parseLap(r.qualifying) > 0)
        .map((r) => ({
          driver: r.driver,
          ms: parseLap(r.qualifying),
          time: r.qualifying,
        })),
    },
    {
      kind: "race",
      name: "Race 1",
      results: event.results
        .filter((r) => r.position)
        .sort((a, b) => a.position - b.position)
        .map((r) => ({ driver: r.driver, position: r.position, time: r.time })),
    },
  ];
}
export function normalizeSessions(raw, drivers) {
  if (raw.length > 40)
    throw Error("Use up to 40 qualifying and race sessions.");
  return raw.map((session) => {
    const name = session.name.trim();
    if (!name || name.length > 60)
      throw Error("Name each result session (up to 60 characters).");
    if (!["qualifying", "race"].includes(session.kind))
      throw Error("Choose a session type.");
    const seen = new Set();
    const results = session.results
      .filter((r) => r.name.trim() || r.time.trim())
      .map((r, index) => {
        const driver = drivers.find(
          (d) =>
            d.complete !== false &&
            d.name.toLowerCase() === r.name.trim().toLowerCase(),
        );
        if (!driver)
          throw Error(`${name}, row ${index + 1}: choose a registered driver.`);
        if (seen.has(driver.id))
          throw Error(`${name}: ${driver.name} appears twice.`);
        seen.add(driver.id);
        const time = r.time.trim();
        if (session.kind === "qualifying") {
          const ms = parseLap(time);
          if (!Number.isFinite(ms) || ms <= 0 || ms > 5999999)
            throw Error(`${name}: enter ${driver.name}’s lap as M:SS.mmm.`);
          return { driver: driver.id, ms, time: formatLap(ms) };
        }
        if (!time || time.length > 40)
          throw Error(
            `${name}: enter ${driver.name}’s race time, gap or DNF/DNS.`,
          );
        return { driver: driver.id, time, position: index + 1 };
      });
    if (session.kind === "qualifying")
      results.sort((a, b) => a.ms - b.ms || a.driver.localeCompare(b.driver));
    return { kind: session.kind, name, results };
  });
}
