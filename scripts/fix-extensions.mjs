/**
 * Post-build pass for the Vercel `dist/server/` tree.
 *
 * esbuild with --packages=external preserves import specifiers verbatim,
 * but Node ESM at runtime cannot resolve extensionless or .ts specifiers.
 * This pass walks every compiled .js under dist/server/ and rewrites
 * relative import specifiers:
 *   - extensionless "./foo" or "../foo" → "./foo.js" / "../foo.js"
 *     (only when the .js target actually exists next to the importer)
 *   - explicit ".ts" suffix → ".js"
 * so the tree runs as plain ESM JavaScript on Vercel (nodejs22.x) with
 * packages resolved from the deployment's own node_modules.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const serverDir = path.join(root, "dist", "server");

const IMPORT_RE = /((?:import|export)\s+[^'"]*from\s*['"]|import\s*\(\s*['"])([^'"]+?)(['"])/g;

function resolveTarget(importerFile, spec) {
  const importerDir = path.dirname(importerFile);
  // esbuild drops the "./" prefix of relative specifiers (e.g. "./_core/env"
  // becomes "_core/env.js"). A specifier is local when it neither starts
  // with "." nor resolves to an installed package — we treat the latter case
  // as local only when the file physically exists next to the importer.
  // esbuild strips the "./" prefix of relative specifiers at compile time
  // ("./_core/env" → "_core/env"), so we normalize by treating a bare
  // non-package specifier as if it started with "./".
  const normalized = spec.startsWith(".") ? spec : "./" + spec;
  if (normalized !== "./" && !normalized.includes("/")) return null; // package
  if (spec.endsWith(".js") || spec.endsWith(".json")) return null; // already has ext
  // normalized is a FILE specifier like "./_core/env" — its dirname is the
  // target directory and its basename is the module name.
  const targetDir = path.resolve(importerDir, path.dirname(normalized));
  const baseName = path.basename(normalized);
  const candidateTs = path.join(targetDir, baseName + ".ts");
  const candidateJs = path.join(targetDir, baseName + ".js");
  // source or compiled target must exist
  if (fs.existsSync(candidateTs) || fs.existsSync(candidateJs)) {
    return "./" + path.relative(importerDir, path.join(targetDir, baseName + ".js")).replace(/\\/g, "/");
  }
  return null;
}

function rewriteFile(file) {
  let src = fs.readFileSync(file, "utf8");
  let changed = false;
  src = src.replace(IMPORT_RE, (match, prefix, spec, quote) => {
    if (spec.endsWith(".ts")) {
      changed = true;
      return `${prefix}${spec.slice(0, -3)}.js${quote}`;
    }
    const replacement = resolveTarget(file, spec);
    if (replacement) {
      changed = true;
      return `${prefix}${replacement}${quote}`;
    }
    return match;
  });
  if (changed) fs.writeFileSync(file, src);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
    } else if (entry.name.endsWith(".js")) {
      rewriteFile(full);
    }
  }
}

if (fs.existsSync(serverDir)) walk(serverDir);
console.log("dist/server import extensions fixed");
