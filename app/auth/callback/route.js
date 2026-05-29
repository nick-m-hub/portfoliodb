import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Service-role client for linking subscriptions (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Link any existing Memberful subscription to this user's Supabase UID.
      // Handles the case where someone bought a Memberful plan before signing
      // in to PortfolioDB for the first time.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await getAdminClient()
            .from('user_subscriptions')
            .update({ user_id: user.id, updated_at: new Date().toISOString() })
            .eq('email', user.email)
            .is('user_id', null);
        }
      } catch (linkError) {
        // Non-fatal — user can still log in. builder-save has an email-based fallback
        // that will re-attempt the link on the next save attempt. Log as error so it's
        // visible in Vercel logs if this happens repeatedly.
        console.error('[auth/callback] Subscription link failed:', linkError);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
