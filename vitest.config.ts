import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: [
      {
        // server/legacy/admin.action.js (plain .js) imports "../storage.js", a
        // TypeScript module with a Node ESM-style specifier. Resolve it to the
        // .ts source so vitest transforms it and vi.mock("./storage.ts") still
        // matches the same module instance.
        find: "../storage.js",
        replacement: path.resolve(templateRoot, "server", "storage.ts"),
      },
      { find: "@", replacement: path.resolve(templateRoot, "client", "src") },
      { find: "@shared", replacement: path.resolve(templateRoot, "shared") },
      { find: "@assets", replacement: path.resolve(templateRoot, "attached_assets") },
    ],
  },
  test: {
    environment: "node",
    poolOptions: { threads: { singleThread: true } },
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // Neon HTTP pooler cold-wake can take several seconds on first query,
    // so give every test a generous ceiling (individual tests may still use
    // an explicit { timeout } option of their own).
    testTimeout: 60_000,
  },
});
