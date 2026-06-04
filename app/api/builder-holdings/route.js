import { supabase } from '@/lib/supabase';

// Returns allocations + current tactical signals for a specific set of portfolio slugs.
// Called client-side by BuilderClient when the user has 2+ portfolios selected.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get('slugs');

  if (!slugsParam) return Response.json({ error: 'slugs required' }, { status: 400 });

  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (!slugs.length) return Response.json({ error: 'slugs required' }, { status: 400 });

  // Fetch allocations, asset class colors, and which of these slugs are tactical — in parallel
  const [
    { data: allocations, error: allocError },
    { data: assetClasses },
    { data: signalPortfolios },
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

  // Fetch current tactical holdings for any signal portfolios in the selection
  let signals = [];
  const signalSlugs = (signalPortfolios ?? []).map((p) => p.slug);

  if (signalSlugs.length > 0) {
    const nameBySlug = Object.fromEntries((signalPortfolios ?? []).map((p) => [p.slug, p.name]));

    // Get the most recent date, then fetch only that date's holdings
    const { data: latestRow } = await supabase
      .from('tactical_monthly_holdings')
      .select('date')
      .in('portfolio_slug', signalSlugs)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRow) {
      const { data: holdings } = await supabase
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
