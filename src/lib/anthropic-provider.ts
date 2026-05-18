import { createAnthropic } from '@ai-sdk/anthropic'

// AI SDK 1.x always sets `temperature: 0` on every request because of a
// historical default (see ai/dist/index.mjs ~line 1619 — "TODO v5 remove
// default 0 for temperature"). Claude Opus 4.7 has deprecated the
// `temperature` parameter entirely and rejects requests that include it.
//
// We work around this by wrapping the provider's fetch, parsing the JSON
// body the SDK is about to send, and stripping `temperature` (and
// `top_p` / `top_k` for the same reason on newer models) before it goes
// out the wire.

const stripDeprecatedFields = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  if (init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body) as Record<string, unknown>
      if ('temperature' in body) delete body.temperature
      if ('top_p' in body) delete body.top_p
      if ('top_k' in body) delete body.top_k
      init = { ...init, body: JSON.stringify(body) }
    } catch {
      // Not JSON — leave untouched.
    }
  }
  return fetch(input, init)
}

export const anthropic = createAnthropic({
  fetch: stripDeprecatedFields,
})
