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
 * Blend each portfolio's current holdings by the mix weights into a single
 * ticker → weight list. Buy-and-hold portfolios use static allocations
 * (percentage 0–100); tactical portfolios use current-month signals
 * (holdings[].weight already 0–100).
 *
 * CR-12 (July 2026): shared by BuilderClient's Blended Holdings card and
 * SavedMixList's per-mix chips — previously two drifting copies.
 *
 * @param {Array}  selections     [{ slug, weight }] weight is a percentage (string or number)
 * @param {Object} allocBySlug    { [slug]: [{ ticker, percentage }] }
 * @param {Object} signalBySlug   { [slug]: { holdings: [{ ticker, weight }] } }
 * @param {Set}    tacticalSlugs  slugs whose holdings come from signals
 * @returns {{ hasTactical: boolean, holdings: Array<{ticker, weight}> }}
 *          holdings sorted by weight desc (0–100 scale), [] if no data
 */
export function blendHoldings(selections, { allocBySlug, signalBySlug, tacticalSlugs }) {
  let hasTactical = false;
  const tickerTotals = {}; // ticker → blended weight fraction (0–1 scale)

  for (const sel of selections) {
    const isTactical = tacticalSlugs.has(sel.slug);
    if (isTactical) hasTactical = true;

    const portFrac = parseFloat(sel.weight) / 100; // e.g. 0.6 for 60%
    if (!portFrac || isNaN(portFrac)) continue;

    let holdings = [];
    if (isTactical) {
      const signal = signalBySlug[sel.slug];
      if (signal) {
        holdings = signal.holdings.map((h) => ({ ticker: h.ticker, frac: h.weight / 100 }));
      }
    } else {
      const allocs = allocBySlug[sel.slug] ?? [];
      holdings = allocs.map((a) => ({ ticker: a.ticker, frac: Number(a.percentage) / 100 }));
    }

    for (const { ticker, frac } of holdings) {
      tickerTotals[ticker] = (tickerTotals[ticker] || 0) + portFrac * frac;
    }
  }

  const holdings = Object.entries(tickerTotals)
    .map(([ticker, frac]) => ({ ticker, weight: frac * 100 }))
    .sort((a, b) => b.weight - a.weight);

  return { hasTactical, holdings };
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

  // CR-3 (July 2026): must mirror the portfolio_stats SQL view exactly —
  // calendar-year windows (GFC = 2007–2009, dot-com = 2000–2002) with a
  // ≥24-month minimum — so Builder crisis CAGRs match the same portfolio's
  // detail page. (Previously used peak-to-trough windows with a 6-month
  // minimum, which visibly disagreed with the view.)
  function crisisCagr(startYear, endYear) {
    const subset = blended.filter((r) => {
      const year = Number(r.date.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    if (subset.length < 24) return null;
    const growth = subset.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    return (Math.pow(growth, 12 / subset.length) - 1) * 100;
  }

  const gfcCagr    = crisisCagr(2007, 2009);
  const dotcomCagr = crisisCagr(2000, 2002);

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
