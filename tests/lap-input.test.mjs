import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLapDigits } from "../src/lap-input.js";
import { parseLap } from "../src/data.js";
test("numeric lap input inserts fixed separators and supports pasted laps and two-digit minutes", () => {
  assert.equal(formatLapDigits(""), "_:__.___");
  assert.equal(formatLapDigits("1"), "1:__.___");
  assert.equal(formatLapDigits("142381"), "1:42.381");
  assert.equal(formatLapDigits("1:42.381"), "1:42.381");
  assert.equal(formatLapDigits("1242381"), "12:42.381");
  assert.equal(parseLap(formatLapDigits("142381")), 102381);
  assert.equal(parseLap(formatLapDigits("199999")), 0);
});
