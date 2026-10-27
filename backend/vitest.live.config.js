import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.js"],
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      RUN_LIVE_INTEGRATION: "true"
    },
    coverage: {
      enabled: false
    }
  }
});
