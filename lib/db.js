import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { getAdminClient } from './supabaseAdmin';

// Used by homepage, /database, /portfolio-screener, and the AI screener API.
// Column list = union of fields those pages display/filter/sort on, including
// every column in ScreenerClient's ALL_COLUMNS picker (even the off-by-default
// ones like best_year, UPI, GFC/Dotcom CAGR, and rolling avg/high) so toggling
// a column on never shows blank data. If you add a new filter or column to the
// screener, add the matching field here too.
export async function getPortfolios() {
  const { data, error } = await supabase
    .from('portfolio_stats')
    .select(`
      slug, name, category, trade_frequency, min_timeline_years, risk_level,
      cagr, max_drawdown, sharpe_ratio, sortino_ratio, best_year, worst_year, ytd_return, cagr_10yr,
      ulcer_index, ulcer_performance_index, cagr_gfc, cagr_dotcom,
      cagr_1yr, cagr_3yr, annualized_volatility, pct_profitable_months, best_month, worst_month, longest_drawdown_months,
      rolling_1yr_low, rolling_1yr_avg, rolling_1yr_high,
      rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high,
      rolling_5yr_low, rolling_5yr_avg, rolling_5yr_high,
      rolling_10yr_low, rolling_10yr_avg, rolling_10yr_high
    `)
    .order('sharpe_ratio', { ascending: false });

  if (error) {
    console.error('getPortfolios error:', error.message);
    return [];
  }

  return data;
}

export const getPortfolio = cache(async function getPortfolio(slug) {
  const { data, error } = await supabase
    .from('portfolio_stats')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error(`getPortfolio error for slug "${slug}":`, error.message);
    return null;
  }

  return data;
});

export async function getAllocations(slug) {
  const [
    { data: allocations, error: allocError },
    { data: assetClasses, error: acError },
  ] = await Promise.all([
    supabase
      .from('allocations')
      .select('*')
      .eq('portfolio_slug', slug)
      .order('percentage', { ascending: false }),
    supabase
      .from('asset_classes')
      .select('asset_class, default_color'),
  ]);

  if (allocError) {
    console.error(`getAllocations error for slug "${slug}":`, allocError.message);
    return [];
  }
  if (acError) {
    console.error('getAllocations: asset_classes fetch error:', acError.message);
  }

  // COALESCE: use the allocation's own color; fall back to the asset class default
  const defaultColorMap = Object.fromEntries(
    (assetClasses ?? []).map((ac) => [ac.asset_class, ac.default_color])
  );

  return allocations.map((a) => ({
    ...a,
    color: a.color || defaultColorMap[a.asset_class] || null,
  }));
}

export async function getAllAllocations() {
  const [
    { data: allocations, error: allocError },
    { data: assetClasses, error: acError },
  ] = await Promise.all([
    supabase.from('allocations').select('*'),
    supabase.from('asset_classes').select('asset_class, default_color'),
  ]);

  if (allocError) {
    console.error('getAllAllocations error:', allocError.message);
    return [];
  }
  if (acError) {
    console.error('getAllAllocations: asset_classes fetch error:', acError.message);
  }

  const defaultColorMap = Object.fromEntries(
    (assetClasses ?? []).map((ac) => [ac.asset_class, ac.default_color])
  );

  return allocations.map((a) => ({
    ...a,
    color: a.color || defaultColorMap[a.asset_class] || null,
  }));
}

export async function getAssetClasses() {
  const { data, error } = await supabase
    .from('asset_classes')
    .select('asset_class, default_color, description')
    .order('asset_class');

  if (error) {
    console.error('getAssetClasses error:', error.message);
    return [];
  }

  return data;
}

export const getMonthlyReturns = cache(async function getMonthlyReturns(slug) {
  const { data, error } = await supabase
    .from('monthly_returns')
    .select('date, monthly_return')
    .eq('portfolio_slug', slug)
    .order('date', { ascending: true });

  if (error) {
    console.error(`getMonthlyReturns error for slug "${slug}":`, error.message);
    return [];
  }

  return data;
});

export async function getAllPortfolioStrategies() {
  const { data, error } = await supabase
    .from('portfolio_strategies')
    .select('portfolio_slug, strategy_slug');

  if (error) {
    console.error('getAllPortfolioStrategies error:', error.message);
    return [];
  }

  return data;
}

export async function getAllSlugs() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('slug');

  if (error) {
    console.error('getAllSlugs error:', error.message);
    return [];
  }

  return data;
}

export async function getRelatedPortfolios(slug) {
  // Round 1: get current portfolio's category + its strategy tags
  const [{ data: current, error: currentError }, { data: currentStrategies }] = await Promise.all([
    supabase.from('portfolios').select('category').eq('slug', slug).single(),
    supabase.from('portfolio_strategies').select('strategy_slug').eq('portfolio_slug', slug),
  ]);

  if (currentError || !current?.category) return [];

  // Round 2: get same-category candidates + all strategy tags for overlap scoring
  const [{ data: candidates, error: candidatesError }, { data: allStrategies }] = await Promise.all([
    supabase
      .from('portfolio_stats')
      .select('slug, name, category, cagr, sharpe_ratio, max_drawdown, risk_level')
      .eq('category', current.category)
      .neq('slug', slug)
      .order('sharpe_ratio', { ascending: false })
      .limit(10),
    supabase.from('portfolio_strategies').select('portfolio_slug, strategy_slug'),
  ]);

  if (candidatesError || !candidates?.length) return [];

  const currentStrategySet = new Set((currentStrategies ?? []).map((r) => r.strategy_slug));

  const overlapMap = {};
  for (const row of (allStrategies ?? [])) {
    if (currentStrategySet.has(row.strategy_slug)) {
      overlapMap[row.portfolio_slug] = (overlapMap[row.portfolio_slug] || 0) + 1;
    }
  }

  return candidates
    .map((p, i) => ({ ...p, _score: (overlapMap[p.slug] || 0) * 100 + (10 - i) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(({ _score, ...p }) => p);
}

export async function getSignalPortfolios() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('name, slug')
    .not('kofi_link', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    console.error('getSignalPortfolios error:', error.message);
    return [];
  }

  return data;
}

export async function getSignalPortfolioCount() {
  const { count, error } = await supabase
    .from('portfolios')
    .select('*', { count: 'exact', head: true })
    .not('kofi_link', 'is', null);

  if (error) {
    console.error('getSignalPortfolioCount error:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getPortfoliosByStrategy(strategySlug) {
  const { data: tags, error: tagsError } = await supabase
    .from('portfolio_strategies')
    .select('portfolio_slug')
    .eq('strategy_slug', strategySlug);

  if (tagsError) {
    console.error(`getPortfoliosByStrategy error for "${strategySlug}":`, tagsError.message);
    return [];
  }
  if (!tags?.length) return [];

  const slugs = tags.map((t) => t.portfolio_slug);

  const { data, error } = await supabase
    .from('portfolio_stats')
    .select('slug, name, cagr, max_drawdown, sharpe_ratio, worst_year, risk_level, category')
    .in('slug', slugs)
    .order('sharpe_ratio', { ascending: false });

  if (error) {
    console.error(`getPortfoliosByStrategy stats error for "${strategySlug}":`, error.message);
    return [];
  }

  return data ?? [];
}

export async function getAllStrategiesWithCounts() {
  const { data, error } = await supabase
    .from('portfolio_strategies')
    .select('strategy_slug');

  if (error) {
    console.error('getAllStrategiesWithCounts error:', error.message);
    return [];
  }

  const counts = {};
  for (const row of data ?? []) {
    counts[row.strategy_slug] = (counts[row.strategy_slug] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([strategy_slug, count]) => ({ strategy_slug, count }))
    .sort((a, b) => a.strategy_slug.localeCompare(b.strategy_slug));
}

// Portfolio names/slugs only change when a new portfolio is added, which
// already requires a Vercel redeploy (see New Portfolio Checklist), so this
// is cached indefinitely (default unstable_cache behavior — persists until
// the next deploy clears the data cache). No `revalidate` option here: any
// numeric value gets adopted as the route-level ISR revalidate for every
// page that renders the root layout, which would silently turn fully-static
// pages (and /leaderboard, which explicitly must not use ISR) into ISR pages.
export const getPortfolioNames = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('name, slug, kofi_link')
      .order('name', { ascending: true });

    if (error) {
      console.error('getPortfolioNames error:', error.message);
      return [];
    }

    return data;
  },
  ['portfolio-names']
);

// Returns current month's holdings for all signal-set portfolios (kofi_link IS NOT NULL).
// Tactical holdings come from tactical_monthly_holdings (most recent date per portfolio).
// Returns: [{ slug, name, date, holdings: [{ ticker, weight }] }]
//
// IMPORTANT (CR-1, July 2026): tactical_monthly_holdings is the paid Signals
// product and its RLS denies anon/authenticated reads — it is only readable via
// the service-role client. Callers MUST verify the user has an active Signals
// subscription BEFORE calling this function; it does no entitlement check itself.
export async function getCurrentSignals() {
  const admin = getAdminClient();

  // Step 1 — get signal portfolio slugs + names, and the latest date stored
  // in tactical_monthly_holdings, in parallel. Stage 0 writes holdings for
  // all tactical (signal) portfolios for a given month together, so the
  // unfiltered latest date is equivalent to filtering by signal slugs.
  const [
    { data: signalPortfolios, error: spError },
    { data: latestRow },
  ] = await Promise.all([
    supabase
      .from('portfolios')
      .select('slug, name')
      .not('kofi_link', 'is', null)
      .order('name', { ascending: true }),
    // single-row query avoids the 1,000-row PostgREST cap when history accumulates
    admin
      .from('tactical_monthly_holdings')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (spError || !signalPortfolios?.length) return [];
  if (!latestRow) return [];

  const nameBySlug = Object.fromEntries(signalPortfolios.map((p) => [p.slug, p.name]));
  const signalSlugs = signalPortfolios.map((p) => p.slug);

  // Step 2b — fetch holdings only for that date (well under 1,000 rows)
  const { data, error } = await admin
    .from('tactical_monthly_holdings')
    .select('portfolio_slug, date, ticker, weight')
    .in('portfolio_slug', signalSlugs)
    .eq('date', latestRow.date)
    .order('portfolio_slug', { ascending: true })
    .order('weight', { ascending: false });

  if (error) {
    console.error('getCurrentSignals error:', error.message);
    return [];
  }

  // Step 3 — group by portfolio slug
  const latestBySlug = {};
  for (const row of data ?? []) {
    const slug = row.portfolio_slug;
    if (!latestBySlug[slug]) {
      latestBySlug[slug] = {
        slug,
        name: nameBySlug[slug] ?? slug,
        date: row.date,
        holdings: [],
      };
    }
    latestBySlug[slug].holdings.push({
      ticker: row.ticker,
      // tactical_monthly_holdings stores weight as a decimal fraction (0–1);
      // multiply by 100 for percentage display
      weight: Number(row.weight) * 100,
    });
  }

  return Object.values(latestBySlug).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('getBlogPosts error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getBlogPost(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error(`getBlogPost error for slug "${slug}":`, error.message);
    return null;
  }

  return data;
}

export async function getAllBlogSlugs() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published');

  if (error) {
    console.error('getAllBlogSlugs error:', error.message);
    return [];
  }

  return data ?? [];
}
