import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock, Callout } from '../../components/BlogLayout'

const naiveAgent = `async function agent(task: string) {
  const plan = await llm('Break this task into steps: ' + task);
  
  for (const step of plan.steps) {
    const result = await llm('Execute: ' + step);
    // But what if result isn't valid JSON?
    // What if it has the wrong shape?
    // What if a field is missing?
    const parsed = JSON.parse(result); // 💥 throws
    await executeStep(parsed);
  }
}`

const guardedAgent = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const provider = openaiCompatible(new OpenAI(), 'gpt-4o');

const StepResult = z.object({
  action: z.enum(['search', 'compute', 'store', 'respond']),
  input: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

async function agent(task: string) {
  const planResult = await forge(provider, [
    { role: 'system', content: 'Break the task into steps. Return JSON.' },
    { role: 'user', content: task },
  ], z.object({ steps: z.array(z.string()) }));

  if (!planResult.success) {
    throw new Error('Planning failed: ' + planResult.errors[0]?.message);
  }

  for (const step of planResult.data.steps) {
    const stepResult = await forge(provider, [
      { role: 'system', content: 'Execute this step. Return structured JSON.' },
      { role: 'user', content: step },
    ], StepResult);

    if (stepResult.success) {
      await executeStep(stepResult.data);
      // stepResult.data is fully typed with all 4 fields guaranteed
    }
  }
}`

const retryPromptExample = `// When forge() internally retries, it sends a prompt like:
// "Your previous response failed schema validation.
//  Errors: [Path: /confidence, Expected: number, Received: string];
//  [Path: /action, Expected: 'search'|'compute'|'store'|'respond', Received: 'query'].
//  The schema is still in your context — return ONLY corrected valid JSON."

// This targeted feedback is far more effective than "Try again."`

const multiStepPipeline = `const AnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  topics: z.array(z.string()),
  actionItems: z.array(z.object({
    task: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    assignee: z.string().optional(),
  })),
});

// Each step is guaranteed to produce valid, typed data
const analysis = await forge(provider, [
  { role: 'user', content: \`Analyze this meeting transcript: \${transcript}\` },
], AnalysisSchema, { maxRetries: 2 });

if (analysis.success) {
  // TypeScript knows the exact shape — no type assertions needed
  for (const item of analysis.data.actionItems) {
    if (item.priority === 'high') {
      await createTicket(item.task, item.assignee);
    }
  }
}`

const customRetryConfig = `// Strict: fail fast (good for real-time)
const result = await forge(provider, messages, schema, {
  maxRetries: 1,
  providerOptions: { temperature: 0 },
});

// Lenient: try harder (good for batch processing)
const result = await forge(provider, messages, schema, {
  maxRetries: 5,
  providerOptions: { temperature: 0.3 },
});`

export default function ReliableAIAgentsPost() {
  return (
    <BlogLayout
      title="Building Reliable AI Agents with Automatic Retry and Validation"
      date="March 12, 2026"
      readingTime="9 min read"
    >
      <Paragraph>
        AI agents are only as reliable as their weakest step. In a multi-step pipeline — plan, execute, validate, respond — a single malformed JSON response breaks the entire chain. And when you're running agents in production, "it usually works" isn't good enough.
      </Paragraph>

      <Paragraph>
        The root issue is that LLMs are probabilistic. Even with <InlineCode>temperature: 0</InlineCode>, you can get trailing commas, markdown wrappers, wrong types, or truncated output. In an agentic pipeline, each step compounds the failure risk.
      </Paragraph>

      <Heading>The Fragile Agent Pattern</Heading>

      <Paragraph>
        Here's what a basic agent loop looks like without validation:
      </Paragraph>

      <BlogCodeBlock code={naiveAgent} />

      <Paragraph>
        The <InlineCode>JSON.parse()</InlineCode> call is the weak link. If the LLM returns <InlineCode>```json ... ```</InlineCode> instead of raw JSON, the entire agent crashes. If a field is the wrong type, downstream steps receive invalid data and produce garbage output. In a production environment, these failures cascade.
      </Paragraph>

      <Heading>The Fix: Schema-Validated Steps with Automatic Retry</Heading>

      <Paragraph>
        The solution is to validate every LLM interaction against a strict schema, repair common issues locally, and only retry over the network when the data itself is semantically wrong. Here's the same agent with Reforge's <InlineCode>forge()</InlineCode>:
      </Paragraph>

      <BlogCodeBlock code={guardedAgent} />

      <Paragraph>
        Every step in this pipeline is guaranteed to either produce data that matches the Zod schema or explicitly fail. There's no silent data corruption, no untyped <InlineCode>any</InlineCode> objects flowing between steps, and no crashes from malformed JSON.
      </Paragraph>

      <Heading>Why Local Repair Matters for Agents</Heading>

      <Paragraph>
        In an agentic pipeline, latency compounds. If your agent executes 5 steps and each step needs one network retry, you've added 25000ms+ of total latency. For interactive agents, that's the difference between responsive and unusable.
      </Paragraph>

      <Paragraph>
        Reforge's <InlineCode>guard()</InlineCode> engine handles the most common issues — markdown fences, trailing commas, unquoted keys, type coercion — in under 5 milliseconds. These are syntactic problems that don't need a network round-trip to fix. The LLM generated the right data, it just formatted it wrong.
      </Paragraph>

      <Paragraph>
        When local repair isn't enough (a required field is missing, an enum has an invalid value), <InlineCode>forge()</InlineCode> generates a targeted retry prompt:
      </Paragraph>

      <BlogCodeBlock code={retryPromptExample} lang="text" />

      <Paragraph>
        This is significantly more effective than generic "try again" messages. The retry prompt tells the LLM exactly which fields failed, what types were expected, and what was actually received. The model can correct just those fields without regenerating the entire response.
      </Paragraph>

      <Heading>Real-World Pattern: Multi-Step Analysis Pipeline</Heading>

      <Paragraph>
        Here's a practical example — a meeting transcript analyzer that extracts structured data and creates action items:
      </Paragraph>

      <BlogCodeBlock code={multiStepPipeline} />

      <Paragraph>
        Without schema validation, you'd need to manually check every field of the response before using it. With <InlineCode>forge()</InlineCode>, the type system does the work: if <InlineCode>analysis.success</InlineCode> is <InlineCode>true</InlineCode>, TypeScript knows the exact shape of <InlineCode>analysis.data</InlineCode>.
      </Paragraph>

      <Heading>Tuning Retry Behavior</Heading>

      <Paragraph>
        Different agent steps have different reliability requirements. A planning step that runs once can afford more retries. A step inside a tight loop needs to fail fast.
      </Paragraph>

      <BlogCodeBlock code={customRetryConfig} />

      <SubHeading>Guidelines for Production Agents</SubHeading>

      <ul className="list-disc space-y-2 pl-6">
        <li><strong className="text-foreground">Use strict schemas</strong> — the tighter your Zod schema, the earlier you catch bad data. Use <InlineCode>.enum()</InlineCode> instead of <InlineCode>.string()</InlineCode> when the set of values is known.</li>
        <li><strong className="text-foreground">Set low temperature</strong> — for structured output, <InlineCode>temperature: 0</InlineCode> or <InlineCode>0.1</InlineCode> reduces format variance.</li>
        <li><strong className="text-foreground">Monitor telemetry</strong> — track <InlineCode>attempts</InlineCode> and <InlineCode>totalDurationMs</InlineCode> to identify which steps are unreliable and need prompt tuning.</li>
        <li><strong className="text-foreground">Handle failures explicitly</strong> — <InlineCode>forge()</InlineCode> never throws on validation failure. Check <InlineCode>result.success</InlineCode> and decide whether to skip, fallback, or escalate.</li>
      </ul>

      <Heading>The Bigger Picture</Heading>

      <Paragraph>
        As LLM agents move from demos to production, the infrastructure around them needs to mature. Structured output validation isn't optional — it's foundational. Every step in an agentic pipeline should produce typed, validated data that the next step can trust.
      </Paragraph>

      <Paragraph>
        Reforge fits into this picture as the validation layer: it sits between every LLM call and your application logic, ensuring that what comes out matches what you expect. The local repair engine avoids unnecessary retries, and the targeted retry prompts make the remaining retries more effective.
      </Paragraph>

      <Callout>
        <strong className="text-foreground">Start building reliable agents:</strong>{' '}
        <InlineCode>npm install reforge-ai zod</InlineCode> — see the{' '}
        <a href="/docs/quick-start-forge" className="text-primary hover:underline">forge() Quick Start</a>{' '}
        and{' '}
        <a href="/docs/retry-strategy" className="text-primary hover:underline">Retry Strategy</a>{' '}
        docs for details.
      </Callout>
    </BlogLayout>
  )
}
