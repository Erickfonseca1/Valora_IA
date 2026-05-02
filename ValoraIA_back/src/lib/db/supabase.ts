import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
// Supabase renamed service_role → secret key (sb_secret_...) in newer projects
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!supabasePublishableKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

// Server client — respects RLS, reads auth cookies from request context
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handlers can't set cookies — safe to ignore in read-only contexts
        }
      },
    },
  });
}

// Admin client — server-side only, bypasses RLS (service role)
export function getAdminClient() {
  if (!supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) — server-side only");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
