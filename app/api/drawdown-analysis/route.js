import { supabase } from '@/lib/supabase';

export const revalidate = 86400;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from'); // YYYY-MM
  const to = searchParams.get('to');     // YYYY-MM

  if (!from || !to) {
    return Response.json({ error: 'from and to required' }, { status: 400 });
  }

  const fromDate = `${from}-01`;
  const toDate = `${to}-01`;

  if (fromDate >= toDate) {
    return Response.json({ error: 'from must be before to' }, { status: 400 });
  }

  // Fetch all monthly returns in the window across all portfolios
  const PAGE = 1000;
  let allReturns = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('monthly_returns')
      .select('portfolio_slug, date, monthly_return')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('portfolio_slug', { ascending: true })
      .order('date', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    allReturns = allReturns.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // Fetch portfolio names + categories
  const { data: portfolios, error: pError } = await supabase
    .from('portfolios')
    .select('slug, name, category');

  if (pError) return Response.json({ error: pError.message }, { status: 500 });

  const meta = Object.fromEntries(portfolios.map((p) => [p.slug, p]));

  // Group returns by slug
  const bySlug = {};
  for (const row of allReturns) {
    if (!bySlug[row.portfolio_slug]) bySlug[row.portfolio_slug] = [];
    bySlug[row.portfolio_slug].push(Number(row.monthly_return));
  }

  // Calculate stats per portfolio
  const results = [];
  for (const [slug, returns] of Object.entries(bySlug)) {
    if (returns.length === 0) continue;

    // Total return: compound all monthly returns
    let value = 1;
    let peak = 1;
    let maxDD = 0;
    for (const r of returns) {
      value *= (1 + r / 100);
      if (value > peak) peak = value;
      const dd = (value - peak) / peak * 100;
      if (dd < maxDD) maxDD = dd;
    }
    const totalReturn = (value - 1) * 100;

    const info = meta[slug];
    if (!info) continue;

    results.push({
      slug,
      name: info.name,
      category: info.category,
      totalReturn: Math.round(totalReturn * 10) / 10,
      maxDrawdown: Math.round(maxDD * 10) / 10,
      months: returns.length,
    });
  }

  // Sort by total return descending
  results.sort((a, b) => b.totalReturn - a.totalReturn);

  return Response.json({ results });
}
