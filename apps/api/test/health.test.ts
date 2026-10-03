import { test } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../src/app.js";

test("GET /health returns status 200 with MIND API is alive", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.deepEqual(body, { status: "MIND API is alive" });

  await app.close();
});
