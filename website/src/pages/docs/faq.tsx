import { SectionHeader, InlineCode, FaqItem } from '../../components/DocsLayout'

export default function Faq() {
  return (
    <div className="space-y-6">
      <SectionHeader>Frequently Asked Questions</SectionHeader>

      <FaqItem question="What's the difference between guard() and forge()?">
        <InlineCode>guard()</InlineCode> is synchronous and local — it takes a raw string and validates it. <InlineCode>forge()</InlineCode> is async and end-to-end — it calls your LLM, validates with <InlineCode>guard()</InlineCode>, and auto-retries if needed. Use <InlineCode>guard()</InlineCode> if you manage the LLM calls yourself, or <InlineCode>forge()</InlineCode> for a batteries-included experience.
      </FaqItem>

      <FaqItem question="Does guard() make any network requests?">
        No. <InlineCode>guard()</InlineCode> is entirely local and synchronous. <InlineCode>forge()</InlineCode> makes network requests via your provider adapter, but <InlineCode>guard()</InlineCode> never does.
      </FaqItem>

      <FaqItem question="What happens if the input is not JSON at all?">
        Reforge returns a failure with a parse-focused <InlineCode>retryPrompt</InlineCode> and an <InlineCode>errors</InlineCode> entry explaining that JSON parsing failed. It never throws.
      </FaqItem>

      <FaqItem question="Can I use Reforge without Zod?">
        No. Zod is a required peer dependency.
      </FaqItem>

      <FaqItem question="Does Reforge support nested objects and arrays?">
        Yes. The dirty parser handles arbitrarily nested structures. Bracket balancing uses a stack that tracks depth. Zod validation and type coercion also work on nested structures via an iterative work queue.
      </FaqItem>

      <FaqItem question="What's the maximum input size?">
        10MB. Inputs larger than this are rejected to prevent excessive memory usage. In practice, LLM outputs are rarely larger than 50KB.
      </FaqItem>

      <FaqItem question="Is Reforge deterministic?">
        Yes. Given the same input and schema, <InlineCode>guard()</InlineCode> always returns the same result. There's no randomness, no caching, and no global state.
      </FaqItem>

      <FaqItem question="Can Reforge fix missing fields?">
        No. Reforge can only fix syntactic issues (formatting, brackets, types). If a required field is missing from the LLM output, Reforge returns a failure with a retry prompt that tells the LLM exactly which fields are missing.
      </FaqItem>

      <FaqItem question="Does it work with streaming LLM responses?">
        Reforge operates on complete strings. For streaming, you'd accumulate the full response first, then pass it through <InlineCode>guard()</InlineCode>. Partial streaming validation is not currently supported.
      </FaqItem>
    </div>
  )
}
