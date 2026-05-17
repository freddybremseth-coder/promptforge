'use client'

import { useState } from 'react'

import { FileRenderer } from '@/components/FileRenderer'
import type { PackageFile } from '@/lib/schemas'

interface Props {
  packageId: string
  files: PackageFile[]
}

export function DonePageClient({ packageId, files }: Props) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      if (!res.ok) throw new Error('Eksport feilet')
      const { url } = (await res.json()) as { url: string }
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setDownloading(false)
    }
  }

  async function copySnippet() {
    const snippet = buildBashSnippet(files)
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Pakken er klar 🎉</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {files.length} fil{files.length === 1 ? '' : 'er'} generert. Last ned ZIP eller kopier bash-snippet.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {downloading ? 'Pakker…' : 'Last ned ZIP'}
        </button>
        <button
          type="button"
          onClick={copySnippet}
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-brand-600 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"
        >
          {copied ? 'Snippet kopiert!' : 'Kopier bash-snippet'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3">
        {files.map((f) => (
          <FileRenderer key={f.path} path={f.path} content={f.content} kind={f.kind} />
        ))}
      </div>
    </div>
  )
}

function buildBashSnippet(files: PackageFile[]): string {
  const lines: string[] = ['#!/usr/bin/env bash', 'set -euo pipefail', '']
  const dirs = new Set<string>()
  for (const f of files) {
    const dir = f.path.split('/').slice(0, -1).join('/')
    if (dir && !dirs.has(dir)) {
      dirs.add(dir)
      lines.push(`mkdir -p ${dir}`)
    }
  }
  lines.push('')
  for (const f of files) {
    // Use a unique-ish heredoc tag so file content never collides with delimiter.
    const tag = `EOF_${f.path.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`
    lines.push(`cat > ${f.path} <<'${tag}'`)
    lines.push(f.content.replace(/\r/g, ''))
    lines.push(tag)
    lines.push('')
  }
  return lines.join('\n')
}
