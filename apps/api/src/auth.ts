import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

export interface TelegramUserAuth {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  [key: string]: unknown;
}

export interface TelegramParsedInitData {
  user?: TelegramUserAuth;
  auth_date?: number;
  query_id?: string;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  hash?: string;
  [key: string]: unknown;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: TelegramUserAuth;
  }
}

/**
 * Validates Telegram Web App initData string using HMAC-SHA256 according to official Telegram documentation.
 * Secret key = HMAC_SHA256("WebAppData", botToken)
 * Data check string = sorted alphabetically 'key=value' separated by '\n' (excluding 'hash')
 * Hash = HMAC_SHA256(secretKey, dataCheckString).hex()
 */
export function validateWebAppData(telegramInitData: string, botToken: string): boolean {
  if (!telegramInitData || !botToken) {
    return false;
  }

  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get("hash");

    if (!hash) {
      return false;
    }

    urlParams.delete("hash");

    const paramsList: string[] = [];
    urlParams.forEach((value, key) => {
      paramsList.push(`${key}=${value}`);
    });

    paramsList.sort();
    const dataCheckString = paramsList.join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash.length !== hash.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "utf-8"),
      Buffer.from(hash, "utf-8")
    );
  } catch {
    return false;
  }
}

/**
 * Parses user and metadata from Telegram initData string.
 */
export function parseInitData(telegramInitData: string): TelegramUserAuth | null {
  if (!telegramInitData) return null;

  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const userString = urlParams.get("user");

    if (!userString) return null;

    const parsed = JSON.parse(userString) as TelegramUserAuth;
    if (!parsed || typeof parsed.id !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fastify preHandler authentication hook.
 * Verifies Authorization header formatted as 'tma <initData>'.
 * If valid, attaches parsed Telegram user to request.user.
 * Otherwise returns 401 Unauthorized.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("tma ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid authorization header. Expected 'Authorization: tma <initData>'",
    });
  }

  const initData = authHeader.slice(4).trim();
  if (!initData) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Empty initData in authorization header",
    });
  }

  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  if (!botToken) {
    request.log.error("TELEGRAM_BOT_TOKEN is not configured on the server");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Telegram authentication is not configured on the server",
    });
  }

  const isValid = validateWebAppData(initData, botToken);
  if (!isValid) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid Telegram authentication signature",
    });
  }

  const user = parseInitData(initData);
  if (!user || typeof user.id !== "number") {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid user identity in initData",
    });
  }

  request.user = user;
}
