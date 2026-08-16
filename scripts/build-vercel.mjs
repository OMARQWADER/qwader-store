import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");

function run(command) {
  console.log(`\n>>> ${command}\n`);
  execSync(command, {
    cwd: root,
    stdio: "inherit",
  });
}

console.log("========== QWADER STORE VERCEL BUILD ==========");

console.log("\n========== 1. VITE BUILD ==========");
run("vite build");

console.log("\n========== 2. VERCEL HANDLER ==========");

fs.mkdirSync(path.join(root, "api"), { recursive: true });

run(
  "esbuild server/_core/vercelEntry.ts --platform=node --bundle --format=esm --outfile=api/vercel-handler.js --packages=external"
);

console.log("\n========== 3. CLEAN SERVER ==========");

fs.rmSync(path.join(root, "dist", "server"), {
  recursive: true,
  force: true,
});

console.log("\n========== 4. COMPILE SERVER ==========");

/*
 * Do NOT bundle the whole server.
 *
 * The legacy server contains dynamic imports such as:
 *   import("../_lib/common.js")
 *
 * Bundling the entire tree makes esbuild try to resolve those dynamic
 * imports and breaks the build.
 *
 * Instead we compile the server normally and keep npm packages external.
 */
run(
  'esbuild "server/**/*.ts" "server/**/*.js" --platform=node --packages=external --format=esm --outdir=dist/server'
);

console.log("\n========== 5. FIX EXTENSIONS ==========");

run("node scripts/fix-extensions.mjs");

console.log("\n========== 6. COPY JSONWEBTOKEN INTO DIST ==========");

const srcJwt = path.join(root, "node_modules", "jsonwebtoken");
const dstJwt = path.join(root, "dist", "server", "node_modules", "jsonwebtoken");

if (!fs.existsSync(srcJwt)) {
  throw new Error("jsonwebtoken is not installed in node_modules");
}

fs.mkdirSync(path.dirname(dstJwt), { recursive: true });

fs.cpSync(srcJwt, dstJwt, {
  recursive: true,
});

console.log(`✅ Copied jsonwebtoken to: ${dstJwt}`);

console.log("\n========== 7. PATCH NODE MODULE RESOLUTION ==========");

/*
 * dist/server/legacy/*.js is executed from /var/task/dist/server/...
 *
 * Node searches node_modules upwards:
 *
 * dist/server/legacy
 * dist/server
 * dist
 * /var/task
 *
 * Therefore putting jsonwebtoken here:
 *
 * dist/server/node_modules/jsonwebtoken
 *
 * allows legacy files to resolve it without relying on Vercel's
 * root node_modules packaging.
 */

console.log("✅ dist/server/node_modules/jsonwebtoken exists");

console.log("\n========== 8. CHECK JSONWEBTOKEN ==========");

const jwtPackage = path.join(
  root,
  "dist",
  "server",
  "node_modules",
  "jsonwebtoken",
  "package.json"
);

if (!fs.existsSync(jwtPackage)) {
  throw new Error("❌ jsonwebtoken was not copied correctly");
}

console.log("✅ jsonwebtoken package found inside dist/server");

console.log("\n========== 9. CHECK LEGACY FILES ==========");

for (const file of [
  "dist/server/legacy/auth.js",
  "dist/server/legacy/auth.action.js",
]) {
  const full = path.join(root, file);

  if (fs.existsSync(full)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`⚠️ ${file} not found`);
  }
}

console.log("\n==========================================");
console.log("✅ Vercel build completed successfully");
console.log("==========================================");
