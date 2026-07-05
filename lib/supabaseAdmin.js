import { createClient } from '@supabase/supabase-js';

// ─── Service-role client (bypasses RLS) — SERVER ONLY ─────────────────────────
// Never import this from a client component: SUPABASE_SERVICE_ROLE_KEY is only
// available server-side, and the key must never reach the browser bundle.
// Used for tables locked down by RLS (e.g. tactical_monthly_holdings, whose
// contents are the paid Signals product) after the route/page has verified
// entitlement itself.
let adminClient = null;

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return adminClient;
}
