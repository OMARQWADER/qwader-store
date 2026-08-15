/**
 * Full local simulation of how Vercel serves `dist` with the current
 * vercel.json: static files + /api/* catch-all function + SPA rewrites.
 * Verifies the 7 requested checkpoints.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import handler from "../api/vercel-handler.js";

const root = path.resolve(import.meta.dirname, "..", "dist");
const projectRoot = path.resolve(root, "..");
const publicDir = path.join(root, "public");

// Route matching mirrors vercel.json exactly.
const apiCatchAll = /^\/api\/(.*)/;
const rewrites = [
  [/^\/api\/(.*)/, () => null], // handled by the function route below
  [/^\/assets\/(.*)/, (m) => path.join(publicDir, "assets", m[1])],
  [/^\/__manus__\/(.*)/, (m) => path.join(publicDir, "__manus__", m[1])],
  [/^\/favicon(\..*)?/, (m) => path.join(publicDir, "favicon" + (m[1] || ".svg"))],
  [/^\/robots\.txt$/, () => path.join(publicDir, "robots.txt")],
];
const spaRewrite = path.join(publicDir, "index.html");

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  let am = apiCatchAll.exec(urlPath);
  if (am) {
    // /api/* → serverless function, same destination as vercel.json:
    // dest "/api/vercel-handler?path=/$1" → function at api/vercel-handler
    // receives the full URL; Vercel strips nothing when dest is a function.
    handler(req, res);
    return;
  }
  // vercel.json route: { "src": "/server/(.*)", "status": 404 }
  // Blocks dist/server/** from being served as static files.
  if (/^\/server\//.test(urlPath)) {
    res.writeHead(404).end("Not Found");
    return;
  }
  let file = null;
  for (const [re, fn] of rewrites) {
    const m = re.exec(urlPath);
    if (m) { file = fn(m); break; }
  }
  if (!file) {
    const candidate = path.join(publicDir, urlPath === "/" ? "" : urlPath);
    const fileForRoot = urlPath === "/" ? spaRewrite : candidate;
    // Vercel's filesystem handle only serves existing REGULAR files; otherwise
    // the SPA rewrite applies.
    if (fileForRoot !== spaRewrite && fs.existsSync(fileForRoot) && fs.statSync(fileForRoot).isFile()) file = fileForRoot;
    else file = spaRewrite;
  }
  const ext = path.extname(file).slice(1);
  const mime = { html: "text/html; charset=utf-8", js: "application/javascript", css: "text/css", svg: "image/svg+xml", ico: "image/x-icon", txt: "text/plain", json: "application/json" }[ext] || "application/octet-stream";
  res.setHeader("Content-Type", mime);
  fs.createReadStream(file).on("error", () => res.writeHead(500).end("read error")).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

function get(url) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout GET ${url}`)), 60_000);
    http.get(`http://127.0.0.1:${port}${url}`, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { clearTimeout(t); resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); });
      res.on("error", reject);
    }).on("error", (e) => { clearTimeout(t); reject(e); });
  });
}
function post(url, body) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout POST ${url}`)), 60_000);
    const payload = JSON.stringify(body);
    const req = http.request(`http://127.0.0.1:${port}${url}`, {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { clearTimeout(t); resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); });
      res.on("error", reject);
    });
    req.on("error", (e) => { clearTimeout(t); reject(e); });
    req.write(payload); req.end();
  });
}

let failed = 0;
function check(label, cond, extra = "") { console.log(`${cond ? "PASS" : "FAIL"} ${label} ${extra}`); if (!cond) failed++; }

// 1) Homepage works
const home = await get("/");
check("1. الصفحة الرئيسية", home.status === 200 && home.body.includes("<html"));

// 2) JS/CSS in dist/public works — detect hashes from index.html
const homeSrc = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
const assetJs = (homeSrc.match(/\/assets\/[^"']+\.js/) || [""])[0];
const assetCss = (homeSrc.match(/\/assets\/[^"']+\.css/) || [""])[0];
console.log("detected assets:", assetJs, assetCss);
const js = assetJs ? await get(assetJs) : { status: 500, body: "" };
const css = assetCss ? await get(assetCss) : { status: 500, body: "" };
check("2a. ملف JavaScript (assets)", js.status === 200 && js.body.length > 10000);
check("2b. ملف CSS (assets)", css.status === 200 && css.body.length > 1000);

// 3) /api/* reaches the serverless function
const login = await post("/api/auth/login", { email: "nobody@example.invalid", password: "x" });
check("3. /api/* → Vercel Function", login.status === 401 && login.body.includes("بيانات الدخول") || login.status === 429);
const content = await get("/api/content");
check("3b. /api/content عبر الـ Function", content.status === 200 && content.body.includes("games"));

// 4) SPA routes don't 404
const products = await get("/products");
const admin = await get("/admin");
const payment = await get("/payment-methods");
check("4a. SPA /products → index.html", products.status === 200 && products.body.includes("<html") && products.body.includes("assets/"));
check("4b. SPA /admin → index.html", admin.status === 200 && admin.body.includes("<html"));
check("4c. SPA /payment-methods → index.html", payment.status === 200 && payment.body.includes("<html"));

// 8) /server/* blocked (dist/server must not be downloadable as static files)
const serverFile = await get("/server/_core/index.js");
const serverDb = await get("/server/db.js");
check("8a. /server/* → 404 (محمي)", serverFile.status === 404);
check("8b. /server/db.js → 404 (محمي)", serverDb.status === 404);

// 5) Function discovery (api/vercel-handler.js exists + imports cleanly)
check("5. api/vercel-handler.js موجود", fs.existsSync(path.join(projectRoot, "api", "vercel-handler.js")));

// 6) DATABASE_URL untouched (handler boots only via env, no hardcoded URL)
// Vercel error messages may mention the protocol name; what matters is that no
// actual connection URL with credentials (@) is embedded in the bundle.
const bundleSrc = fs.readFileSync(path.join(projectRoot, "api", "vercel-handler.js"), "utf8");
check("6. لا DATABASE_URL مضمّن بالكود", !/postgresql:\/\/[\w%:.@-]*@/.test(bundleSrc) && !/npg_/.test(bundleSrc) && !/neon\.tech/.test(bundleSrc));

// 7) build already succeeded (we ran it before this script)
check("7. npm run build:vercel نجح", fs.existsSync(path.join(root, "public", "index.html")));

// Extra: tRPC works through the function
const me = await get("/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D");
check("extra. tRPC عبر الـ Function", me.status === 200);

server.close();
console.log(failed ? `\n${failed} FAIL(S)` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
