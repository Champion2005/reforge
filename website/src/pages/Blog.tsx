import { Link } from 'react-router-dom'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

export const blogPosts = [
  {
    slug: 'reforge-timing-benchmark-process-findings',
    title: 'How We Benchmarked Reforge End-to-End: Capture, Analysis, and Findings',
    excerpt:
      'A full walkthrough of the new timing workflow: source-generated artifacts, one-command benchmarking, consolidated analysis, and what the numbers reveal about guard() and forge().',
    date: 'March 14, 2026',
    readingTime: '10 min read',
  },
  {
    slug: 'structured-output-any-llm-typescript',
    title: 'How to Get Structured Output from Any LLM in 5 Lines of TypeScript',
    excerpt:
      'Getting validated, typed JSON from LLMs shouldn\'t require a retry loop. See how forge() turns any provider into a structured output API with a single function call.',
    date: 'March 14, 2026',
    readingTime: '7 min read',
  },
  {
    slug: 'reliable-ai-agents-retry-validation',
    title: 'Building Reliable AI Agents with Automatic Retry and Validation',
    excerpt:
      'AI agents break when LLM output is malformed. Learn how to build multi-step pipelines that validate every interaction, repair locally, and retry intelligently.',
    date: 'March 12, 2026',
    readingTime: '9 min read',
  },
  {
    slug: 'enforce-json-schemas-openai-2026',
    title: 'How to Enforce JSON Schemas with OpenAI in 2026',
    excerpt:
      'Structured outputs from LLMs are still unreliable. Learn how to combine Zod schemas with deterministic JSON repair to guarantee valid data from GPT-4o and other models.',
    date: 'March 10, 2026',
    readingTime: '8 min read',
  },
  {
    slug: 'json-schema-prompts-native-repair',
    title: 'Why JSON Schema Prompts Fail: The Case for Native Repair',
    excerpt:
      'Prompt engineering alone cannot guarantee valid JSON from LLMs. We break down why schemas in system prompts fail and how client-side deterministic repair solves the problem.',
    date: 'March 8, 2026',
    readingTime: '7 min read',
  },
  {
    slug: 'zod-llms-resilient-pipelines',
    title: 'Zod vs. LLMs: Building Resilient Agentic Pipelines',
    excerpt:
      'Agentic systems depend on structured data passing between steps. Here is how to use Zod and Reforge to build LLM pipelines that never break on malformed output.',
    date: 'March 5, 2026',
    readingTime: '9 min read',
  },
]

export default function Blog() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Blog
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Engineering Notes
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Practical guides on LLM output validation, JSON repair, and
            building resilient AI-powered applications.
          </p>
        </div>

        <div className="space-y-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block rounded-xl border border-border/40 bg-card/50 p-6 transition-all duration-200 hover:border-border hover:bg-card"
            >
              <h2 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-150">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {post.readingTime}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
