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
