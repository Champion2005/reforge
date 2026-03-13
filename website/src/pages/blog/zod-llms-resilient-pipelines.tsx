import BlogLayout, { Heading, SubHeading, Paragraph, InlineCode, BlogCodeBlock, Callout } from '../../components/BlogLayout'

const agentPipeline = `// A typical agentic pipeline: each step depends on structured output
async function researchAgent(topic: string) {
  // Step 1: Generate research questions
  const questionsRaw = await llm.call(\`Generate 5 research questions about: \${topic}\`);
  const questions = guard(questionsRaw, QuestionsSchema);
  if (!questions.success) throw new Error('Step 1 failed');

  // Step 2: For each question, gather data
  const findings = [];
  for (const q of questions.data.questions) {
    const dataRaw = await llm.call(\`Research this question: \${q}\`);
    const data = guard(dataRaw, FindingSchema);
    if (data.success) findings.push(data.data);
  }

  // Step 3: Synthesize into a report
  const reportRaw = await llm.call(\`Synthesize: \${JSON.stringify(findings)}\`);
  const report = guard(reportRaw, ReportSchema);
  return report;
}`

const schemaDefinitions = `import { z } from 'zod';

const QuestionsSchema = z.object({
  questions: z.array(z.string()).min(1).max(10),
});

const FindingSchema = z.object({
  question: z.string(),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional(),
});

const ReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  findings: z.array(FindingSchema),
  recommendations: z.array(z.string()),
});`

const robustStepExample = `import { guard } from 'reforge-ai';
import type { z } from 'zod';

async function robustLLMStep<T extends z.ZodTypeAny>(
  llm: LLMClient,
  prompt: string,
  schema: T,
  maxAttempts = 3,
): Promise<z.infer<T>> {
  const messages = [{ role: 'user' as const, content: prompt }];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await llm.call(messages);
    const result = guard(raw, schema);

    if (result.success) {
      console.log(
        \`Step resolved: \${result.telemetry.status} in \${result.telemetry.durationMs.toFixed(1)}ms\`
      );
      return result.data;
    }

    // Append the raw response + retry prompt for the next attempt
    messages.push(
      { role: 'assistant' as const, content: raw },
      { role: 'user' as const, content: result.retryPrompt },
    );
  }

  throw new Error(\`LLM step failed after \${maxAttempts} attempts\`);
}`

const pipelineComposition = `// Compose validated steps into a reliable pipeline
async function analyzeProduct(description: string) {
  // Each step is independently validated and retried
  const extraction = await robustLLMStep(
    llm,
    \`Extract product details: \${description}\`,
    ProductSchema,
  );

  const sentiment = await robustLLMStep(
    llm,
    \`Analyze sentiment of this product description: \${description}\`,
    SentimentSchema,
  );

  const comparison = await robustLLMStep(
    llm,
    \`Find similar products to: \${JSON.stringify(extraction)}\`,
    ComparisonSchema,
  );

  return { extraction, sentiment, comparison };
}`

export default function ZodLlmsResilientPipelines() {
  return (
    <BlogLayout
      title="Zod vs. LLMs: Building Resilient Agentic Pipelines"
      date="March 5, 2026"
      readingTime="9 min read"
    >
      <Paragraph>
        Agentic AI systems — multi-step pipelines where each LLM call feeds into
        the next — are the dominant architecture for complex AI applications in
        2026. But they have a critical weakness: every step depends on structured
        data from the previous step. If one LLM call returns malformed JSON,
        the entire pipeline breaks.
      </Paragraph>

      <Paragraph>
        This post shows how to combine Zod schemas with Reforge to build LLM
        pipelines that handle malformed output gracefully, retry intelligently,
        and never propagate invalid data downstream.
      </Paragraph>

      <Heading>The Agentic Pipeline Problem</Heading>

      <Paragraph>
        Consider a typical multi-step agent:
      </Paragraph>

      <BlogCodeBlock code={agentPipeline} />

      <Paragraph>
        Each step depends on the previous step returning valid, typed data. If
        Step 1 returns <InlineCode>{`{"questions": ["What is..."}`}</InlineCode>{' '}
        (truncated), Step 2 crashes. If Step 2 returns{' '}
        <InlineCode>{`{"confidence": "high"}`}</InlineCode> instead of a number,
        Step 3 gets garbage input.
      </Paragraph>

      <Callout>
        <strong className="text-foreground">The compounding error problem:</strong>{' '}
        In a 5-step pipeline where each step has a 95% success rate, the overall
        pipeline success rate is only 77%. At 90% per step, it drops to 59%.
        Structured validation at each step is essential.
      </Callout>

      <Heading>Zod as the Contract Layer</Heading>

      <Paragraph>
        Zod schemas serve as contracts between pipeline steps. They define exactly
        what shape of data each step must produce before the next step can consume
        it:
      </Paragraph>

      <BlogCodeBlock code={schemaDefinitions} />

      <SubHeading>Why Zod specifically?</SubHeading>

      <ul className="list-disc space-y-2 pl-6">
        <li><strong className="text-foreground">Runtime + compile-time safety</strong> — You get TypeScript types AND runtime validation from the same schema definition.</li>
        <li><strong className="text-foreground">Composable</strong> — Schemas can be composed, extended, and refined. Build complex pipeline contracts from simple building blocks.</li>
        <li><strong className="text-foreground">Rich error messages</strong> — When validation fails, Zod tells you exactly which field failed and why. This is critical for generating effective retry prompts.</li>
        <li><strong className="text-foreground">Widely adopted</strong> — Zod is the de facto standard for TypeScript validation. Your team likely already uses it.</li>
      </ul>

      <Heading>The Robust Step Pattern</Heading>

      <Paragraph>
        The key pattern for resilient pipelines is wrapping each LLM call in a
        function that validates, repairs, and retries:
      </Paragraph>

      <BlogCodeBlock code={robustStepExample} />

      <Paragraph>
        This pattern gives you several things:
      </Paragraph>

      <ol className="list-decimal space-y-2 pl-6">
        <li><strong className="text-foreground">Automatic repair</strong> — Reforge fixes trailing commas, markdown wrappers, truncated output, and type mismatches before validation.</li>
        <li><strong className="text-foreground">Targeted retries</strong> — If repair isn&apos;t enough, the retry prompt tells the LLM exactly what failed — no schema re-sending needed.</li>
        <li><strong className="text-foreground">Observability</strong> — The telemetry data tells you whether each step was clean, repaired, or failed, and how long validation took.</li>
        <li><strong className="text-foreground">Type safety</strong> — The return type is automatically inferred from the Zod schema.</li>
      </ol>

      <Heading>Composing Validated Steps</Heading>

      <Paragraph>
        Once you have the <InlineCode>robustLLMStep</InlineCode> helper, composing
        pipelines becomes straightforward:
      </Paragraph>

      <BlogCodeBlock code={pipelineComposition} />

      <Paragraph>
        Each step is independently validated and retried. If extraction fails, it
        retries extraction — it doesn&apos;t re-run sentiment analysis. If sentiment
        returns a string confidence instead of a number, Reforge coerces it
        automatically.
      </Paragraph>

      <Heading>Performance Considerations</Heading>

      <SubHeading>Validation overhead is negligible</SubHeading>

      <Paragraph>
        Reforge&apos;s <InlineCode>guard()</InlineCode> function runs in under 5ms for
        typical LLM outputs (1-2KB). Compare this to the 5000ms+ for an LLM
        API call. The validation overhead is less than 0.5% of total step time.
      </Paragraph>

      <SubHeading>Repair saves expensive retries</SubHeading>

      <Paragraph>
        Without repair, a trailing comma or markdown wrapper requires a full
        network round-trip to the LLM provider. That&apos;s 5000ms+ and real
        money (input + output tokens billed again). Reforge repairs these in
            under 5ms local timings — the most cost-effective optimization you can make.
      </Paragraph>

      <SubHeading>Retry prompts save tokens</SubHeading>

      <Paragraph>
        Reforge&apos;s retry prompts include only the specific validation errors, not
        the full schema. For a schema with 20 fields, this can save hundreds of
        tokens per retry.
      </Paragraph>

      <Heading>Best Practices for Agentic Pipelines</Heading>

      <ol className="list-decimal space-y-2 pl-6">
        <li><strong className="text-foreground">Validate at every boundary.</strong> Every LLM call should pass through <InlineCode>guard()</InlineCode>. Never pass unvalidated data to the next step.</li>
        <li><strong className="text-foreground">Keep schemas strict.</strong> Use <InlineCode>.min()</InlineCode>, <InlineCode>.max()</InlineCode>, <InlineCode>.email()</InlineCode>, and other Zod refinements. The stricter your schema, the earlier you catch problems.</li>
        <li><strong className="text-foreground">Make fields optional strategically.</strong> If a field is nice-to-have, mark it <InlineCode>.optional()</InlineCode>. Reforge won&apos;t retry for missing optional fields.</li>
        <li><strong className="text-foreground">Log telemetry.</strong> Track the <InlineCode>telemetry.status</InlineCode> field across your pipeline. A high rate of &quot;repaired_natively&quot; suggests your prompts need tuning.</li>
        <li><strong className="text-foreground">Set reasonable retry limits.</strong> 2-3 retries per step is usually enough. If it fails after that, the prompt or model is the problem.</li>
      </ol>

      <Heading>Conclusion</Heading>

      <Paragraph>
        Zod and Reforge together give you a type-safe, self-healing validation
        layer for agentic pipelines. Zod defines the contracts; Reforge enforces
        them with deterministic repair and intelligent retry prompts.
      </Paragraph>

      <Paragraph>
        The result is pipelines that handle the messy reality of LLM output
        gracefully — repairing what can be repaired, retrying what can&apos;t, and
        never propagating invalid data downstream.
      </Paragraph>

      <Paragraph>
        Get started with{' '}
        <InlineCode>npm install reforge-ai zod</InlineCode>. Reforge is
        open-source, zero-dependency, and runs in every JavaScript runtime.
      </Paragraph>
    </BlogLayout>
  )
}
