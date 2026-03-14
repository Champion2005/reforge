import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/providers/openai-compatible.ts",
    "src/providers/openrouter.ts",
    "src/providers/groq.ts",
    "src/providers/together.ts",
    "src/providers/anthropic.ts",
    "src/providers/google.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "es2020",
  outDir: "dist",
});
