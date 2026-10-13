import test from "node:test";
import assert from "node:assert/strict";
import { achievements, roleFor } from "../src/driver-badges.js";
test("achievement badges count completed wins/poles and current approved track records only", () => {
  const db = {
    roles: [{ driver_id: "a", role: "developer" }],
    events: [
      {
        status: "past",
        results: [
          { driver: "a", position: 1, qualifying: "1:00.000" },
          { driver: "b", position: 2, qualifying: "0:59.500" },
        ],
      },
      {
        status: "past",
        results: [
          { driver: "a", position: 2, qualifying: "1:00.000" },
          { driver: "b", position: 1, qualifying: "1:00.000" },
        ],
      },
      {
        status: "upcoming",
        results: [{ driver: "a", position: 1, qualifying: "0:58.000" }],
      },
    ],
    laps: [
      {
        id: "1",
        driver: "a",
        track: "t1",
        status: "approved",
        ms: 60000,
        date: "2026-10-01",
      },
      {
        id: "2",
        driver: "b",
        track: "t1",
        status: "approved",
        ms: 59000,
        date: "2026-10-02",
      },
      {
        id: "3",
        driver: "a",
        track: "t2",
        status: "approved",
        ms: 60000,
        date: "2026-10-01",
      },
      {
        id: "4",
        driver: "a",
        track: "t3",
        status: "pending",
        ms: 50000,
        date: "2026-10-01",
      },
    ],
  };
  assert.deepEqual(achievements(db, "a"), { wins: 1, poles: 1, records: 1 });
  assert.equal(roleFor(db, "a"), "developer");
  assert.equal(roleFor(db, "b"), "");
  assert.deepEqual(achievements(db, "c"), { wins: 0, poles: 0, records: 0 });
  db.records = [];
  assert.equal(achievements(db, "a").records, 0);
  db.records = [{ driver_id: "a", track_id: "t2" }];
  assert.equal(achievements(db, "a").records, 1);
});
