import { Link } from 'react-router-dom'
import {
  Zap,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import {
  SiOpenai,
  SiAnthropic,
  SiGoogle,
  SiOllama,
  SiPerplexity,
} from 'react-icons/si'
import { useState } from 'react'
import CodeBlock from '../components/CodeBlock'

/* ── Provider logo data ─────────────────────────────────── */

const providers: { name: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { name: 'OpenAI', icon: SiOpenai },
  { name: 'Anthropic', icon: SiAnthropic },
  { name: 'Google Gemini', icon: SiGoogle },
  { name: 'OpenRouter' },
  { name: 'Groq' },
  { name: 'Together' },
  { name: 'Ollama', icon: SiOllama },
  { name: 'Perplexity', icon: SiPerplexity },
  { name: 'Fireworks' },
  { name: 'LM Studio' },
]

/* ── Code snippets ──────────────────────────────────────── */

const guardCode = `import { z } from 'zod';
import { guard } from 'reforge-ai';

const User = z.object({ name: z.string(), age: z.number() });

// Raw LLM output — markdown-wrapped, trailing comma
const raw = '\`\`\`json\\n{"name": "Alice", "age": 30,}\\n\`\`\`';

const result = guard(raw, User);

if (result.success) {
  console.log(result.data);       // { name: "Alice", age: 30 }
  console.log(result.isRepaired); // true
  console.log(result.telemetry);  // { durationMs: ~1, status: "repaired_natively" }
}`

const forgeCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const provider = openaiCompatible(new OpenAI(), 'gpt-4o');

const Colors = z.array(z.object({
  name: z.string(),
  hex: z.string(),
}));

const result = await forge(provider, [
  { role: 'user', content: 'List 3 colors with hex codes.' },
], Colors);

// Calls LLM → guard() → auto-retry up to 3x if needed
if (result.success) console.log(result.data);
// → [{ name: "Red", hex: "#FF0000" }, ...]`

const repairBeforeAfter = `// LLM returned this:
{
  name: "Widget Pro",       // ← unquoted key
  "price": "49.99",         // ← string, not number
  "inStock": "true",        // ← string, not boolean
  "tags": ["sale", "new",], // ← trailing comma
}                            // ← trailing comma

// guard() returns:
{
  "name": "Widget Pro",
  "price": 49.99,
  "inStock": true,
  "tags": ["sale", "new"]
}`

const forgeFlowCode = `// One function replaces the manual retry loop:
const result = await forge(provider, messages, schema, {
  maxRetries: 3,
  providerOptions: { temperature: 0.1 },
});

// forge() internally:
// 1. Calls your LLM provider
// 2. Pipes response through guard()
// 3. If guard() fails → appends retryPrompt → calls LLM again
// 4. Returns validated, typed data or accumulated errors`

const installCmd = 'npm install reforge-ai zod'

/* ── Component ──────────────────────────────────────────── */

export default function Home() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'guard' | 'forge'>('guard')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 sm:pt-36 sm:pb-24">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <Zap className="h-3 w-3 text-primary" />
            Open-source &middot; Free forever
          </div>

          <h1 className="glow-text text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Stop paying for{' '}
            <span className="text-primary">LLM retries.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[660px] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Raw LLM output reforged into clean data. Native JSON repair in
            under 5ms local timings, Zod validation, and automatic retries for any LLM
            provider — with a single unified API.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/demo"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-150 hover:brightness-110"
            >
              Try the Live Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={handleCopy}
              className="inline-flex h-11 items-center gap-2.5 rounded-lg border border-border/60 bg-muted/50 px-5 font-mono text-sm text-muted-foreground backdrop-blur-sm transition-all duration-150 hover:border-border hover:bg-muted hover:text-foreground"
            >
              <span className="text-primary/60">$</span>
              {installCmd}
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Provider strip */}
          <div className="mx-auto mt-14 max-w-3xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
              Works with every provider
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              {providers.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-1.5 text-muted-foreground/60"
                >
                  {p.icon ? (
                    <p.icon className="h-4 w-4" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground/50">
                      {p.name[0]}
                    </span>
                  )}
                  <span className="text-xs font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dual Code Example (guard / forge tabs) ──── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center gap-1 rounded-t-lg border border-b-0 border-border/40 bg-card/30 px-1 pt-1">
            {(['guard', 'forge'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  activeTab === tab
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}()
              </button>
            ))}
            <span className="ml-auto pr-3 text-xs text-muted-foreground/50">
              {activeTab === 'guard' ? 'Sync · Zero dependencies' : 'Async · End-to-end'}
            </span>
          </div>
          <div className="glow-blue rounded-b-xl rounded-tr-xl">
            <CodeBlock code={activeTab === 'guard' ? guardCode : forgeCode} />
          </div>
        </div>
      </section>

      {/* ── Feature: Native JSON Repair ─────────────── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Core
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Native JSON Repair
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">
                LLMs produce trailing commas, unquoted keys, markdown wrappers,
                single quotes, and truncated outputs. Reforge fixes all of these
                deterministically in under 5ms local timings — no network round-trips.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  'Strips markdown ```json fences',
                  'Removes trailing commas',
                  'Quotes bare keys',
                  'Converts single → double quotes',
                  'Balances truncated brackets',
                  'Coerces "true" → true, "42" → 42',
                ].map((fix) => (
                  <div key={fix} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    <span>{fix}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl">
              <CodeBlock code={repairBeforeAfter} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature: End-to-End Structured Output ───── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <CodeBlock code={forgeFlowCode} />
            </div>
            <div className="order-1 lg:order-2">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                New in v0.2
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                End-to-End with forge()
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">
                One function replaces the manual retry loop. <code className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px]">forge()</code> calls
                your LLM, repairs and validates the response, and auto-retries
                if needed — all with a single call.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  'Call any LLM provider with a unified API',
                  'Auto-retry with token-efficient prompts',
                  'Returns fully typed, validated data',
                  'Configurable max retries and provider options',
                  'Telemetry: attempts, attemptDetails, total duration',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature: Any LLM Provider ───────────────── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Universal
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Any LLM Provider. One API.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Three built-in adapters cover the entire ecosystem. The OpenAI-compatible
              adapter works with any provider that exposes an OpenAI-like API — pass your
              pre-configured client with a custom <code className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px]">baseURL</code>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                adapter: 'openaiCompatible()',
                path: 'reforge-ai/openai-compatible',
                covers: ['OpenAI', 'OpenRouter', 'Groq', 'Together', 'Fireworks', 'Ollama', 'LM Studio', 'vLLM'],
              },
              {
                adapter: 'anthropic()',
                path: 'reforge-ai/anthropic',
                covers: ['Anthropic Claude'],
              },
              {
                adapter: 'google()',
                path: 'reforge-ai/google',
                covers: ['Google Gemini', 'Vertex AI'],
              },
            ].map((a) => (
              <div
                key={a.adapter}
                className="rounded-xl border border-border/40 bg-card/50 p-6 transition-all duration-200 hover:border-border hover:bg-card"
              >
                <code className="text-sm font-semibold text-primary">{a.adapter}</code>
                <p className="mt-1 font-mono text-xs text-muted-foreground/50">{a.path}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.covers.map((name) => (
                    <span
                      key={name}
                      className="rounded-md border border-border/40 bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground/60">
            Need a different provider? Implement the single-method{' '}
            <code className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[12px]">ReforgeProvider</code>{' '}
            interface — it's trivial.
          </p>
        </div>
      </section>

      {/* ── Pipeline ────────────────────────────────── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Pipeline
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Call Provider',
                desc: 'forge() sends your messages to the LLM via the adapter.',
              },
              {
                step: '2',
                title: 'Dirty Parse',
                desc: 'Extracts fenced JSON, fixes comments/quotes/literals, then balances brackets.',
              },
              {
                step: '3',
                title: 'Schema Validate',
                desc: 'Runs your Zod schema with automatic type coercion.',
              },
              {
                step: '4',
                title: 'Result or Retry',
                desc: 'Returns typed data on success. On failure, appends retry prompt and loops.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-border/40 bg-card/50 p-6"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
                {i < 3 && (
                  <div className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                    <ChevronRight className="h-5 w-5 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Performance & Runtime ────────────────────── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Performance
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sub-millisecond. Zero-dep core.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">
                guard() runs under 5ms on typical 2KB inputs with
                typically sub-millisecond execution. Synchronous, pure,
                never throws. No async, no I/O, no global state. Only Zod as an
                required peer dependency.
              </p>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="pb-3 text-left font-semibold text-foreground">Operation</th>
                      <th className="pb-3 text-left font-semibold text-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-muted-foreground">
                    <tr><td className="py-2.5">Clean JSON (fast path)</td><td className="py-2.5 text-success">&lt;1ms</td></tr>
                    <tr><td className="py-2.5">Markdown + parse</td><td className="py-2.5 text-success">&lt;1ms</td></tr>
                    <tr><td className="py-2.5">Full heuristic repair</td><td className="py-2.5 text-success">1-3ms</td></tr>
                    <tr><td className="py-2.5">Repair + Zod validation</td><td className="py-2.5 text-success">&lt;5ms</td></tr>
                    <tr><td className="py-2.5">LLM network retry</td><td className="py-2.5 text-destructive">5000ms+</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Runtime
              </p>
              <h2 className="mb-4 text-xl font-bold tracking-tight">
                Edge-ready everywhere
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Node.js 18+',
                  'Bun',
                  'Deno',
                  'Cloudflare Workers',
                  'Vercel Edge',
                  'Browser',
                ].map((runtime) => (
                  <div
                    key={runtime}
                    className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/50 px-4 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-foreground">{runtime}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground/60">
                No Node-specific APIs. Dual CJS + ESM. Tree-shakeable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to ship resilient AI?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Use <code className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px]">guard()</code> for
            instant local repair, or <code className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px]">forge()</code> for
            end-to-end structured output with any provider.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/docs"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-150 hover:brightness-110"
            >
              Read the Docs
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border/60 px-5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-border hover:bg-muted hover:text-foreground"
            >
              Try the Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
