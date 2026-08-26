import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) {
    client = getSupabase()
    if (!client) {
      throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados')
    }
  }
  return client
}