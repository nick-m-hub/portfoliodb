// Shared stat computation helpers used by BuilderClient and PortfolioMapClient.
// Mirrors the math in the portfolio_stats materialized view.

export const RF_MONTHLY = 0.375; // 4.5% annual risk-free rate / 12

/**
 * Blend monthly returns across multiple portfolios.
 * Returns an array of { date, monthly_return } for months that exist in ALL selected portfolios.
 *
 * @param {Object} portfolioReturns  { [slug]: [{date, monthly_return}] }
 * @param {Array}  selections        [{ slug, weight }]  weight is a numeric string or number (percentage, e.g. "50")
 */
export function buildBlendedReturns(portfolioReturns, selections) {
  if (!selections?.length) return [];

  // Single portfolio — return its returns directly (no intersection needed)
  if (selections.length === 1) {
    const { slug } = selections[0];
    return (portfolioReturns[slug] || []).map((r) => ({
      date: r.date,
      monthly_return: Number(r.monthly_return),
    }));
  }

  // Build date → return lookup maps
  const maps = {};
  for (const { slug } of selections) {
    maps[slug] = {};
    for (const r of portfolioReturns[slug] || []) {
      maps[slug][r.date] = Number(r.monthly_return);
    }
  }

  // Find dates present in every portfolio
  const dateSets = selections.map(({ slug }) => new Set(Object.keys(maps[slug])));
  if (dateSets.some((s) => s.size === 0)) return [];

  const commonDates = [...dateSets[0]]
    .filter((date) => dateSets.every((s) => s.has(date)))
    .sort();

  return commonDates.map((date) => ({
    date,
    monthly_return: selections.reduce(
      (sum, { slug, weight }) => sum + (parseFloat(weight) / 100) * maps[slug][date],
      0
    ),
  }));
}

/**
 * Compute all performance stats from a blended monthly return series.
 * Returns null when there are fewer than 12 months of data.
 *
 * @param {Array} blended  [{ date, monthly_return }]
 */
export function computeStats(blended) {
  const n = blended.length;
  if (n < 12) return null;

  let value = 10000;
  let peak = 10000;
  let maxDrawdown = 0;
  let sumDDSquared = 0;
  let currentDDStreak = 0;
  let longestDrawdownMonths = 0;
  const byYear = {};

  for (const r of blended) {
    value *= 1 + r.monthly_return / 100;
    if (value > peak) {
      peak = value;
      currentDDStreak = 0;
    } else {
      currentDDStreak++;
      if (currentDDStreak > longestDrawdownMonths) longestDrawdownMonths = currentDDStreak;
    }
    const dd = ((value - peak) / peak) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;
    sumDDSquared += dd * dd;
    const year = r.date.slice(0, 4);
    byYear[year] = Math.round(value * 100) / 100;
  }

  const growthData = Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, val]) => ({ label, value: val }));

  const totalGrowth = value / 10000;
  const cagr = (Math.pow(totalGrowth, 12 / n) - 1) * 100;

  const returns = blended.map((r) => r.monthly_return);
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / Math.max(n - 1, 1);
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev === 0 ? 0 : ((mean - RF_MONTHLY) / stdDev) * Math.sqrt(12);

  const downsideVar =
    returns.reduce((s, r) => s + Math.pow(Math.min(0, r - RF_MONTHLY), 2), 0) / n;
  const downsideStdDev = Math.sqrt(downsideVar);
  const sortino =
    downsideStdDev === 0 ? 0 : ((mean - RF_MONTHLY) / downsideStdDev) * Math.sqrt(12);

  const yearCounts = {};
  const yearFactors = {};
  for (const r of blended) {
    const year = r.date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + 1;
    yearFactors[year] = (yearFactors[year] || 1) * (1 + r.monthly_return / 100);
  }
  const fullYearReturns = Object.entries(yearFactors)
    .filter(([year]) => yearCounts[year] === 12)
    .map(([, f]) => (f - 1) * 100);

  const bestYear  = fullYearReturns.length ? Math.max(...fullYearReturns) : null;
  const worstYear = fullYearReturns.length ? Math.min(...fullYearReturns) : null;

  const ulcerIndex = Math.sqrt(sumDDSquared / n);
  const RF_ANNUAL = RF_MONTHLY * 12;
  const ulcerPerformanceIndex = ulcerIndex === 0 ? null : (cagr - RF_ANNUAL) / ulcerIndex;

  const currentYear = new Date().getFullYear().toString();
  const ytdMonths = blended.filter((r) => r.date.startsWith(currentYear));
  const ytdReturn =
    ytdMonths.length > 0
      ? (ytdMonths.reduce((v, r) => v * (1 + r.monthly_return / 100), 1) - 1) * 100
      : null;

  let cagr10yr = null;
  if (blended.length >= 120) {
    const last120 = blended.slice(-120);
    const growth10 = last120.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    cagr10yr = (Math.pow(growth10, 12 / 120) - 1) * 100;
  }

  function crisisCagr(startDate, endDate) {
    const subset = blended.filter((r) => r.date >= startDate && r.date <= endDate);
    if (subset.length < 6) return null;
    const growth = subset.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    return (Math.pow(growth, 12 / subset.length) - 1) * 100;
  }

  const gfcCagr    = crisisCagr('2007-10-01', '2009-03-31');
  const dotcomCagr = crisisCagr('2000-03-01', '2002-10-31');

  const annualReturns = Object.entries(yearFactors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, f]) => ({
      year,
      return: (f - 1) * 100,
      fullYear: yearCounts[year] === 12,
      endValue: byYear[year],
    }));

  const annualizedVolatility  = stdDev * Math.sqrt(12);
  const pctProfitableMonths   = Math.round((returns.filter((r) => r > 0).length / n) * 1000) / 10;
  const bestMonth  = Math.max(...returns);
  const worstMonth = Math.min(...returns);

  return {
    cagr,
    maxDrawdown,
    sharpe,
    sortino,
    bestYear,
    worstYear,
    ulcerIndex,
    ulcerPerformanceIndex,
    ytdReturn,
    cagr10yr,
    gfcCagr,
    dotcomCagr,
    annualizedVolatility,
    pctProfitableMonths,
    bestMonth,
    worstMonth,
    longestDrawdownMonths,
    growthData,
    annualReturns,
    totalMonths: n,
    startDate: blended[0].date,
    endDate: blended[blended.length - 1].date,
  };
}
