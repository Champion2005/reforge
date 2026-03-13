import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  BookOpen,
  Download,
  Zap,
  Layers,
  Shield,
  Wrench,
  Globe,
  RotateCcw,
  BarChart3,
  Bug,
  ScrollText,
  HelpCircle,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'

interface DocSection {
  slug: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface DocCategory {
  title: string
  items: DocSection[]
}

const docNav: DocCategory[] = [
  {
    title: 'Getting Started',
    items: [
      { slug: 'introduction', label: 'Introduction', icon: BookOpen },
      { slug: 'installation', label: 'Installation', icon: Download },
      { slug: 'quick-start-guard', label: 'Quick Start — guard()', icon: Zap },
      { slug: 'quick-start-forge', label: 'Quick Start — forge()', icon: Layers },
    ],
  },
  {
    title: 'Guides',
    items: [
      { slug: 'provider-adapters', label: 'Provider Adapters', icon: Wrench },
      { slug: 'openai', label: 'OpenAI', icon: Wrench },
      { slug: 'openrouter', label: 'OpenRouter', icon: Wrench },
      { slug: 'anthropic', label: 'Anthropic', icon: Wrench },
      { slug: 'google', label: 'Google Gemini', icon: Wrench },
      { slug: 'custom-provider', label: 'Custom Provider', icon: Wrench },
      { slug: 'edge-runtime', label: 'Edge Runtime', icon: Globe },
      { slug: 'retry-strategy', label: 'Retry Strategy', icon: RotateCcw },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { slug: 'api-guard', label: 'guard() API', icon: Shield },
      { slug: 'api-forge', label: 'forge() API', icon: Shield },
    ],
  },
  {
    title: 'Help',
    items: [
      { slug: 'concepts', label: 'Concepts', icon: BookOpen },
      { slug: 'performance', label: 'Performance', icon: BarChart3 },
      { slug: 'environments', label: 'Environments', icon: Globe },
      { slug: 'troubleshooting', label: 'Troubleshooting', icon: Bug },
      { slug: 'faq', label: 'FAQ', icon: HelpCircle },
      { slug: 'reporting-issues', label: 'Reporting Issues', icon: Bug },
      { slug: 'changelog', label: 'Changelog', icon: ScrollText },
    ],
  },
]

export { docNav }

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const currentSlug = location.pathname.replace('/docs/', '').replace('/docs', '')
  const allDocs = docNav.flatMap((category) => category.items)
  const activeIndex = allDocs.findIndex((item) => item.slug === (currentSlug || 'introduction'))
  const prevDoc = activeIndex > 0 ? allDocs[activeIndex - 1] : null
  const nextDoc = activeIndex >= 0 && activeIndex < allDocs.length - 1 ? allDocs[activeIndex + 1] : null

  const sidebar = (
    <nav className="space-y-6">
      {docNav.map((category) => (
        <div key={category.title}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {category.title}
          </p>
          <div className="space-y-0.5">
            {category.items.map((item) => {
              const isActive =
                currentSlug === item.slug ||
                (currentSlug === '' && item.slug === 'introduction')
              return (
                <Link
                  key={item.slug}
                  to={`/docs/${item.slug}`}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 opacity-50" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">{sidebar}</div>
        </aside>

        {/* Mobile hamburger */}
        <div className="mb-6 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Menu className="h-4 w-4" />
            Documentation Menu
          </button>
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border/60 bg-background p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Docs</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebar}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="min-w-0">
          {children}

          <div className="mt-10 border-t border-border/40 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {prevDoc ? (
                <Link
                  to={`/docs/${prevDoc.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-card"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Previous</p>
                    <p className="truncate font-medium text-foreground">{prevDoc.label}</p>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextDoc ? (
                <Link
                  to={`/docs/${nextDoc.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-card"
                >
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Next</p>
                    <p className="truncate font-medium text-foreground">{nextDoc.label}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Shared doc helper components ──────────────────────── */

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight">{children}</h2>
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[13px] text-foreground/85">
      {children}
    </code>
  )
}

export function ConceptCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-6">
      <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

export function ParamRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <p>
      <strong className="text-foreground">{name}</strong>{' '}
      <code className="rounded-md border border-border/40 bg-muted/50 px-1 py-0.5 font-mono text-[11px] text-foreground/70">
        {type}
      </code>{' '}
      — {desc}
    </p>
  )
}

export function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-sm font-semibold text-foreground">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  )
}
