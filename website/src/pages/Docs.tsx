import CodeBlock from '../components/CodeBlock'
import { BookOpen, Download, Wrench, Shield, Zap, RotateCcw, Globe, HelpCircle, Bug, BarChart3, Layers } from 'lucide-react'

const installCode = `npm install reforge-ai zod`

const installProvidersCode = `# OpenAI / OpenRouter / Groq / Together / Ollama / etc.
npm install reforge-ai zod openai

# Anthropic
npm install reforge-ai zod @anthropic-ai/sdk

# Google Gemini
npm install reforge-ai zod @google/generative-ai`

const quickStartCode = `import { z } from 'zod';
import { guard } from 'reforge-ai';

const UserSchema = z.object({
  name: z.string(),
  age:  z.number(),
});

const result = guard(llmOutput, UserSchema);

if (result.success) {
  console.log(result.data);       // typed as { name: string; age: number }
  console.log(result.telemetry);  // { durationMs: ~1, status: "repaired_natively" }
} else {
  // Append to your LLM message array for a corrective retry
  messages.push({ role: 'user', content: result.retryPrompt });
}`

const forgeQuickStartCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const provider = openaiCompatible(new OpenAI(), 'gpt-4o');

const Colors = z.array(z.object({
  name: z.string(),
  hex:  z.string(),
}));

const result = await forge(provider, [
  { role: 'system', content: 'Return JSON matching the schema.' },
  { role: 'user', content: 'List 3 colors with hex codes.' },
], Colors);

if (result.success) {
  console.log(result.data);
  // → [{ name: "Red", hex: "#FF0000" }, ...]
  console.log(result.telemetry);
  // → { durationMs: ~1, status: "clean", attempts: 1, totalDurationMs: ~1200 }
}`

const openaiForgeCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const client = new OpenAI();
const provider = openaiCompatible(client, 'gpt-4o');

const ProductSchema = z.object({
  name:  z.string(),
  price: z.number(),
  tags:  z.array(z.string()),
});

const result = await forge(provider, [
  { role: 'user', content: 'Extract product info for: iPhone 16 Pro Max' },
], ProductSchema, {
  maxRetries: 3,
  providerOptions: { temperature: 0.1 },
});

if (result.success) {
  console.log(result.data); // fully typed as { name: string; price: number; tags: string[] }
}`

const openRouterCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openrouter } from 'reforge-ai/openrouter';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
const provider = openrouter(client, 'anthropic/claude-sonnet-4-20250514');

const result = await forge(provider, messages, schema, {
  providerOptions: {
    models: ['anthropic/claude-sonnet-4-20250514', 'openai/gpt-4o-mini'],
    httpReferer: 'https://reforge-ai.dev',
    xTitle: 'Reforge Docs Demo',
  },
});`

const anthropicForgeCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { anthropic } from 'reforge-ai/anthropic';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const provider = anthropic(client, 'claude-sonnet-4-20250514');

const EventSchema = z.object({
  title:     z.string(),
  date:      z.string(),
  attendees: z.array(z.string()),
});

const result = await forge(provider, [
  { role: 'user', content: 'Parse this: Team standup on March 15 with Alice, Bob, Carol' },
], EventSchema);`

const googleForgeCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { google } from 'reforge-ai/google';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const provider = google(client, 'gemini-2.0-flash');

const SummarySchema = z.object({
  title:    z.string(),
  summary:  z.string(),
  keywords: z.array(z.string()),
});

const result = await forge(provider, [
  { role: 'user', content: 'Summarize: TypeScript 5.7 adds ...' },
], SummarySchema);`

const customProviderCode = `import { forge, type ReforgeProvider, type Message } from 'reforge-ai';

const myProvider: ReforgeProvider = {
  async call(messages: Message[], options) {
    const res = await fetch('https://my-llm-api.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        ...options,
      }),
    });
    const data = await res.json();
    return data.text;
  },
};

const result = await forge(myProvider, messages, schema);`

const guardApiTypes = `// ── Core: guard() ──
function guard<T extends z.ZodTypeAny>(
  llmOutput: string,
  schema: T
): GuardResult<z.infer<T>>

type GuardResult<T> = GuardSuccess<T> | GuardFailure;

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

const forgeApiTypes = `// ── Provider Layer: forge() ──
async function forge<T extends z.ZodTypeAny, TNativeOptions extends Record<string, unknown>>(
  provider: ReforgeProvider<TNativeOptions> | ReforgeProvider<TNativeOptions>[],
  messages: Message[],
  schema: T,
  options?: ForgeOptions<TNativeOptions>
): Promise<ForgeResult<z.infer<T>>>

interface ReforgeProvider<TNativeOptions = Record<string, unknown>> {
  call(messages: Message[], options?: TNativeOptions): Promise<string>;
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text' | 'image_url'; [k: string]: unknown }>;
}

interface ForgeOptions<TNativeOptions> {
  maxRetries?: number;         // Default: 3
  providerOptions?: TNativeOptions;
  tools?: Record<string, ReforgeTool>;
  toolTimeoutMs?: number;
  maxAgentIterations?: number;
  onChunk?: (text: string) => void;
}

type ForgeResult<T> = ForgeSuccess<T> | ForgeFailure;

interface ForgeSuccess<T> {
  success: true;
  data: T;
  telemetry: ForgeTelemetry;
  isRepaired: boolean;
}

interface ForgeFailure {
  success: false;
  errors: ZodIssue[];
  retryPrompt: string;
  telemetry: ForgeTelemetry;
}

interface ForgeTelemetry extends TelemetryData {
  attempts: number;
  totalDurationMs: number;
  networkDurationMs: number;
  toolExecutionDurationMs: number;
}

// ── Adapter factories ──
function openaiCompatible(client: OpenAIClient, model: string): ReforgeProvider;
function openrouter(client: OpenAIClient, model: string): ReforgeProvider;
function groq(client: OpenAIClient, model: string): ReforgeProvider;
function together(client: OpenAIClient, model: string): ReforgeProvider;
function anthropic(client: AnthropicClient, model: string): ReforgeProvider;
function google(client: GoogleClient, model: string): ReforgeProvider;`

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
  { id: 'forge', label: 'forge() — End-to-End', icon: Layers },
  { id: 'concepts', label: 'Concepts', icon: BookOpen },
  { id: 'api-guard', label: 'API: guard()', icon: Shield },
  { id: 'api-forge', label: 'API: forge()', icon: Shield },
  { id: 'providers', label: 'Provider Adapters', icon: Wrench },
  { id: 'openai', label: 'OpenAI Integration', icon: Wrench },
  { id: 'openrouter', label: 'OpenRouter', icon: Wrench },
  { id: 'anthropic', label: 'Anthropic Integration', icon: Wrench },
  { id: 'google', label: 'Google Gemini', icon: Wrench },
  { id: 'custom', label: 'Custom Provider', icon: Wrench },
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
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
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
              Instead of paying for expensive network retries (5000ms+ each), Reforge repairs these issues <strong className="text-foreground">deterministically in under 5ms local timings</strong> on your side. When repair isn't enough, it generates a token-efficient retry prompt you can feed back to the model.
            </p>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground mb-4">What Reforge does:</p>
              <ul className="space-y-5 text-sm text-muted-foreground">
                <li className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    <strong className="text-foreground">Parses & Repairs</strong>
                  </div>
                  <div className="pl-6 text-muted-foreground">Fixes markdown fences, trailing commas, unquoted keys, single quotes, escaped quote anomalies, and truncated brackets.</div>
                </li>
                <li className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    <strong className="text-foreground">Validates & Coerces</strong>
                  </div>
                  <div className="pl-6 text-muted-foreground">Runs your Zod schema with automatic type coercion (e.g., string <InlineCode>"true"</InlineCode> → boolean <InlineCode>true</InlineCode>).</div>
                </li>
                <li className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    <strong className="text-foreground">Generates Retry Prompts</strong>
                  </div>
                  <div className="pl-6 text-muted-foreground">When validation fails, generates a targeted retry string with specific errors — no schema re-sending needed.</div>
                </li>
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
            <p className="text-muted-foreground">
              To use provider adapters with <InlineCode>forge()</InlineCode>, also install the provider SDK:
            </p>
            <CodeBlock code={installProvidersCode} lang="bash" />
            <p className="text-sm text-muted-foreground/70">
              Works with npm, yarn, pnpm, and bun. Requires Node.js 18+ or any
              modern edge runtime.
            </p>
          </div>

          {/* Quick Start */}
          <div id="quickstart" className="scroll-mt-24 space-y-4">
            <SectionHeader>Quick Start — guard()</SectionHeader>
            <p className="text-muted-foreground">
              Import <InlineCode>guard</InlineCode>, define your Zod schema, and pass the raw LLM string. That's it.
            </p>
            <CodeBlock code={quickStartCode} />
            <p className="text-muted-foreground">
              The <InlineCode>result</InlineCode> is a discriminated union — use <InlineCode>result.success</InlineCode> to narrow the type.
            </p>
          </div>

          {/* forge() Quick Start */}
          <div id="forge" className="scroll-mt-24 space-y-4">
            <SectionHeader>forge() — End-to-End Structured Output</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              <InlineCode>forge()</InlineCode> wraps the entire flow: call your LLM, pipe through <InlineCode>guard()</InlineCode>, and auto-retry if validation fails. One function replaces the manual retry loop.
            </p>
            <CodeBlock code={forgeQuickStartCode} />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground mb-3">How forge() works:</p>
              <ol className="list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
                <li>Calls the provider with your messages</li>
                <li>Pipes the raw response through <InlineCode>guard()</InlineCode></li>
                <li>If <InlineCode>guard()</InlineCode> succeeds — returns the validated data</li>
                <li>If <InlineCode>guard()</InlineCode> fails — appends the retry prompt and calls the LLM again</li>
                <li>Repeats up to <InlineCode>maxRetries</InlineCode> (default: 3)</li>
                <li>If all retries exhausted — returns failure with accumulated errors</li>
              </ol>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-5">
              <p className="text-sm font-semibold text-foreground mb-3">Advanced orchestration:</p>
              <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                <li>Semantic strategy: strict retry or local clamp/coerce for out-of-bound values</li>
                <li>Deterministic fallback arrays for same-vendor model failover on network failures</li>
                <li>Tool loop execution with Zod-validated tool args, timeout guards, and circuit breaking</li>
                <li><InlineCode>onChunk</InlineCode> for user-facing stream text (tool-call payloads suppressed)</li>
              </ul>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              <InlineCode>forge()</InlineCode> never mutates your original messages array. Provider errors (network failures, auth errors) bubble up as exceptions.
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

          {/* API Reference — guard() */}
          <div id="api-guard" className="scroll-mt-24 space-y-5">
            <SectionHeader>API Reference — guard()</SectionHeader>
            <p className="text-muted-foreground">
              The core synchronous function. Zero dependencies beyond Zod.
            </p>
            <CodeBlock code={guardApiTypes} />

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

          {/* API Reference — forge() */}
          <div id="api-forge" className="scroll-mt-24 space-y-5">
            <SectionHeader>API Reference — forge() & Providers</SectionHeader>
            <p className="text-muted-foreground">
              The async orchestrator and provider adapter types.
            </p>
            <CodeBlock code={forgeApiTypes} />

            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-border/60 bg-card/30 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">forge(provider, messages, schema, options?)</code>
                </h3>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <ParamRow name="provider" type="ReforgeProvider" desc="An adapter wrapping your LLM SDK." />
                  <ParamRow name="messages" type="Message[]" desc="The conversation messages to send." />
                  <ParamRow name="schema" type="z.ZodTypeAny" desc="The Zod schema to validate against." />
                  <ParamRow name="options" type="ForgeOptions" desc="Optional: maxRetries (default 3), providerOptions." />
                  <ParamRow name="Returns" type="Promise<ForgeResult<T>>" desc="Discriminated union with telemetry including attempts and totalDurationMs." />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/30 p-6">
                <h3 className="text-base font-semibold text-foreground">
                  <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">ForgeTelemetry</code>
                </h3>
                <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  <ParamRow name="durationMs" type="number" desc="Duration of the last guard() call." />
                  <ParamRow name="status" type="string" desc="Status of the last guard() call." />
                  <ParamRow name="attempts" type="number" desc="Total LLM calls made (1 = first try succeeded)." />
                  <ParamRow name="totalDurationMs" type="number" desc="Wall-clock time for the entire forge() call." />
                </div>
              </div>
            </div>
          </div>

          {/* Provider Adapters */}
          <div id="providers" className="scroll-mt-24 space-y-4">
            <SectionHeader>Provider Adapters</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge ships three built-in adapters. Each wraps the respective SDK's chat completion call and extracts the text content from the response. You pass your own pre-configured client — Reforge never manages credentials.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-3 text-left font-semibold text-foreground">Adapter</th>
                    <th className="pb-3 text-left font-semibold text-foreground">Import</th>
                    <th className="pb-3 text-left font-semibold text-foreground">Covers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-muted-foreground">
                  <tr>
                    <td className="py-2.5"><InlineCode>openaiCompatible()</InlineCode></td>
                    <td className="py-2.5 font-mono text-xs">reforge-ai/openai-compatible</td>
                    <td className="py-2.5">OpenAI, OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, vLLM</td>
                  </tr>
                  <tr>
                    <td className="py-2.5"><InlineCode>anthropic()</InlineCode></td>
                    <td className="py-2.5 font-mono text-xs">reforge-ai/anthropic</td>
                    <td className="py-2.5">Anthropic Claude</td>
                  </tr>
                  <tr>
                    <td className="py-2.5"><InlineCode>google()</InlineCode></td>
                    <td className="py-2.5 font-mono text-xs">reforge-ai/google</td>
                    <td className="py-2.5">Google Gemini, Vertex AI</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground/70">
              The <InlineCode>openaiCompatible()</InlineCode> adapter works with ANY OpenAI-compatible provider because you pass a pre-configured client with custom <InlineCode>baseURL</InlineCode>. Reforge never manages credentials.
            </p>
          </div>

          {/* OpenAI Integration */}
          <div id="openai" className="scroll-mt-24 space-y-4">
            <SectionHeader>OpenAI Integration</SectionHeader>
            <p className="text-muted-foreground">
              Use <InlineCode>forge()</InlineCode> with the OpenAI adapter for end-to-end structured output:
            </p>
            <CodeBlock code={openaiForgeCode} />
          </div>

          {/* OpenRouter Integration */}
          <div id="openrouter" className="scroll-mt-24 space-y-4">
            <SectionHeader>OpenRouter / Compatible Providers</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Any OpenAI-compatible API works with the same adapter — just change the <InlineCode>baseURL</InlineCode>. This covers OpenRouter, Groq, Together, Fireworks, Ollama, LM Studio, and more.
            </p>
            <CodeBlock code={openRouterCode} />
          </div>

          {/* Anthropic Integration */}
          <div id="anthropic" className="scroll-mt-24 space-y-4">
            <SectionHeader>Anthropic Integration</SectionHeader>
            <p className="text-muted-foreground">
              Use the dedicated Anthropic adapter:
            </p>
            <CodeBlock code={anthropicForgeCode} />
          </div>

          {/* Google Gemini Integration */}
          <div id="google" className="scroll-mt-24 space-y-4">
            <SectionHeader>Google Gemini Integration</SectionHeader>
            <p className="text-muted-foreground">
              Use the Google adapter with the <InlineCode>@google/generative-ai</InlineCode> SDK:
            </p>
            <CodeBlock code={googleForgeCode} />
          </div>

          {/* Custom Provider */}
          <div id="custom" className="scroll-mt-24 space-y-4">
            <SectionHeader>Custom Provider</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Need a provider not covered by the built-ins? Implement the single-method <InlineCode>ReforgeProvider</InlineCode> interface:
            </p>
            <CodeBlock code={customProviderCode} />
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
              When <InlineCode>guard()</InlineCode> fails it returns a <InlineCode>retryPrompt</InlineCode> string
              ready to append to your LLM message array. The prompt <strong className="text-foreground">assumes the LLM still has your schema in its conversation context</strong> — it never re-sends the schema, only describes exactly what was wrong with the previous response.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              There are two distinct failure modes, each producing a different prompt:
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card/30 p-5 text-sm">
                <p className="font-semibold text-foreground mb-1">Parse failure <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">errors: []</span></p>
                <p className="text-xs text-muted-foreground mb-3">The LLM returned something that couldn't be extracted as JSON at all. When the output is short enough to be the complete picture (&le;300 chars), it's echoed verbatim. For longer outputs the snippet is omitted.</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-[oklch(0.13_0.005_286)] p-3.5 font-mono text-[13px] leading-6 text-muted-foreground">
{`// Short output — full text is included:
Your previous response could not be parsed as JSON. Got: \`{name: Alice age: 30}\`. The schema is still in your context — return ONLY valid JSON.

// Long output — snippet omitted:
Your previous response could not be parsed as JSON. The schema is still in your context — return ONLY valid JSON.`}
                </pre>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/30 p-5 text-sm">
                <p className="font-semibold text-foreground mb-1">Validation failure <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">errors: ZodIssue[]</span></p>
                <p className="text-xs text-muted-foreground mb-3">JSON parsed successfully but didn't satisfy the schema. Each broken field is reported with its exact path, expected type, and received type.</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-[oklch(0.13_0.005_286)] p-3.5 font-mono text-[13px] leading-6 text-muted-foreground">
{`Your previous response failed schema validation. Errors: [Path: /age, Expected: number, Received: string]; [Path: /email, Expected: string, Received: undefined]. The schema is still in your context — return ONLY corrected valid JSON.`}
                </pre>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Because the schema is assumed to be in context, the prompt stays minimal — only the specific paths and types that failed are included, never the full schema definition. This saves tokens and avoids inflating your context window on retries.
            </p>
          </div>

          {/* Performance */}
          <div id="performance" className="scroll-mt-24 space-y-5">
            <SectionHeader>Performance</SectionHeader>
            <p className="text-muted-foreground leading-relaxed">
              Reforge is designed for <strong className="text-foreground">under 5ms</strong> local validation on typical 2KB outputs. The entire pipeline is:
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
                  <tr><td className="py-2.5">Clean JSON (fast path)</td><td className="py-2.5">typically sub-millisecond</td></tr>
                  <tr><td className="py-2.5">Markdown extraction + parse</td><td className="py-2.5">typically sub-millisecond</td></tr>
                  <tr><td className="py-2.5">Full heuristic repair</td><td className="py-2.5">usually 1-3ms</td></tr>
                  <tr><td className="py-2.5">Repair + Zod validation</td><td className="py-2.5">under 5ms</td></tr>
                  <tr><td className="py-2.5">LLM network retry (comparison)</td><td className="py-2.5">5000ms+</td></tr>
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
                If you see an error about Zod not being found, install it: <InlineCode>npm install zod</InlineCode>. Zod is a required peer dependency.
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

            <FaqItem question="What's the difference between guard() and forge()?">
              <InlineCode>guard()</InlineCode> is synchronous and local — it takes a raw string and validates it. <InlineCode>forge()</InlineCode> is async and end-to-end — it calls your LLM, validates with <InlineCode>guard()</InlineCode>, and auto-retries if needed. Use <InlineCode>guard()</InlineCode> if you manage the LLM calls yourself, or <InlineCode>forge()</InlineCode> for a batteries-included experience.
            </FaqItem>

            <FaqItem question="Does guard() make any network requests?">
              No. <InlineCode>guard()</InlineCode> is entirely local and synchronous. <InlineCode>forge()</InlineCode> makes network requests via your provider adapter, but <InlineCode>guard()</InlineCode> never does.
            </FaqItem>

            <FaqItem question="What happens if the input is not JSON at all?">
              Reforge returns a failure with a parse-focused <InlineCode>retryPrompt</InlineCode> and an <InlineCode>errors</InlineCode> entry explaining that JSON parsing failed. It never throws.
            </FaqItem>

            <FaqItem question="Can I use Reforge without Zod?">
              No. Zod is a required peer dependency.
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
