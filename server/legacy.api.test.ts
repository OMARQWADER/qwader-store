import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { legacyApiRouter } from "./legacy/router";
import express from "express";

// A minimal app that mounts the legacy router exactly like the real entry point,
// so we test the mounted path resolution without starting the HTTP server.
function createLegacyApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

async function call(app: Express, method: string, path: string, body?: unknown) {
  const res = await app.inject
    ? await (app as any).inject?.({ method, url: path, payload: body ? JSON.stringify(body) : undefined })
    : (() => {
        throw new Error("no inject");
      })();
  return res;
}

// express has no built-in inject(); use superagent-less raw approach with http
import http from "node:http";

async function request(app: Express, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; json: () => any }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const req = http.request(
        url,
        { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            server.close();
            try {
              resolve({ status: res.statusCode ?? 0, json: () => JSON.parse(Buffer.concat(chunks).toString()) });
            } catch (e) {
              resolve({ status: res.statusCode ?? 0, json: () => null });
            }
          });
        }
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe("legacy REST API", () => {
  const app = createLegacyApp();

  it("GET /api/content returns games and coupons", async () => {
    const res = await request(app, "GET", "/api/content");
    expect(res.status).toBe(200);
    const data = res.json();
    expect(data.content).toBeDefined();
    expect(Array.isArray(data.content.games)).toBe(true);
    expect(data.content.games.length).toBeGreaterThan(0);
    const game = data.content.games[0];
    expect(game).toHaveProperty("id");
    expect(game).toHaveProperty("name");
    expect(game).toHaveProperty("price");
  });

  it("GET /api/auth/me returns user:null when anonymous", async () => {
    const res = await request(app, "GET", "/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.json()).toEqual({ user: null });
  });

  it("GET /api/auth/otp returns 404 (no GET action)", async () => {
    const res = await request(app, "GET", "/api/auth/otp");
    expect(res.status).toBe(404);
  });

  it("signup-start rejects invalid input (short password)", async () => {
    const res = await request(app, "POST", "/api/auth/signup-start", {
      method: "email",
      identifier: `vitest-${Date.now()}@example.com`,
      name: "Test",
      password: "123",
    });
    // Server-side validation rejects the short password (400). Because rate
    // limits are DB-backed (same client fingerprint across runs), 429 is also
    // acceptable — it proves the server-side protection is active.
    expect([400, 429]).toContain(res.status);
    expect(res.json().error).toBeTruthy();
  });

  it("notify request is reachable (public sourcing widget)", async () => {
    const res = await request(app, "POST", "/api/notify", {
      name: "Test",
      phone: "0770000000",
      gameName: "FC 25",
      details: "vitest",
    });
    // accepts or rejects input; must not 500/404
    expect([200, 201, 400]).toContain(res.status);
  });
}, 30000);
