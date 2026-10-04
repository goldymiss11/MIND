import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateWebAppData, parseInitData, requireAuth } from "../src/auth.js";

const TEST_BOT_TOKEN = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ";

function generateTestInitData(
  botToken: string,
  user: { id: number; first_name: string; username?: string },
  customParams: Record<string, string> = {}
): string {
  const params: Record<string, string> = {
    auth_date: Math.floor(Date.now() / 1000).toString(),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify(user),
    ...customParams,
  };

  const checkString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  const urlParams = new URLSearchParams(params);
  urlParams.set("hash", hash);
  return urlParams.toString();
}

test("validateWebAppData: correctly validates authentic Telegram initData", () => {
  const initData = generateTestInitData(TEST_BOT_TOKEN, {
    id: 999999,
    first_name: "Alex",
  });

  const isValid = validateWebAppData(initData, TEST_BOT_TOKEN);
  assert.equal(isValid, true);
});

test("validateWebAppData: rejects tampered data", () => {
  const initData = generateTestInitData(TEST_BOT_TOKEN, {
    id: 999999,
    first_name: "Alex",
  });

  // Tamper by modifying the user id in query string without recalculating hash
  const tampered = initData.replace("999999", "888888");
  const isValid = validateWebAppData(tampered, TEST_BOT_TOKEN);
  assert.equal(isValid, false);
});

test("validateWebAppData: rejects data signed with different bot token", () => {
  const initData = generateTestInitData("999999999:DIFFERENT_BOT_TOKEN", {
    id: 12345,
    first_name: "Hacker",
  });

  const isValid = validateWebAppData(initData, TEST_BOT_TOKEN);
  assert.equal(isValid, false);
});

test("validateWebAppData: rejects empty or missing hash", () => {
  assert.equal(validateWebAppData("", TEST_BOT_TOKEN), false);
  assert.equal(validateWebAppData("user=%7B%22id%22%3A1%7D", TEST_BOT_TOKEN), false);
});

test("parseInitData: extracts user object properly", () => {
  const user = { id: 777777, first_name: "TestUser", username: "tester" };
  const initData = generateTestInitData(TEST_BOT_TOKEN, user);

  const parsed = parseInitData(initData);
  assert.notEqual(parsed, null);
  assert.equal(parsed?.id, 777777);
  assert.equal(parsed?.first_name, "TestUser");
  assert.equal(parsed?.username, "tester");
});

test("requireAuth hook: rejects requests without Authorization header with 401", async () => {
  process.env["TELEGRAM_BOT_TOKEN"] = TEST_BOT_TOKEN;

  let statusCode = 0;
  let responseBody: any = null;

  const mockReply: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(body: any) {
      responseBody = body;
      return this;
    },
  };

  const mockRequest: any = {
    headers: {},
    log: { error: () => {} },
  };

  await requireAuth(mockRequest, mockReply);
  assert.equal(statusCode, 401);
  assert.equal(responseBody.error, "Unauthorized");
});

test("requireAuth hook: rejects invalid signature with 401", async () => {
  process.env["TELEGRAM_BOT_TOKEN"] = TEST_BOT_TOKEN;

  let statusCode = 0;
  let responseBody: any = null;

  const mockReply: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(body: any) {
      responseBody = body;
      return this;
    },
  };

  const mockRequest: any = {
    headers: {
      authorization: "tma query_id=123&user=%7B%22id%22%3A1%7D&hash=invalidhash00000000000000000000000000000000000000000000000000000000",
    },
    log: { error: () => {} },
  };

  await requireAuth(mockRequest, mockReply);
  assert.equal(statusCode, 401);
  assert.equal(responseBody.error, "Unauthorized");
});

test("requireAuth hook: accepts valid Telegram signature and populates request.user", async () => {
  process.env["TELEGRAM_BOT_TOKEN"] = TEST_BOT_TOKEN;

  const validInitData = generateTestInitData(TEST_BOT_TOKEN, {
    id: 55555,
    first_name: "Alice",
  });

  let statusCode = 0;
  const mockReply: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(body: any) {
      return body;
    },
  };

  const mockRequest: any = {
    headers: {
      authorization: `tma ${validInitData}`,
    },
    log: { error: () => {} },
  };

  await requireAuth(mockRequest, mockReply);
  assert.equal(statusCode, 0); // No error status set
  assert.notEqual(mockRequest.user, undefined);
  assert.equal(mockRequest.user.id, 55555);
  assert.equal(mockRequest.user.first_name, "Alice");
});
