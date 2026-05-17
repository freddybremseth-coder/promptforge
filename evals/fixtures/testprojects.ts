import type { PresetId } from '@/types/supabase'

export interface TestProject {
  rawGoal: string
  preset: PresetId
}

export const TEST_PROJECTS: TestProject[] = [
  { rawGoal: 'CRM for olivenbønder med kart', preset: 'next-supabase-vercel' },
  { rawGoal: 'Todo-app med AI som prioriterer oppgaver', preset: 'next-supabase-vercel' },
  { rawGoal: 'Budsjett-tracker for studenter med iCloud-sync', preset: 'next-supabase-vercel' },
  { rawGoal: 'Dokumentasjonsside for et open-source-bibliotek', preset: 'astro-sqlite-cloudflare' },
  { rawGoal: 'API for å analysere CSV-er med ML-modell', preset: 'python-fastapi-postgres' },
]
