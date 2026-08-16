import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const serverDir = path.join(root, "dist", "server");

function run(command) {
  console.log(`\n>>> ${command}\n`);
  execSync(command, {
    cwd: root,
    stdio: "inherit",
  });
}

console.log("========== QWADER STORE VERCEL BUILD ==========");

// 1. CLIENT
console.log("\n========== 1. VITE BUILD ==========");
run("vite build");

// 2. VERCEL HANDLER
console.log("\n========== 2. VERCEL HANDLER ==========");

fs.mkdirSync(path.join(root, "api"), { recursive: true });

run(
  "esbuild server/_core/vercelEntry.ts --platform=node --bundle --format=esm --outfile=api/vercel-handler.js --packages=external"
);

// 3. CLEAN SERVER
console.log("\n========== 3. CLEAN SERVER ==========");

fs.rmSync(serverDir, {
  recursive: true,
  force: true,
});

fs.mkdirSync(serverDir, {
  recursive: true,
});

// 4. COMPILE LEGACY SERVER
console.log("\n========== 4. COMPILE LEGACY SERVER ==========");

run(
  'esbuild "server/**/*.ts" "server/**/*.js" --platform=node --packages=external --format=esm --outdir=dist/server'
);

// 5. FIX EXTENSIONS
console.log("\n========== 5. FIX EXTENSIONS ==========");

run("node scripts/fix-extensions.mjs");

// 6. INSTALL REQUIRED RUNTIME DEPENDENCIES
console.log("\n========== 6. INSTALL RUNTIME DEPENDENCIES ==========");

const runtimePackages = [
  "jsonwebtoken@9.0.3",
  "bcryptjs@3.0.3",
  "nodemailer@7.0.6",
  "jose@6.1.0",
];

const runtimePackageJson = {
  name: "qwader-server-runtime",
  private: true,
  type: "module",
  dependencies: Object.fromEntries(
    runtimePackages.map((pkg) => {
      const [name, version] = pkg.split("@");
      return [name, version];
    })
  ),
};

fs.writeFileSync(
  path.join(serverDir, "package.json"),
  JSON.stringify(runtimePackageJson, null, 2)
);

run(
  "npm install --prefix dist/server --omit=dev --ignore-scripts --no-audit --no-fund"
);

// 7. VERIFY DEPENDENCIES
console.log("\n========== 7. VERIFY DEPENDENCIES ==========");

const required = [
  "jsonwebtoken",
  "bcryptjs",
  "nodemailer",
  "jose",
  "jws",
  "jwa",
];

for (const pkg of required) {
  const pkgPath = path.join(
    serverDir,
    "node_modules",
    pkg,
    "package.json"
  );

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`❌ Missing runtime dependency: ${pkg}`);
  }

  const info = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  console.log(`✅ ${pkg} ${info.version || ""}`);
}

// 8. VERIFY LEGACY FILES
console.log("\n========== 8. CHECK LEGACY FILES ==========");

const legacyFiles = [
  "legacy/auth.js",
  "legacy/auth.action.js",
  "legacy/mailer.js",
];

for (const file of legacyFiles) {
  const full = path.join(serverDir, file);

  if (!fs.existsSync(full)) {
    throw new Error(`❌ Missing legacy file: ${file}`);
  }

  console.log(`✅ ${file}`);
}

// 9. VERIFY IMPORTS
console.log("\n========== 9. CHECK RUNTIME IMPORTS ==========");

run(
  'grep -R -nE \'from "(jsonwebtoken|bcryptjs|nodemailer|jose)"\' dist/server/legacy || true'
);

// 10. SIZE
console.log("\n========== 10. SERVER SIZE ==========");

run("du -sh dist/server");

console.log("\n==========================================");
console.log("✅ QWADER VERCEL BUILD COMPLETED");
console.log("==========================================");
