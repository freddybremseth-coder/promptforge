'use client'

import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useRef, useState } from 'react'

import { FileRenderer } from '@/components/FileRenderer'
import type { PackageFile, RenderManifest, RenderStep } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

interface StartResponse {
  packageId: string
  manifest: RenderManifest
  remaining: number[]
  alreadyDone: { path: string; kind: string }[]
}

interface FileResponse {
  file: PackageFile
  stepIndex: number
  total: number
  done: boolean
}

type Status = 'idle' | 'starting' | 'running' | 'done' | 'error'

const MAX_RETRIES_PER_STEP = 2

export default function GeneratePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const startedRef = useRef<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [manifest, setManifest] = useState<RenderManifest>([])
  const [files, setFiles] = useState<PackageFile[]>([])
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const run = useCallback(async () => {
    setStatus('starting')
    setErrorMessage(null)
    try {
      const startRes = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}))
        throw new Error(body.detail ?? body.error ?? `Start feilet (${startRes.status})`)
      }
      const start = (await startRes.json()) as StartResponse
      setManifest(start.manifest)

      // Recover any files that were already generated in a prior run.
      // We don't have the content here — only the indices — so we fetch
      // and rebuild after each new file is generated.

      setStatus('running')
      for (const i of start.remaining) {
        setCurrentIndex(i)
        setElapsed(0)
        const startedAt = Date.now()
        let lastErr: Error | null = null
        for (let attempt = 0; attempt <= MAX_RETRIES_PER_STEP; attempt++) {
          try {
            const r = await fetch('/api/render/file', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                projectId: id,
                packageId: start.packageId,
                stepIndex: i,
              }),
            })
            if (!r.ok) {
              const body = await r.json().catch(() => ({}))
              throw new Error(body.detail ?? body.error ?? `Steg ${i} feilet (${r.status})`)
            }
            const data = (await r.json()) as FileResponse
            setFiles((prev) => {
              const existing = prev.find((f) => f.path === data.file.path)
              return existing ? prev : [...prev, data.file]
            })
            lastErr = null
            break
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err))
            // Brief backoff before retry.
            await new Promise((r) => setTimeout(r, 800))
          }
        }
        if (lastErr) throw lastErr
        // Log the duration in dev — useful when tuning timeouts.
        void (Date.now() - startedAt)
      }

      setCurrentIndex(null)
      setStatus('done')
      // Small UX delay so user sees the final ✓ before redirect.
      setTimeout(() => router.push(`/new/${id}/done` as never), 800)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Ukjent feil')
    }
  }, [id, router])

  useEffect(() => {
    if (startedRef.current === id) return
    startedRef.current = id
    void run()
  }, [id, run])

  // Tick elapsed timer for the currently-running step.
  useEffect(() => {
    if (currentIndex === null) return
    const start = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(t)
  }, [currentIndex])

  const total = manifest.length
  const done = files.length

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Genererer pakken din</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Hver fil genereres som et eget kort kall, så ingen request går over 60 sekunder.
          </p>
        </div>
        {total > 0 && (
          <p className="text-sm text-zinc-500">
            {done} / {total} filer
          </p>
        )}
      </header>

      {status === 'error' && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Render feilet.</p>
          <p className="mt-1 text-xs opacity-80">{errorMessage}</p>
          <button
            type="button"
            onClick={run}
            className="mt-2 rounded border border-red-300 px-3 py-1.5 text-xs hover:bg-red-100"
          >
            Prøv igjen — fortsetter der vi slapp
          </button>
        </div>
      )}

      {total > 0 && (
        <ol className="grid gap-1.5">
          {manifest.map((step, i) => (
            <StepRow
              key={step.path}
              step={step}
              index={i}
              status={
                files.some((f) => f.path === step.path)
                  ? 'done'
                  : currentIndex === i
                    ? 'running'
                    : 'pending'
              }
              elapsed={currentIndex === i ? elapsed : null}
            />
          ))}
        </ol>
      )}

      <div className="grid gap-3 pt-2">
        {files.map((f) => (
          <FileRenderer key={f.path} path={f.path} content={f.content} kind={f.kind} />
        ))}
      </div>
    </div>
  )
}

function StepRow({
  step,
  index,
  status,
  elapsed,
}: {
  step: RenderStep
  index: number
  status: 'pending' | 'running' | 'done'
  elapsed: number | null
}) {
  const dot =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-brand-500 animate-pulse'
        : 'bg-zinc-300'
  return (
    <li className="flex items-center gap-3 rounded-md border border-zinc-100 bg-white px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-mono text-zinc-700 dark:text-zinc-300">{step.path}</span>
      <span className="ml-auto text-[10px] uppercase text-zinc-400">
        {index + 1}. {step.kind.replace('_', ' ')}
      </span>
      {status === 'running' && elapsed !== null && (
        <span className="text-[10px] text-zinc-500">{elapsed}s</span>
      )}
      {status === 'done' && <span className="text-emerald-600">✓</span>}
    </li>
  )
}
