/**
 * Legacy QWADER STORE REST API router.
 * The original project used Vercel catch-all route files (`[...action].js`),
 * where each file parsed its own path segments. In the Express-based WebDev
 * runtime we keep those files untouched and simulate the Vercel resolver:
 * a request to `/api/<segment>/<rest...>` loads `server/legacy/<segment>.action.js`
 * with a synthetic `pathAfter` prefix of `/api/<segment>/`, exactly as the
 * original files expect.
 *
 * DB: external Neon (NEON_DATABASE_URL). Schema guard is idempotent and runs
 * once per hour max, so it can never modify existing data.
 */
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Request, Response } from "express";

/**
 * Locate server/legacy/<file>.js at runtime, regardless of whether this code
 * is running from the TS source tree (dev) or the esbuild bundle (dist).
 */
function resolveLegacyModule(file: string): string {
  // At runtime, import.meta.dirname is either:
  //  - the source dir `server/legacy/` (dev, tsx)
  //  - the bundle dir, which sits ONE level below the project root
  // Legacy .js files always live at <project-root>/server/legacy/, so climb
  // to the project root accordingly before joining the source path.
  // import.meta.dirname is reliable in Node 20+ (tsx dev runtime, vitest,
  // esbuild bundles): here it is either .../server/legacy (this source file's
  // own directory) or .../dist/server/legacy (bundled copy). Climbing two
  // levels from either layout lands at the project root — no cwd heuristics.
  const dir = import.meta.dirname;
  const projectRoot = path.resolve(dir, "..", "..");
  // Legacy action files import TypeScript modules (e.g. ../storage.ts).
  // Node cannot import .ts at runtime, so builds emit JS copies of the whole
  // server to dist/server/. In production the compiled copy is the source of
  // truth; in development (tsx / vitest) prefer the SOURCE tree — a stale
  // dist/server from a previous build must never shadow fresh source edits.
  const source = path.join(projectRoot, "server", "legacy", `${file}.js`);
  const compiled = path.join(projectRoot, "dist", "server", "legacy", `${file}.js`);
  if (process.env.NODE_ENV !== "production" && fs.existsSync(source)) {
    return pathToFileURL(source).href;
  }
  if (fs.existsSync(compiled)) return pathToFileURL(compiled).href;
  return pathToFileURL(source).href;
}

export function legacyApiRouter(): Router {
  const api = Router();

  // Mount helpers: every legacy action file exports a default function
  // (req, res) that handles its own dispatch internally.
  const mount = (prefix: string, file: string): void => {
    api.all(prefix + "(/*)?", async (req: Request, res: Response) => {
      // The original handlers parse paths with pathAfter(req, "/api/<seg>/")
      // against the full original URL (Vercel runtime behavior). Express
      // mounted routers strip the prefix from req.url, so restore it here.
      req.url = (req.originalUrl || req.url);
      try {
        // Dynamic import resolves .js at runtime. In development import.meta.url
        // points at this router file (server/legacy/router.ts), but after the
        // esbuild production bundle it points at dist/index.js. Resolve the
        // legacy action files relative to the SOURCE directory (where the .js
        // files actually live) instead of the bundled entry point.
        const mod: any = await import(/* @vite-ignore */ resolveLegacyModule(file));
        const handler = mod.default;
        if (typeof handler !== "function") {
          res.status(404).json({ error: "Not found" });
          return;
        }
        await handler(req, res);
      } catch (e) {
        console.error(`[legacy] ${req.url} error:`, e);
        if (!res.headersSent) res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
      }
    });
  };

  // /api/<segment>/... maps to server/legacy/<segment>.action.js
  mount("/auth", "auth.action");
  mount("/account", "account.action");
  mount("/admin", "admin.action");
  mount("/orders", "orders.action");
  mount("/support", "support.action");
  mount("/content", "content.action");
  mount("/notifications", "notifications.action");
  mount("/upload", "upload.action");

  // /api/notify → support notifyRequest (public sourcing widget)
  api.all("/notify", async (req: Request, res: Response) => {
    // req.url is "/notify" (prefix stripped by the mounted router) —
    // legacy handlers expect the full Vercel-style URL "/api/notify".
    req.url = req.url === "/notify" ? "/api/notify" : "/api/notify/" + req.url.slice(1);
    req.originalUrl = "/api/notify";
    try {
      const mod: any = await import(/* @vite-ignore */ resolveLegacyModule("support.action"));
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
    }
  });

  // /api/rate-game → content rateGame (legacy top-level alias)
  api.all("/rate-game", async (req: Request, res: Response) => {
    req.url = "/api/content/rate-game";
    req.originalUrl = "/api/content/rate-game";
    try {
      const mod: any = await import(/* @vite-ignore */ resolveLegacyModule("content.action"));
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
    }
  });

  // Top-level legacy endpoints
  api.all("/content", async (req: Request, res: Response) => {
    req.url = req.originalUrl || req.url;
    try {
      const mod: any = await import(/* @vite-ignore */ resolveLegacyModule("content"));
      await mod.default(req, res);
    } catch (e) {
      console.error(`[legacy] ${req.url} error:`, e);
      if (!res.headersSent) res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
    }
  });

  return api;
}
