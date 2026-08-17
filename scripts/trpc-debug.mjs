import http from "http";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const root = process.env.PROJECT_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..", "qwader-game-store");
const appFactory = await import(resolve(root, "api/vercel-handler.js"));
const app = appFactory.app ?? appFactory.default?.app ?? appFactory.default;
const server = http.createServer((req, res) => app(req, res));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function hit(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const req = http.request({ method: "POST", host: url.hostname, port: url.port, path: url.pathname + url.search, headers: { "content-type": "application/json" } }, (res) => {
      let buf = ""; res.on("data", c => buf += c); res.on("end", () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on("error", reject);
    req.end(JSON.stringify({ "0": { json: null } }));
  });
}
for (const p of ["/api/trpc", "/api/trpc/", "/api/trpc/content.get", "/api/trpc/content.get?batch=1"]) {
  const r = await hit(p);
  console.log(p, "→", r.status, r.body.slice(0, 120));
}
server.close();
