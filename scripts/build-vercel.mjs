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

//
// 1. CLIENT
//
console.log("\n========== 1. VITE BUILD ==========");
run("vite build");

//
// 2. VERCEL HANDLER
//
console.log("\n========== 2. VERCEL HANDLER ==========");

fs.mkdirSync(path.join(root, "api"), { recursive: true });

run(
  "esbuild server/_core/vercelEntry.ts --platform=node --bundle --format=esm --outfile=api/vercel-handler.js --packages=external"
);

//
// 3. CLEAN SERVER
//
console.log("\n========== 3. CLEAN SERVER ==========");

const serverDir = path.join(root, "dist", "server");

fs.rmSync(serverDir, {
  recursive: true,
  force: true,
});

fs.mkdirSync(serverDir, {
  recursive: true,
});

//
// 4. COMPILE LEGACY SERVER
//
console.log("\n========== 4. COMPILE LEGACY SERVER ==========");

run(
  'esbuild "server/**/*.ts" "server/**/*.js" --platform=node --packages=external --format=esm --outdir=dist/server'
);

//
// 5. FIX EXTENSIONS
//
console.log("\n========== 5. FIX EXTENSIONS ==========");

run("node scripts/fix-extensions.mjs");

//
// 6. COPY ONLY REQUIRED RUNTIME PACKAGES
//
console.log("\n========== 6. COPY REQUIRED PACKAGES ==========");

const requiredPackages = [
  "jsonwebtoken",
  "bcryptjs",
  "nodemailer",
  "jose",
];

const nodeModulesDir = path.join(serverDir, "node_modules");

fs.mkdirSync(nodeModulesDir, {
  recursive: true,
});

function copyPackage(packageName) {
  const source = path.join(root, "node_modules", packageName);
  const destination = path.join(nodeModulesDir, packageName);

  if (!fs.existsSync(source)) {
    throw new Error(`Package not found: ${packageName}`);
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
  });

  console.log(`✅ ${packageName}`);
}

for (const pkg of requiredPackages) {
  copyPackage(pkg);
}

//
// 7. CHECK PACKAGE DEPENDENCIES
//
console.log("\n========== 7. CHECK REQUIRED PACKAGES ==========");

for (const pkg of requiredPackages) {
  const packagePath = path.join(
    serverDir,
    "node_modules",
    pkg,
    "package.json"
  );

  if (fs.existsSync(packagePath)) {
    const info = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    console.log(
      `✅ ${pkg} ${info.version || ""}`
    );
  } else {
    throw new Error(`Missing package.json for ${pkg}`);
  }
}

//
// 8. CHECK LEGACY FILES
//
console.log("\n========== 8. CHECK LEGACY FILES ==========");

const legacyFiles = [
  "legacy/auth.js",
  "legacy/auth.action.js",
  "legacy/mailer.js",
];

for (const file of legacyFiles) {
  const full = path.join(serverDir, file);

  if (fs.existsSync(full)) {
    console.log(`✅ ${file}`);
  } else {
    throw new Error(`Missing legacy file: ${file}`);
  }
}

//
// 9. CHECK RUNTIME IMPORTS
//
console.log("\n========== 9. CHECK RUNTIME IMPORTS ==========");

run(
  'grep -R -nE \'from "(jsonwebtoken|bcryptjs|nodemailer|jose)"\' dist/server/legacy || true'
);

//
// 10. CHECK PACKAGE SIZES
//
console.log("\n========== 10. PACKAGE SIZES ==========");

run(
  "du -sh dist/server/node_modules/* 2>/dev/null | sort -hr"
);

//
// 11. FINAL SIZE
//
console.log("\n========== 11. FINAL SERVER SIZE ==========");

run("du -sh dist/server");

console.log("\n==========================================");
console.log("✅ QWADER VERCEL BUILD COMPLETED");
console.log("==========================================");
