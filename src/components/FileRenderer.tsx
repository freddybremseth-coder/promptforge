'use client'

import { useState } from 'react'

import { cn } from '@/lib/cn'
import type { FileKind } from '@/lib/schemas'

const kindLabel: Record<FileKind, string> = {
  claude_md: 'CLAUDE.md',
  skill: 'Skill',
  phase_prompt: 'Phase prompt',
  hook: 'Hook',
  readme: 'Readme',
}

interface Props {
  path?: string
  content?: string
  kind?: FileKind
  streaming?: boolean
}

export function FileRenderer({ path, content, kind, streaming }: Props) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs">{path ?? '…'}</code>
          {kind && (
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brand-700">
              {kindLabel[kind]}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={!content}
          className={cn(
            'rounded border border-zinc-200 px-2 py-1 text-xs hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-zinc-700',
            copied && 'border-brand-600 text-brand-600'
          )}
        >
          {copied ? 'Kopiert' : 'Kopier'}
        </button>
      </header>
      <pre className="max-h-[40vh] overflow-auto bg-zinc-50 px-4 py-3 text-xs leading-relaxed dark:bg-zinc-950">
        <code>{content ?? (streaming ? '…' : '')}</code>
      </pre>
    </article>
  )
}
