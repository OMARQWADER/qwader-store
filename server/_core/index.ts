import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { legacyApiRouter } from "../legacy/router";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureSchema, getDatabaseUrl } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Fail fast in production: a PostgreSQL (Neon) DATABASE_URL is mandatory.
  // If a platform injects DATABASE_URL as mysql://, NEON_DATABASE_URL wins.
  if (process.env.NODE_ENV === "production" && !getDatabaseUrl()) {
    throw new Error(
      "Missing DATABASE_URL. Set it in your platform → Environment Variables as a postgresql:// connection string (Neon)."
    );
  }
  // Configure body parser with larger size limit for file uploads
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind on 0.0.0.0 (all interfaces) so the server works inside Docker
  // containers and on platforms (Railway/Render) that reach containers by IP.
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : undefined;
  server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
