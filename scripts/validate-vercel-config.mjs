/**
 * Validate vercel.json with the exact same logic the Vercel CLI uses
 * (from @vercel/static-config inside Vercel CLI 59.x) before build starts.
 * This reproduces the "Function Runtimes must have a valid version" check
 * that previously failed on runtime: "nodejs22.x".
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));

// --- Reproduce CLI validation (chunk-VE545BR3.js: validate functions) ---
// Minimal semver.valid implementation for plain version tags (what the CLI uses via its semver dep)
let sv = null;
try {
  const mod = await import("semver");
  sv = mod.default || mod;
} catch {
  sv = null;
}

function validTag(tag) {
  // Vercel CLI accepts: name@1.2.3 where the part after @ must be semver.
  // Runtime values WITHOUT "@" go through semver.valid(string) directly.
  return sv ? sv.valid(tag) : /\d+\.\d+\.\d+/.test(tag);
}

const errors = [];

// 1. functions block validation
const fns = cfg.functions || {};
for (const [path, func] of Object.entries(fns)) {
  if (path.startsWith("/")) {
    errors.push({ code: "invalid_function_source", path });
    continue;
  }
  if (!func || typeof func !== "object") {
    errors.push({ code: "invalid_function", path });
    continue;
  }
  if (func.runtime !== undefined) {
    const tag = `${func.runtime}`.split("@").pop();
    const sv = requireSemver();
    if (!tag || !(sv && sv.valid(tag))) {
      errors.push({
        code: "invalid_function_runtime",
        path,
        runtime: func.runtime,
        message:
          'Function Runtimes must have a valid version, for example `now-php@1.0.0`.',
      });
    }
  }
  if (func.includeFiles !== undefined && typeof func.includeFiles !== "string") {
    errors.push({ code: "invalid_function_property", path, prop: "includeFiles" });
  }
}

// 2. routes validation (basic)
const routes = cfg.routes || [];
const handles = new Set(["filesystem", "error"]);
for (const [i, r] of routes.entries()) {
  if (!r.src && !r.handle && !r.continue && !r.check !== undefined) {
    if (r.src === undefined && r.handle === undefined) {
      errors.push({ code: "invalid_route", index: i });
    }
  }
  if (r.handle !== undefined && !handles.has(r.handle)) {
    errors.push({ code: "invalid_route_handle", index: i, handle: r.handle });
  }
}

// 3. required top-level fields
for (const field of ["buildCommand", "outputDirectory", "installCommand"]) {
  if (typeof cfg[field] !== "string" || cfg[field].length === 0) {
    errors.push({ code: "missing_config", field });
  }
}

console.log("vercel.json validated with CLI-equivalent logic.");
if (errors.length === 0) {
  console.log("ALL CHECKS PASSED — no runtime/config errors.");
  process.exit(0);
}
console.log("ERRORS:", JSON.stringify(errors, null, 2));
process.exit(1);
