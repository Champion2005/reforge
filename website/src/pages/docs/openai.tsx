import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

const openaiForgeCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';
import OpenAI from 'openai';

const client = new OpenAI();
const provider = openaiCompatible(client, 'gpt-4o');

const ProductSchema = z.object({
  name:  z.string(),
  price: z.number(),
  tags:  z.array(z.string()),
});

const result = await forge(provider, [
  { role: 'user', content: 'Extract product info for: iPhone 16 Pro Max' },
], ProductSchema, {
  maxRetries: 3,
  providerOptions: {
    temperature: 0.1,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
  },
});

const resilient = await forge([
  openaiCompatible(client, 'gpt-4o'),
  openaiCompatible(client, 'gpt-4o-mini'),
], messages, ProductSchema);

if (result.success) {
  console.log(result.data); // fully typed as { name: string; price: number; tags: string[] }
}`

export default function OpenAIGuide() {
  return (
    <div className="space-y-6">
      <SectionHeader>OpenAI Integration</SectionHeader>
      <p className="text-muted-foreground leading-relaxed">
        Use <InlineCode>forge()</InlineCode> with the OpenAI adapter for end-to-end structured output. The <InlineCode>openaiCompatible()</InlineCode> adapter works with the official OpenAI SDK.
      </p>
      <CodeBlock code={openaiForgeCode} />
      <p className="text-muted-foreground leading-relaxed">
        Pass native OpenAI options directly in <InlineCode>providerOptions</InlineCode>. These are forwarded unmodified so you can use structured outputs, reasoning knobs, and tool settings without waiting for wrapper updates.
      </p>
    </div>
  )
}
