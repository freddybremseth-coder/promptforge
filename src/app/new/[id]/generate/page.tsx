'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { useRouter } from 'next/navigation'
import { use, useEffect } from 'react'

import { FileRenderer } from '@/components/FileRenderer'
import { PackageSchema } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GeneratePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { object, submit, isLoading, error } = useObject({
    api: '/api/render',
    schema: PackageSchema,
  })

  useEffect(() => {
    submit({ projectId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!isLoading && object?.files && object.files.length > 0 && !error) {
      const t = setTimeout(() => router.push(`/new/${id}/done` as never), 800)
      return () => clearTimeout(t)
    }
  }, [isLoading, object, error, id, router])

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
          Render feilet. Du kan prøve igjen fra dashboardet.
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
        {isLoading && (
          <div className="rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            Skriver flere filer…
          </div>
        )}
      </div>
    </div>
  )
}
