import { SectionHeader, ParamRow } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

const guardApiTypes = `// ── Core: guard() ──
function guard<T extends z.ZodTypeAny>(
  llmOutput: string,
  schema: T,
  options?: GuardOptions
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
  debug?: GuardDebugArtifacts;
}

interface TelemetryData {
  durationMs: number;
  status: 'clean' | 'repaired_natively' | 'failed';
}

interface GuardOptions {
  profile?: 'safe' | 'standard' | 'aggressive';
  heuristics?: Partial<GuardHeuristicOptions>;
  retryPrompt?: {
    mode?: 'compact' | 'line-aware';
    contextRadius?: number;
    maxContextChars?: number;
    includeLineNumbers?: boolean;
    maxIssueBlocks?: number;
    redactPaths?: string[];
    redactRegex?: RegExp[];
  };
  retryPromptStrategy?: (input: RetryPromptStrategyInput) => string;
  debug?: boolean;
}`

export default function ApiGuard() {
  return (
    <div className="space-y-6">
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
            <ParamRow name="options" type="GuardOptions" desc="Optional profile/heuristic controls, line-aware retry prompt mode, redaction, custom strategy, and debug artifacts." />
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
  )
}
