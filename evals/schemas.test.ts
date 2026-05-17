import { describe, expect, test } from 'vitest'

import { PackageSchema, PlanSchema } from '@/lib/schemas'
import { PRESETS, getPreset } from '@/presets'

import { SAMPLE_NEXT_PACKAGE } from './fixtures/sample-package'
import { TEST_PROJECTS } from './fixtures/testprojects'

describe('schema sanity', () => {
  test('sample package is schema-valid', () => {
    const parsed = PackageSchema.safeParse(SAMPLE_NEXT_PACKAGE)
    expect(parsed.success).toBe(true)
  })

  test('PlanSchema rejects non-kebab-case skill names', () => {
    const bad = {
      project_summary: 'a'.repeat(60),
      conventions: [
        { rule: 'MUST x', severity: 'MUST' },
        { rule: 'SHOULD y', severity: 'SHOULD' },
        { rule: 'MUST_NOT z', severity: 'MUST_NOT' },
      ],
      phases: [{ name: 'Setup', goal: 'x'.repeat(25), thinking_level: 'think', depends_on: [] }],
      skills_needed: [{ name: 'BadCaseName', description: 'x'.repeat(50), rationale: 'because' }],
      hooks_recommended: [],
    }
    expect(PlanSchema.safeParse(bad).success).toBe(false)
  })
})

describe('presets', () => {
  test('every test project has a resolvable preset', () => {
    for (const t of TEST_PROJECTS) {
      expect(getPreset(t.preset)).not.toBeNull()
    }
  })

  test('exactly three presets are exported', () => {
    expect(PRESETS).toHaveLength(3)
  })
})
