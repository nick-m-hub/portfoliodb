import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ─── Anon client (public data only) ────────────────────────────────────────────
// Uses the public anon key and is fully subject to RLS — it does NOT bypass
// row security. Used by lib/db.js for server-side reads of public data.
// For service-role (RLS-bypassing) access, see lib/supabaseAdmin.js.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Browser client (client components) ───────────────────────────────────────
// createBrowserClient handles singleton internally — safe to call in components.
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// ─── Server client (server components, route handlers, middleware) ─────────────
// cookieStore must be the Next.js cookies() object from 'next/headers'.
export function createServerSupabaseClient(cookieStore) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Called from a Server Component — cookie writes are handled by middleware instead.
        }
      },
    },
  });
}
