import CodeBlock from '../components/CodeBlock'
import { BookOpen, Download, Wrench, Shield, Zap, RotateCcw, Globe, HelpCircle, Bug, BarChart3 } from 'lucide-react'

const installCode = `npm install reforge-ai zod`

const quickStartCode = `import { z } from 'zod';
import { guard } from 'reforge-ai';

const UserSchema= z.object({
  name: z.string(),
  age:  z.number(),
});

const result = guard(llmOutput, UserSchema);

if (result.success) {
  console.log(result.data);       // typed as { name: string; age: number }
  console.log(result.telemetry);  // { durationMs: 0.4, status: "repaired_natively" }
} else {
  // Append to your LLM message array for a corrective retry
  messages.push({ role: 'user', content: result.retryPrompt });
}`

const openaiCode = `import OpenAI from 'openai';
import { z } from 'zod';
import { guard } from 'reforge-ai';

const openai= new OpenAI();

const ProductSchema = z.object({
  name:  z.string(),
  price: z.number(),
  tags:  z.array(z.string()),
});

async function getProduct(prompt: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: prompt },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
    });

    const raw = response.choices[0].message.content ?? '';
    const result = guard(raw, ProductSchema);

    if (result.success) return result.data;

    // Append the retry prompt and try again
    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: result.retryPrompt },
    );
  }

  throw new Error('Failed after 3 attempts');
}`

const anthropicCode = `import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { guard } from 'reforge-ai';

const client= new Anthropic();

const EventSchema = z.object({
  title: z.string(),
  date:  z.string(),
  attendees: z.array(z.string()),
});

async function getEvent(prompt: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages,
    });

    const raw = response.content[0].type === 'text'
      ? response.content[0].text : '';
    const result = guard(raw, EventSchema);

    if (result.success) return result.data;

    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: result.retryPrompt },
    );
  }

  throw new Error('Failed after 3 attempts');
}`

const apiTypes = `// The main entry-point
function guard<T extends z.ZodTypeAny>(
  llmOutput: string,
  schema: T
): GuardResult<z.infer<T>>

// Discriminated union result
type GuardResult<T> =
  | GuardSuccess<T>
  | GuardFailure;

interface GuardSuccess<T> {
  success: true;
  data: T;
  telemetry: TelemetryData;
  isRepaired: boolean;
}

interface GuardFailure {
  success: false;
  retryPrompt: string;
  errors: ZodIssue[];
  telemetry: TelemetryData;
}

interface TelemetryData {
  durationMs: number;
  status: 'clean' | 'repaired_natively' | 'failed';
}`

const edgeRouteCode = `// app/api/parse/route.ts (Next.js Edge)
import { z } from 'zod';
import { guard } from 'reforge-ai';

export const runtime = 'edge';

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
}`

const sections = [
  { id: 'intro', label: 'Introduction', icon: BookOpen },
  { id: 'install', label: 'Installation', icon: Download },
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'api', label: 'API Reference', icon: Shield },
  { id: 'openai', label: 'OpenAI Integration', icon: Wrench },
  { id: 'anthropic', label: 'Anthropic Integration', icon: Wrench },
  { id: 'edge', label: 'Edge Runtime', icon: Globe },
  { id: 'retry', label: 'Retry Strategy', icon: RotateCcw },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'environments', label: 'Environments', icon: Globe },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: Bug },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'bugs', label: 'Reporting Issues', icon: Bug },
]

export default function Docs() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
        {/* Sidebar nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-0.5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              On this page
            </p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-all duration-150 hover:bg-muted/50 hover:text-foreground"
              >
                <s.icon className="h-3.5 w-3.5 opacity-50" />
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-20">
          {/* Header */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Documentation
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Reforge Documentation
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Everything you need to integrate Reforge into your AI-powered
              application.
            </p>
          </div>

          {/* Introduction */}
          <div id="intro" className="scroll-mt-24 space-y-4">
            <SectionHeader>Introduction</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Reforge</strong> is a zero-dependency TypeScript library that sits between your LLM provider and your application. It solves a common problem: LLMs frequently output malformed JSON — markdown wrappers, trailing commas, unquoted keys, truncated outputs, and type mismatches.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Instead of paying for expensive network retries (1-3 seconds each), Reforge repairs these issues <strong className="text-foreground">deterministically in microseconds</strong> on your side. When repair isn't enough, it generates a token-efficient retry prompt you can feed back to the model.
            </p>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground mb-3">What Reforge does:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary font-bold">1.</span> <strong className="text-foreground">Parses & Repairs</strong> — Fixes markdown fences, trailing commas, unquoted keys, single quotes, escaped quote anomalies, and truncated brackets.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">2.</span> <strong className="text-foreground">Validates & Coerces</strong> — Runs your Zod schema with automatic type coercion (e.g., string <InlineCode>"true"</InlineCode> → boolean <InlineCode>true</InlineCode>).</li>
                <li className="flex gap-2"><span className="text-primary font-bold">3.</span> <strong className="text-foreground">Generates Retry Prompts</strong> — When validation fails, generates a targeted retry string with specific errors — no schema re-sending needed.</li>
              </ul>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Reforge is provider-agnostic (OpenAI, Anthropic, local models), environment-agnostic (Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, browsers), and fully synchronous — no async, no I/O, no global state. It never throws; all error paths return typed result objects.
            </p>
          </div>

          {/* Installation */}
          <div id="install" className="scroll-mt-24 space-y-4">
            <SectionHeader>Installation</SectionHeader>
            <p className="text-muted-foreground">
              Reforge requires <strong className="text-foreground">Zod</strong> as a peer dependency. Install both:
            </p>
            <CodeBlock code={installCode} lang="bash" />
            <p className="text-sm text-muted-foreground/70">
              Works with npm, yarn, pnpm, and bun. Requires Node.js 18+ or any
              modern edge runtime.
            </p>
          </div>

          {/* Quick Start */}
          <div id="quickstart" className="scroll-mt-24 space-y-4">
            <SectionHeader>Quick Start</SectionHeader>
            <p className="text-muted-foreground">
              Import <InlineCode>guard</InlineCode>, define your Zod schema, and pass the raw LLM string. That's it.
            </p>
            <CodeBlock code={quickStartCode} />
            <p className="text-muted-foreground">
              The <InlineCode>result</InlineCode> is a discriminated union — use <InlineCode>result.success</InlineCode> to narrow the type.
            </p>
          </div>

          {/* Concepts */}
          <div id="concepts" className="scroll-mt-24 space-y-8">
            <SectionHeader>Concepts</SectionHeader>

            <ConceptCard title="The Dirty Parser">
              <p className="text-muted-foreground leading-relaxed">
                LLMs are probabilistic — they frequently produce malformed JSON
                with markdown wrappers, trailing commas, unquoted keys,
                single quotes, or truncated output. The Dirty Parser is
                Reforge's core repair engine. It runs a deterministic
                pipeline:
              </p>
              <ol className="mt-4 list-decimal space-y-2.5 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Fast path</strong> —
                  Attempts <InlineCode>JSON.parse()</InlineCode> directly. If it works, no repair needed.
                </li>
                <li>
                  <strong className="text-foreground">Extraction</strong> —
                  Strips markdown fences, locates the first <InlineCode>{'{'}</InlineCode> or <InlineCode>[</InlineCode> and its matching closer.
                </li>
                <li>
                  <strong className="text-foreground">Heuristic fixes</strong> — Removes trailing commas, quotes unquoted keys, converts single quotes to double, un-escapes improperly escaped quotes.
                </li>
                <li>
                  <strong className="text-foreground">Bracket balancing</strong> — Appends missing closing brackets/braces using a stack to handle truncated LLM output.
                </li>
              </ol>
            </ConceptCard>

            <ConceptCard title="Semantic Validation">
              <p className="text-muted-foreground leading-relaxed">
                Once JSON is structurally valid, Reforge validates it against
                your Zod schema using <InlineCode>safeParse()</InlineCode>. It also
                applies automatic type coercion before failing — for example,
                the string <InlineCode>"true"</InlineCode> is coerced to boolean <InlineCode>true</InlineCode>,
                and <InlineCode>"42"</InlineCode> to number <InlineCode>42</InlineCode>.
              </p>
            </ConceptCard>

            <ConceptCard title="Retry Prompt Generation">
              <p className="text-muted-foreground leading-relaxed">
                When validation fails, Reforge does <em>not</em> make a
                network request. Instead, it generates a token-optimized retry
                prompt string that you can append to your LLM conversation to
                request a corrected response. This saves latency and tokens
                compared to re-sending the full schema.
              </p>
            </ConceptCard>
          </div>

          {/* API Reference */}
          <div id="api" className="scroll-mt-24 space-y-5">
            <SectionHeader>API Reference</SectionHeader>
            <p className="text-muted-foreground">
              Reforge exports a single function and its associated types.
            </p>
            <CodeBlock code={apiTypes} />

            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-border/60 bg-card/30 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">guard(llmOutput, schema)</code>
                </h3>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <ParamRow name="llmOutput" type="string" desc="The raw string produced by an LLM." />
                  <ParamRow name="schema" type="z.ZodTypeAny" desc="The Zod schema to validate against." />
                  <ParamRow name="Returns" type="GuardResult<T>" desc="A discriminated union. Check result.success to narrow." />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/30 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">TelemetryData</code>
                </h3>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <ParamRow name="durationMs" type="number" desc="Wall-clock time in milliseconds." />
                  <ParamRow name="status" type={`"clean" | "repaired_natively" | "failed"`} desc="The resolution status of the guard call." />
                </div>
              </div>
            </div>
          </div>

          {/* OpenAI Integration */}
          <div id="openai" className="scroll-mt-24 space-y-4">
            <SectionHeader>OpenAI Integration</SectionHeader>
            <p className="text-muted-foreground">
              Use the retry prompt with the OpenAI SDK to build a robust retry loop:
            </p>
            <CodeBlock code={openaiCode} />
          </div>

          {/* Anthropic Integration */}
          <div id="anthropic" className="scroll-mt-24 space-y-4">
            <SectionHeader>Anthropic Integration</SectionHeader>
            <p className="text-muted-foreground">
              Same pattern works with the Anthropic SDK:
            </p>
            <CodeBlock code={anthropicCode} />
          </div>

          {/* Edge Runtime */}
          <div id="edge" className="scroll-mt-24 space-y-4">
            <SectionHeader>Edge Runtime (Next.js API Route)</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge uses no Node-specific APIs (<InlineCode>fs</InlineCode>, <InlineCode>path</InlineCode>, <InlineCode>Buffer</InlineCode>), so it works natively in edge runtimes. Here's an example Next.js Edge API route:
            </p>
            <CodeBlock code={edgeRouteCode} />
            <p className="text-muted-foreground leading-relaxed text-sm">
              This also works identically in Cloudflare Workers, Vercel Edge Functions, and Deno Deploy.
            </p>
          </div>

          {/* Retry Strategy */}
          <div id="retry" className="scroll-mt-24 space-y-4">
            <SectionHeader>Retry Strategy</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge generates a concise retry prompt that includes the
              specific validation errors flattened into a single string. This is
              designed to be appended directly to your LLM message array.
            </p>
            <div className="rounded-xl border border-border/60 bg-card/30 p-6 text-sm">
              <p className="font-semibold text-foreground">Example retry prompt:</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-muted-foreground">
                Your previous response failed validation. Errors: [Path: /age,
                Expected: number, Received: undefined], [Path: /email, Expected:
                string, Received: undefined]. Return ONLY valid JSON matching
                the schema.
              </pre>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              The retry prompt is token-efficient by design — it only includes
              the paths and types that failed, not the full schema. This saves
              context tokens and keeps the conversation concise.
            </p>
          </div>

          {/* Performance */}
          <div id="performance" className="scroll-mt-24 space-y-5">
            <SectionHeader>Performance</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge is designed for <strong className="text-foreground">&lt; 5ms</strong> end-to-end on a 2KB input. The entire pipeline is:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Synchronous', desc: 'No async, no network, no I/O' },
                { label: 'Pure', desc: 'No global state mutation' },
                { label: 'O(n)', desc: 'Linear time relative to input length' },
                { label: 'Never throws', desc: 'All error paths return typed results' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/40 bg-card/30 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-3 text-left font-semibold text-foreground">Operation</th>
                    <th className="pb-3 text-left font-semibold text-foreground">Typical Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  <tr><td className="py-2.5">Clean JSON (fast path)</td><td className="py-2.5">&lt; 0.1ms</td></tr>
                  <tr><td className="py-2.5">Markdown extraction + parse</td><td className="py-2.5">&lt; 0.5ms</td></tr>
                  <tr><td className="py-2.5">Full heuristic repair</td><td className="py-2.5">&lt; 2ms</td></tr>
                  <tr><td className="py-2.5">Repair + Zod validation</td><td className="py-2.5">&lt; 5ms</td></tr>
                  <tr><td className="py-2.5">LLM network retry (comparison)</td><td className="py-2.5">1,000 - 3,000ms</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Environments */}
          <div id="environments" className="scroll-mt-24 space-y-5">
            <SectionHeader>Environment Compatibility</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge uses only standard JavaScript APIs. No Node-specific modules, no polyfills required.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-3 text-left font-semibold text-foreground">Runtime</th>
                    <th className="pb-3 text-left font-semibold text-foreground">Status</th>
                    <th className="pb-3 text-left font-semibold text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  <tr><td className="py-2.5">Node.js 18+</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">CJS + ESM</td></tr>
                  <tr><td className="py-2.5">Bun</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">Native ESM</td></tr>
                  <tr><td className="py-2.5">Deno</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">Via npm: specifier</td></tr>
                  <tr><td className="py-2.5">Cloudflare Workers</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">No Node APIs used</td></tr>
                  <tr><td className="py-2.5">Vercel Edge</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">Edge-compatible</td></tr>
                  <tr><td className="py-2.5">Browser</td><td className="py-2.5 text-green-400">✓ Supported</td><td className="py-2.5">ESM bundle, tree-shakeable</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground/70">
              Reforge outputs both CJS and ESM via tsup. TypeScript definitions are included. The bundle is tree-shakeable and has zero side effects.
            </p>
          </div>

          {/* Troubleshooting */}
          <div id="troubleshooting" className="scroll-mt-24 space-y-5">
            <SectionHeader>Troubleshooting</SectionHeader>

            <ConceptCard title="Zod is not installed">
              <p className="text-muted-foreground leading-relaxed text-sm">
                If you see an error about Zod not being found, install it as a peer dependency: <InlineCode>npm install zod</InlineCode>. Zod is optional — Reforge has zero runtime dependencies — but it's required for schema validation.
              </p>
            </ConceptCard>

            <ConceptCard title="guard() returns failed but the JSON looks correct">
              <p className="text-muted-foreground leading-relaxed text-sm">
                This usually means the data is valid JSON but doesn't match your Zod schema. Check the <InlineCode>result.errors</InlineCode> array — it contains the exact Zod validation issues with paths and expected types. Common cause: a field is the wrong type (e.g., a string <InlineCode>"42"</InlineCode> where a number <InlineCode>42</InlineCode> is expected). Reforge does try to coerce types, but only for simple cases.
              </p>
            </ConceptCard>

            <ConceptCard title="Very large inputs are slow">
              <p className="text-muted-foreground leading-relaxed text-sm">
                Reforge has a 10MB input size limit. For inputs larger than ~50KB, performance may exceed the 5ms target because every heuristic pass is O(n). If you're processing very large LLM outputs, consider splitting them or increasing your performance budget.
              </p>
            </ConceptCard>

            <ConceptCard title="TypeScript types not resolving">
              <p className="text-muted-foreground leading-relaxed text-sm">
                Ensure your <InlineCode>tsconfig.json</InlineCode> has <InlineCode>"moduleResolution": "bundler"</InlineCode> or <InlineCode>"node16"</InlineCode>. Reforge exports types via the <InlineCode>exports</InlineCode> map in <InlineCode>package.json</InlineCode>, which requires modern module resolution.
              </p>
            </ConceptCard>
          </div>

          {/* FAQ */}
          <div id="faq" className="scroll-mt-24 space-y-5">
            <SectionHeader>Frequently Asked Questions</SectionHeader>

            <FaqItem question="Does Reforge make any network requests?">
              No. Reforge is entirely local and synchronous. It never calls an API, opens a socket, or performs any I/O. The retry prompt is just a string — you decide whether and how to send it to your LLM provider.
            </FaqItem>

            <FaqItem question="What happens if the input is not JSON at all?">
              If Reforge can't find any JSON-like structure in the input (no opening <InlineCode>{'{'}</InlineCode> or <InlineCode>[</InlineCode>), the guard call returns a failure result with Zod validation errors. It never throws.
            </FaqItem>

            <FaqItem question="Can I use Reforge without Zod?">
              Zod is an optional peer dependency. However, without it, Reforge can only do syntactic repair (dirty parsing). Schema validation and type coercion require Zod.
            </FaqItem>

            <FaqItem question="Does Reforge support nested objects and arrays?">
              Yes. The dirty parser handles arbitrarily nested structures. Bracket balancing uses a stack that tracks depth. Zod validation and type coercion also work on nested structures via an iterative work queue.
            </FaqItem>

            <FaqItem question="What's the maximum input size?">
              10MB. Inputs larger than this are rejected to prevent excessive memory usage. In practice, LLM outputs are rarely larger than 50KB.
            </FaqItem>

            <FaqItem question="Is Reforge deterministic?">
              Yes. Given the same input and schema, <InlineCode>guard()</InlineCode> always returns the same result. There's no randomness, no caching, and no global state.
            </FaqItem>

            <FaqItem question="Can Reforge fix missing fields?">
              No. Reforge can only fix syntactic issues (formatting, brackets, types). If a required field is missing from the LLM output, Reforge returns a failure with a retry prompt that tells the LLM exactly which fields are missing.
            </FaqItem>

            <FaqItem question="Does it work with streaming LLM responses?">
              Reforge operates on complete strings. For streaming, you'd accumulate the full response first, then pass it through <InlineCode>guard()</InlineCode>. Partial streaming validation is not currently supported.
            </FaqItem>
          </div>

          {/* Reporting Issues */}
          <div id="bugs" className="scroll-mt-24 space-y-4">
            <SectionHeader>Reporting Issues</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Found a bug? Have a feature request? We'd love to hear from you.
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card/30 p-5">
                <h3 className="text-sm font-semibold text-foreground">Bug Reports</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Open an issue at{' '}
                  <a href="https://github.com/Champion2005/reforge/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    github.com/Champion2005/reforge/issues
                  </a>
                  . Include the raw LLM output string, your Zod schema, and the unexpected result. This helps us reproduce and fix the issue quickly.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/30 p-5">
                <h3 className="text-sm font-semibold text-foreground">Feature Requests</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Have an idea for a new feature? Open an issue with the{' '}
                  <a href="https://github.com/Champion2005/reforge/issues/new?template=feature_request.yml" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    feature request template
                  </a>
                  . Describe the use case and how you'd expect the API to work.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/30 p-5">
                <h3 className="text-sm font-semibold text-foreground">Contributing</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Want to contribute code? See the{' '}
                  <a href="https://github.com/Champion2005/reforge/blob/master/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Contributing Guide
                  </a>
                  {' '}for setup instructions, coding standards, and PR workflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Tiny helper components ──────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight">{children}</h2>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px] text-foreground/85">
      {children}
    </code>
  )
}

function ConceptCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-6">
      <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function ParamRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <p>
      <strong className="text-foreground">{name}</strong>{' '}
      <code className="rounded-md border border-border/40 bg-muted/50 px-1 py-0.5 font-mono text-[11px] text-foreground/70">{type}</code>{' '}
      — {desc}
    </p>
  )
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-sm font-semibold text-foreground">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  )
}
