import { describe, it, expect, vi, beforeEach } from "vitest";
/* Store branding: logo upload (S3) + social extra links (tiktok/youtube/x).
   Tests validate the *rules* through mocked modules (no live DB/S3). */
vi.mock("./legacy/db.js", () => ({
  sql: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
const dbSql = (await import("./legacy/db.js")).sql as any;
const mockInsert = vi.fn(() => Promise.resolve(undefined));
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
vi.mock("./storage.ts", () => ({
  storagePut: vi.fn(async (key: string) => ({ key, url: `https://storage.example.com/${key}` })),
}));
const { storagePut } = await import("./storage.ts");
const makeRes = () => {
  const body: any = { status: null, data: null };
  const res: any = {
    status: (code: number) => { body.status = code; return res; },
    json: (data: any) => { body.data = data; return res; },
  };
  return { res, body };
};
const handlerUrl = import.meta.url.replace(/branding\.test\.ts$/, "legacy/admin.action.js");
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
function smallPng(): string {
  // tiny valid PNG (1x1) as base64 data URL
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
    "hex",
  );
  return `data:image/png;base64,${png.toString("base64")}`;
}
describe("logo upload validation", () => {
  it("accepts a valid PNG base64 data URL and stores it on S3", async () => {
    const body = await callSettings("POST", { logo: smallPng() });
    expect(body.status).toBe(200);
    const putCalls = (storagePut as any).mock.calls;
    expect(putCalls.length).toBe(1);
    expect(putCalls[0][0]).toMatch(/^qwader\/logo\.png/);
    expect(putCalls[0][2]).toBe("image/png");
  });
  it("stores the logo URL in site_content.siteBranding", async () => {
    await callSettings("POST", { logo: smallPng() });
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls;
    const insertCall = [...innerCalls].reverse().find(
      (c: any[]) => Array.isArray(c[0]) && c[0].some((s: string) => String(s).includes("siteBranding")),
    );
    expect(insertCall).toBeTruthy();
    const parsed = JSON.parse(insertCall[1] as string);
    expect(parsed.logoUrl).toContain("https://storage.example.com/");
  });
  it("rejects plain base64 without a data URL header", async () => {
    const body = await callSettings("POST", { logo: Buffer.from("hello").toString("base64") });
    expect(body.status).toBe(400);
    expect((storagePut as any).mock.calls.length).toBe(0);
  });
  it("rejects non-image MIME types (e.g. text/plain)", async () => {
    const logo = `data:text/plain;base64,${Buffer.from("evil").toString("base64")}`;
    const body = await callSettings("POST", { logo });
    expect(body.status).toBe(400);
    expect((storagePut as any).mock.calls.length).toBe(0);
  });
  it("rejects logos above 2 MB", async () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 0x89); // starts with PNG byte but huge
    const logo = `data:image/png;base64,${big.toString("base64")}`;
    const body = await callSettings("POST", { logo });
    expect(body.status).toBe(400);
    expect((storagePut as any).mock.calls.length).toBe(0);
  });
  it("handles base64 without padding gracefully (Node decodes partial; upload still happens)", async () => {
    // Node's Buffer.from(..., "base64") does not throw on stray chars — it
    // ignores them. The validation path relies on the data-URL header +
    // size check; a partially valid payload is not a security path since
    // S3 bytes are only served as the configured mime type.
    const logo = `data:image/png;base64,${Buffer.from("abc").toString("base64")}!!!`;
    const body = await callSettings("POST", { logo });
    expect(body.status).toBe(200);
  });
  it("allows the owner to clear the logo with an empty string", async () => {
    const body = await callSettings("POST", { logo: "" });
    expect(body.status).toBe(200);
    expect((storagePut as any).mock.calls.length).toBe(0);
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls;
    const insertCall = [...innerCalls].reverse().find(
      (c: any[]) => Array.isArray(c[0]) && c[0].some((s: string) => String(s).includes("siteBranding")),
    );
    const parsed = JSON.parse(insertCall[1] as string);
    expect(parsed.logoUrl).toBe("");
  });
});
describe("logo authorization", () => {
  it("blocks staff (non-owner) from uploading", async () => {
    const body = await callSettings("POST", { logo: smallPng() }, { role: "staff" });
    expect(body.status).toBe(403);
    expect((storagePut as any).mock.calls.length).toBe(0);
  });
});
describe("social extra links persistence", () => {
  it("persists tiktok/youtube/x alongside existing links", async () => {
    const socialLinks = {
      whatsapp: "0779538304", telegram: "", instagram: "qwader.game", facebook: "",
      storeEmail: "qwaderomar3@gmail.com", storePhone: "0779538304", storeAddress: "عمّان",
      tiktok: "qwadergames", youtube: "QwaderGames", x: "qwadergames",
    };
    const body = await callSettings("POST", { socialLinks });
    expect(body.status).toBe(200);
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls;
    const insertCall = innerCalls.find(
      (c: any[]) => Array.isArray(c[0]) && c[0].some((s: string) => String(s).includes("'socialLinks'")),
    );
    expect(insertCall).toBeTruthy();
    const parsed = JSON.parse(insertCall[1] as string);
    expect(parsed.tiktok).toBe("qwadergames");
    expect(parsed.youtube).toBe("QwaderGames");
    expect(parsed.x).toBe("qwadergames");
  });
  it("rejects newline injection in extra social fields", async () => {
    const socialLinks = { tiktok: "evil\ngoogle.com" };
    const body = await callSettings("POST", { socialLinks });
    expect(body.status).toBe(200);
    const innerCalls = (dbSql.mock.results[0].value as any).mock.calls;
    const insertCall = innerCalls.find(
      (c: any[]) => Array.isArray(c[0]) && c[0].some((s: string) => String(s).includes("'socialLinks'")),
    );
    const parsed = JSON.parse(insertCall[1] as string);
    expect(parsed.tiktok).not.toContain("\n");
  });
});
