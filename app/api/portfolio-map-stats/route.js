import { supabase } from '@/lib/supabase';
import { computeStats } from '@/lib/portfolioStats';

const PAGE = 1000;

// Returns annualized cutoff date string for a given period
function getCutoff(period) {
  const now = new Date();
  const years = period === '10yr' ? 10 : period === '20yr' ? 20 : null;
  if (!years) return null;
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period'); // '10yr' | '20yr'

  const cutoff = getCutoff(period);
  if (!cutoff) {
    return Response.json({ error: 'period must be 10yr or 20yr' }, { status: 400 });
  }

  // ── Step 1: portfolio metadata (name + category) from portfolio_stats ───────
  const { data: meta, error: metaError } = await supabase
    .from('portfolio_stats')
    .select('slug, name, category');

  if (metaError) {
    return Response.json({ error: metaError.message }, { status: 500 });
  }

  const metaMap = Object.fromEntries(meta.map((p) => [p.slug, p]));

  // ── Step 2: fetch row count for the date window (for parallel pagination) ──
  const { count, error: countError } = await supabase
    .from('monthly_returns')
    .select('*', { count: 'exact', head: true })
    .gte('date', cutoff);

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }

  // ── Step 3: fetch all pages in parallel ─────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(count / PAGE));
  const pageResults = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      supabase
        .from('monthly_returns')
        .select('portfolio_slug, date, monthly_return')
        .gte('date', cutoff)
        .order('portfolio_slug', { ascending: true })
        .order('date', { ascending: true })
        .range(i * PAGE, (i + 1) * PAGE - 1)
    )
  );

  // Merge all pages into a single array
  const allRows = pageResults.flatMap((r) => r.data ?? []);

  // ── Step 4: group by slug and compute windowed stats ───────────────────────
  const bySlug = {};
  for (const row of allRows) {
    if (!bySlug[row.portfolio_slug]) bySlug[row.portfolio_slug] = [];
    bySlug[row.portfolio_slug].push({
      date: row.date,
      monthly_return: Number(row.monthly_return),
    });
  }

  const result = [];
  for (const [slug, returns] of Object.entries(bySlug)) {
    const stats = computeStats(returns); // null if < 12 months in window
    if (!stats) continue; // skip portfolios without enough history in this window

    const m = metaMap[slug];
    if (!m) continue;

    result.push({
      slug,
      name: m.name,
      category: m.category,
      cagr: stats.cagr,
      annualized_volatility: stats.annualizedVolatility,
      sharpe_ratio: stats.sharpe,
      max_drawdown: stats.maxDrawdown,
      total_months: stats.totalMonths,
    });
  }

  return Response.json(result);
}
