import { useState, useRef, useEffect } from 'react'
import { Play, RotateCcw, ChevronDown, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'

const presets: Record<string, { label: string; desc: string; input: string; schema: string }> = {
  markdown: {
    label: 'Markdown Wrapper',
    desc: 'JSON wrapped in ```json fences',
    input: '```json\n{"name": "Alice", "age": 30}\n```',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n})`,
  },
  trailing: {
    label: 'Trailing Commas',
    desc: 'Common LLM mistake',
    input: '{"name": "Bob", "age": 25, "active": true,}',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  active: z.boolean(),\n})`,
  },
  unquoted: {
    label: 'Unquoted Keys',
    desc: 'JS-style object notation',
    input: '{name: "Charlie", age: 35}',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n})`,
  },
  truncated: {
    label: 'Truncated Output',
    desc: 'Hit max_tokens mid-response',
    input: '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob"',
    schema: `z.object({\n  users: z.array(z.object({\n    name: z.string(),\n    age: z.number().optional(),\n  })),\n})`,
  },
  conversational: {
    label: 'Conversational Wrapper',
    desc: 'JSON buried in chat text',
    input: 'Sure! Here is the data you requested:\n\n{"city": "London", "population": 8982000}\n\nLet me know if you need anything else!',
    schema: `z.object({\n  city: z.string(),\n  population: z.number(),\n})`,
  },
  coercion: {
    label: 'Type Coercion',
    desc: 'String values need casting',
    input: '{"name": "Diana", "age": "28", "active": "true"}',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  active: z.boolean(),\n})`,
  },
  failure: {
    label: 'Validation Failure',
    desc: 'Missing required fields',
    input: '{"name": "Eve"}',
    schema: `z.object({\n  name: z.string(),\n  age: z.number(),\n  email: z.string(),\n})`,
  },
}

type GuardResultAny =
  | { success: true; data: unknown; telemetry: { durationMs: number; status: string }; isRepaired: boolean }
  | { success: false; retryPrompt: string; errors: Array<{ path: (string | number)[]; message: string }>; telemetry: { durationMs: number; status: string } }

export default function Demo() {
  const [input, setInput] = useState(presets.markdown.input)
  const [schema, setSchema] = useState(presets.markdown.schema)
  const [result, setResult] = useState<GuardResultAny | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadPreset = (key: string) => {
    const preset = presets[key]
    setInput(preset.input)
    setSchema(preset.schema)
    setResult(null)
    setError(null)
    setDropdownOpen(false)
  }

  const runGuard = async () => {
    setError(null)
    setResult(null)

    try {
      const z = await import('zod')
      const { guard } = await import('reforge-ai')

      const schemaFn = new Function('z', `return ${schema}`)
      const zodSchema = schemaFn(z)

      const res = guard(input, zodSchema) as GuardResultAny
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const reset = () => {
    setInput(presets.markdown.input)
    setSchema(presets.markdown.schema)
    setResult(null)
    setError(null)
  }

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Playground
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Interactive Demo
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Paste dirty LLM output, define your Zod schema, and watch
            Reforge repair and validate it — right in your browser.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-border hover:bg-card"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Examples
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl shadow-black/30">
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => loadPreset(key)}
                    className="block w-full px-4 py-2.5 text-left transition-colors duration-100 hover:bg-muted"
                  >
                    <span className="block text-sm font-medium text-foreground">{preset.label}</span>
                    <span className="block text-xs text-muted-foreground">{preset.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={runGuard}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-150 hover:brightness-110"
          >
            <Play className="h-3.5 w-3.5" />
            Run guard()
          </button>

          <button
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/60 px-3.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-border hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Split panes */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Input side */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                LLM Output
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full resize-none rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-4 font-mono text-[13px] leading-6 text-foreground/85 placeholder:text-muted-foreground/40 transition-colors duration-150 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Paste your LLM output here..."
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Zod Schema
              </label>
              <textarea
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full resize-none rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-4 font-mono text-[13px] leading-6 text-foreground/85 placeholder:text-muted-foreground/40 transition-colors duration-150 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="z.object({ ... })"
              />
            </div>
          </div>

          {/* Output side */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Result
            </label>
            <div className="min-h-[376px] rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-5">
              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm leading-relaxed text-destructive/90">{error}</p>
                </div>
              )}

              {!result && !error && (
                <div className="flex h-full min-h-[336px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Play className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Click <span className="text-primary">Run guard()</span> to see the result
                  </p>
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-5">
                  {/* Status row */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {result.success ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        SUCCESS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                        <XCircle className="h-3.5 w-3.5" />
                        FAILED
                      </span>
                    )}
                    <span className="rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {result.telemetry.status}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <Clock className="h-3 w-3" />
                      {result.telemetry.durationMs.toFixed(2)}ms
                    </span>
                  </div>

                  {/* Data */}
                  {result.success && (
                    <ResultSection title="Validated Data">
                      <pre className="overflow-x-auto rounded-lg border border-border/40 bg-card/50 p-3.5 text-[13px] leading-6">
                        <code className="font-mono text-foreground/85">
                          {JSON.stringify(result.data, null, 2)}
                        </code>
                      </pre>
                      {result.isRepaired && (
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-primary/80">
                          <Sparkles className="h-3 w-3" />
                          Input was repaired before validation
                        </p>
                      )}
                    </ResultSection>
                  )}

                  {/* Failure info */}
                  {!result.success && (
                    <>
                      {result.errors.length > 0 && (
                        <ResultSection title="Validation Errors">
                          <div className="space-y-1.5">
                            {result.errors.map((err, i) => (
                              <div key={i} className="flex items-baseline gap-2 text-sm">
                                <code className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] text-destructive">
                                  {err.path.join('.') || '/'}
                                </code>
                                <span className="text-muted-foreground">{err.message}</span>
                              </div>
                            ))}
                          </div>
                        </ResultSection>
                      )}
                      <ResultSection title="Retry Prompt">
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-card/50 p-3.5 text-[13px] leading-6">
                          <code className="font-mono text-foreground/85">
                            {result.retryPrompt}
                          </code>
                        </pre>
                      </ResultSection>
                    </>
                  )}

                  {/* Telemetry */}
                  <ResultSection title="Telemetry">
                    <pre className="overflow-x-auto rounded-lg border border-border/40 bg-card/50 p-3.5 text-[13px] leading-6">
                      <code className="font-mono text-foreground/85">
                        {JSON.stringify(result.telemetry, null, 2)}
                      </code>
                    </pre>
                  </ResultSection>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h4>
      {children}
    </div>
  )
}
