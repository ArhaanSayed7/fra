import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSessions, sessionsForEvent } from "../src/event-sessions.js";
import { achievements } from "../src/driver-badges.js";
const drivers = [
  { id: "a", name: "Rivers", complete: true },
  { id: "b", name: "Racer", complete: true },
];
test("qualifying lobbies rank independently; race rows preserve finishing order and blank rows are ignored", () => {
  const sessions = normalizeSessions(
    [
      {
        kind: "qualifying",
        name: "Lobby A",
        results: [
          { name: "Rivers", time: "1:02.000" },
          { name: "racer", time: "1:01.000" },
          { name: "", time: "" },
        ],
      },
      {
        kind: "qualifying",
        name: "Lobby B",
        results: [{ name: "Rivers", time: "1:00.000" }],
      },
      {
        kind: "race",
        name: "Final",
        results: [
          { name: "Rivers", time: "24:00.000" },
          { name: "Racer", time: "DNF" },
        ],
      },
    ],
    drivers,
  );
  assert.equal(sessions[0].results[0].driver, "b");
  assert.equal(sessions[2].results[1].position, 2);
  const db = {
    events: [
      { status: "past", sessions, results: [{ driver: "a", position: 1 }] },
    ],
    laps: [],
  };
  assert.equal(achievements(db, "a").poles, 1);
  assert.equal(achievements(db, "b").poles, 1);
  assert.equal(achievements(db, "a").wins, 1);
  db.events[0].results = [];
  assert.equal(achievements(db, "a").wins, 1);
});
test("results reject unknown/duplicate drivers and invalid qualifying laps while preserving legacy events", () => {
  assert.throws(
    () =>
      normalizeSessions(
        [
          {
            kind: "qualifying",
            name: "Q",
            results: [{ name: "Rivers", time: "bad" }],
          },
        ],
        drivers,
      ),
    /M:SS/,
  );
  assert.throws(
    () =>
      normalizeSessions(
        [
          {
            kind: "race",
            name: "R",
            results: [
              { name: "Rivers", time: "1" },
              { name: "Rivers", time: "2" },
            ],
          },
        ],
        drivers,
      ),
    /appears twice/,
  );
  assert.throws(
    () =>
      normalizeSessions(
        [
          {
            kind: "race",
            name: "R",
            results: [{ name: "Nobody", time: "DNF" }],
          },
        ],
        drivers,
      ),
    /registered driver/,
  );
  const old = sessionsForEvent({
    results: [
      { driver: "a", position: 1, time: "24:00.000", qualifying: "1:00.000" },
    ],
  });
  assert.equal(old.length, 2);
  assert.equal(old[0].results[0].ms, 60000);
});
