import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/vfi_test",
      TELNYX_MODE: "mock",
    },
    // Claude worktrees live under .claude/ and share the test database.
    exclude: [...configDefaults.exclude, ".claude/**"],
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
  },
});
