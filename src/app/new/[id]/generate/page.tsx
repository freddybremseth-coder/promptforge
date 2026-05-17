'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useRef, useState } from 'react'

import { FileRenderer } from '@/components/FileRenderer'
import { PackageSchema } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

const STALL_AFTER_MS = 120_000

export default function GeneratePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/render',
    schema: PackageSchema,
  })

  const [elapsed, setElapsed] = useState(0)
  const [stalled, setStalled] = useState(false)
  const lastChangeRef = useRef<number>(Date.now())
  const startedRef = useRef<string | null>(null)

  useEffect(() => {
    if (startedRef.current === id) return
    startedRef.current = id
    submit({ projectId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!isLoading) return
    const start = Date.now()
    lastChangeRef.current = Date.now()
    setStalled(false)
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
      if (Date.now() - lastChangeRef.current > STALL_AFTER_MS) {
        setStalled(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    lastChangeRef.current = Date.now()
    setStalled(false)
  }, [object])

  useEffect(() => {
    if (!isLoading && object?.files && object.files.length > 0 && !error) {
      const t = setTimeout(() => router.push(`/new/${id}/done` as never), 800)
      return () => clearTimeout(t)
    }
  }, [isLoading, object, error, id, router])

  function retry() {
    startedRef.current = id
    setElapsed(0)
    setStalled(false)
    submit({ projectId: id })
  }

  const fileCount = object?.files?.length ?? 0

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Genererer pakken din</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Filer streames live mens Opus 4.7 skriver dem.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Render feilet.</p>
          <p className="mt-1 text-xs opacity-80">{error.message ?? String(error)}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {fileCount > 0 ? `Skriver fil ${fileCount}…` : 'Tenker…'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {elapsed}s · Render tar typisk 60-180 sekunder for hele pakken.
              </p>
            </div>
            <button
              type="button"
              onClick={() => stop()}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-600 dark:border-zinc-700"
            >
              Avbryt
            </button>
          </div>
          {stalled && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-medium">Streamen virker stoppet.</p>
              <p className="mt-1">
                Ingen nye data på {Math.floor(STALL_AFTER_MS / 1000)} sekunder. Vercel kan ha
                kuttet kallet. Avbryt og prøv igjen.
              </p>
              <button
                type="button"
                onClick={() => {
                  stop()
                  retry()
                }}
                className="mt-2 rounded border border-amber-400 px-2 py-1 hover:bg-amber-100"
              >
                Avbryt og start på nytt
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {(object?.files ?? []).map((f, i) => (
          <FileRenderer
            key={`${f?.path ?? i}`}
            path={f?.path}
            content={f?.content}
            kind={f?.kind}
            streaming={isLoading}
          />
        ))}
      </div>
    </div>
  )
}
