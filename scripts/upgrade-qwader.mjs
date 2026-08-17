import { execSync } from "node:child_process";
import fs from "node:fs";

function run(command) {
  console.log(`\n>>> ${command}`);
  execSync(command, {
    stdio: "inherit",
    shell: true,
  });
}

console.log(`
==========================================
       QWADER STORE UPGRADE SYSTEM
==========================================
`);

try {
  console.log("1. Checking Node...");
  run("node --version");

  console.log("\n2. Checking npm...");
  run("npm --version");

  console.log("\n3. Installing runtime dependencies...");
  run("npm install jsonwebtoken bcryptjs nodemailer jose jws jwa");

  console.log("\n4. Checking TypeScript...");
  run("npm run check");

  console.log("\n5. Running tests...");
  run("npm run test");

  console.log("\n6. Validating Vercel configuration...");
  if (fs.existsSync("scripts/validate-vercel-config.mjs")) {
    run("node scripts/validate-vercel-config.mjs");
  }

  console.log("\n7. Building Vercel package...");
  run("npm run build:vercel");

  console.log(`
==========================================
       QWADER STORE CHECK PASSED
==========================================

Build is ready for Vercel.
`);
} catch (error) {
  console.error(`
==========================================
       QWADER STORE CHECK FAILED
==========================================

The command above failed.
The project was NOT automatically pushed.
`);
  process.exit(1);
}
