import { SectionHeader, InlineCode, ConceptCard } from '../../components/DocsLayout'

export default function Concepts() {
  return (
    <div className="space-y-8">
      <SectionHeader>Concepts</SectionHeader>

      <ConceptCard title="The Dirty Parser">
        <p className="text-muted-foreground leading-relaxed">
          LLMs are probabilistic — they frequently produce malformed JSON
          with markdown wrappers, trailing commas, unquoted keys,
          single quotes, or truncated output. The Dirty Parser is
          Reforge's core repair engine. It runs a deterministic pipeline:
        </p>
        <ol className="mt-4 list-decimal space-y-2.5 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Fast path</strong> —
            Attempts <InlineCode>JSON.parse()</InlineCode> directly. If it works, no repair needed.
          </li>
          <li>
            <strong className="text-foreground">Extraction</strong> —
            Strips markdown fences (<InlineCode>```</InlineCode> and <InlineCode>~~~</InlineCode>), then locates the first <InlineCode>{'{'}</InlineCode> or <InlineCode>[</InlineCode> and its matching closer.
          </li>
          <li>
            <strong className="text-foreground">Heuristic fixes</strong> — Removes trailing commas and JS comments, quotes unquoted keys, converts single/backtick quotes to double quotes, normalizes Python literals (<InlineCode>True</InlineCode>/<InlineCode>False</InlineCode>/<InlineCode>None</InlineCode>), and un-escapes improperly escaped quotes.
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
          <InlineCode>"42"</InlineCode> to number <InlineCode>42</InlineCode>, and ISO date strings to <InlineCode>Date</InlineCode>
          when the schema expects <InlineCode>z.date()</InlineCode>.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          You can choose a semantic resolution strategy: <InlineCode>retry</InlineCode> for strict regeneration,
          or <InlineCode>clamp</InlineCode> to coerce out-of-range values locally with
          telemetry flag <InlineCode>coerced_locally</InlineCode>.
        </p>
      </ConceptCard>

      <ConceptCard title="Semantic vs. Syntactic Guardrails">
        <p className="text-muted-foreground leading-relaxed">
          Syntactic guardrails repair malformed JSON shape (<InlineCode>{`{name: "x",}`}</InlineCode>).
          Semantic guardrails enforce business constraints after parsing (for example,
          <InlineCode>age &lt;= 100</InlineCode>). Reforge supports both in one pipeline.
        </p>
      </ConceptCard>

      <ConceptCard title="Model Fallback Orchestration">
        <p className="text-muted-foreground leading-relaxed">
          <InlineCode>forge()</InlineCode> can accept a same-vendor fallback chain.
          Semantic failures consume retry budget on the active provider. Intrinsic network failures
          (rate limits, timeouts, server errors) immediately fail over to the next provider in the list.
        </p>
      </ConceptCard>

      <ConceptCard title="Agent Tool Loops">
        <p className="text-muted-foreground leading-relaxed">
          Register local tools with Zod-validated arguments and execution callbacks.
          <InlineCode>forge()</InlineCode> can execute tool calls, feed results back to the model,
          and continue deterministically with circuit breaking via <InlineCode>maxAgentIterations</InlineCode>.
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
  )
}
