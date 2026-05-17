// Hand-written until `npx supabase gen types typescript --local > src/types/supabase.ts`
// is run against the local DB. Mirrors the migrations exactly.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PresetId =
  | 'next-supabase-vercel'
  | 'astro-sqlite-cloudflare'
  | 'python-fastapi-postgres'

export type ProjectStatus = 'interview' | 'generating' | 'ready' | 'archived'
export type PlanId = 'free' | 'starter' | 'pro'

interface ProjectsRow {
  id: string
  user_id: string
  raw_goal: string
  context: Json
  preset: PresetId
  status: ProjectStatus
  plan: Json | null
  created_at: string
  updated_at: string
}
interface ProjectsInsert {
  id?: string
  user_id: string
  raw_goal: string
  context?: Json
  preset: PresetId
  status?: ProjectStatus
  plan?: Json | null
  created_at?: string
  updated_at?: string
}
interface ProjectsUpdate {
  id?: string
  user_id?: string
  raw_goal?: string
  context?: Json
  preset?: PresetId
  status?: ProjectStatus
  plan?: Json | null
  created_at?: string
  updated_at?: string
}

interface PackagesRow {
  id: string
  project_id: string
  files: Json
  model_used: string
  token_cost: number | null
  generated_at: string
}
interface PackagesInsert {
  id?: string
  project_id: string
  files: Json
  model_used: string
  token_cost?: number | null
  generated_at?: string
}
interface PackagesUpdate {
  id?: string
  project_id?: string
  files?: Json
  model_used?: string
  token_cost?: number | null
  generated_at?: string
}

interface QuotasRow {
  user_id: string
  packages_this_month: number
  plan: PlanId
  packages_per_month: number
  reset_at: string
  updated_at: string
}
interface QuotasInsert {
  user_id: string
  packages_this_month?: number
  plan?: PlanId
  packages_per_month?: number
  reset_at?: string
  updated_at?: string
}
interface QuotasUpdate {
  user_id?: string
  packages_this_month?: number
  plan?: PlanId
  packages_per_month?: number
  reset_at?: string
  updated_at?: string
}

interface SubscriptionsRow {
  id: string
  user_id: string
  status: string | null
  metadata: Json | null
  price_id: string | null
  quantity: number | null
  cancel_at_period_end: boolean | null
  created: string
  current_period_start: string
  current_period_end: string
  ended_at: string | null
  cancel_at: string | null
  canceled_at: string | null
  trial_start: string | null
  trial_end: string | null
}
interface SubscriptionsInsert {
  id: string
  user_id: string
  status?: string | null
  metadata?: Json | null
  price_id?: string | null
  quantity?: number | null
  cancel_at_period_end?: boolean | null
  created?: string
  current_period_start?: string
  current_period_end?: string
  ended_at?: string | null
  cancel_at?: string | null
  canceled_at?: string | null
  trial_start?: string | null
  trial_end?: string | null
}

interface CustomersRow {
  id: string
  stripe_customer_id: string | null
}
interface CustomersInsert {
  id: string
  stripe_customer_id?: string | null
}

interface ProductsRow {
  id: string
  active: boolean | null
  name: string | null
  description: string | null
  image: string | null
  metadata: Json | null
}
interface ProductsInsert {
  id: string
  active?: boolean | null
  name?: string | null
  description?: string | null
  image?: string | null
  metadata?: Json | null
}

interface PricesRow {
  id: string
  product_id: string | null
  active: boolean | null
  description: string | null
  unit_amount: number | null
  currency: string | null
  type: string | null
  interval: string | null
  interval_count: number | null
  trial_period_days: number | null
  metadata: Json | null
}
interface PricesInsert {
  id: string
  product_id?: string | null
  active?: boolean | null
  description?: string | null
  unit_amount?: number | null
  currency?: string | null
  type?: string | null
  interval?: string | null
  interval_count?: number | null
  trial_period_days?: number | null
  metadata?: Json | null
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      projects: { Row: ProjectsRow; Insert: ProjectsInsert; Update: ProjectsUpdate; Relationships: [] }
      prompt_packages: { Row: PackagesRow; Insert: PackagesInsert; Update: PackagesUpdate; Relationships: [] }
      usage_quotas: { Row: QuotasRow; Insert: QuotasInsert; Update: QuotasUpdate; Relationships: [] }
      subscriptions: {
        Row: SubscriptionsRow
        Insert: SubscriptionsInsert
        Update: Partial<SubscriptionsInsert>
        Relationships: []
      }
      customers: {
        Row: CustomersRow
        Insert: CustomersInsert
        Update: Partial<CustomersInsert>
        Relationships: []
      }
      products: {
        Row: ProductsRow
        Insert: ProductsInsert
        Update: Partial<ProductsInsert>
        Relationships: []
      }
      prices: {
        Row: PricesRow
        Insert: PricesInsert
        Update: Partial<PricesInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_quota: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
