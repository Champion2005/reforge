import { Link, useLocation } from 'react-router-dom'
import { Github, Menu, X } from 'lucide-react'
import { useState } from 'react'
import reforge_logo from "/reforge.svg"

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/demo', label: 'Demo' },
  { to: '/docs', label: 'Docs' },
]

export default function Navbar() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
            <img src={reforge_logo} alt="Refoge logo" className="h-8 w-8" />
          Reforge
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                location.pathname === link.to
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-3 h-5 w-px bg-border" />
          <a
            href="https://github.com/Champion2005/reforge"
            aria-label="GitHub repository"
          >
            <Github className="h-4.5 w-4.5" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted sm:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/60 bg-background/95 px-4 pb-4 pt-2 backdrop-blur-xl sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                location.pathname === link.to
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/Champion2005/reforge"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground"
          >
            GitHub
          </a>
        </div>
      )}
    </header>
  )
}
