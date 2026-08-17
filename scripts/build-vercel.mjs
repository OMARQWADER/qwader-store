/**
 * Build step for Vercel deployment.
 *
 * 1. `vite build`  → client bundle into dist/public
 * 2. `esbuild`     → server/_core/vercelEntry.ts into api/vercel-handler.js
 *    (root-level api/, NOT dist/api/ — Vercel's zero-config function
 *     detection always scans the repo's root api/ directory, regardless of
 *     outputDirectory. Emitting straight there, fully bundled, means Vercel
 *     deploys this exact self-contained file as-is instead of re-compiling
 *     an un-bundled source file itself. --bundle inlines every local
 *     relative import (./vercel, ./oauth, ../routers, ../db, ...) into this
 *     one file; --packages=external keeps real npm packages resolved from
 *     Vercel's own node_modules at runtime.)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");

execSync("vite build", { cwd: root, stdio: "inherit" });

// Emit the bundled, self-contained function at the project root's api/
// directory — this is what Vercel actually deploys as the Serverless
// Function for every /api/* route.
fs.mkdirSync(path.join(root, "api"), { recursive: true });
execSync(
  "esbuild server/_core/vercelEntry.ts --platform=node --packages=external --bundle --format=esm --outfile=api/vercel-handler.js",
  { cwd: root, stdio: "inherit" }
);

// Compile the whole server tree (TS + JS) to dist/server/ so that legacy
// action files — plain .js loaded by dynamic import() but pulling in TS
// modules like ../storage.ts — resolve to real JS at runtime. The handler
// bundle keeps packages external, so everything in dist/server is resolved
// by Vercel's own node_modules at invocation time.
fs.rmSync(path.join(root, "dist", "server"), { recursive: true, force: true });
execSync(
  "esbuild \"server/**/*.ts\" \"server/**/*.js\" --platform=node --packages=external --format=esm --outdir=dist/server",
  { cwd: root, stdio: "inherit" }
);

// Rewrite relative import specifiers in dist/server/ so Node ESM can resolve
// them at runtime (.ts → .js, extensionless → .js).
execSync("node scripts/fix-extensions.mjs", { cwd: root, stdio: "inherit" });

console.log("Vercel build complete: dist/public + api/vercel-handler.js + dist/server");
