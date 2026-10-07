import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "@mind/db";

test("CORS: restricts disallowed origins in production", async () => {
  mock.method(pool, "query", async () => ({ rows: [{ "?column?": 1 }] }));

  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.WEB_APP_URL = "https://app.mind.ai";

  const { buildServer } = await import("../src/app.js");
  const app = buildServer();

  // Allowed: localhost
  const resLocal = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "http://localhost:3000" },
  });
  assert.equal(resLocal.headers["access-control-allow-origin"], "http://localhost:3000");

  // Allowed: onrender.com
  const resRender = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://my-mind-app.onrender.com" },
  });
  assert.equal(resRender.headers["access-control-allow-origin"], "https://my-mind-app.onrender.com");

  // Allowed: webAppOrigin
  const resWeb = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://app.mind.ai" },
  });
  assert.equal(resWeb.headers["access-control-allow-origin"], "https://app.mind.ai");

  // Disallowed: untrusted external origin
  const resEvil = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://evil-attacker.com" },
  });
  assert.notEqual(resEvil.headers["access-control-allow-origin"], "https://evil-attacker.com");
  assert.equal(resEvil.statusCode, 500);

  await app.close();
  process.env.NODE_ENV = originalEnv;
  mock.restoreAll();
});
