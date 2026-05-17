import type { PresetId } from '@/types/supabase'
import { astroSqliteCloudflare } from './astro-sqlite-cloudflare'
import { nextSupabaseVercel } from './next-supabase-vercel'
import { pythonFastapiPostgres } from './python-fastapi-postgres'
import type { Preset } from './types'

export const PRESETS: Preset[] = [
  nextSupabaseVercel,
  astroSqliteCloudflare,
  pythonFastapiPostgres,
]

const byId = new Map<PresetId, Preset>(PRESETS.map((p) => [p.id, p]))

export function getPreset(id: PresetId | string): Preset | null {
  return byId.get(id as PresetId) ?? null
}

export type { Preset } from './types'
