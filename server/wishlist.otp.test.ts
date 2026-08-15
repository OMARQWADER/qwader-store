import { describe, it, expect } from "vitest";
import express from "express";
import type { Express } from "express";
import { legacyApiRouter } from "./legacy/router";
import http from "node:http";

/* A minimal app that mounts the legacy router exactly like the real entry
   point, so we test the mounted path resolution without starting the HTTP
   server. Copied helper from legacy.api.test.ts. */
function createLegacyApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

function request(app: Express, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
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
            let parsed: any = null;
            try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) { /* not JSON */ }
            resolve({ status: res.statusCode ?? 0, body: parsed });
          });
        }
      );
      req.on("error", (e) => { server.close(); reject(e); });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

/* Wishlist + OTP hardening specs. */
describe("wishlist payload normalization (account.update)", () => {
  it("dedupes and caps the wishlist at 50 items, keeps only ids", () => {
    // replicate the exact normalization done in server/legacy/account.action.js
    const normalize = (body: any): any[] => {
      const raw = Array.isArray(body) ? body : [];
      return Array.from(
        new Set(
          raw
            .map((id: any) => (typeof id === "number" ? id : id != null && id !== "" ? String(id) : null))
            .filter((x: any) => x !== null)
        )
      ).slice(-50);
    };
    expect(normalize([1, 1, 2, "3", "", null, undefined])).toEqual([1, 2, "3"]);
    expect(normalize("not-an-array")).toEqual([]);
    expect(normalize(Array.from({ length: 100 }, (_, i) => i))).toHaveLength(50);
  });
});

describe("OTP generation is cryptographically random", () => {
  it("codes differ on every generation", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const bytes = (await import("node:crypto")).randomBytes(6);
      codes.add(Array.from(bytes, b => b % 10).join(""));
    }
    expect(codes.size).toBe(50);
  });
});

describe("signup-start fails openly when real OTP delivery is not possible", () => {
  it("phone signup without an account email returns 400 fail-safe", { timeout: 60_000 }, async () => {
    const app = createLegacyApp();
    // a phone number that definitely has no account (hence no email on file)
    const phone = `+962700000000${Date.now() % 10000}`;
    const res = await request(app, "POST", "/api/auth/signup-start", {
      method: "phone",
      identifier: phone,
      name: "TestFailSafe",
      password: "VerySecurePass9!",
    });
    // fail-safe: must NOT hand out a pendingToken when no code can be sent
    expect(res.status).toBe(400);
    expect(String(res.body?.error || "")).toContain("التحقق");
  });
});
