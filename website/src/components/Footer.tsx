import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>reforge-ai &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-5 text-xs text-muted-foreground">
          <a
            href="https://github.com/Champion2005/reforge-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150 hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/reforge-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150 hover:text-foreground"
          >
            npm
          </a>
        </div>
      </div>
    </footer>
  )
}
