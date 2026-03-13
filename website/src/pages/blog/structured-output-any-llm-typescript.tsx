import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock, Callout } from '../../components/BlogLayout'

const forgeExample = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const provider = openaiCompatible(new OpenAI(), 'gpt-4o');

const result = await forge(provider, [
  { role: 'user', content: 'List 3 colors with hex codes.' },
], z.array(z.object({ name: z.string(), hex: z.string() })));

console.log(result.data);
// [{ name: "Red", hex: "#FF0000" }, { name: "Green", hex: "#00FF00" }, ...]`

const manualRetryLoop = `const messages = [
  { role: 'system', content: 'Return only valid JSON matching the schema.' },
  { role: 'user', content: prompt },
];

for (let attempt = 0; attempt < 3; attempt++) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
  });

  const raw = response.choices[0]?.message?.content ?? '';

  try {
    const parsed = JSON.parse(raw);
    const validated = schema.parse(parsed);
    return validated;
  } catch (e) {
    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: 'That was invalid JSON. Try again.' },
    );
  }
}
throw new Error('Failed after 3 retries');`

const anthropicExample = `import { anthropic } from 'reforge-ai/anthropic';
import Anthropic from '@anthropic-ai/sdk';

const provider = anthropic(new Anthropic(), 'claude-sonnet-4-20250514');
const result = await forge(provider, messages, schema);`

const openRouterExample = `import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

// Works with any OpenAI-compatible API
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
const provider = openaiCompatible(client, 'meta-llama/llama-3.3-70b-instruct');`

const telemetryExample = `const result = await forge(provider, messages, schema);

if (result.success) {
  console.log(result.telemetry);
  // {
  //   durationMs: 0.8,           // last guard() call
  //   status: 'repaired_natively', // JSON was fixed locally
  //   attempts: 1,                 // succeeded on first try
  //   totalDurationMs: 923,        // total wall-clock time
  // }
}`

export default function StructuredOutputPost() {
  return (
    <BlogLayout
      title="How to Get Structured Output from Any LLM in 5 Lines of TypeScript"
      date="March 14, 2026"
      readingTime="7 min read"
    >
      <Paragraph>
        You ask an LLM for JSON. It returns JSON wrapped in a markdown code fence. Or with trailing commas. Or with string <InlineCode>"true"</InlineCode> where you need boolean <InlineCode>true</InlineCode>. You write a retry loop, add error handling, and suddenly what should have been five lines of code is fifty.
      </Paragraph>

      <Paragraph>
        What if getting structured, validated, fully-typed output from any LLM provider was actually just five lines?
      </Paragraph>

      <BlogCodeBlock code={forgeExample} />

      <Paragraph>
        That's <InlineCode>forge()</InlineCode> from Reforge — a new TypeScript function that wraps the entire structured-output pipeline into a single call. Define your Zod schema, pick your provider, and get validated data back. No manual parsing. No retry loops. No type guessing.
      </Paragraph>

      <Heading>The Problem with LLM JSON Output</Heading>

      <Paragraph>
        If you've built anything real with LLMs, you know the pattern: prompt the model for JSON, get something that's <em>almost</em> valid, then spend hours handling edge cases. The common issues are well-documented:
      </Paragraph>

      <ul className="list-disc space-y-2 pl-6">
        <li>Markdown code fences wrapping the JSON (<InlineCode>```json ... ```</InlineCode>)</li>
        <li>Trailing commas after the last property or array element</li>
        <li>Unquoted or single-quoted keys</li>
        <li>Type mismatches — strings where numbers or booleans are expected</li>
        <li>Truncated output when the model hits <InlineCode>max_tokens</InlineCode></li>
        <li>Conversational wrappers — "Here's the JSON you asked for: ..."</li>
      </ul>

      <Paragraph>
        Each of these breaks <InlineCode>JSON.parse()</InlineCode>, which means your application fails, and you need an expensive network retry. At 5000ms+ per LLM call, those retries add up fast.
      </Paragraph>

      <Heading>The Manual Retry Loop Problem</Heading>

      <Paragraph>
        Without a library, handling structured output looks something like this:
      </Paragraph>

      <BlogCodeBlock code={manualRetryLoop} />

      <Paragraph>
        This approach has several issues. The retry message "That was invalid JSON. Try again" is vague — it doesn't tell the model <em>what</em> was wrong. It doesn't attempt local repair first (many issues like trailing commas can be fixed in under 5ms without a network call). And you're writing this loop for every single LLM call in your application.
      </Paragraph>

      <Heading>How forge() Works Under the Hood</Heading>

      <Paragraph>
        <InlineCode>forge()</InlineCode> is built on top of Reforge's <InlineCode>guard()</InlineCode> function — a synchronous, zero-dependency JSON repair and validation engine. Here's the pipeline:
      </Paragraph>

      <ol className="list-decimal space-y-2 pl-6">
        <li><strong className="text-foreground">Call the LLM</strong> — sends your messages through the provider adapter</li>
        <li><strong className="text-foreground">Repair locally</strong> — strips markdown fences, fixes trailing commas, quotes bare keys, balances truncated brackets — all in under 5ms</li>
        <li><strong className="text-foreground">Validate with Zod</strong> — runs <InlineCode>safeParse()</InlineCode> with automatic type coercion</li>
        <li><strong className="text-foreground">Smart retry</strong> — if validation fails, generates a targeted retry prompt that tells the LLM exactly which fields failed and why</li>
        <li><strong className="text-foreground">Repeat</strong> — up to <InlineCode>maxRetries</InlineCode> (default: 3), then return the final result</li>
      </ol>

      <Paragraph>
        The key insight is step 2: most LLM output issues are syntactic, not semantic. A trailing comma doesn't need a 2-second network round-trip — it needs a fast local string operation. Reforge handles these locally, and only retries when the data itself is wrong (missing fields, wrong types that can't be coerced).
      </Paragraph>

      <Heading>Works with Any Provider</Heading>

      <Paragraph>
        Reforge ships adapters for the major providers, but the pattern is always the same: create a client, wrap it in an adapter, pass it to <InlineCode>forge()</InlineCode>.
      </Paragraph>

      <SubHeading>Anthropic Claude</SubHeading>
      <BlogCodeBlock code={anthropicExample} />

      <SubHeading>OpenRouter / Groq / Ollama / Any OpenAI-Compatible API</SubHeading>
      <BlogCodeBlock code={openRouterExample} />

      <Paragraph>
        Because the <InlineCode>openaiCompatible()</InlineCode> adapter works with any OpenAI-compatible API (you just change the <InlineCode>baseURL</InlineCode>), it covers dozens of providers: OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM, and more.
      </Paragraph>

      <Heading>Full Telemetry</Heading>

      <Paragraph>
        Every <InlineCode>forge()</InlineCode> call returns detailed telemetry so you can monitor your LLM pipeline:
      </Paragraph>

      <BlogCodeBlock code={telemetryExample} />

      <Paragraph>
        You can see exactly how many attempts were needed, whether the output was repaired locally or required a network retry, and how long the entire flow took.
      </Paragraph>

      <Heading>When to Use guard() vs forge()</Heading>

      <Paragraph>
        If you already have your own LLM calling infrastructure and just need the repair + validation step, use <InlineCode>guard()</InlineCode> directly. It's synchronous, zero-dependency, and processes a 2KB string in under 5ms.
      </Paragraph>

      <Paragraph>
        If you want the full pipeline — LLM call, repair, validation, and automatic retries — in a single function, use <InlineCode>forge()</InlineCode>. It's the simplest way to get structured output from any LLM.
      </Paragraph>

      <Callout>
        <strong className="text-foreground">Get started:</strong>{' '}
        <InlineCode>npm install reforge-ai zod openai</InlineCode> — then check the{' '}
        <a href="/docs/quick-start-forge" className="text-primary hover:underline">Quick Start guide</a>{' '}
        for a complete walkthrough.
      </Callout>
    </BlogLayout>
  )
}
