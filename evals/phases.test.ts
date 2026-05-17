import { describe, expect, test } from 'vitest'

import { SAMPLE_NEXT_PACKAGE } from './fixtures/sample-package'

const FILENAME_PATTERN = /^prompts\/phase-\d+-[a-z][a-z0-9-]*\.md$/

describe('phase-prompt quality', () => {
  const phases = SAMPLE_NEXT_PACKAGE.files.filter((f) => f.kind === 'phase_prompt')

  test('package has at least one phase prompt', () => {
    expect(phases.length).toBeGreaterThan(0)
  })

  for (const p of phases) {
    describe(`Phase: ${p.path}`, () => {
      test('filename matches phase-N-slug.md', () => {
        expect(p.path).toMatch(FILENAME_PATTERN)
      })

      test('contains the four required sections', () => {
        expect(p.content).toMatch(/## Mål/)
        expect(p.content).toMatch(/## Forutsetninger/)
        expect(p.content).toMatch(/## Prompt å lime inn/)
        expect(p.content).toMatch(/## Akseptansekriterier/)
      })

      test('uses a sanctioned thinking level', () => {
        expect(p.content).toMatch(/think hard|ultrathink/)
        expect(p.content).not.toMatch(/megathink|hyperthink/i)
      })
    })
  }
})
