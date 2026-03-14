import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import CodeBlock from '../../components/CodeBlock'

const customProviderCode = `import { forge, type ReforgeProvider, type Message } from 'reforge-ai';

const myProvider: ReforgeProvider = {
  async call(messages: Message[], options) {
    const res = await fetch('https://my-llm-api.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        ...options,
      }),
    });
    const data = await res.json();
    return data.text;
  },
};

const result = await forge(myProvider, messages, schema);`

export default function CustomProvider() {
  return (
    <div className="space-y-6">
      <SectionHeader>Custom Provider</SectionHeader>
      <p className="text-muted-foreground leading-relaxed">
        Need a provider not covered by the built-ins? Implement the single-method <InlineCode>ReforgeProvider</InlineCode> interface:
      </p>
      <CodeBlock code={customProviderCode} />
      <p className="text-muted-foreground leading-relaxed">
        The <InlineCode>ReforgeProvider</InlineCode> interface has just one method: <InlineCode>call(messages, options)</InlineCode> that returns a <InlineCode>Promise&lt;string&gt;</InlineCode>. Extract the text content from your provider's response and return it as a plain string.
      </p>
    </div>
  )
}
