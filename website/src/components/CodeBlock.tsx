import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function CodeBlock({
  code,
  lang = 'ts',
  copyable = true,
}: {
  code: string
  lang?: string
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.13_0.005_286)]">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.6_0.2_25/0.7)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.75_0.15_85/0.7)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.17_150/0.7)]" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {lang}
          </span>
          {copyable && (
            <button
              onClick={handleCopy}
              className="rounded-md p-1 text-muted-foreground/50 opacity-0 transition-all duration-150 hover:bg-muted hover:text-foreground group-hover:opacity-100"
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code className="font-mono text-foreground/85">{code}</code>
      </pre>
    </div>
  )
}
