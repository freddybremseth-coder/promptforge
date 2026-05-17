import { z } from 'zod'

// ---------- Interview ----------

export const QuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(5),
  kind: z.enum(['single_select', 'multi_select', 'free_text']),
  options: z.array(z.string()).optional(),
  rationale: z.string().min(5),
})

export const InterviewSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(6),
})

export type Question = z.infer<typeof QuestionSchema>
export type Interview = z.infer<typeof InterviewSchema>

export const InterviewAnswerSchema = z.object({
  question_id: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
})

export const InterviewAnswersSchema = z.array(InterviewAnswerSchema)
export type InterviewAnswers = z.infer<typeof InterviewAnswersSchema>

// ---------- Plan ----------

const KebabCase = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'must be kebab-case starting with a letter')

export const ConventionSchema = z.object({
  rule: z.string().min(5),
  severity: z.enum(['MUST', 'MUST_NOT', 'SHOULD']),
})

export const PhaseSchema = z.object({
  name: z.string().min(3),
  goal: z.string().min(20),
  thinking_level: z.enum(['normal', 'think', 'think_hard', 'ultrathink']),
  depends_on: z.array(z.string()).default([]),
})

export const SkillBlueprintSchema = z.object({
  name: KebabCase,
  description: z.string().min(40).max(1024),
  rationale: z.string().min(10),
})

export const PlanSchema = z.object({
  project_summary: z.string().min(50),
  conventions: z.array(ConventionSchema).min(3),
  phases: z.array(PhaseSchema).min(1).max(5),
  skills_needed: z.array(SkillBlueprintSchema).max(4),
  hooks_recommended: z.array(z.string()).default([]),
})

export type Plan = z.infer<typeof PlanSchema>

// ---------- Render (package files) ----------

export const FileKind = z.enum(['claude_md', 'skill', 'phase_prompt', 'hook', 'readme'])
export type FileKind = z.infer<typeof FileKind>

export const PackageFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().min(1),
  kind: FileKind,
})

export const PackageSchema = z.object({
  files: z.array(PackageFileSchema).min(1),
})

export type PackageFile = z.infer<typeof PackageFileSchema>
export type PromptPackage = z.infer<typeof PackageSchema>
