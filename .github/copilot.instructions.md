---
description: High-level development guidelines for Reforge. Captures core principles, non-negotiable constraints, and security guardrails.
applyTo: **
---

# Reforge Development Guidelines

## Non-Negotiable Constraints

1. **Zero Dependencies:** Only `zod` as a peer/optional dependency. No other npm packages in core.
2. **Environment Agnostic:** Must run in Node.js, Cloudflare Workers, Vercel Edge, Bun, Deno, and browsers.
3. **Sub-5ms Latency:** End-to-end `guard()` call on 2KB input must execute in < 5ms.
4. **No Node-Specific APIs:** Forbidden: `fs`, `path`, `Buffer`, `require()`, `__dirname`, `process` (except process.env).

---

## Architecture

**Three-stage pipeline:**

1. **Dirty Parser:** Stack-based string repair (markdown extraction, bracket balancing, heuristic fixes). Character-by-character scanning only. No AST parsers, recursive descent, or regex for complex parsing.
2. **Zod Validation:** Semantic enforcement using user's schema. Return errors as discriminated unions.
3. **Telemetry:** Track `durationMs` and status (`clean` | `repaired_natively` | `failed`).

---

## Security Guardrails

- **No code execution:** Never use `eval()`, `new Function()`, or dynamic code generation.
- **No network calls:** All logic is local; zero external requests.
- **DoS prevention:** Guard against extremely long inputs (> 1MB warn, > 10MB fail). Use iterative, not recursive, algorithms.
- **Input validation:** Treat LLM output as untrusted. Validate Zod schemas from users.

---

## Code Requirements

- **100% test coverage** using Vitest. Test edge cases explicitly.
- **Full type safety:** No `any` types. Use generics and `unknown`. JSDoc for all public APIs.
- **Pure functions:** No state mutations, no global variables (except telemetry).
- **Performance first:** O(n) or O(n log n) algorithms only. Profile every PR.
- **Clean exports:** Only `guard()`, `GuardResult<T>`, `TelemetryData`. Keep internals private.

---

## Key Principles

- **Never throw.** Return `{ success: false; ... }` instead.
- **Dirty Parser ≠ semantic fixer.** Stack balancing and markdown extraction only. Zod handles type issues.
- **Conservative by default.** If a repair is ambiguous, skip it and let Zod handle the error.
- **Telemetry is truth.** Use `status` and `durationMs` for observability.
- **Simplicity scales.** Every heuristic must be explainable in one sentence.

---

## Forbidden

- Heavy dependencies (lodash, AST parsers, regex for JSON parsing)
- Recursive algorithms (use stacks)
- Storing mutable state globally
- Async operations in the parser core
- Hard-coded markdown variations (make configurable)
- Node-specific APIs in shared code
