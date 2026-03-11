import CodeBlock from '../components/CodeBlock'
import { BookOpen, Download, Wrench, Shield, Zap, RotateCcw } from 'lucide-react'

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

const sections = [
  { id: 'install', label: 'Installation', icon: Download },
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'api', label: 'API Reference', icon: Shield },
  { id: 'openai', label: 'OpenAI Integration', icon: Wrench },
  { id: 'anthropic', label: 'Anthropic Integration', icon: Wrench },
  { id: 'retry', label: 'Retry Strategy', icon: RotateCcw },
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
              Getting Started
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Everything you need to integrate Reforge into your AI-powered
              application.
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
