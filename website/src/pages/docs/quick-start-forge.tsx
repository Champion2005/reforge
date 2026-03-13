import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

const forgeQuickStartCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const provider = openaiCompatible(new OpenAI(), 'gpt-4o');

const Colors = z.array(z.object({
  name: z.string(),
  hex:  z.string(),
}));

const result = await forge(provider, [
  { role: 'system', content: 'Return JSON matching the schema.' },
  { role: 'user', content: 'List 3 colors with hex codes.' },
], Colors);

if (result.success) {
  console.log(result.data);
  // → [{ name: "Red", hex: "#FF0000" }, ...]
  console.log(result.telemetry);
  // → { durationMs: ~1, status: "clean", attempts: 1, totalDurationMs: ~1200 }
}`

export default function QuickStartForge() {
  return (
    <div className="space-y-6">
      <SectionHeader>Quick Start — forge()</SectionHeader>
      <p className="text-muted-foreground leading-relaxed">
        <InlineCode>forge()</InlineCode> wraps the entire flow: call your LLM, pipe through <InlineCode>guard()</InlineCode>, and auto-retry if validation fails. One function replaces the manual retry loop.
      </p>
      <CodeBlock code={forgeQuickStartCode} />
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-sm font-semibold text-foreground mb-3">How forge() works:</p>
        <ol className="list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
          <li>Calls the provider with your messages</li>
          <li>Pipes the raw response through <InlineCode>guard()</InlineCode></li>
          <li>If <InlineCode>guard()</InlineCode> succeeds — returns the validated data</li>
          <li>If <InlineCode>guard()</InlineCode> fails — appends the retry prompt and calls the LLM again</li>
          <li>Repeats up to <InlineCode>maxRetries</InlineCode> (default: 3)</li>
          <li>If all retries exhausted — returns failure with accumulated errors</li>
        </ol>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        <InlineCode>forge()</InlineCode> never mutates your original messages array. Provider errors (network failures, auth errors) bubble up as exceptions.
      </p>
    </div>
  )
}
