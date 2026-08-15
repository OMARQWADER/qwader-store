#!/usr/bin/env bash
# Sync the merged Vercel handler fix from the master project into this
# standalone copy, rebuild, and verify — nothing else is touched.
set -u
SRC=/home/ubuntu/qwader-game-store
DST=/home/ubuntu/qwader-full
cd "$DST" || exit 1

# Core handler + build script + routing fix + vitest alias
cp "$SRC/server/_core/vercelEntry.ts" server/_core/vercelEntry.ts
cp "$SRC/scripts/build-vercel.mjs" scripts/build-vercel.mjs
cp "$SRC/server/legacy/router.ts" server/legacy/router.ts
cp "$SRC/vitest.config.ts" vitest.config.ts
cp "$SRC/scripts/verify-vercel-config.mjs" scripts/verify-vercel-config.mjs
cp "$SRC/scripts/test-vercel-handler.mjs" scripts/test-vercel-handler.mjs

# Remove the old handler source file if still present (replaced by vercelEntry.ts)
rm -f api/vercel-handler.ts

# Clean build artifacts and stale bundles, rebuild
rm -rf dist api
npm run build:vercel
echo "build exit: $?"
ls api 2>/dev/null || { echo "ERROR: api/ not created"; exit 1; }

# Verify the bundled handler imports cleanly and the layout is correct
echo "--- verify ---"
timeout 240 node scripts/verify-vercel-config.mjs
echo "verify exit: $?"
