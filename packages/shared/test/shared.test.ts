import { test } from "node:test";
import assert from "node:assert";
import { ok, err, getCurrentIsoTimestamp } from "../src/index.js";

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
