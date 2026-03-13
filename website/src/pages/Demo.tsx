import { useState } from 'react'
import { Play, RotateCcw, CheckCircle2, XCircle, Clock, Sparkles, Wrench, X, Grid3x3 } from 'lucide-react'
import { demoPresets, type DemoPreset } from './demo-presets'

const presets = demoPresets

/* The 3 initially-visible preset keys */
const initialPresetKeys = ['validationFailure', 'combined', 'typeCoercion'] as const

type GuardResultAny =
  | { success: true; data: unknown; telemetry: { durationMs: number; status: string }; isRepaired: boolean }
  | { success: false; retryPrompt: string; errors: Array<{ path: (string | number)[]; message: string }>; telemetry: { durationMs: number; status: string } }

export default function Demo() {
  const [input, setInput] = useState(presets.validationFailure.input)
  const [schema, setSchema] = useState(presets.validationFailure.schema)
  const [result, setResult] = useState<GuardResultAny | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<DemoPreset | null>(presets.validationFailure)
  const [overlayOpen, setOverlayOpen] = useState(false)

  const loadPreset = (key: string) => {
    const preset = presets[key]
    setInput(preset.input)
    setSchema(preset.schema)
    setResult(null)
    setError(null)
    setActivePreset(preset)
    setOverlayOpen(false)
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
    setInput(presets.validationFailure.input)
    setSchema(presets.validationFailure.schema)
    setResult(null)
    setError(null)
    setActivePreset(presets.validationFailure)
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    setActivePreset(null)
  }

  const handleSchemaChange = (val: string) => {
    setSchema(val)
    setActivePreset(null)
  }

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
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

        {/* Example cards grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Try an example
            </span>
            <button
              onClick={() => setOverlayOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Grid3x3 className="h-3 w-3" />
              View all examples
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {initialPresetKeys.map((key) => {
              const preset = presets[key]
              return (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className={`group rounded-xl border p-4 text-left transition-all duration-150 ${
                    activePreset === preset
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/60 bg-card/30 hover:border-border hover:bg-card/50'
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {preset.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
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
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          {/* Input side */}
          <div className="flex flex-col gap-4 lg:h-112">
            <div className="flex flex-1 flex-col min-h-0">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                LLM Output
              </label>
              <textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                spellCheck={false}
                className="h-56 w-full resize-none overflow-y-auto rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-4 font-mono text-[13px] leading-6 text-foreground/85 placeholder:text-muted-foreground/40 transition-colors duration-150 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 lg:flex-1 lg:min-h-0"
                placeholder="Paste your LLM output here..."
              />
            </div>
            <div className="flex flex-1 flex-col min-h-0">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Zod Schema
              </label>
              <textarea
                value={schema}
                onChange={(e) => handleSchemaChange(e.target.value)}
                spellCheck={false}
                className="h-48 w-full resize-none overflow-y-auto rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-4 font-mono text-[13px] leading-6 text-foreground/85 placeholder:text-muted-foreground/40 transition-colors duration-150 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 lg:flex-1 lg:min-h-0"
                placeholder="z.object({ ... })"
              />
            </div>
          </div>

          {/* Output side — single result box */}
          <div className="flex flex-col lg:h-112">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Result
            </label>
            <div className="h-112 overflow-y-auto rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)] p-5 lg:flex-1 lg:min-h-0">
              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm leading-relaxed text-destructive/90">{error}</p>
                </div>
              )}

              {!result && !error && (
                <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
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

                  {/* Corrections — inside the result box */}
                  {activePreset?.corrections && activePreset.corrections.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary/70">
                        <Wrench className="h-3 w-3" />
                        What Reforge Fixed
                      </div>
                      <div className="space-y-1.5">
                        {activePreset.corrections.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                            <span className="text-foreground/80">{c.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

      {/* All examples overlay */}
      {overlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">All Examples</h2>
              <button
                onClick={() => setOverlayOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className={`rounded-xl border p-4 text-left transition-all duration-150 ${
                    activePreset === preset
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/60 bg-card/30 hover:border-border hover:bg-card/50'
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
