import { test } from "node:test";
import assert from "node:assert";
import { ok, err, getCurrentIsoTimestamp, parseDeadline, nextOccurrence, isValidTimezone } from "../src/index.js";

test("shared: ok returns success Result", () => {
  const res = ok({ value: 42 });
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.value, 42);
  }
});

test("shared: err returns failure Result", () => {
  const errorObj = new Error("Something failed");
  const res = err(errorObj);
  assert.equal(res.success, false);
  if (!res.success) {
    assert.equal(res.error.message, "Something failed");
  }
});

test("shared: getCurrentIsoTimestamp returns valid ISO string", () => {
  const iso = getCurrentIsoTimestamp();
  assert.ok(typeof iso === "string");
  assert.ok(!isNaN(Date.parse(iso)));
});

const MOSCOW = "Europe/Moscow"; // UTC+3
const NOW = new Date("2026-11-03T10:00:00Z"); // 13:00 in Moscow

test("parseDeadline: reads ISO without offset in the user's timezone", () => {
  assert.equal(parseDeadline("2026-11-04T15:00:00", MOSCOW, NOW)?.toISOString(), "2026-11-04T12:00:00.000Z");
  assert.equal(parseDeadline("2026-11-04T15:00:00", "Asia/Yekaterinburg", NOW)?.toISOString(), "2026-11-04T10:00:00.000Z");
});

test("parseDeadline: keeps an explicit offset", () => {
  assert.equal(parseDeadline("2026-11-04T15:00:00Z", MOSCOW, NOW)?.toISOString(), "2026-11-04T15:00:00.000Z");
  assert.equal(parseDeadline("2026-11-04T15:00:00+05:00", MOSCOW, NOW)?.toISOString(), "2026-11-04T10:00:00.000Z");
});

test("parseDeadline: relative phrases", () => {
  assert.equal(parseDeadline("через 5 минут", MOSCOW, NOW)?.toISOString(), "2026-11-03T10:05:00.000Z");
  assert.equal(parseDeadline("через 2 ч", MOSCOW, NOW)?.toISOString(), "2026-11-03T12:00:00.000Z");
  assert.equal(parseDeadline("через 3 дня", MOSCOW, NOW)?.toISOString(), "2026-11-06T10:00:00.000Z");
  assert.equal(parseDeadline("завтра", MOSCOW, NOW)?.toISOString(), "2026-11-04T10:00:00.000Z");
});

test("parseDeadline: named times are local to the user", () => {
  assert.equal(parseDeadline("завтра в 15:00", MOSCOW, NOW)?.toISOString(), "2026-11-04T12:00:00.000Z");
  assert.equal(parseDeadline("послезавтра в 9", MOSCOW, NOW)?.toISOString(), "2026-11-05T06:00:00.000Z");
  assert.equal(parseDeadline("в 18:30", MOSCOW, NOW)?.toISOString(), "2026-11-03T15:30:00.000Z");
  // 12:00 has passed in Moscow, so it means tomorrow.
  assert.equal(parseDeadline("в 12:00", MOSCOW, NOW)?.toISOString(), "2026-11-04T09:00:00.000Z");
});

test("parseDeadline: rejects what it cannot read", () => {
  assert.equal(parseDeadline("когда-нибудь", MOSCOW, NOW), null);
  assert.equal(parseDeadline("12345", MOSCOW, NOW), null);
  assert.equal(parseDeadline("", MOSCOW, NOW), null);
});

test("nextOccurrence: moves past now and keeps wall-clock time across DST", () => {
  const berlin = "Europe/Berlin";
  // 09:00 in Berlin the day before clocks go back (UTC+2 → UTC+1).
  const before = new Date("2026-10-24T07:00:00Z");
  assert.equal(
    nextOccurrence(before, "daily", berlin, new Date("2026-10-25T07:30:00Z")).toISOString(),
    "2026-10-25T08:00:00.000Z"
  );
  assert.equal(
    nextOccurrence(new Date("2026-11-01T10:00:00Z"), "weekly", MOSCOW, NOW).toISOString(),
    "2026-11-08T10:00:00.000Z"
  );
});

test("nextOccurrence: monthly clamps to short months", () => {
  const jan31 = new Date("2027-01-31T06:00:00Z");
  assert.equal(
    nextOccurrence(jan31, "monthly", MOSCOW, new Date("2027-02-01T00:00:00Z")).toISOString(),
    "2027-02-28T06:00:00.000Z"
  );
});

test("isValidTimezone", () => {
  assert.equal(isValidTimezone(MOSCOW), true);
  assert.equal(isValidTimezone("Mars/Olympus"), false);
});
