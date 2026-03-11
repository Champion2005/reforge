import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock, Callout } from '../../components/BlogLayout'

const basicExample = `import { z } from 'zod';
import { guard } from 'reforge-ai';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const raw = llm.response; // whatever your LLM returns
const result = guard(raw, UserSchema);

if (result.success) {
  // result.data is typed as { name: string; age: number; email: string }
  saveUser(result.data);
} else {
  // result.retryPrompt is a string you send back to the LLM
  messages.push({ role: 'user', content: result.retryPrompt });
}`

const openaiExample = `import OpenAI from 'openai';
import { z } from 'zod';
import { guard } from 'reforge-ai';

const openai = new OpenAI();

const ProductSchema = z.object({
  name: z.string(),
  price: z.number(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  tags: z.array(z.string()),
});

async function extractProduct(description: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'Extract product info as JSON. Return only JSON.',
    },
    { role: 'user', content: description },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    const raw = response.choices[0]?.message?.content ?? '';
    const result = guard(raw, ProductSchema);

    if (result.success) {
      console.log(\`Validated in \${result.telemetry.durationMs.toFixed(1)}ms\`);
      return result.data;
    }

    // Feed the retry prompt back — no schema re-sending needed
    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: result.retryPrompt },
    );
  }

  throw new Error('Extraction failed after 3 attempts');
}`

const structuredOutputExample = `// Even with OpenAI's Structured Outputs, you should validate
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  response_format: { type: 'json_object' },
  messages: [{ role: 'user', content: prompt }],
});

const raw = response.choices[0]?.message?.content ?? '';

// The model *says* it returns JSON, but:
// - It might still have trailing commas
// - Fields might be the wrong type ("42" instead of 42)
// - Optional fields might be missing entirely
const result = guard(raw, MySchema);`

export default function EnforceJsonSchemasOpenAI() {
  return (
    <BlogLayout
      title="How to Enforce JSON Schemas with OpenAI in 2026"
      date="March 10, 2026"
      readingTime="8 min read"
    >
      <Paragraph>
        If you&apos;re building with GPT-4o, Claude, or any other LLM in 2026, you&apos;ve
        probably hit this problem: you ask the model for structured JSON, and what
        you get back is <em>almost</em> right. A trailing comma here, a string where
        you expected a number there, maybe the whole thing wrapped in a markdown
        code fence. Your <InlineCode>JSON.parse()</InlineCode> call throws, your
        pipeline breaks, and you&apos;re left retrying — burning tokens and latency.
      </Paragraph>

      <Paragraph>
        This guide shows how to build a bulletproof JSON extraction pipeline using
        Zod schemas and Reforge — a zero-dependency TypeScript library that repairs
        malformed LLM output deterministically in microseconds.
      </Paragraph>

      <Heading>The Problem with LLM JSON Output</Heading>

      <Paragraph>
        LLMs are probabilistic text generators. Even when you tell them to &quot;return
        only valid JSON,&quot; they frequently produce output with these issues:
      </Paragraph>

      <ul className="list-disc space-y-2 pl-6">
        <li><strong className="text-foreground">Markdown wrappers</strong> — The model wraps JSON in <InlineCode>```json</InlineCode> fences</li>
        <li><strong className="text-foreground">Trailing commas</strong> — <InlineCode>{`{"name": "Alice",}`}</InlineCode></li>
        <li><strong className="text-foreground">Wrong types</strong> — Returning <InlineCode>&quot;42&quot;</InlineCode> (string) instead of <InlineCode>42</InlineCode> (number)</li>
        <li><strong className="text-foreground">Truncated output</strong> — Hitting <InlineCode>max_tokens</InlineCode> mid-object</li>
        <li><strong className="text-foreground">Conversational wrapping</strong> — &quot;Here is the data you requested: {'{'}&quot;</li>
      </ul>

      <Paragraph>
        OpenAI&apos;s Structured Outputs (<InlineCode>response_format</InlineCode>) helps, but
        it doesn&apos;t solve all problems. It can&apos;t fix truncation. It doesn&apos;t do
        type coercion. And it&apos;s vendor-specific — if you switch to Anthropic or a
        local model, you lose that safety net.
      </Paragraph>

      <Heading>The Solution: Client-Side Validation + Repair</Heading>

      <Paragraph>
        Instead of relying on the model to get it right, validate and repair on
        your side. The pattern is simple:
      </Paragraph>

      <ol className="list-decimal space-y-2 pl-6">
        <li>Define your schema with Zod (you probably already do this)</li>
        <li>Pass the raw LLM string through <InlineCode>guard()</InlineCode></li>
        <li>Get back typed, validated data — or a retry prompt if repair isn&apos;t enough</li>
      </ol>

      <BlogCodeBlock code={basicExample} />

      <Heading>Full OpenAI Integration</Heading>

      <Paragraph>
        Here&apos;s a production-ready pattern with automatic retries. Notice that the
        retry prompt is generated by Reforge — you don&apos;t need to re-send the
        schema or craft the correction message yourself:
      </Paragraph>

      <BlogCodeBlock code={openaiExample} />

      <Callout>
        <strong className="text-foreground">Performance note:</strong> The{' '}
        <InlineCode>guard()</InlineCode> call itself takes under 5ms for typical
        LLM outputs. The expensive part is always the network round-trip to the
        model. Reforge eliminates unnecessary round-trips by fixing issues locally.
      </Callout>

      <Heading>What About Structured Outputs?</Heading>

      <Paragraph>
        OpenAI&apos;s <InlineCode>response_format: {'{'} type: &apos;json_object&apos; {'}'}</InlineCode> is
        useful, but it&apos;s not sufficient on its own:
      </Paragraph>

      <BlogCodeBlock code={structuredOutputExample} />

      <SubHeading>Why you still need client-side validation</SubHeading>

      <ul className="list-disc space-y-2 pl-6">
        <li><strong className="text-foreground">Type coercion</strong> — The model might return <InlineCode>&quot;true&quot;</InlineCode> instead of <InlineCode>true</InlineCode>. Reforge handles this.</li>
        <li><strong className="text-foreground">Vendor independence</strong> — Switch to Anthropic or Llama without changing your validation layer.</li>
        <li><strong className="text-foreground">Defense in depth</strong> — Even &quot;guaranteed&quot; JSON can violate your business logic. Zod catches semantic errors.</li>
        <li><strong className="text-foreground">Truncation</strong> — If the model hits <InlineCode>max_tokens</InlineCode>, Structured Outputs won&apos;t save you. Reforge will attempt bracket balancing.</li>
      </ul>

      <Heading>Key Takeaways</Heading>

      <ol className="list-decimal space-y-2 pl-6">
        <li><strong className="text-foreground">Never trust LLM output directly.</strong> Always validate against a schema.</li>
        <li><strong className="text-foreground">Repair before retrying.</strong> Most JSON errors are trivially fixable without a network round-trip.</li>
        <li><strong className="text-foreground">Use typed schemas.</strong> Zod gives you runtime validation AND TypeScript types from a single source of truth.</li>
        <li><strong className="text-foreground">Keep it vendor-agnostic.</strong> Your validation layer should work with any LLM provider.</li>
      </ol>

      <Paragraph>
        Reforge is open-source, zero-dependency, and runs everywhere — Node.js,
        Bun, Deno, Cloudflare Workers, Vercel Edge, and the browser. Get started
        with <InlineCode>npm install reforge-ai zod</InlineCode>.
      </Paragraph>
    </BlogLayout>
  )
}
