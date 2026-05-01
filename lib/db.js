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
