import { Link } from 'react-router-dom'
import {
  Shield,
  Zap,
  Package,
  Globe,
  Timer,
  Wrench,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import CodeBlock from '../components/CodeBlock'

const features = [
  {
    icon: Package,
    title: 'Zero Dependencies',
    description:
      'Only Zod as a peer dependency. No heavy AST parsers, no lodash. Ship lean.',
  },
  {
    icon: Globe,
    title: 'Edge-Ready',
    description:
      'Runs in Node.js, Cloudflare Workers, Vercel Edge, Bun, Deno, and the browser.',
  },
  {
    icon: Timer,
    title: 'Sub-5ms Latency',
    description:
      'End-to-end guard() executes in under 5ms for 2KB strings. No network round-trips.',
  },
  {
    icon: Wrench,
    title: 'Native JSON Repair',
    description:
      'Fixes trailing commas, unquoted keys, markdown wrappers, and truncated outputs automatically.',
  },
  {
    icon: Shield,
    title: 'Zod-Native Validation',
    description:
      'Semantic enforcement with your existing Zod schemas. Type-safe, discriminated-union results.',
  },
  {
    icon: Zap,
    title: 'Retry Prompt Generation',
    description:
      'When validation fails, generates a token-optimized prompt for LLM re-queries.',
  },
]

const heroCode = `import { z } from 'zod';
import { guard } from 'reforge';

const User = z.object({
  name: z.string(),
  age:  z.number(),
});

// Raw LLM output — markdown-wrapped, trailing comma
const raw = '\`\`\`json\\n{"name": "Alice", "age": 30,}\\n\`\`\`';

const result = guard(raw, User);

if (result.success) {
  console.log(result.data);       // { name: "Alice", age: 30 }
  console.log(result.isRepaired); // true
  console.log(result.telemetry);  // { durationMs: 0.4, status: "repaired_natively" }
} else {
  // Append result.retryPrompt to your LLM messages
  console.log(result.retryPrompt);
}`

const installCmd = 'npm install reforge zod'

export default function Home() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Grid background */}
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-20 text-center sm:px-6 sm:pt-36 sm:pb-28">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <Zap className="h-3 w-3 text-primary" />
            Open-source &middot; MIT licensed
            <ChevronRight className="h-3 w-3" />
          </div>

          <h1 className="glow-text text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Stop paying for{' '}
            <span className="text-primary">LLM retries.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[640px] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Zero-latency deterministic validation and native JSON repair for
            GenAI applications. Fix malformed LLM output in microseconds —
            not seconds.
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
        </div>
      </section>

      {/* Code example */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="glow-blue mx-auto max-w-3xl rounded-xl">
          <CodeBlock code={heroCode} />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Features
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for the AI-native stack
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Reforge sits between your LLM provider and your application.
              It validates, repairs, and enforces — all locally, all instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/40 bg-card/50 p-6 transition-all duration-200 hover:border-border hover:bg-card"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Pipeline
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Dirty Parse',
                desc: 'Extracts JSON from markdown wrappers. Fixes trailing commas, unquoted keys, and balances truncated brackets.',
              },
              {
                step: '2',
                title: 'Schema Validate',
                desc: 'Runs your Zod schema with automatic type coercion. String "true" → boolean, "42" → number.',
              },
              {
                step: '3',
                title: 'Result',
                desc: 'Returns typed data on success, or a token-optimized retry prompt on failure. Never throws.',
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
                {/* Connector arrow (hidden on last) */}
                {i < 2 && (
                  <div className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                    <ChevronRight className="h-5 w-5 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to ship resilient AI?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Install Reforge in seconds. No configuration needed — just
            import and guard.
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
