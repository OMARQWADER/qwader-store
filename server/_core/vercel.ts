/**
 * Vercel Serverless entry point.
 *
 * Vercel does not keep a long-running process alive: each request is served
 * by a short-lived serverless function. Instead of rewriting the whole app,
 * this module builds the exact same Express `app` that `server/_core/index.ts`
 * uses in production (minus the static-file serving and the listening socket),
 * and hands every request to it through the `express` package itself.
 *
 * Vercel configuration (vercel.json) routes:
 *   - static files   → dist/public (output directory)
 *   - /api/*         → this function   (single catch-all API route)
 *   - SPA routes     → dist/public/index.html (rewrites)
 *
 * No API endpoint is removed or renamed: the legacy REST API, tRPC, OAuth and
 * the storage proxy all live under `/api`, which is exactly where this
 * catch-all handler receives them.
 */
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { legacyApiRouter } from "../legacy/router";
import { createContext } from "./context";
import { ensureSchema, getDatabaseUrl } from "../db";

// Cached promise: build the app once per cold start and reuse it.
let appPromise: Promise<express.Express> | null = null;

export async function getVercelApp(): Promise<express.Express> {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const app = express();

    // Fail fast when no PostgreSQL DATABASE_URL is configured.
    if (!getDatabaseUrl()) {
      throw new Error(
        "Missing DATABASE_URL. Set it in Vercel → Settings → Environment Variables as a postgresql:// connection string (Neon)."
      );
    }

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));
    registerStorageProxy(app);

    // Ensure the drizzle users table + additive OAuth columns exist (idempotent).
    await ensureSchema();

    registerOAuthRoutes(app);
    // Legacy QWADER STORE REST API (external Neon Postgres)
    app.use("/api", legacyApiRouter());

    // tRPC API
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext,
      })
    );

    return app;
  })();

  return appPromise;
}

export default async function handler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const app = await getVercelApp();
    app(req, res);
  } catch (error) {
    console.error("[Vercel] request failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
