import { SectionHeader, InlineCode, ConceptCard } from '../../components/DocsLayout'

export default function Troubleshooting() {
  return (
    <div className="space-y-6">
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
  )
}
