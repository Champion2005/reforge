# steelguard-ts

**Zero-latency deterministic validation and native JSON repair for Agentic LLM applications.**

[![npm version](https://img.shields.io/npm/v/steelguard-ts.svg)](https://www.npmjs.com/package/steelguard-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org)

---

## The Problem

LLMs are probabilistic and frequently output malformed JSON:

- **Markdown wrappers** — ` ```json ... ``` ` blocks around the data
- **Trailing commas** — `{"name": "Alice",}`
- **Unquoted keys** — `{name: "Alice"}`
- **Single-quoted strings** — `{'name': 'Alice'}`
- **Truncated outputs** — `{"items": [1, 2, 3` (hit `max_tokens`)
- **Escaped-quote anomalies** — `{\"key\": \"value\"}`

Network retries to providers (OpenAI, Anthropic, etc.) cost **1-3 seconds** and real money. Most of these failures are trivially fixable.

## The Solution

`steelguard-ts` is a **zero-dependency** TypeScript library that sits between the LLM output and your application:

- **Natively repairs** syntactic JSON errors in **microseconds**
- **Validates** against your Zod schema with automatic type coercion
- **Generates token-efficient retry prompts** when repair isn't enough
- Works everywhere: **Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, Browsers**

## Installation

```bash
npm install steelguard-ts zod
```

```bash
pnpm add steelguard-ts zod
```

```bash
yarn add steelguard-ts zod
```

> `zod` is an optional peer dependency. It's required for schema validation but `steelguard-ts` has **zero runtime dependencies**.

## Quick Start

```typescript
import { z } from "zod";
import { guard } from "steelguard-ts";

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Raw LLM output — markdown-wrapped with a trailing comma:
const raw = '```json\n{"name": "Alice", "age": 30,}\n```';

const result = guard(raw, UserSchema);

if (result.success) {
  console.log(result.data);       // { name: "Alice", age: 30 }
  console.log(result.isRepaired); // true
  console.log(result.telemetry);  // { durationMs: 0.4, status: "repaired_natively" }
} else {
  // Append result.retryPrompt to your LLM message array
  console.log(result.retryPrompt);
  console.log(result.errors);     // ZodIssue[]
}
```

## How It Works

`guard()` runs a deterministic three-stage pipeline:

### 1. Dirty Parse (Native Repair)

The parser runs a sequence of heuristic passes to fix common LLM output issues:

| Issue | Before | After |
|---|---|---|
| Markdown fences | `` ```json\n{"a":1}\n``` `` | `{"a":1}` |
| Conversational wrapping | `Here's the data: {"a":1}` | `{"a":1}` |
| Trailing commas | `{"a": 1,}` | `{"a": 1}` |
| Unquoted keys | `{name: "Alice"}` | `{"name": "Alice"}` |
| Single quotes | `{'key': 'val'}` | `{"key": "val"}` |
| Escaped quotes | `{\"key\": \"val\"}` | `{"key": "val"}` |
| Truncated output | `{"items": [1, 2` | `{"items": [1, 2]}` |

### 2. Schema Validation (with Coercion)

After parsing, the data is validated against your Zod schema. SteelGuard also attempts automatic coercion for common LLM type mismatches:

| LLM Output | Schema Expects | Coerced To |
|---|---|---|
| `"true"` / `"false"` | `boolean` | `true` / `false` |
| `"42"`, `"3.14"` | `number` | `42`, `3.14` |
| `"null"` | `nullable` | `null` |

### 3. Retry Prompt Generation

If validation fails, SteelGuard generates a token-efficient prompt you can append to your LLM conversation:

```
Your previous response failed validation. Errors: [Path: /user/age, Expected: number, Received: string]. Return ONLY valid JSON matching the schema.
```

No network requests. No retries. Just a string you feed back.

## API Reference

### `guard<T>(llmOutput: string, schema: T): GuardResult<z.infer<T>>`

The main entry-point. Parses, repairs, validates, and returns a typed result.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `llmOutput` | `string` | The raw string produced by an LLM |
| `schema` | `ZodTypeAny` | The Zod schema the output must conform to |

**Returns:** `GuardResult<T>` — a discriminated union:

```typescript
// Success
{
  success: true;
  data: T;                    // Validated & typed data
  telemetry: TelemetryData;   // { durationMs, status }
  isRepaired: boolean;        // true if the Dirty Parser fixed the input
}

// Failure
{
  success: false;
  retryPrompt: string;        // Token-efficient correction prompt
  errors: ZodIssue[];         // Zod validation issues
  telemetry: TelemetryData;   // { durationMs, status: "failed" }
}
```

### Types

```typescript
type TelemetryData = {
  durationMs: number;
  status: "clean" | "repaired_natively" | "failed";
};
```

## Examples

### OpenAI Integration

```typescript
import OpenAI from "openai";
import { z } from "zod";
import { guard } from "steelguard-ts";

const client = new OpenAI();

const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

async function getRecipe(prompt: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const result = guard(raw, RecipeSchema);

    if (result.success) {
      console.log(`Resolved in ${result.telemetry.durationMs.toFixed(2)}ms`);
      return result.data;
    }

    // Append the retry prompt for the next attempt
    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: result.retryPrompt });
  }

  throw new Error("Failed after 3 attempts");
}
```

### Anthropic Integration

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { guard } from "steelguard-ts";

const client = new Anthropic();

const SummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
});

async function getSummary(text: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Summarize as JSON: ${text}` },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const result = guard(raw, SummarySchema);

  if (result.success) return result.data;

  // Use retryPrompt for follow-up
  console.error("Validation failed:", result.retryPrompt);
  return null;
}
```

### Edge Runtime (Next.js API Route)

```typescript
// app/api/parse/route.ts
import { z } from "zod";
import { guard } from "steelguard-ts";

export const runtime = "edge";

const PayloadSchema = z.object({
  action: z.string(),
  data: z.record(z.unknown()),
});

export async function POST(request: Request) {
  const body = await request.text();
  const result = guard(body, PayloadSchema);

  if (result.success) {
    return Response.json({ ok: true, data: result.data });
  }

  return Response.json(
    { ok: false, errors: result.errors },
    { status: 422 },
  );
}
```

## Performance

SteelGuard is designed for **< 5ms** end-to-end on a 2KB input. The entire pipeline is:

- **Synchronous** — no async, no network, no I/O
- **Pure** — no global state mutation
- **O(n)** — linear time relative to input length
- **Never throws** — all error paths return typed result objects

## Guarantees

- **Zero dependencies** — only `zod` as an optional peer dependency
- **Environment agnostic** — no Node-specific APIs (`fs`, `path`, `Buffer`)
- **Tree-shakeable** — ESM + CJS dual output via tsup
- **Strict TypeScript** — full type safety with discriminated union results

## License

MIT
