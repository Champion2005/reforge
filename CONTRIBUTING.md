# Contributing to Reforge

Thanks for your interest in contributing to Reforge! This document covers everything you need to get started.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn

### Setup

```bash
git clone https://github.com/Champion2005/reforge.git
cd reforge
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
npm run build
```

This outputs CJS + ESM to `dist/` via tsup.

### Type Checking

```bash
npm run typecheck
```

## Project Structure

```
src/
  index.ts          # Public API exports
  guard.ts          # Main guard() function
  types.ts          # TypeScript type definitions
  telemetry.ts      # Performance timing
  dirty-parser/     # JSON repair pipeline
    index.ts        # Pipeline orchestrator
    extract.ts      # Markdown/wrapper extraction
    heuristics.ts   # Trailing commas, quotes, etc.
    balance.ts      # Bracket balancing for truncated output
  validation/       # Zod schema validation + coercion
    index.ts
  retry/            # Retry prompt generation
    index.ts
tests/              # Vitest test files (mirrors src/ structure)
website/            # Vite + React documentation site
```

## How to Contribute

### Reporting Bugs

Use the [bug report template](https://github.com/Champion2005/reforge/issues/new?template=bug_report.yml). Include:

1. The raw input string
2. Your Zod schema
3. The expected vs. actual result
4. Your Reforge version and runtime

### Suggesting Features

Use the [feature request template](https://github.com/Champion2005/reforge/issues/new?template=feature_request.yml). Describe the use case and proposed API.

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Add or update tests as needed
5. Ensure all tests pass: `npm test`
6. Ensure type checking passes: `npm run typecheck`
7. Commit with a clear message
8. Push and open a Pull Request

### Code Standards

- **Zero dependencies.** Do not add runtime dependencies. Zod is a peer dependency only.
- **Environment agnostic.** Do not use Node-specific APIs (fs, path, Buffer, process). Must work in Cloudflare Workers and browsers.
- **No throwing.** All error paths should return typed result objects. The `guard()` function must never throw.
- **Performance.** The full pipeline must execute in under 5ms for a 2KB input. Benchmark any changes that touch the hot path.
- **Test coverage.** Maintain 95%+ coverage. All new features and bug fixes must include tests.

### Test Guidelines

- Tests live in `tests/` and mirror the `src/` structure
- Use Vitest
- Test edge cases: empty strings, huge inputs, deeply nested structures
- For dirty parser fixes, include the exact malformed input as a test case

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
