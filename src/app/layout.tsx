import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'PromptForge — Claude Code prompt-pakker',
  description: 'Skriv målet ditt. Få en ferdig Claude Code-pakke: CLAUDE.md, Skills, og fase-prompts.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold text-zinc-900 no-underline dark:text-zinc-100">
              PromptForge
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/new" className="text-zinc-700 no-underline hover:text-brand-600 dark:text-zinc-300">
                Ny pakke
              </Link>
              <Link href="/dashboard" className="text-zinc-700 no-underline hover:text-brand-600 dark:text-zinc-300">
                Dashboard
              </Link>
              <Link href="/account" className="text-zinc-700 no-underline hover:text-brand-600 dark:text-zinc-300">
                Konto
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span>© {new Date().getFullYear()} PromptForge</span>
            <div className="flex gap-3">
              <Link href="/privacy" className="text-zinc-500 no-underline hover:text-brand-600">Personvern</Link>
              <Link href="/terms" className="text-zinc-500 no-underline hover:text-brand-600">Vilkår</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
