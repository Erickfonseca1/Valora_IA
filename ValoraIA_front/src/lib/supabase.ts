import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Aceita os dois nomes comuns de chave pública (anon/publishable).
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

let client: SupabaseClient | null = null

// Retorna null quando não configurado, para o AuthContext operar sem auth
// (útil em dev) em vez de derrubar a aplicação inteira.
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(supabaseUrl!, supabaseKey!)
  }
  return client
}

export function supabase(): SupabaseClient {
  const instance = getSupabase()
  if (!instance) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados')
  }
  return instance
}