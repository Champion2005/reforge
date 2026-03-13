import { SectionHeader, InlineCode } from '../../components/DocsLayout'
import type { ReactNode } from 'react'
import changelogRaw from '../../../../CHANGELOG.md?raw'

interface ChangelogSection {
  title: string
  items: string[]
}

interface ChangelogRelease {
  version: string
  date: string | null
  sections: ChangelogSection[]
}

function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.split(/\r?\n/)
  const releases: ChangelogRelease[] = []

  let currentRelease: ChangelogRelease | null = null
  let currentSection: ChangelogSection | null = null

  for (const line of lines) {
    const releaseWithDateMatch = line.match(/^## \[(.+?)\] - (.+)$/)
    const releaseWithoutDateMatch = line.match(/^## \[(.+?)\]$/)

    if (releaseWithDateMatch) {
      currentRelease = {
        version: releaseWithDateMatch[1],
        date: releaseWithDateMatch[2],
        sections: [],
      }
      releases.push(currentRelease)
      currentSection = null
      continue
    }

    if (releaseWithoutDateMatch) {
      currentRelease = {
        version: releaseWithoutDateMatch[1],
        date: null,
        sections: [],
      }
      releases.push(currentRelease)
      currentSection = null
      continue
    }

    if (line.startsWith('## ')) {
      currentRelease = null
      currentSection = null
      continue
    }

    if (line.startsWith('[')) {
      continue
    }

    if (!currentRelease) {
      continue
    }

    const sectionMatch = line.match(/^### (.+)$/)
    if (sectionMatch) {
      currentSection = {
        title: sectionMatch[1],
        items: [],
      }
      currentRelease.sections.push(currentSection)
      continue
    }

    if (!currentSection) {
      currentSection = {
        title: 'Notes',
        items: [],
      }
      currentRelease.sections.push(currentSection)
    }

    const bulletMatch = line.match(/^\s*-\s+(.+)$/)
    if (bulletMatch) {
      currentSection.items.push(bulletMatch[1].trim())
      continue
    }

    const paragraph = line.trim()
    if (paragraph.length > 0) {
      currentSection.items.push(paragraph)
    }
  }

  return releases.filter((release) => release.sections.some((section) => section.items.length > 0))
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <InlineCode key={index}>{part.slice(1, -1)}</InlineCode>
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    return <span key={index}>{part}</span>
  })
}

export default function Changelog() {
  const releases = parseChangelog(changelogRaw)

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
          Documentation
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Changelog</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Live changelog rendered directly from the repository root <InlineCode>CHANGELOG.md</InlineCode>.
          Updates appear here automatically on every website build and deploy.
        </p>
      </div>

      <SectionHeader>Release History</SectionHeader>

      <div className="space-y-6">
        {releases.map((release) => (
          <section key={`${release.version}-${release.date}`} className="rounded-xl border border-border/60 bg-card/30 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-foreground">v{release.version}</h2>
              {release.date ? (
                <span className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {release.date}
                </span>
              ) : (
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  In Progress
                </span>
              )}
            </div>

            <div className="space-y-5">
              {release.sections.map((section) => (
                <div key={`${release.version}-${section.title}`}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary/90">
                    {section.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.items.map((item, idx) => (
                      <li key={`${release.version}-${section.title}-${idx}`} className="leading-relaxed">
                        <span className="mr-2 text-primary">•</span>
                        {renderInline(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
