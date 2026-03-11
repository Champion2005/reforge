# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-11

### Added

- **`guard()` function** — Main entry-point that parses, repairs, validates, and returns typed results.
- **Dirty Parser pipeline** — Multi-stage JSON repair engine:
  - Markdown fence extraction (` ```json ` blocks)
  - Conversational wrapper removal ("Here is the data: {...}")
  - Trailing comma removal
  - Unquoted key fixing
  - Single quote → double quote conversion
  - Escaped quote anomaly repair
  - Stack-based bracket balancing for truncated output
- **Zod schema validation** with automatic type coercion:
  - String `"true"` / `"false"` → boolean
  - String `"42"` / `"3.14"` → number
  - String `"null"` → null
- **Retry prompt generation** — Token-efficient error messages for LLM re-queries.
- **Telemetry** — Every result includes `{ durationMs, status }` for observability.
- **Full TypeScript support** — Discriminated union result types, generic inference from Zod schemas.
- **Dual CJS/ESM output** — Built with tsup, tree-shakeable, source maps included.
- **Zero runtime dependencies** — Only Zod as an optional peer dependency.
- **Environment agnostic** — No Node-specific APIs. Works in Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, and browsers.

[0.1.0]: https://github.com/Champion2005/reforge/releases/tag/v0.1.0
