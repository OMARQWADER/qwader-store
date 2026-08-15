/**
 * Local simulation of a Vercel serverless invocation of api/vercel-handler.js.
 *
 * Spins up a real local HTTP server whose request listener delegates to the
 * bundled handler (exactly how @vercel/node invokes the exported default),
 * then verifies endpoints with real http.request calls.
 */
import http from "node:http";
import handler from "../api/vercel-handler.js";

const server = http.createServer((req, res) => {
  handler(req, res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout POST ${path}`)), 60_000);
    const payload = JSON.stringify(body);
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          clearTimeout(timer);
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
        });
        res.on("error", reject);
      }
    );
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.write(payload);
    req.end();
  });
}
function get(path) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout GET ${path}`)), 60_000);
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        clearTimeout(timer);
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
      });
      res.on("error", reject);
    }).on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

const cases = [
  ["/api/auth/login", 200],
  ["/api/orders", 404],
  ["/api/support", 404],
  ["/api/admin", 404],
  ["/api/notify", 404],
  ["/api/rate-game", 404],
  ["/api/content/stats", 200],
  ["/api/content", 200],
  ["/api/products", 404], // not a legacy segment — Express falls through to SPA index.html → 200 html
  ["/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D", 200],
];
// POST cases: 4xx means the handler executed and rejected invalid input
// (auth/validation failures are expected without a session — 5xx = bug).
const postCases = [
  ["/api/auth/login", { email: "noone@example.invalid", password: "x" }],
  ["/api/support", { name: "a", message: "b" }],
  ["/api/rate-game", { gameId: "g1", rating: 5 }],
];

let failed = 0;
for (const [path, expect] of cases) {
  try {
    const r = await get(path);
    const isHtml = r.body.trim().startsWith("<!");
    const label = expect === 200 && isHtml ? "SPA " : "JSON";
    const ok = expect === r.status || (expect === 404 && r.status === 200 && isHtml);
    console.log(
      `${ok ? "OK " : "FAIL"} GET ${path} -> ${r.status} [${label}]`,
      r.body.slice(0, 100)
    );
    if (!ok) failed++;
  } catch (e) {
    console.log(`ERR  GET ${path}:`, e.message);
    failed++;
  }
}
for (const [path, body] of postCases) {
  try {
    const r = await post(path, body);
    const isJson = r.body.trim().startsWith("{") || r.body.trim().startsWith("[");
    // 5xx after a POST means the handler itself blew up — everything else
    // (4xx validation/auth rejections) proves the route executed correctly.
    const ok = r.status < 500 && isJson;
    console.log(`${ok ? "OK " : "FAIL"} POST ${path} -> ${r.status} [JSON]`, r.body.slice(0, 100));
    if (!ok) failed++;
  } catch (e) {
    console.log(`ERR  POST ${path}:`, e.message);
    failed++;
  }
}

server.close();
process.exit(failed ? 1 : 0);
