import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Database suites reset shared tables between files.
    pool: "forks",
    fileParallelism: false,

    env: {
      NODE_ENV: "test",
    },

    setupFiles: ["./tests/setup.ts"],
  },
});
