import { SectionHeader, InlineCode } from '../../components/DocsLayout'

export default function Introduction() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
          Documentation
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Reforge Documentation
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everything you need to integrate Reforge into your AI-powered application.
        </p>
      </div>

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
              <span className="text-primary font-bold flex-shrink-0">1.</span>
              <strong className="text-foreground">Parses & Repairs</strong>
            </div>
            <div className="pl-6 text-muted-foreground">Fixes markdown fences (``` and ~~~), trailing commas, unquoted keys, single/backtick quotes, JS comments, Python literals, escaped quote anomalies, and truncated brackets.</div>
          </li>
          <li className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-primary font-bold flex-shrink-0">2.</span>
              <strong className="text-foreground">Validates & Coerces</strong>
            </div>
            <div className="pl-6 text-muted-foreground">Runs your Zod schema with automatic type coercion (e.g., string <InlineCode>"true"</InlineCode> → boolean <InlineCode>true</InlineCode>).</div>
          </li>
          <li className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-primary font-bold flex-shrink-0">3.</span>
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
  )
}
