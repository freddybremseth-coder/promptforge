import { generateText, type LanguageModel } from 'ai'
import { z } from 'zod'

import { anthropic } from '@/lib/anthropic-provider'
import { OPUS } from '@/lib/models'

// Extract a JSON object from a model response. Handles three common cases:
//   1. Pure JSON — parse directly
//   2. JSON wrapped in ```json ... ``` fences
//   3. JSON embedded in prose — find first { and matching }
function extractJson(text: string): unknown {
  const trimmed = text.trim()
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/)
  const candidate = fenceMatch ? fenceMatch[1] : trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    // Fallback: locate the outermost {…} or […].
    const start = candidate.search(/[\[{]/)
    if (start === -1) throw new Error('no JSON object found in response')
    const openChar = candidate[start]
    const closeChar = openChar === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    let escape = false
    for (let i = start; i < candidate.length; i++) {
      const ch = candidate[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (ch === openChar) depth++
      else if (ch === closeChar) {
        depth--
        if (depth === 0) {
          return JSON.parse(candidate.slice(start, i + 1))
        }
      }
    }
    throw new Error('unbalanced JSON in response')
  }
}

interface GenerateJsonArgs<T> {
  schema: z.ZodSchema<T>
  system: string
  user: string
  model?: LanguageModel
  maxTokens?: number
}

export interface GenerateJsonResult<T> {
  object: T
  text: string
  usage?: { promptTokens?: number; completionTokens?: number }
}

export async function generateJson<T>({
  schema,
  system,
  user,
  model,
  maxTokens = 4000,
}: GenerateJsonArgs<T>): Promise<GenerateJsonResult<T>> {
  // Append a strong JSON-only nudge so the model doesn't wander into prose.
  const fullSystem = `${system}\n\n=====\nIMPORTANT OUTPUT FORMAT\n- Respond with a single JSON object (or array if the schema is an array).\n- No prose before or after. No markdown code fences.\n- Use double quotes for all strings.\n- The JSON must parse with JSON.parse().`

  const result = await generateText({
    model: model ?? anthropic(OPUS),
    messages: [
      {
        role: 'system',
        content: fullSystem,
        providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
      },
      { role: 'user', content: user },
    ],
    maxTokens,
  })

  const raw = result.text
  let parsed: unknown
  try {
    parsed = extractJson(raw)
  } catch (e) {
    const err = new Error(
      `JSON extraction failed: ${e instanceof Error ? e.message : String(e)} :: raw=${raw.slice(0, 500)}`
    )
    throw err
  }

  const validation = schema.safeParse(parsed)
  if (!validation.success) {
    const issues = validation.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    const err = new Error(
      `schema mismatch (${issues}) :: raw=${JSON.stringify(parsed).slice(0, 500)}`
    )
    throw err
  }

  return {
    object: validation.data,
    text: raw,
    usage: result.usage,
  }
}
