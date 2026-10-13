import test from "node:test";
import assert from "node:assert/strict";
import { leaderboardSetup } from "../src/leaderboard-filters.js";
const tracks = [
  {
    id: "dry",
    creator: "a",
    weather: ["Dry"],
    cars: ["Prevalents"],
    hasTires: false,
    tires: [],
  },
  {
    id: "rain",
    creator: "a",
    weather: ["Light Rain", "Heavy Rain"],
    cars: ["Whiplashes", "Customs"],
    hasTires: true,
    tires: ["Soft", "Wet"],
  },
  {
    id: "fixed",
    creator: "b",
    weather: ["Dry"],
    cars: ["Customs"],
    hasTires: true,
    tires: ["Medium"],
  },
];
const defaults = {
  creator: "",
  track: "",
  weather: "Dry",
  car: "Prevalents",
  tire: "",
  custom: "",
};
test("a fixed no-tire circuit hides redundant filters and clears incompatible selections", () => {
  const result = leaderboardSetup(tracks, {
    ...defaults,
    track: "dry",
    weather: "Heavy Rain",
    car: "Customs",
    custom: "Car name",
    tire: "Wet",
  });
  assert.deepEqual(result.filters, { ...defaults, track: "dry", tire: "none" });
  assert.equal(result.showWeather, false);
  assert.equal(result.showCars, false);
  assert.equal(result.showTires, false);
});
test("a circuit exposes only its supported weather, cars and compounds", () => {
  const result = leaderboardSetup(tracks, {
    ...defaults,
    track: "rain",
    tire: "Hard",
  });
  assert.deepEqual(result.weather, ["Light Rain", "Heavy Rain"]);
  assert.deepEqual(result.cars, ["Whiplashes", "Customs"]);
  assert.deepEqual(result.tires, ["Soft", "Wet"]);
  assert.equal(result.filters.weather, "");
  assert.equal(result.filters.car, "");
  assert.equal(result.filters.tire, "");
  assert.equal(result.showWeather && result.showCars && result.showTires, true);
});
test("changing creator removes a stale track and derives the new creator's setup", () => {
  const result = leaderboardSetup(tracks, {
    ...defaults,
    creator: "b",
    track: "rain",
    tire: "Wet",
  });
  assert.equal(result.filters.track, "");
  assert.deepEqual(
    result.tracks.map((t) => t.id),
    ["fixed"],
  );
  assert.equal(result.filters.car, "Customs");
  assert.equal(result.filters.tire, "Medium");
  assert.equal(result.showTires, false);
  assert.deepEqual(leaderboardSetup([], defaults).weather, []);
});
test("all-track filters use the catalogue union and retain supported custom selections", () => {
  const all = leaderboardSetup(tracks, defaults);
  assert.deepEqual(all.tires, ["none", "Soft", "Medium", "Wet"]);
  assert.equal(all.showTires, true);
  const custom = leaderboardSetup(tracks, {
    ...defaults,
    track: "rain",
    car: "Customs",
    custom: "Cyclone",
    weather: "Heavy Rain",
    tire: "Wet",
  });
  assert.equal(custom.filters.custom, "Cyclone");
  assert.equal(custom.filters.weather, "Heavy Rain");
  assert.equal(custom.filters.tire, "Wet");
});
