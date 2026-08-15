import { describe, it, expect, vi, beforeEach } from "vitest";

/* Settings tab: owner-only contact-info + SMTP editing endpoint.
   Tests validate the *rules* through mocked modules (no live DB). */

vi.mock("./legacy/db.js", () => ({
  sql: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));

const dbSql = (await import("./legacy/db.js")).sql as any;

const mockInsert = vi.fn(() => Promise.resolve(undefined));
const mockUpdate = vi.fn(() => Promise.resolve(undefined));
vi.mock("./legacy/auth.js", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getAuth: vi.fn(() => Promise.resolve({ user: { id: "u1", role: "owner" } })),
    isStaff: (a: any) => a?.user?.role === "owner" || a?.user?.role === "staff",
    isOwner: (a: any) => a?.user?.role === "owner",
    logActivity: vi.fn(() => Promise.resolve(undefined)),
  };
});

const { getAuth, logActivity } = await import("./legacy/auth.js");

const makeRes = () => {
  const body: any = { status: null, data: null };
  const res: any = {
    status: (code: number) => { body.status = code; return res; },
    json: (data: any) => { body.data = data; return res; },
  };
  return { res, body };
};

const handlerUrl = import.meta.url.replace(/settings\.test\.ts$/, "legacy/admin.action.js");

async function callSettings(method: string, bodyObj: any, opts: { role?: string } = {}) {
  const auth = opts.role ? { user: { id: "u1", role: opts.role }, userId: "u1", name: "t" } : { user: { id: "u1", role: "owner" }, userId: "u1", name: "t" };
  (getAuth as any).mockResolvedValue(auth);
  const mod = await import(handlerUrl);
  const { res, body } = makeRes();
  const req: any = { method, url: "/api/admin/settings", originalUrl: "/api/admin/settings", body: bodyObj };
  await mod.default(req, res);
  return body;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbSql.mockImplementation(() => vi.fn().mockImplementation(async (strings: any, ...vals: any[]) => {
    const text = (strings as string[]).join("?");
    if (text.includes("select")) return [{ value: null }];
    return undefined;
  }));
});

describe("settings endpoint authorization", () => {
  it("staff (non-owner) cannot GET settings", async () => {
    const body = await callSettings("GET", {}, { role: "staff" });
    expect(body.status).toBe(403);
  });
  it("staff (non-owner) cannot POST settings", async () => {
    const body = await callSettings("POST", { socialLinks: { whatsapp: "123" } }, { role: "staff" });
    expect(body.status).toBe(403);
  });
  it("customer cannot access settings", async () => {
    const body = await callSettings("GET", {}, { role: "customer" });
    expect(body.status).toBe(403);
  });
  it("DELETE is rejected", async () => {
    const body = await callSettings("DELETE", {}, {});
    expect(body.status).toBe(405);
  });
});

describe("contact-info validation", () => {
  it("accepts a well-formed socialLinks object", async () => {
    const body = await callSettings("POST", { socialLinks: { whatsapp: "962779538304", telegram: "qwader", instagram: "@qwader", facebook: "https://facebook.com/q", storeEmail: "store@example.com", storePhone: "0779538304", storeAddress: "عمان" } }, {});
    expect(body.status).toBe(200);
    expect(body.data.ok).toBe(true);
  });
  it("rejects a malformed store email (drops it silently)", async () => {
    const body = await callSettings("POST", { socialLinks: { storeEmail: "not-an-email" } }, {});
    expect(body.status).toBe(200);
    // the stored JSON for 'socialLinks' must not contain the bad email
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls.filter((c: any[]) => c[0] && c[0].some((s: string) => s.includes("socialLinks")));
    expect(innerCalls.length).toBeGreaterThan(0);
    const storedJson = innerCalls[0][1]; // tagged template: 1st arg = strings, subsequent = values
    expect(storedJson).not.toContain("not-an-email");
    expect(JSON.parse(storedJson).storeEmail).toBe("");
  });
  it("truncates address at 300 chars", async () => {
    const long = "أ".repeat(500);
    await callSettings("POST", { socialLinks: { storeAddress: long } }, {});
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls.filter((c: any[]) => c[0] && c[0].some((s: string) => s.includes("socialLinks")));
    const storedJson = innerCalls[0][1];
    expect(JSON.parse(storedJson).storeAddress.length).toBe(300);
  });
});

describe("SMTP validation", () => {
  it("clears a malformed email user instead of crashing", async () => {
    const body = await callSettings("POST", { smtp: { user: "not an email", appPassword: "abcdefghijklmnop" } }, {});
    expect(body.status).toBe(200);
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls.filter((c: any[]) => c[0] && c[0].some((s: string) => s.includes("'settings'") && s.includes("insert")));
    expect(innerCalls.length).toBeGreaterThan(0);
    const storedJson = innerCalls[0][1];
    const parsed = JSON.parse(storedJson);
    expect(parsed.smtpUser).toBe(""); // malformed user is cleared, never stored
    expect(parsed.smtpPass).toBe("abcdefghijklmnop");
  });
  it("accepts an empty user (keeps current SMTP config)", async () => {
    const body = await callSettings("POST", { smtp: { user: "", appPassword: "abcdefghijklmnop" } }, {});
    expect(body.status).toBe(200);
  });
  it("rejects an app password shorter than 12 chars", async () => {
    const body = await callSettings("POST", { smtp: { user: "store@gmail.com", appPassword: "short" } }, {});
    expect(body.status).toBe(400);
  });
  it("accepts valid SMTP and logs activity", async () => {
    const body = await callSettings("POST", { smtp: { user: "store@gmail.com", appPassword: "abcdefghijklmnop" } }, {});
    expect(body.status).toBe(200);
    expect(logActivity).toHaveBeenCalled();
  });
});
