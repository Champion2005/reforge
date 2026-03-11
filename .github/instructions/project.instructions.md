---
description: This file describes the master plan and guidelines for the project. All information about the project should be included here.
applyTo: **
---

# Reforge Master Specification

## 1. Project Overview & Product Thesis

**Name:** reforge

**Tagline:** Raw LLM output reforged into clean data.

**The Problem:** LLMs are probabilistic and frequently output malformed JSON (markdown wrappers, trailing commas, unquoted keys, truncated outputs). Network retries to providers (OpenAI, Anthropic) take 1-3 seconds and cost money.

**The Solution:** A zero-dependency TypeScript library that sits between the LLM output and the application. It natively repairs syntactical errors in microseconds and strictly enforces semantic types via Zod.

---

## 2. The SDK (reforge)

### 2.1 Core Constraints

- **Zero Dependencies:** Strictly zod as a peer/optional dependency. No lodash, no heavy AST parsers.
- **Environment Agnostic:** Must run in Node.js, Cloudflare Workers, Vercel Edge, Bun, Deno, and the Browser. Do not use Node-specific APIs (fs, path, Buffer).
- **Performance Bound:** The end-to-end guard() function must execute in under 5ms for a 2KB string.

### 2.2 Feature 1: The Dirty Parser (Native Syntactic Repair)

This is the "magic" layer. It takes raw text and attempts to yield a valid JS object.

- **Markdown Extraction:** LLMs often wrap JSON in ```json blocks or add conversational text ("Here is the data:"). The parser must locate the first { or [ and the last corresponding } or ].
- **Stack-Based Bracket Balancing:** If the LLM output is truncated (e.g., hits max_tokens), the parser must use a stack to append the necessary closing brackets/braces to make the JSON structurally valid.
- **Common Heuristic Fixes:**
  - Strip trailing commas: {"a": 1,} -> {"a": 1}
  - Fix unquoted keys: {name: "John"} -> {"name": "John"}
  - Handle escaped quote anomalies (e.g., improperly unescaping inner quotes like {\"key\": \"value\"} which breaks standard JSON.parse).

### 2.3 Feature 2: Semantic Enforcement (Zod)

Once structurally valid, the object must match the business logic.

- Takes the user's ZodSchema and runs .safeParse().
- **Shimming/Coercion:** If the schema allows, attempt to coerce types (e.g., string "true" to boolean true) before failing the validation.

### 2.4 Feature 3: The Provider-Agnostic Retry Generator

If semantic validation completely fails (e.g., a required key is missing), Reforge does not make a network request.

- It generates a highly optimized retryPrompt string.
- **Format:** "Your previous response failed validation. Errors: [Path: /user/age, Expected: Number]. Return ONLY valid JSON matching the schema." Ensure Zod issues are mapped and flattened into this concise string format to save LLM context tokens.
- Returns this string to the developer in the payload so they can append it to their LLM message array.

### 2.5 Feature 4: Telemetry & Developer UX

- **Context Object:** Every result must return a telemetry object: { durationMs: 1.2, status: 'repaired_natively' | 'clean' | 'failed' }.

**API Signature:**

```typescript
export function guard<T extends z.ZodTypeAny>(
  llmOutput: string,
  schema: T
): GuardResult<z.infer<T>>

// Expected Return Types:
export type GuardResult<T> =
  | { success: true; data: T; telemetry: TelemetryData; isRepaired: boolean }
  | { success: false; retryPrompt: string; errors: z.ZodIssue[]; telemetry: TelemetryData };

export type TelemetryData = { durationMs: number; status: 'clean' | 'repaired_natively' | 'failed'; };
```

---

## 3. The Web Platform (Marketing, Demo, Docs, Blog)

### 3.1 Tech Stack Recommendations

- **Framework:** Next.js (App Router).
- **Styling:** Tailwind CSS + Shadcn UI (for fast, clean, dark-mode default components).
- **Docs/Blog Engine:** Fumadocs or Nextra (Allows Markdown with embedded React components for the interactive demo).
- **Hosting:** Vercel (free, edge-native).

### 3.2 Landing Page Strategy

- **Hero Section:** "Stop paying for LLM retries." Clear code snippet showing the simple guard() implementation.
- **Value Prop Grid:** Zero dependencies, Edge-ready, Zod native, Microsecond latency.
- **The "Proof" Interactive Demo:** A split-screen React component right on the homepage.
  - **Left Pane (Input):** A text editor where the user can type "dirty" LLM output. Include a dropdown or buttons with "Pre-loaded Examples" (e.g., 'Truncated Output', 'Markdown Wrapper', 'Trailing Commas') for quick testing.
  - **Right Pane (Output):** Real-time formatted JSON and the telemetry.durationMs displayed in green (e.g., "Repaired in 0.8ms").
- **Architecture:** Because reforge is browser-compatible, this demo imports the actual library and runs it client-side. No API required.

### 3.3 Documentation Hub

The docs must be generated alongside the code to prevent drift.

- **Setup Guide:** Install instructions for NPM/Yarn/PNPM.
- **Concepts:** Explaining the "Dirty Parser" vs "Semantic Validation".
- **API Reference:** Auto-generated from JSDoc comments in the TypeScript source using typedoc and converted to Markdown for the docs site.
- **Cookbooks/Examples:**
  - Next.js API Route integration.
  - OpenAI SDK integration.
  - Anthropic SDK integration.

### 3.4 The SEO Blog

Dev-tools require high-intent search traffic. The blog must exist to capture long-tail keywords.

**Initial Content Strategy:**

- "How to enforce JSON schemas with OpenAI in 2026."
- "Why JSON Schema prompts fail: The case for native repair."
- "Zod vs. LLMs: Building resilient agentic pipelines."

---

## 4. Execution Roadmap (Anti-Scope-Creep Plan)

To ensure this project actually launches, execute in this strict order:

### Phase 1: The Core Engine

- Init pure TypeScript project (tsup for bundling to CJS/ESM).
- Build the DirtyParser string manipulation heuristics.
- Build the Zod wrapper and standard response types.
- Achieve 100% test coverage on messy LLM string edge-cases using Vitest.

### Phase 2: The Package Release

- Finalize JSDoc comments.
- Publish v0.1.0 to NPM.
- Write a informative README.md.

### Phase 3: The Web Platform

- Init Vite + Fumadocs workspace.
- Build the Interactive React Demo component using the published v0.1.0 package.
- Port README.md into the Docs section.
- Launch the landing page (must have good frontend design).

### Phase 4: Content & Scale

- Write the first 3 blog posts.
- Share the Interactive Demo on X/Twitter and HackerNews.
- Monitor GitHub issues for edge-cases the Dirty Parser missed.