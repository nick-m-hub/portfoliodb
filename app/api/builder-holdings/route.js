import { cookies } from 'next/headers';
import { supabase, createServerSupabaseClient } from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabaseAdmin';

// Returns allocations + current tactical signals for a specific set of portfolio slugs.
// Called client-side by BuilderClient when the user has 2+ portfolios selected.
//
// CR-1 (July 2026): allocations are public data, but tactical signals are the
// paid Signals product. The `signals` portion is only returned to authenticated
// users with an active Signals subscription — everyone else gets signals: [].
// Holdings are read via the service-role client because RLS on
// tactical_monthly_holdings denies anon/authenticated reads.

// True only for an authenticated user with an active Signals subscription.
// Uses getUser() (not getSession()) deliberately: this route must stay safe
// even if the middleware matcher is later narrowed (CR-8) to exclude it.
async function isSignalsMember() {
  try {
    const cookieStore = await cookies();
    const authed = createServerSupabaseClient(cookieStore);
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return false;

    const { data: sub } = await authed
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('plan', 'signals')
      .maybeSingle();

    return Boolean(sub);
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get('slugs');

  if (!slugsParam) return Response.json({ error: 'slugs required' }, { status: 400 });

  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (!slugs.length) return Response.json({ error: 'slugs required' }, { status: 400 });

  // Fetch allocations, asset class colors, which of these slugs are tactical,
  // and the caller's Signals entitlement — all in parallel
  const [
    { data: allocations, error: allocError },
    { data: assetClasses },
    { data: signalPortfolios },
    signalsMember,
  ] = await Promise.all([
    supabase
      .from('allocations')
      .select('portfolio_slug, asset_class, ticker, percentage, color')
      .in('portfolio_slug', slugs),
    supabase
      .from('asset_classes')
      .select('asset_class, default_color'),
    supabase
      .from('portfolios')
      .select('slug, name')
      .in('slug', slugs)
      .not('kofi_link', 'is', null),
    isSignalsMember(),
  ]);

  if (allocError) return Response.json({ error: allocError.message }, { status: 500 });

  // Apply color fallback: allocation.color → asset class default → null
  const defaultColorMap = Object.fromEntries(
    (assetClasses ?? []).map((ac) => [ac.asset_class, ac.default_color])
  );
  const allocsWithColor = (allocations ?? []).map((a) => ({
    ...a,
    color: a.color || defaultColorMap[a.asset_class] || null,
  }));

  // Fetch current tactical holdings only for entitled Signals members
  let signals = [];
  const signalSlugs = (signalPortfolios ?? []).map((p) => p.slug);

  if (signalsMember && signalSlugs.length > 0) {
    const admin = getAdminClient();
    const nameBySlug = Object.fromEntries((signalPortfolios ?? []).map((p) => [p.slug, p.name]));

    // Get the most recent date, then fetch only that date's holdings
    const { data: latestRow } = await admin
      .from('tactical_monthly_holdings')
      .select('date')
      .in('portfolio_slug', signalSlugs)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRow) {
      const { data: holdings } = await admin
        .from('tactical_monthly_holdings')
        .select('portfolio_slug, date, ticker, weight')
        .in('portfolio_slug', signalSlugs)
        .eq('date', latestRow.date)
        .order('weight', { ascending: false });

      const bySlug = {};
      for (const row of holdings ?? []) {
        if (!bySlug[row.portfolio_slug]) {
          bySlug[row.portfolio_slug] = {
            slug: row.portfolio_slug,
            name: nameBySlug[row.portfolio_slug] ?? row.portfolio_slug,
            date: row.date,
            holdings: [],
          };
        }
        bySlug[row.portfolio_slug].holdings.push({
          ticker: row.ticker,
          weight: Number(row.weight) * 100,
        });
      }
      signals = Object.values(bySlug);
    }
  }

  return Response.json({ allocations: allocsWithColor, signals });
}
