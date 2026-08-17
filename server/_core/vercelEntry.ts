/**
 * Vercel API catch-all entry point (source for the bundled function).
 *
 * This file is compiled by `scripts/build-vercel.mjs` with
 * `esbuild --bundle` directly into `api/vercel-handler.js` at the project
 * root. Because it is bundled (not just transpiled), every LOCAL relative
 * import in this file's dependency graph (./vercel, ./oauth,
 * ./storageProxy, ../routers, ../legacy/router, ./context, ../db, ...) gets
 * inlined into that single output file at build time. Only real npm
 * packages (express, @trpc/server, etc.) stay external and are resolved
 * from Vercel's own node_modules at runtime.
 *
 * This avoids Vercel's zero-config Node.js function builder, which only
 * transpiles source files 1:1 without bundling — under "type": "module"
 * (ESM), Node's runtime module loader then fails to resolve extensionless
 * relative imports (ERR_MODULE_NOT_FOUND), which was the root cause of the
 * previous HTTP 500 on every /api/* route.
 *
 * Vercel rewrites `/api/<anything>` to `/api/vercel-handler?path=/<anything>`,
 * preserving the original HTTP method, headers and body, so the full
 * QWADER STORE Express API (REST + tRPC + OAuth + storage proxy) is served
 * here with zero endpoint changes.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getVercelApp } from "./vercel";

export default async function vercelHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Vercel rewrites /api/<anything> to /api/vercel-handler?path=/<anything>,
    // so req.query.path carries the original route. Outside Vercel (local
    // simulation with a native http request, where req.query doesn't exist),
    // fall back to the raw request URL as-is.
    let path = typeof req.query?.path === "string" ? req.query.path : "";
    if (!path && req.url) {
      // Outside Vercel the raw URL already carries the /api/* route, keep it
      // as-is so Express routers mounted under /api match it.
      path = req.url.split("?")[0] || "/";
    }
    if (!path) path = "/";
    // Reconstruct the original /api/* URL (query string included).
    const queryString = req.url && req.url.includes("?")
      ? req.url.slice(req.url.indexOf("?"))
      : "";
    // The rewrite in vercel.json strips the leading "/api" segment before
    // handing us `path`, but every route registered on `app` is mounted
    // under "/api". Re-add it here so Express can actually match.
    const fullPath = path.startsWith("/api") ? path : `/api${path}`;
    req.url = fullPath + queryString;
    // `originalUrl` is not part of VercelRequest's type, but Express and our
    // legacy legacyApiRouter read it — define it on the request object.
    const anyReq = req as unknown as Record<string, unknown>;
    if (!anyReq.originalUrl) anyReq.originalUrl = req.url;

    const app = await getVercelApp();
    app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
  } catch (error) {
    console.error("[Vercel] handler failed:", error);
    // Guard against response objects without Express/Vercel helpers
    // (e.g. plain Node http responses during local simulation).
    const anyRes = res as unknown as Record<string, unknown>;
    if (!anyRes.headersSent && typeof anyRes.status === "function") {
      res.status(500).json({ error: "Internal server error" });
    } else if (!anyRes.headersSent && typeof anyRes.end === "function") {
      (res as any).writeHead(500, { "content-type": "application/json" });
      (res as any).end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}
