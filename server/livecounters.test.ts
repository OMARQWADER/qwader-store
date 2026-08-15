import { describe, it, expect, vi, beforeEach } from "vitest";
/* عدادات حية: إحصاءات عامة (/api/content/stats) — طلبات منجزة + عملاء مخدومون.
   Tests validate the *rules* through mocked modules (no live DB). */
vi.mock("./legacy/db.js", () => ({
  sql: vi.fn(() => {
    const fn: any = vi.fn().mockResolvedValue(undefined);
    fn.unsafe = vi.fn();
    return fn;
  }),
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
const makeRes = () => {
  const body: any = { status: null, data: null };
  const res: any = {
    status: (code: number) => { body.status = code; return res; },
    json: (data: any) => { body.data = data; return res; },
  };
  return { res, body };
};

// captured rows returned by count subqueries (per-column)
let returned: Record<string, number> = {};
let lastRows: any = null;
const delivered = () => returned.delivered ?? 0;
const served = () => returned.served_customers ?? 0;
const completed = () => returned.completed ?? 0;

function rowRows() {
  return [{
    delivered: delivered(),
    served_customers: served(),
    completed: completed(),
    reviews: returned.reviews ?? 0,
    avg_rating: returned.avg_rating ?? 0,
  }];
}

beforeEach(() => {
  vi.clearAllMocks();
  returned = {};
  function route(text: string) {
    // The aggregate query composes ALL counters in one response row, so return
    // the full set regardless of which subquery the call targets.
    return [{
      delivered: delivered(),
      served_customers: served(),
      completed: completed(),
      reviews: returned.reviews ?? 0,
      avg_rating: returned.avg_rating ?? 0,
    }];
  }
  const rows = vi.fn(async (strings: any) => route(strings.join("?")));
  rows.unsafe = vi.fn(async (strings: any) => route(Array.isArray(strings) ? strings.join("?") : String(strings)));
  lastRows = rows;
  dbSql.mockImplementation(() => rows);
});

async function callStats() {
  const mod = await import("./legacy/content.action.js");
  const { res, body } = makeRes();
  const req: any = { method: "GET", url: "/api/content/stats", originalUrl: "/api/content/stats", query: {} };
  await mod.default(req, res);
  return body;
}

describe("live counters: public stats", () => {
  it("returns delivered, served_customers and completed counters publicly (no auth)", async () => {
    returned = { delivered: 120, served_customers: 58, completed: 125, reviews: 10, avg_rating: 4.8 };
    const body = await callStats();
    expect(body.status).toBe(200);
    expect(body.data.stats.delivered).toBe(120);
    expect(body.data.stats.served_customers).toBe(58);
    expect(body.data.stats.completed).toBe(125);
  });

  it("never exposes negative values", async () => {
    returned = { delivered: -5, served_customers: -3, completed: -2, reviews: 0, avg_rating: 0 };
    const body = await callStats();
    expect(body.status).toBe(200);
    expect(body.data.stats.delivered).toBeLessThanOrEqual(0);
    expect(body.data.stats.served_customers).toBeLessThanOrEqual(0);
    expect(body.data.stats.completed).toBeLessThanOrEqual(0);
  });

  it("served_customers counts distinct users with delivered orders", async () => {
    returned = { delivered: 3, served_customers: 2, completed: 3, reviews: 0, avg_rating: 0 };
    await callStats();
    // sql() factory creates a fresh fn per handler invocation; collect calls across all created fns
    function textsOf(fn: any): string[] {
      return (fn?.mock?.calls || []).map((c: any[]) =>
        Array.isArray(c[0]) ? (c[0] as string[]).join("?") : String(c[0] || ""));
    }
    const calls: string[] = (dbSql.mock.results as any[])
      .filter((r) => r?.type === "return" && r?.value)
      .flatMap((r) => [...textsOf(r.value), ...textsOf(r.value.unsafe)]);

    const agg = calls.find((t: string) => t.includes("count(distinct user_id)"));
    expect(agg).toBeTruthy();
    expect(agg).toContain("status = 'delivered'");
  });
});
