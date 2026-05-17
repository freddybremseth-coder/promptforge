import type { PresetId } from '@/types/supabase'

export interface Preset {
  id: PresetId
  name: string
  tagline: string
  defaultConventions: string[]
  stackContext: string
  skillBlueprints: string[]
}
