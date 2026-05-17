import { describe, expect, test } from 'vitest'

import { SAMPLE_NEXT_PACKAGE } from './fixtures/sample-package'

const SECRET_PATTERNS = [/sk_test_/i, /sk_live_/i, /pk_live_/i, /whsec_/i, /AKIA[0-9A-Z]{16}/]

describe('CLAUDE.md quality', () => {
  const claudeMd = SAMPLE_NEXT_PACKAGE.files.find((f) => f.kind === 'claude_md')

  test('exists in package', () => {
    expect(claudeMd).toBeDefined()
  })

  test('is under 200 lines', () => {
    const lines = (claudeMd?.content ?? '').split('\n').length
    expect(lines).toBeLessThan(200)
  })

  test('has required sections', () => {
    const c = claudeMd!.content
    expect(c).toMatch(/## Stack/)
    expect(c).toMatch(/## Conventions \(MUST\)/)
    expect(c).toMatch(/## Workflow/)
    expect(c).toMatch(/## When stuck/)
  })

  test('has at least three MUST rules', () => {
    const matches = claudeMd!.content.match(/^- MUST/gm) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(3)
  })

  test('contains no plaintext secrets', () => {
    const c = claudeMd!.content
    for (const pattern of SECRET_PATTERNS) {
      expect(c).not.toMatch(pattern)
    }
  })
})
