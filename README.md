# Reforge

**Raw LLM output reforged into clean data.**

[![npm version](https://img.shields.io/npm/v/reforge-ai.svg)](https://www.npmjs.com/package/reforge-ai)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
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

`reforge-ai` is a **zero-dependency** TypeScript library that sits between the LLM output and your application:

- **Natively repairs** syntactic JSON errors in **microseconds**
- **Validates** against your Zod schema with automatic type coercion
- **Generates token-efficient retry prompts** when repair isn't enough
- Works everywhere: **Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, Browsers**

## Installation

```bash
npm install reforge-ai zod
```

To use provider adapters with `forge()`, also install the provider SDK:

```bash
# OpenAI / OpenRouter / Groq / Together / Ollama / etc.
npm install reforge-ai zod openai

# Anthropic
npm install reforge-ai zod @anthropic-ai/sdk

# Google Gemini
npm install reforge-ai zod @google/generative-ai
```

> `zod` is a required peer dependency. Provider SDKs are optional peer dependencies — only install what you use.

## Quick Start

```typescript
import { z } from "zod";
import { guard } from "reforge-ai";

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

## End-to-End with forge()

`forge()` wraps the entire flow: call your LLM → repair → validate → auto-retry.

```typescript
import { z } from "zod";
import { forge } from "reforge-ai";
import { openaiCompatible } from "reforge-ai/openai-compatible";
import OpenAI from "openai";

const provider = openaiCompatible(new OpenAI(), "gpt-4o");

const Colors = z.array(
  z.object({
    name: z.string(),
    hex: z.string(),
  })
);

const result = await forge(
  provider,
  [{ role: "user", content: "List 3 colors with hex codes." }],
  Colors
);

if (result.success) {
  console.log(result.data);
  // → [{ name: "Red", hex: "#FF0000" }, ...]
  console.log(result.telemetry);
  // → { durationMs: 1.2, status: "clean", attempts: 1, totalDurationMs: 845 }
}
```

### Provider Adapters

| Adapter | Import | Covers |
|---|---|---|
| `openaiCompatible()` | `reforge-ai/openai-compatible` | OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM |
| `anthropic()` | `reforge-ai/anthropic` | Anthropic Claude |
| `google()` | `reforge-ai/google` | Google Gemini, Vertex AI |

```typescript
// OpenRouter — same adapter, different baseURL
import { openaiCompatible } from "reforge-ai/openai-compatible";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
const provider = openaiCompatible(client, "anthropic/claude-sonnet-4-20250514");
```

```typescript
// Anthropic
import { anthropic } from "reforge-ai/anthropic";
import Anthropic from "@anthropic-ai/sdk";

const provider = anthropic(new Anthropic(), "claude-sonnet-4-20250514");
```

```typescript
// Google Gemini
import { google } from "reforge-ai/google";
import { GoogleGenerativeAI } from "@google/generative-ai";

const provider = google(
  new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!),
  "gemini-2.0-flash"
);
```

```typescript
// Custom provider — implement a single method
import { forge, type ReforgeProvider } from "reforge-ai";

const myProvider: ReforgeProvider = {
  async call(messages, options) {
    const res = await fetch("https://my-llm-api.com/chat", {
      method: "POST",
      body: JSON.stringify({ messages, ...options }),
    });
    const data = await res.json();
    return data.text;
  },
};
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

After parsing, the data is validated against your Zod schema. Reforge also attempts automatic coercion for common LLM type mismatches:

| LLM Output | Schema Expects | Coerced To |
|---|---|---|
| `"true"` / `"false"` | `boolean` | `true` / `false` |
| `"42"`, `"3.14"` | `number` | `42`, `3.14` |
| `"null"` | `nullable` | `null` |

### 3. Retry Prompt Generation

If validation fails, Reforge generates a token-efficient prompt you can append to your LLM conversation:

```
Your previous response failed schema validation. Errors: [Path: /user/age, Expected: number, Received: string]. The schema is still in your context — return ONLY corrected valid JSON.
```

When the LLM returns something that can't be parsed as JSON at all, the raw text is echoed back if it's short enough to be the full picture (\u2264300 chars). For longer outputs, the snippet is omitted — a truncated fragment of the beginning shows nothing useful:

```
// Short output — full text echoed:
Your previous response could not be parsed as JSON. Got: `{name: Alice age: 30}`. The schema is still in your context — return ONLY valid JSON.

// Long output — snippet omitted:
Your previous response could not be parsed as JSON. The schema is still in your context — return ONLY valid JSON.
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

### `forge<T>(provider, messages, schema, options?): Promise<ForgeResult<z.infer<T>>>`

End-to-end structured output: call LLM → guard() → auto-retry.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `provider` | `ReforgeProvider` | An adapter wrapping your LLM SDK |
| `messages` | `Message[]` | Conversation messages to send |
| `schema` | `ZodTypeAny` | The Zod schema the output must conform to |
| `options` | `ForgeOptions` | Optional: `maxRetries` (default: 3), `providerOptions`, `onRetry` |

`onRetry` is called after each failed attempt that will be retried:

```typescript
onRetry?: (attempt, failure) => {
  // attempt is 1-based
  // failure.errors are the zod issues from the failed guard() call
  // failure.retryPrompt is the corrective prompt used for the next attempt
}
```

**Returns:** `Promise<ForgeResult<T>>`:

```typescript
// Success
{
  success: true;
  data: T;
  telemetry: ForgeTelemetry;
  isRepaired: boolean;
}

// Failure
{
  success: false;
  errors: ZodIssue[];
  retryPrompt: string;
  telemetry: ForgeTelemetry;
}

// ForgeTelemetry extends TelemetryData
interface ForgeTelemetry extends TelemetryData {
  attempts: number;       // Total LLM calls made
  totalDurationMs: number; // Wall-clock time for entire forge() call
  attemptDetails: Array<{
    attempt: number;
    durationMs: number;
    status: "clean" | "repaired_natively" | "failed";
  }>;
}
```

## Examples

### OpenAI with forge()

```typescript
import { z } from "zod";
import { forge } from "reforge-ai";
import { openaiCompatible } from "reforge-ai/openai-compatible";
import OpenAI from "openai";

const provider = openaiCompatible(new OpenAI(), "gpt-4o");

const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

const result = await forge(
  provider,
  [
    { role: "system", content: "Return JSON only." },
    { role: "user", content: "Give me a recipe for chocolate cake." },
  ],
  RecipeSchema,
  { maxRetries: 3, providerOptions: { temperature: 0.2 } }
);

if (result.success) {
  console.log(`Resolved in ${result.telemetry.attempts} attempt(s)`);
  console.log(result.data);
}
```

### Anthropic with forge()

```typescript
import { z } from "zod";
import { forge } from "reforge-ai";
import { anthropic } from "reforge-ai/anthropic";
import Anthropic from "@anthropic-ai/sdk";

const provider = anthropic(new Anthropic(), "claude-sonnet-4-20250514");

const SummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
});

const result = await forge(
  provider,
  [{ role: "user", content: "Summarize: TypeScript 5.7 adds ..." }],
  SummarySchema
);
```

### guard() Only (Manual Retry)

```typescript
import OpenAI from "openai";
import { z } from "zod";
import { guard } from "reforge-ai";

const client = new OpenAI();

const ProductSchema = z.object({
  name: z.string(),
  price: z.number(),
  tags: z.array(z.string()),
});

async function getProduct(prompt: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "user", content: prompt },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const result = guard(raw, ProductSchema);

    if (result.success) return result.data;

    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: result.retryPrompt });
  }

  throw new Error("Failed after 3 attempts");
}
```

### Edge Runtime (Next.js API Route)

```typescript
// app/api/parse/route.ts
import { z } from "zod";
import { guard } from "reforge-ai";

export const runtime= "edge";

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

Reforge is designed for **< 5ms** end-to-end on a 2KB input. The entire pipeline is:

- **Synchronous** — no async, no network, no I/O
- **Pure** — no global state mutation
- **O(n)** — linear time relative to input length
- **Never throws** — all error paths return typed result objects

## Guarantees

- **Zero dependencies** — only `zod` as an optional peer dependency
- **Environment agnostic** — no Node-specific APIs (`fs`, `path`, `Buffer`)
- **Tree-shakeable** — ESM + CJS dual output via tsup
- **Strict TypeScript** — full type safety with discriminated union results

## Environment Compatibility

| Runtime              | Status      | Notes          |
|----------------------|-------------|----------------|
| Node.js 18+         | ✅ Supported | CJS + ESM      |
| Bun                  | ✅ Supported | Native ESM     |
| Deno                 | ✅ Supported | Via npm: specifier |
| Cloudflare Workers   | ✅ Supported | No Node APIs   |
| Vercel Edge          | ✅ Supported | Edge-compatible |
| Browser              | ✅ Supported | ESM, tree-shakeable |

## Documentation

Full documentation, interactive demo, and integration guides are available at **[reforge-ai-97558.web.app](https://reforge-ai-97558.web.app)**.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Setup instructions
- Code standards
- PR workflow
- Test guidelines

## Reporting Issues

- **Bug reports:** [Open an issue](https://github.com/Champion2005/reforge/issues/new?template=bug_report.yml) with the raw input, schema, and unexpected result.
- **Feature requests:** [Open an issue](https://github.com/Champion2005/reforge/issues/new?template=feature_request.yml) with the use case and proposed API.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## License

MIT
