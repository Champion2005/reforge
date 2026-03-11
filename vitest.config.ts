import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types.ts"],
      thresholds: {
        branches: 95,
        functions: 100,
        lines: 95,
        statements: 95,
      },
    },
  },
});
