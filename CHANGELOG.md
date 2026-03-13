# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Line-aware retry prompts** - `guard()` now supports `retryPrompt.mode = "line-aware"` to include only relevant line windows for parse/validation failures, with multi-issue block grouping and configurable context radius.
- **Retry prompt customization hooks** - Added `retryPromptStrategy` for full custom retry prompt generation while preserving typed context inputs.
- **Guard profiles and heuristic controls** - Added `profile` (`safe` | `standard` | `aggressive`) and per-heuristic toggles in `GuardOptions`.
- **Retry-context redaction controls** - Added `retryPrompt.redactPaths` and `retryPrompt.redactRegex` to prevent sensitive values from leaking into retry prompts.
- **Optional debug artifacts** - Added `debug: true` support on `guard()` to expose extracted/repaired text, applied repair passes, likely parse line, and retry context blocks.
- **Forge retry policy controls** - Added `retryPolicy` with `shouldRetry`, per-attempt `mutateProviderOptions`, and overrideable retry count.
- **Structured forge events** - Added `onEvent` stream with attempt lifecycle events for observability.
- **Provider fallback orchestration** - Added `forgeWithFallback()` for ordered provider failover with per-provider attempt budgets.

### Changed

- **`forge()` now forwards guard options** - Added `guardOptions` pass-through for consistent retry prompt behavior in provider orchestration flows.
- **Dirty parser metadata surfaced internally** - Dirty parse pipeline now tracks applied repairs and likely parse line to improve retry context quality.

### Fixed

- **Retry prompt context quality** - Parse and validation retries can now target specific lines instead of broad snippets when line-aware mode is enabled.

## [0.2.1] - 2026-03-13

### Added

- **Dirty parser heuristics expanded** — Added JavaScript comment stripping (`//`, `/* ... */`) and Python literal normalization (`True`/`False`/`None` → JSON literals), with string-context awareness to avoid mutating quoted values.
- **Schema-aware coercion extended** — Added coercion support for `ZodDate`, case-insensitive `ZodEnum`, `ZodLiteral` primitive matching, `ZodTuple`, `ZodUnion`, and `ZodDiscriminatedUnion` traversal.
- **`forge()` retry hooks and richer telemetry** — Added `onRetry` callback and per-attempt telemetry via `attemptDetails`.

### Changed

- **`forge()` retry safety hardened** — Retry assistant content is now truncated before being appended to the conversation to control token growth.
- **`forge()` options normalization** — `maxRetries` is now defensively normalized (`NaN`/`Infinity`/negative values resolve to bounded non-negative behavior).
- **Markdown extraction broadened** — JSON extraction now supports both backtick and tilde code fences (` ``` ` and `~~~`).

### Fixed

- **Bracket extraction robustness** — Improved mismatched-closer handling in bracket extraction to avoid incorrect early boundary selection in malformed wrappers.
- **Parse-failure reporting consistency** — Parse failures now consistently surface a structured custom parse error in `guard()` failure paths, including non-string runtime input.
- **Coercion clone hardening** — Object cloning in validation coercion now uses a safer plain-object clone strategy to avoid prototype pollution edge cases.

## [0.2.0] - 2026-03-12

### Added

- **`forge()` function** — End-to-end structured LLM output. Calls a provider, pipes through `guard()`, and auto-retries on validation failure. Configurable `maxRetries` (default: 3) with targeted retry prompts.
- **Provider adapter system** — `ReforgeProvider` interface with a single `call()` method. Three built-in adapters:
  - `openaiCompatible()` — works with OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM, and any OpenAI-compatible API.
  - `anthropic()` — dedicated Anthropic Claude adapter. Handles system message extraction and `max_tokens` defaults.
  - `google()` — Google Gemini / Vertex AI adapter. Maps `assistant` role to `model`.
- **Sub-path exports** — `reforge-ai/openai-compatible`, `reforge-ai/anthropic`, `reforge-ai/google`. Tree-shakeable, each adapter is independently importable.
- **`ForgeTelemetry`** — Extends `TelemetryData` with `attempts` and `totalDurationMs` fields.
- **New types** — `Message`, `ProviderCallOptions`, `ForgeOptions`, `ForgeResult`, `ReforgeProvider`.
- **Full test coverage** — 36+ new tests for `forge()` and all three provider adapters.

### Changed

- **Package exports expanded** — Exports now include four entry points (core + three adapters).
- **Provider peer dependencies updated** — `openai`, `@anthropic-ai/sdk`, and `@google/generative-ai` are listed as optional peer dependencies.

## [0.1.1] - 2026-03-11

### Changed

- **Retry prompt — parse failures now echo the offending text.** When `guard()` fails because no JSON could be extracted, the `retryPrompt` now includes a snippet (up to 300 chars) of exactly what the LLM returned, so it knows what it produced wrong.
- **Retry prompt — explicit schema-context assumption.** The prompt wording now reflects that the LLM is expected to still have the original schema in its conversation context. The prompt never re-sends the schema — it only describes what was wrong. New wording: `"The schema is still in your context — return ONLY corrected valid JSON."`
- **Retry prompt — distinguishes parse vs. validation failures.** Parse failures say `"could not be parsed as JSON"` and include the raw snippet. Validation failures say `"failed schema validation"` and list the exact field paths, expected types, and received types.

### Fixed

- **`generateRetryPrompt([])` parse-failure path** — Previously returned a generic message with no details; now returns an actionable message that includes the raw offending snippet.

## [0.1.0] - 2026-03-11

### Added

- **`guard()` function** — Main entry-point that parses, repairs, validates, and returns typed results.
- **Dirty parser pipeline** — Multi-stage JSON repair engine:
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
- **TypeScript support** — Discriminated union result types with generic inference from Zod schemas.
- **Dual CJS/ESM output** — Built with tsup, tree-shakeable, source maps included.
- **Zero runtime dependencies** — Only `zod` as an optional peer dependency.
- **Environment agnostic** — No Node-specific APIs. Works in Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, and browsers.

[Unreleased]: https://github.com/Champion2005/reforge/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Champion2005/reforge/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Champion2005/reforge/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/Champion2005/reforge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Champion2005/reforge/releases/tag/v0.1.0
