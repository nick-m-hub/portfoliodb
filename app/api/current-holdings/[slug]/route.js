import { createServerSupabaseClient } from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

// Returns the current month's tactical holdings for one portfolio — Signals
// members only. Used by SignalTeaserWrapper on portfolio detail pages.
//
// CR-22 (July 2026): latency here directly delays the signal de-blur on
// portfolio pages, so the route is optimized to a single sequential DB step:
// - getSession() decodes the cookie locally — proxy.js middleware already ran
//   auth.getUser() for this request and refreshed/validated the session.
//   DEPENDENCY: if the middleware matcher is ever narrowed (CR-8), this route
//   must stay in it, or this must revert to auth.getUser().
// - The subscription check and holdings fetch run in parallel; the holdings
//   result is discarded if the subscription check fails.
// CR-1: holdings are read via the service-role client — RLS on
// tactical_monthly_holdings denies anon/authenticated reads.
export async function GET(request, { params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify active Signals subscription and speculatively fetch holdings in parallel
  const [{ data: sub }, { data, error }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('plan', 'signals')
      .maybeSingle(),
    getAdminClient()
      .from('tactical_monthly_holdings')
      .select('ticker, weight, date')
      .eq('portfolio_slug', slug)
      .order('date', { ascending: false })
      .order('weight', { ascending: false })
      .limit(20),
  ]);

  if (!sub) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (error) {
    return Response.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }

  if (!data?.length) {
    return Response.json({ holdings: [], date: null });
  }

  // Keep only the most recent date
  const latestDate = data[0].date;
  const holdings = data
    .filter((r) => r.date === latestDate)
    .map((r) => ({ ticker: r.ticker, weight: Number(r.weight) * 100 }));

  return Response.json({ holdings, date: latestDate });
}
