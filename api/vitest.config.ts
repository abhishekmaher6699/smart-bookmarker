import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Database suites clear shared tables between tests. A single worker prevents
    // one file from deleting fixtures that another file is still asserting.
    pool: "forks",
    singleFork: true,
    fileParallelism: false,

    env: {
      NODE_ENV: "test",
    },

    setupFiles: ["./tests/setup.ts"],
  },
});
