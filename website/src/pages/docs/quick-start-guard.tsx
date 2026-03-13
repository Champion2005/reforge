import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

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

export default function QuickStartGuard() {
  return (
    <div className="space-y-6">
      <SectionHeader>Quick Start — guard()</SectionHeader>
      <p className="text-muted-foreground">
        Import <InlineCode>guard</InlineCode>, define your Zod schema, and pass the raw LLM string. That's it.
      </p>
      <CodeBlock code={quickStartCode} />
      <p className="text-muted-foreground">
        The <InlineCode>result</InlineCode> is a discriminated union — use <InlineCode>result.success</InlineCode> to narrow the type.
      </p>
    </div>
  )
}
