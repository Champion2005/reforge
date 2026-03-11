import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock, Callout } from '../../components/BlogLayout'

const systemPromptExample = `// The typical approach: schema in the system prompt
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: \`Return JSON matching this schema:
{
  "name": string,
  "age": number,
  "tags": string[]
}
Return ONLY valid JSON. No markdown. No explanation.\`,
    },
    { role: 'user', content: 'Tell me about Alice, age 30, tags: dev, ml' },
  ],
});

// What you expect:
// {"name": "Alice", "age": 30, "tags": ["dev", "ml"]}

// What you frequently get:
// \\\`\\\`\\\`json
// {"name": "Alice", "age": 30, "tags": ["dev", "ml"],}
// \\\`\\\`\\\``

const repairPipeline = `import { guard } from 'reforge-ai';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  tags: z.array(z.string()),
});

// The LLM returned this mess:
const raw = \`\\\`\\\`\\\`json
{"name": "Alice", "age": "30", "tags": ["dev", "ml"],}
\\\`\\\`\\\`\`;

const result = guard(raw, UserSchema);
// result.success === true
// result.data === { name: "Alice", age: 30, tags: ["dev", "ml"] }
// result.isRepaired === true
// result.telemetry.durationMs === 0.3`

const retryExample = `// When repair isn't enough — missing required fields
const raw = '{"name": "Alice"}';
const result = guard(raw, UserSchema);

if (!result.success) {
  console.log(result.retryPrompt);
  // "Your previous response failed validation. Errors:
  //  [Path: /age, Expected: number, Received: undefined],
  //  [Path: /tags, Expected: array, Received: undefined].
  //  Return ONLY valid JSON matching the schema."

  // Feed this back to the LLM — no schema re-sending needed
  messages.push({ role: 'user', content: result.retryPrompt });
}`

export default function JsonSchemaPromptsNativeRepair() {
  return (
    <BlogLayout
      title="Why JSON Schema Prompts Fail: The Case for Native Repair"
      date="March 8, 2026"
      readingTime="7 min read"
    >
      <Paragraph>
        Every developer building with LLMs has tried the same thing: put the JSON
        schema in the system prompt, tell the model to return &quot;only valid JSON,&quot;
        and hope for the best. It works most of the time. But &quot;most of the time&quot;
        isn&apos;t good enough for production systems.
      </Paragraph>

      <Paragraph>
        This post breaks down exactly why JSON schema prompts fail, what the
        failure modes look like, and why deterministic client-side repair is a
        more reliable approach.
      </Paragraph>

      <Heading>The Schema-in-Prompt Pattern</Heading>

      <Paragraph>
        The standard approach looks something like this:
      </Paragraph>

      <BlogCodeBlock code={systemPromptExample} />

      <Paragraph>
        This is the most common pattern in LLM applications today. And it has
        fundamental reliability issues.
      </Paragraph>

      <Heading>Why It Fails</Heading>

      <SubHeading>1. LLMs don&apos;t understand JSON syntax rules</SubHeading>

      <Paragraph>
        LLMs generate text token by token. They don&apos;t have a JSON parser running
        internally — they&apos;re predicting the next most likely token. This means
        they frequently produce syntactically invalid JSON: trailing commas,
        unquoted keys, single quotes, or mixed formatting.
      </Paragraph>

      <SubHeading>2. Instruction following is probabilistic</SubHeading>

      <Paragraph>
        &quot;Return only valid JSON&quot; is an instruction, not a constraint. The model
        might comply 95% of the time, but that 5% failure rate compounds quickly.
        If your pipeline makes 20 LLM calls per request, there&apos;s a 64% chance
        at least one will have malformed output.
      </Paragraph>

      <SubHeading>3. Markdown wrapping is deeply ingrained</SubHeading>

      <Paragraph>
        Models like GPT-4o and Claude have been trained on massive amounts of
        markdown content. When they produce code-like output, their instinct is
        to wrap it in code fences. No amount of &quot;do not use markdown&quot; in your
        prompt will eliminate this behavior entirely.
      </Paragraph>

      <SubHeading>4. Truncation breaks everything</SubHeading>

      <Paragraph>
        When a response hits <InlineCode>max_tokens</InlineCode>, the JSON gets
        cut off mid-object. No prompt engineering can prevent this — it&apos;s a
        hard limit. The result is a string like{' '}
        <InlineCode>{`{"users": [{"name": "A`}</InlineCode> that will never parse.
      </Paragraph>

      <SubHeading>5. Type confusion is common</SubHeading>

      <Paragraph>
        Even when the JSON is syntactically valid, LLMs frequently confuse types.
        Your schema says <InlineCode>age: number</InlineCode>, but the model
        returns <InlineCode>&quot;age&quot;: &quot;30&quot;</InlineCode>. This passes{' '}
        <InlineCode>JSON.parse()</InlineCode> but fails your business logic.
      </Paragraph>

      <Heading>The Repair-First Approach</Heading>

      <Paragraph>
        Instead of relying on the model to produce perfect output, accept that
        it won&apos;t and repair what it gives you. This is what Reforge does:
      </Paragraph>

      <BlogCodeBlock code={repairPipeline} />

      <Callout>
        <strong className="text-foreground">Key insight:</strong> Reforge doesn&apos;t
        guess. It runs a deterministic pipeline — markdown extraction, trailing
        comma removal, quote fixing, bracket balancing, then Zod validation with
        type coercion. Every step is predictable and testable.
      </Callout>

      <Heading>When Repair Isn&apos;t Enough</Heading>

      <Paragraph>
        Syntactic repair can fix formatting issues, but it can&apos;t invent missing
        data. If the LLM omits a required field entirely, Reforge generates a
        targeted retry prompt:
      </Paragraph>

      <BlogCodeBlock code={retryExample} />

      <Paragraph>
        The retry prompt is designed to be token-efficient — it includes only the
        specific paths and types that failed, not the entire schema. This saves
        context window space and gives the model clear, actionable feedback.
      </Paragraph>

      <Heading>Prompts vs. Repair: A Comparison</Heading>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="pb-3 text-left font-semibold text-foreground">Issue</th>
              <th className="pb-3 text-left font-semibold text-foreground">Prompt Engineering</th>
              <th className="pb-3 text-left font-semibold text-foreground">Client-Side Repair</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            <tr><td className="py-2.5">Markdown wrapping</td><td className="py-2.5">Reduces frequency</td><td className="py-2.5 text-foreground">Eliminates 100%</td></tr>
            <tr><td className="py-2.5">Trailing commas</td><td className="py-2.5">No effect</td><td className="py-2.5 text-foreground">Fixed instantly</td></tr>
            <tr><td className="py-2.5">Type mismatches</td><td className="py-2.5">Reduces frequency</td><td className="py-2.5 text-foreground">Coerced automatically</td></tr>
            <tr><td className="py-2.5">Truncation</td><td className="py-2.5">Cannot prevent</td><td className="py-2.5 text-foreground">Brackets balanced</td></tr>
            <tr><td className="py-2.5">Missing fields</td><td className="py-2.5">Reduces frequency</td><td className="py-2.5 text-foreground">Detected + retry prompt</td></tr>
            <tr><td className="py-2.5">Latency cost</td><td className="py-2.5">1-3s per retry</td><td className="py-2.5 text-foreground">&lt;5ms local repair</td></tr>
          </tbody>
        </table>
      </div>

      <Heading>Key Takeaways</Heading>

      <ol className="list-decimal space-y-2 pl-6">
        <li><strong className="text-foreground">Prompts are suggestions, not guarantees.</strong> They reduce error rates but can&apos;t eliminate them.</li>
        <li><strong className="text-foreground">Most JSON errors are syntactic.</strong> Trailing commas, markdown wrappers, and type mismatches are trivially fixable without a network request.</li>
        <li><strong className="text-foreground">Repair is deterministic.</strong> Unlike prompts, a repair pipeline produces the same output for the same input every time.</li>
        <li><strong className="text-foreground">Use both together.</strong> Good prompts reduce the error rate; client-side repair catches what slips through.</li>
      </ol>

      <Paragraph>
        Reforge implements this repair-first philosophy. It&apos;s zero-dependency,
        runs in under 5ms, and works in every JavaScript runtime. Install it
        with <InlineCode>npm install reforge-ai zod</InlineCode> and stop paying
        for preventable retries.
      </Paragraph>
    </BlogLayout>
  )
}
