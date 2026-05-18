import type { Plan, RenderManifest, RenderStep } from '@/lib/schemas'

// Deterministic — same plan always yields the same manifest, so we can
// recompute on every /api/render/file call without persisting it.

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'phase'

export function buildManifest(plan: Plan): RenderManifest {
  const steps: RenderStep[] = []

  // 1. CLAUDE.md
  steps.push({ kind: 'claude_md', path: 'CLAUDE.md' })

  // 2. One SKILL.md per Skill in the plan
  for (const skill of plan.skills_needed ?? []) {
    steps.push({
      kind: 'skill',
      path: `.claude/skills/${skill.name}/SKILL.md`,
      skillName: skill.name,
      skillDescription: skill.description,
      skillRationale: skill.rationale,
    })
  }

  // 3. One phase prompt per phase
  plan.phases.forEach((phase, i) => {
    steps.push({
      kind: 'phase_prompt',
      path: `prompts/phase-${i}-${slug(phase.name)}.md`,
      phaseIndex: i,
      phaseName: phase.name,
      phaseGoal: phase.goal,
      phaseThinkingLevel: phase.thinking_level,
      phaseDependsOn: phase.depends_on ?? [],
    })
  })

  // 4. README.md last
  steps.push({ kind: 'readme', path: 'README.md' })

  return steps
}
