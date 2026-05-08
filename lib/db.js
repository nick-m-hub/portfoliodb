import { supabase } from './supabase';

export async function getPortfolios() {
  const { data, error } = await supabase
    .from('portfolio_stats')
    .select('*')
    .order('sharpe_ratio', { ascending: false });

  if (error) {
    console.error('getPortfolios error:', error.message);
    return [];
  }

  return data;
}

export async function getPortfolio(slug) {
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
}

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

export async function getMonthlyReturns(slug) {
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
}

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

export async function getPortfolioNames() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('name, slug')
    .order('name', { ascending: true });

  if (error) {
    console.error('getPortfolioNames error:', error.message);
    return [];
  }

  return data;
}
