// server/_core/vercel.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

// drizzle/schema.ts
import { jsonb, pgTable, serial, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  passwordHash: text("password_hash"),
  securityQ: text("security_q"),
  securityAHash: text("security_a_hash"),
  avatar: text("avatar"),
  addresses: jsonb("addresses"),
  wishlist: jsonb("wishlist"),
  cart: jsonb("cart"),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  role: text("role").default("user"),
  referredBy: text("referred_by"),
  createdAt: text("created_at"),
  lastLoginAt: text("last_login_at"),
  pointsBalance: integer("points_balance").default(0),
  discountPercent: integer("discount_percent").default(0),
  discountReason: text("discount_reason"),
  referralRewardCount: integer("referral_reward_count").default(0),
  permissions: jsonb("permissions"),
  recentlyViewed: jsonb("recently_viewed"),
  // OAuth columns (additive; migrated at runtime if missing)
  openId: varchar("open_id", { length: 64 }).unique(),
  loginMethod: varchar("login_method", { length: 64 }),
  updatedAt: text("updated_at")
});

// server/_core/env.ts
function getDatabaseUrl() {
  const isPg = (u) => u.startsWith("postgres://") || u.startsWith("postgresql://");
  if (isPg(process.env.NEON_DATABASE_URL ?? "")) return process.env.NEON_DATABASE_URL;
  if (isPg(process.env.DATABASE_URL ?? "")) return process.env.DATABASE_URL;
  return process.env.DATABASE_URL ?? "";
}
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: getDatabaseUrl(),
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
function getDatabaseUrl2() {
  const isPg = (u) => u.startsWith("postgres://") || u.startsWith("postgresql://");
  const unified = process.env.DATABASE_URL ?? "";
  const neon2 = process.env.NEON_DATABASE_URL ?? "";
  if (isPg(neon2)) return neon2;
  if (isPg(unified)) return unified;
  return "";
}
var _db = null;
async function getDb() {
  if (!_db && getDatabaseUrl2()) {
    try {
      const sql = neon(getDatabaseUrl2());
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function ensureSchema() {
  const db = await getDb();
  if (!db) return;
  try {
    const sql = db;
    await sql.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        name text,
        email varchar(320),
        phone varchar(32),
        password_hash text,
        security_q text,
        security_a_hash text,
        avatar text,
        addresses jsonb,
        wishlist jsonb,
        cart jsonb,
        two_fa_enabled boolean DEFAULT false,
        role text NOT NULL DEFAULT 'user',
        referred_by text,
        created_at text,
        last_login_at text,
        points_balance integer DEFAULT 0,
        discount_percent integer DEFAULT 0,
        discount_reason text,
        referral_reward_count integer DEFAULT 0,
        permissions jsonb,
        recently_viewed jsonb
      );
    `);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS open_id varchar(64)`);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_method varchar(64)`);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at text`);
  } catch (error) {
    console.warn("[Database] Schema ensure failed (continuing):", error);
  }
}
function toRow(user) {
  const row = {
    open_id: user.openId ?? null,
    login_method: user.loginMethod ?? null
  };
  if (user.name !== void 0) row.name = user.name;
  if (user.email !== void 0) row.email = user.email;
  if (user.role !== void 0) row.role = user.role;
  if (user.updatedAt !== void 0) row.updated_at = String(user.updatedAt);
  return row;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = toRow(user);
    if (!values.updated_at) values.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    const updateSet = { updated_at: values.updated_at };
    if (values.name !== void 0) updateSet.name = values.name;
    if (values.email !== void 0) updateSet.email = values.email;
    if (values.role !== void 0) updateSet.role = values.role;
    else if (user.openId === ENV.ownerOpenId) {
      updateSet.role = "admin";
      values.role = "admin";
    }
    if (user.openId === ENV.ownerOpenId && values.role === void 0) {
      values.role = "admin";
    }
    const sql = db;
    await sql.execute(
      `INSERT INTO users (open_id, login_method, name, email, role, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (open_id) DO UPDATE
       SET name = $3, email = $4, role = $5, updated_at = $6`,
      [values.open_id, values.login_method, values.name, values.email, values.role, values.updated_at]
    );
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(and(eq(users.openId, openId), eq(users.openId, openId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          updatedAt: signedInAt.toISOString()
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      updatedAt: signedInAt.toISOString()
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    phone: null,
    passwordHash: null,
    securityQ: null,
    securityAHash: null,
    avatar: null,
    addresses: null,
    wishlist: null,
    cart: null,
    twoFaEnabled: false,
    role: "user",
    referredBy: null,
    createdAt: now.toISOString(),
    lastLoginAt: null,
    pointsBalance: 0,
    discountPercent: 0,
    discountReason: null,
    referralRewardCount: 0,
    permissions: null,
    recentlyViewed: null,
    openId: userInfo.openId,
    loginMethod: null,
    updatedAt: now.toISOString(),
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  })
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/legacy/router.ts
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
function resolveLegacyModule(file) {
  const dir = typeof import.meta.dirname === "string" ? import.meta.dirname : process.cwd();
  const isBundleDir = dir.endsWith(`${path.sep}dist`) || dir.endsWith("/dist") || dir.endsWith(`${path.sep}api`) || dir.endsWith("/api");
  const projectRoot = isBundleDir ? path.resolve(dir, "..") : path.resolve(dir, "..", "..");
  const compiled = path.join(projectRoot, "dist", "server", "legacy", `${file}.js`);
  if (fs.existsSync(compiled)) return pathToFileURL(compiled).href;
  return pathToFileURL(path.join(projectRoot, "server", "legacy", `${file}.js`)).href;
}
function legacyApiRouter() {
  const api = Router();
  const mount = (prefix, file) => {
    api.all(prefix + "(/*)?", async (req, res) => {
      req.url = req.originalUrl || req.url;
      try {
        const mod = await import(
          /* @vite-ignore */
          resolveLegacyModule(file)
        );
        const handler = mod.default;
        if (typeof handler !== "function") {
          res.status(404).json({ error: "Not found" });
          return;
        }
        await handler(req, res);
      } catch (e) {
        console.error(`[legacy] ${req.url} error:`, e);
        if (!res.headersSent) res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649" });
      }
    });
  };
  mount("/auth", "auth.action");
  mount("/account", "account.action");
  mount("/admin", "admin.action");
  mount("/orders", "orders.action");
  mount("/support", "support.action");
  mount("/content", "content.action");
  mount("/notifications", "notifications.action");
  mount("/upload", "upload.action");
  api.all("/notify", async (req, res) => {
    req.url = req.url === "/notify" ? "/api/notify" : "/api/notify/" + req.url.slice(1);
    req.originalUrl = "/api/notify";
    try {
      const mod = await import(
        /* @vite-ignore */
        resolveLegacyModule("support.action")
      );
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649" });
    }
  });
  api.all("/rate-game", async (req, res) => {
    req.url = "/api/content/rate-game";
    req.originalUrl = "/api/content/rate-game";
    try {
      const mod = await import(
        /* @vite-ignore */
        resolveLegacyModule("content.action")
      );
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649" });
    }
  });
  api.all("/content", async (req, res) => {
    req.url = req.originalUrl || req.url;
    try {
      const mod = await import(
        /* @vite-ignore */
        resolveLegacyModule("content")
      );
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649" });
    }
  });
  return api;
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vercel.ts
var appPromise = null;
async function getVercelApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const app = express();
    if (!getDatabaseUrl2()) {
      throw new Error(
        "Missing DATABASE_URL. Set it in Vercel \u2192 Settings \u2192 Environment Variables as a postgresql:// connection string (Neon)."
      );
    }
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));
    registerStorageProxy(app);
    await ensureSchema();
    registerOAuthRoutes(app);
    app.use("/api", legacyApiRouter());
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext
      })
    );
    return app;
  })();
  return appPromise;
}

// server/_core/vercelEntry.ts
async function vercelHandler(req, res) {
  try {
    let path2 = typeof req.query?.path === "string" ? req.query.path : "";
    if (!path2 && req.url) {
      path2 = req.url.split("?")[0] || "/";
    }
    if (!path2) path2 = "/";
    const queryString = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const fullPath = path2.startsWith("/api") ? path2 : `/api${path2}`;
    req.url = fullPath + queryString;
    const anyReq = req;
    if (!anyReq.originalUrl) anyReq.originalUrl = req.url;
    const app = await getVercelApp();
    app(req, res);
  } catch (error) {
    console.error("[Vercel] handler failed:", error);
    const anyRes = res;
    if (!anyRes.headersSent && typeof anyRes.status === "function") {
      res.status(500).json({ error: "Internal server error" });
    } else if (!anyRes.headersSent && typeof anyRes.end === "function") {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}
export {
  vercelHandler as default
};
