import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

const openRouterCode = `import { z } from 'zod';
import { forge } from 'reforge-ai';
import { openrouter } from 'reforge-ai/openrouter';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
const provider = openrouter(client, 'anthropic/claude-sonnet-4-20250514');

const result = await forge(provider, messages, schema, {
  providerOptions: {
    models: ['anthropic/claude-sonnet-4-20250514', 'openai/gpt-4o-mini'],
    httpReferer: 'https://reforge-ai.dev',
    xTitle: 'Reforge Demo',
  },
});`

const groqCode = `import OpenAI from 'openai';
import { groq } from 'reforge-ai/groq';

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});
const provider = groq(client, 'llama-3.3-70b-versatile');`

const ollamaCode = `import OpenAI from 'openai';
import { openaiCompatible } from 'reforge-ai/openai-compatible';

const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // Ollama doesn't need a real key
});
const provider = openaiCompatible(client, 'llama3.2');`

export default function OpenRouterGuide() {
  return (
    <div className="space-y-6">
      <SectionHeader>OpenRouter / Compatible Providers</SectionHeader>
      <p className="text-muted-foreground leading-relaxed">
        Reforge provides dedicated adapters for OpenRouter and Groq while still supporting generic OpenAI-compatible endpoints. Use these split adapters to preserve provider-specific options.
      </p>

      <h3 className="text-base font-semibold text-foreground">OpenRouter</h3>
      <CodeBlock code={openRouterCode} />

      <h3 className="text-base font-semibold text-foreground">Groq</h3>
      <CodeBlock code={groqCode} />

      <h3 className="text-base font-semibold text-foreground">Ollama (local)</h3>
      <CodeBlock code={ollamaCode} />

      <p className="text-sm text-muted-foreground/70">
        For Together AI, use <InlineCode>reforge-ai/together</InlineCode>. For any remaining compatible endpoint, <InlineCode>openaiCompatible()</InlineCode> still works.
      </p>
    </div>
  )
}
