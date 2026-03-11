import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'

interface BlogLayoutProps {
  title: string
  date: string
  readingTime: string
  children: React.ReactNode
}

export default function BlogLayout({ title, date, readingTime, children }: BlogLayoutProps) {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <Link
          to="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Blog
        </Link>

        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {readingTime}
            </span>
          </div>
        </header>

        <div className="prose-reforge space-y-6 text-muted-foreground leading-relaxed">
          {children}
        </div>

        <footer className="mt-16 border-t border-border/40 pt-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all posts
          </Link>
        </footer>
      </article>
    </section>
  )
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight text-foreground">{children}</h2>
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground">{children}</h3>
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px] text-foreground/85">
      {children}
    </code>
  )
}

export function BlogCodeBlock({ code, lang = 'ts' }: { code: string; lang?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)]">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
          {lang}
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code className="font-mono text-foreground/85">{code}</code>
      </pre>
    </div>
  )
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
      {children}
    </div>
  )
}
