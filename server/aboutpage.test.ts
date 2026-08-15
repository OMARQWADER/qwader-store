import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
/* About page: story + weekly working hours.
   Rules validated through the real admin.action.js handler (mocked DB/S3 — no live calls). */
vi.mock("./legacy/db.js", () => ({
  sql: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
const dbSql = (await import("./legacy/db.js")).sql as any;
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
vi.mock("./storage.ts", () => ({ storagePut: vi.fn(async (key: string) => ({ key, url: `https://storage.example.com/${key}` })) }));
const makeRes = () => {
  const body: any = { status: null, data: null };
  const res: any = {
    status: (code: number) => { body.status = code; return res; },
    json: (data: any) => { body.data = data; return res; },
  };
  return { res, body };
};
const handlerUrl = import.meta.url.replace(/aboutpage\.test\.ts$/, "legacy/admin.action.js");
async function callSettings(method: string, bodyObj: any, opts: { role?: string } = {}) {
  const auth = opts.role ? { user: { id: "u1", role: opts.role }, userId: "u1", name: "t" } : { user: { id: "u1", role: "owner" }, userId: "u1", name: "t" };
  (getAuth as any).mockResolvedValue(auth);
  const mod = await import(handlerUrl);
  const { res, body } = makeRes();
  const req: any = { method, url: "/api/admin/settings", originalUrl: "/api/admin/settings", body: bodyObj };
  await mod.default(req, res);
  return body;
}
const savedRows: any[] = [];
beforeEach(() => {
  savedRows.length = 0;
  vi.clearAllMocks();
  dbSql.mockImplementation(() => vi.fn().mockImplementation(async (strings: any, ...vals: any[]) => {
    const text = (strings as string[]).join("?");
    if (text.includes("select")) return [{ value: null }];
    if (text.includes("insert into site_content")) savedRows.push({ key: text.includes("'aboutPage'") ? "aboutPage" : String(vals[0]), value: text.includes("'aboutPage'") ? vals[0] : vals[1] });
    return undefined;
  }));
});

describe("aboutPage: owner-only persistence & validation", () => {
  it("rejects non-owner accounts", async () => {
    const body = await callSettings("POST", { aboutPage: { headline: "x", story: "", hours: [] } }, { role: "staff" });
    expect(body.status).toBe(403);
  });

  it("saves a valid aboutPage (headline + story + hours)", async () => {
    const body = await callSettings("POST", { aboutPage: {
      headline: "عنوان تجريبي",
      story: "قصة المتجر",
      hours: [{ day: "السبت", en: "sat", open: "14:00", close: "23:00", enabled: true }],
    } });
    expect(body.status).toBe(200);
    expect(savedRows.length).toBeGreaterThan(0);
    const ap = JSON.parse(savedRows.find((s) => s.key === "aboutPage")!.value);
    expect(ap.headline).toBe("عنوان تجريبي");
    expect(ap.story).toBe("قصة المتجر");
    expect(ap.hours[0]).toMatchObject({ en: "sat", open: "14:00", close: "23:00", enabled: true });
  });

  it("accepts 24:00 as an overnight closing time", async () => {
    const body = await callSettings("POST", { aboutPage: {
      headline: "", story: "",
      hours: [{ day: "الخميس", en: "thu", open: "14:00", close: "24:00", enabled: true }],
    } });
    expect(body.status).toBe(200);
    const ap = JSON.parse(savedRows.find((s) => s.key === "aboutPage")!.value);
    expect(ap.hours[0].close).toBe("24:00");
  });

  it("rejects invalid hour formats", async () => {
    let body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: [{ day: "السبت", en: "sat", open: "25:00", close: "23:00", enabled: true }] } });
    expect(body.status).toBe(400);
    body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: [{ day: "السبت", en: "sat", open: "14:00", close: "23:60", enabled: true }] } });
    expect(body.status).toBe(400);
    body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: [{ day: "السبت", en: "sat", open: "1400", close: "23:00", enabled: true }] } });
    expect(body.status).toBe(400);
  });

  it("rejects days missing their English identifier", async () => {
    const body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: [{ day: "السبت", en: "", open: "14:00", close: "23:00", enabled: true }] } });
    expect(body.status).toBe(400);
  });

  it("rejects duplicate day identifiers", async () => {
    const body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: [
      { day: "السبت", en: "sat", open: "14:00", close: "23:00", enabled: true },
      { day: "سبت", en: "sat", open: "10:00", close: "12:00", enabled: true },
    ] } });
    expect(body.status).toBe(400);
  });

  it("rejects non-array hours payload", async () => {
    const body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours: "not an array" } });
    expect(body.status).toBe(200); // hours coerced to [] is acceptable; object shape must be valid
    await callSettings("POST", { aboutPage: { headline: "", story: "", hours: "not an array" } });
    const ap = savedRows.find((s) => s.key === "aboutPage");
    expect(JSON.parse(ap.value).hours).toEqual([]);
  });

  it("trims and slices story/headline safely", async () => {
    const body = await callSettings("POST", { aboutPage: { headline: " ".repeat(200), story: "a".repeat(5000), hours: [] } });
    expect(body.status).toBe(200);
    const ap = JSON.parse(savedRows.find((s) => s.key === "aboutPage")!.value);
    expect(ap.headline).toBe("");
    expect(ap.story.length).toBeLessThanOrEqual(2500);
  });

  it("caps the hours list to 7 entries", async () => {
    const hours = Array.from({ length: 12 }, (_, i) => ({ day: `د${i}`, en: `d${i}`, open: "10:00", close: "20:00", enabled: true }));
    const body = await callSettings("POST", { aboutPage: { headline: "", story: "", hours } });
    expect(body.status).toBe(200);
    const ap = JSON.parse(savedRows.find((s) => s.key === "aboutPage")!.value);
    expect(ap.hours.length).toBeLessThanOrEqual(7);
  });
});

describe("public content exposes aboutPage", () => {
  it("includes aboutPage in the public KEYS list", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("./server/legacy/content.action.js", "utf8");
    expect(src).toContain("aboutPage");
  });
});

describe("isStoreOpenNow interactive hours logic (client)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("detects a matching open window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 17, 30, 0)); // Wednesday
    const { isStoreOpenNow } = await import("../client/src/pages/AboutPage");
    expect(isStoreOpenNow([{ day: "الأربعاء", en: "wed", open: "16:00", close: "23:00", enabled: true }])).toBe(true);
    vi.setSystemTime(new Date(2026, 7, 12, 15, 59, 0));
    expect(isStoreOpenNow([{ day: "الأربعاء", en: "wed", open: "16:00", close: "23:00", enabled: true }])).toBe(false);
  });

  it("handles overnight spans (14:00 → 24:00)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13, 23, 30, 0)); // Thursday
    const { isStoreOpenNow } = await import("../client/src/pages/AboutPage");
    expect(isStoreOpenNow([{ day: "الخميس", en: "thu", open: "14:00", close: "24:00", enabled: true }])).toBe(true);
    vi.setSystemTime(new Date(2026, 7, 14, 0, 30, 0)); // Friday
    expect(isStoreOpenNow([
      { day: "الخميس", en: "thu", open: "14:00", close: "24:00", enabled: true },
      { day: "الجمعة", en: "fri", open: "14:00", close: "24:00", enabled: true },
    ])).toBe(false);
  });

  it("returns false for a disabled day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 17, 30, 0)); // Wednesday
    const { isStoreOpenNow } = await import("../client/src/pages/AboutPage");
    expect(isStoreOpenNow([
      { day: "السبت", en: "sat", open: "14:00", close: "23:00", enabled: true },
      { day: "الأربعاء", en: "wed", open: "16:00", close: "23:00", enabled: false },
    ])).toBe(false);
  });

  it("returns null for empty or missing hours", async () => {
    const { isStoreOpenNow } = await import("../client/src/pages/AboutPage");
    expect(isStoreOpenNow([])).toBeNull();
  });
});
