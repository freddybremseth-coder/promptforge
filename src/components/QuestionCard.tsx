'use client'

import { cn } from '@/lib/cn'
import type { Question } from '@/lib/schemas'

type Answer = string | string[]

interface Props {
  question: Question
  value: Answer | undefined
  onChange: (value: Answer) => void
}

export function QuestionCard({ question, value, onChange }: Props) {
  return (
    <fieldset className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <legend className="px-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {question.text}
      </legend>
      {question.rationale && (
        <p className="mt-1 text-xs text-zinc-500">{question.rationale}</p>
      )}

      <div className="mt-4 space-y-2">
        {question.kind === 'free_text' && (
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-950"
            aria-label={question.text}
          />
        )}

        {question.kind === 'single_select' &&
          (question.options ?? []).map((opt) => (
            <label
              key={opt}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                value === opt
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-zinc-800'
                  : 'border-zinc-200 hover:border-brand-500 dark:border-zinc-700'
              )}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-brand-600"
              />
              <span>{opt}</span>
            </label>
          ))}

        {question.kind === 'multi_select' &&
          (question.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt)
            return (
              <label
                key={opt}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                  selected
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-zinc-800'
                    : 'border-zinc-200 hover:border-brand-500 dark:border-zinc-700'
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? [...value] : []
                    if (e.target.checked) current.push(opt)
                    else current.splice(current.indexOf(opt), 1)
                    onChange(current)
                  }}
                  className="accent-brand-600"
                />
                <span>{opt}</span>
              </label>
            )
          })}
      </div>
    </fieldset>
  )
}
