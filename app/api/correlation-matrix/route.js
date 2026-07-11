import { supabase } from '@/lib/supabase';

const PAGE = 1000;
const MIN_OVERLAP_MONTHS = 24;

// Cache the computed matrix for 24h — monthly_returns only changes once a month
export const revalidate = 86400;

function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n < MIN_OVERLAP_MONTHS) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  if (denomX === 0 || denomY === 0) return null;

  return num / Math.sqrt(denomX * denomY);
}

export async function GET() {
  // ── Step 1: portfolio metadata ───────────────────────────────────────────
  const { data: meta, error: metaError } = await supabase
    .from('portfolio_stats')
    .select('slug, name, category')
    .order('name', { ascending: true });

  if (metaError) {
    return Response.json({ error: metaError.message }, { status: 500 });
  }

  // ── Step 2: row count for parallel pagination ────────────────────────────
  const { count, error: countError } = await supabase
    .from('monthly_returns')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }

  // ── Step 3: fetch all monthly_returns in parallel pages ───────────────────
  const totalPages = Math.max(1, Math.ceil(count / PAGE));
  const pageResults = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      supabase
        .from('monthly_returns')
        .select('portfolio_slug, date, monthly_return')
        .order('portfolio_slug', { ascending: true })
        .order('date', { ascending: true })
        .range(i * PAGE, (i + 1) * PAGE - 1)
    )
  );
  // CR-6: a failed page must fail the whole request — silently treating it as
  // empty would compute the matrix from partial data (and cache it for 24h).
  const failedPage = pageResults.find((r) => r.error);
  if (failedPage) {
    return Response.json({ error: failedPage.error.message }, { status: 500 });
  }

  const allRows = pageResults.flatMap((r) => r.data ?? []);

  // ── Step 4: group into Map<date, return> per slug for O(1) overlap lookup ─
  const bySlug = {};
  for (const row of allRows) {
    if (!bySlug[row.portfolio_slug]) bySlug[row.portfolio_slug] = new Map();
    bySlug[row.portfolio_slug].set(row.date, Number(row.monthly_return));
  }

  // Only include portfolios that actually have return history
  const slugs = meta.filter((m) => bySlug[m.slug]?.size >= MIN_OVERLAP_MONTHS).map((m) => m.slug);
  const n = slugs.length;

  // ── Step 5: pairwise Pearson correlation over each pair's overlapping months ─
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    const a = bySlug[slugs[i]];
    for (let j = i + 1; j < n; j++) {
      const b = bySlug[slugs[j]];
      const xs = [];
      const ys = [];
      for (const [date, val] of a) {
        const bv = b.get(date);
        if (bv !== undefined) {
          xs.push(val);
          ys.push(bv);
        }
      }
      const r = pearsonCorrelation(xs, ys);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }

  const metaMap = Object.fromEntries(meta.map((m) => [m.slug, m]));
  const portfolios = slugs.map((slug) => ({
    slug,
    name: metaMap[slug].name,
    category: metaMap[slug].category,
  }));

  return Response.json({ portfolios, matrix });
}
