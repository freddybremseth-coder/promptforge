import { describe, expect, test } from 'vitest'

import { SAMPLE_NEXT_PACKAGE } from './fixtures/sample-package'

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]+?)\n---/)
  if (!match) return null
  const out: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return out
}

describe('SKILL.md quality', () => {
  const skills = SAMPLE_NEXT_PACKAGE.files.filter((f) => f.kind === 'skill')

  test('package has at least one Skill', () => {
    expect(skills.length).toBeGreaterThan(0)
  })

  for (const s of skills) {
    describe(`Skill: ${s.path}`, () => {
      const fm = parseFrontmatter(s.content)

      test('has YAML frontmatter that parses', () => {
        expect(fm).not.toBeNull()
      })

      test('name is kebab-case', () => {
        expect(fm!.name).toMatch(/^[a-z][a-z0-9-]*$/)
      })

      test('description is under 1024 characters', () => {
        expect((fm!.description ?? '').length).toBeLessThanOrEqual(1024)
        expect((fm!.description ?? '').length).toBeGreaterThan(20)
      })

      test('description contains trigger phrases', () => {
        expect(fm!.description).toMatch(/use when|triggers? include/i)
      })

      test('body is under 500 lines', () => {
        const body = s.content.replace(/^---[\s\S]+?---\n?/, '')
        expect(body.split('\n').length).toBeLessThan(500)
      })
    })
  }
})
