import { supabase } from '@/lib/supabase';

// Perf 4.4 (July 2026): benchmark requests (US 60/40 / US Stocks / Global
// Stocks) return identical data for every user, so they get a CDN cache
// header. User-mix requests stay uncached — arbitrary slug combinations would
// create an unbounded cache key space.
const BENCHMARK_SLUGS = new Set([
  'united-states-60-40-portfolio',
  'us-stock-market',
  'global-stock-market',
]);
const BENCHMARK_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get('slugs');

  if (!slugsParam) {
    return Response.json({ error: 'slugs required' }, { status: 400 });
  }

  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (slugs.length === 0) {
    return Response.json({ error: 'slugs required' }, { status: 400 });
  }

  // Supabase PostgREST caps responses at 1,000 rows server-side regardless of
  // client .limit() calls. Paginate until we have all rows.
  const PAGE = 1000;
  let allData = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('monthly_returns')
      .select('portfolio_slug, date, monthly_return')
      .in('portfolio_slug', slugs)
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    allData = allData.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const data = allData;

  // Group rows by slug
  const grouped = {};
  for (const row of data) {
    if (!grouped[row.portfolio_slug]) grouped[row.portfolio_slug] = [];
    grouped[row.portfolio_slug].push({
      date: row.date,
      monthly_return: Number(row.monthly_return),
    });
  }

  const allBenchmarks = slugs.every((s) => BENCHMARK_SLUGS.has(s));
  return Response.json(grouped, allBenchmarks ? { headers: BENCHMARK_CACHE_HEADERS } : undefined);
}
