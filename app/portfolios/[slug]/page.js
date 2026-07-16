import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPortfolio, getAllocations, getMonthlyReturns, getAllSlugs, getRelatedPortfolios } from '@/lib/db';
import StructuredData from '@/components/StructuredData';
import AllocationDonut from '@/components/AllocationDonut';
import ChartsSection from '@/components/ChartsSection';
import EmailCapture from '@/components/EmailCapture'
import SignalTeaserWrapper from '@/components/SignalTeaserWrapper';
import StatTooltip from '@/components/StatTooltip';
import { STAT_DEFINITIONS } from '@/lib/statDefinitions';
import HoldingPeriodHeatmap from '@/components/HoldingPeriodHeatmap';
import WithdrawalRatesTable from '@/components/WithdrawalRatesTable';
import { buildWithdrawalRates } from '@/lib/withdrawalRates';
import { buildGrowthData, buildDrawdownData, buildRollingDatasets, buildHeatmapData } from '@/lib/chartData';
import PortfolioJumpNav from '@/components/PortfolioJumpNav';
import SeasonalitySection from '@/components/SeasonalitySection';
import StartDateSensitivitySection from '@/components/StartDateSensitivitySection';
import AnalyzeMenu from '@/components/AnalyzeMenu';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const portfolio = await getPortfolio(slug);
  if (!portfolio) return { title: 'Portfolio Not Found - PortfolioDB' };

  const nameForDesc = /portfolio$/i.test(portfolio.name)
    ? portfolio.name
    : `${portfolio.name} Portfolio`;
  // CR-13: parse the year straight from the date string — new Date().getFullYear()
  // runs in local time and is off by one at year boundaries in US timezones.
  const startYear = portfolio.last_updated && portfolio.total_months
    ? Number(String(portfolio.last_updated).slice(0, 4)) - Math.floor(portfolio.total_months / 12)
    : null;
  const description = startYear
    ? `${nameForDesc} performance, allocations, and risk stats. CAGR ${portfolio.cagr?.toFixed(1)}%, max drawdown ${portfolio.max_drawdown?.toFixed(1)}%, Sharpe ${portfolio.sharpe_ratio?.toFixed(2)} since ${startYear}. Includes safe withdrawal rate analysis.`
    : `${nameForDesc} performance data: CAGR ${portfolio.cagr?.toFixed(1)}%, max drawdown ${portfolio.max_drawdown?.toFixed(1)}%, Sharpe ratio ${portfolio.sharpe_ratio?.toFixed(2)}. Includes safe withdrawal rate analysis.`;

  const cagrStr = portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}% CAGR` : null;
  const sharpeStr = portfolio.sharpe_ratio != null ? `Sharpe ${portfolio.sharpe_ratio.toFixed(2)}` : null;
  const titleWithBoth = cagrStr && sharpeStr
    ? `${portfolio.name} — ${cagrStr}, ${sharpeStr} | PortfolioDB`
    : cagrStr
    ? `${portfolio.name} — ${cagrStr} | PortfolioDB`
    : `${portfolio.name} | PortfolioDB`;
  const titleWithCagr = cagrStr
    ? `${portfolio.name} — ${cagrStr} | PortfolioDB`
    : `${portfolio.name} | PortfolioDB`;
  const title = titleWithBoth.length <= 70 ? titleWithBoth : titleWithCagr;
  const url = `${siteUrl}/portfolios/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'PortfolioDB', type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}


const BENCHMARKS = [
  { slug: 'united-states-60-40-portfolio', label: 'US 60/40' },
  { slug: 'us-stock-market',               label: 'US Stocks' },
  { slug: 'global-stock-market',           label: 'Global Stocks' },
];

// Trim benchmark returns to the portfolio's own date range
function trimToRange(benchmarkReturns, portfolioReturns) {
  if (!portfolioReturns?.length || !benchmarkReturns?.length) return [];
  const start = portfolioReturns[0].date;
  const end = portfolioReturns[portfolioReturns.length - 1].date;
  return benchmarkReturns.filter((r) => r.date >= start && r.date <= end);
}

// Compute drawdown (% decline from running peak) for each month
// buildGrowthData, buildDrawdownData, buildRollingDatasets, and buildHeatmapData
// are imported from @/lib/chartData (CR-12 — shared with Compare + Builder).

// Average return by calendar month (Jan–Dec) for the seasonality chart
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function buildSeasonalityData(monthlyReturns) {
  if (!monthlyReturns?.length) return [];
  const buckets = Array.from({ length: 12 }, () => []);
  for (const row of monthlyReturns) {
    const mIdx = parseInt(row.date.slice(5, 7), 10) - 1;
    buckets[mIdx].push(Number(row.monthly_return));
  }
  return MONTH_NAMES.map((month, i) => {
    const returns = buckets[i];
    if (!returns.length) return { month, avg: null, count: 0, positive: 0 };
    const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
    return {
      month,
      avg: Math.round(avg * 100) / 100,
      count: returns.length,
      positive: returns.filter((r) => r > 0).length,
    };
  });
}

// List of all discrete drawdown events (peak → trough → recovery)
function monthsBetween(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}
function buildDrawdownEvents(monthlyReturns, minDepthPct = 3) {
  if (!monthlyReturns?.length) return [];
  let value = 10000;
  let peak = 10000;
  let peakDate = monthlyReturns[0].date.slice(0, 7);
  let inDrawdown = false;
  let drawdownStart = null;
  let troughDate = null;
  let troughValue = null;
  const events = [];
  for (const row of monthlyReturns) {
    value = value * (1 + row.monthly_return / 100);
    const date = row.date.slice(0, 7);
    if (value >= peak) {
      if (inDrawdown) {
        const depth = ((troughValue - peak) / peak) * 100;
        if (Math.abs(depth) >= minDepthPct) {
          events.push({
            startDate: drawdownStart,
            troughDate,
            endDate: date,
            depth: Math.round(depth * 100) / 100,
            lengthMonths: monthsBetween(drawdownStart, troughDate),
            recoveryMonths: monthsBetween(troughDate, date),
          });
        }
        inDrawdown = false;
      }
      peak = value;
      peakDate = date;
    } else {
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = peakDate;
        troughDate = date;
        troughValue = value;
      } else if (value < troughValue) {
        troughDate = date;
        troughValue = value;
      }
    }
  }
  if (inDrawdown) {
    const depth = ((troughValue - peak) / peak) * 100;
    if (Math.abs(depth) >= minDepthPct) {
      events.push({
        startDate: drawdownStart,
        troughDate,
        endDate: null,
        depth: Math.round(depth * 100) / 100,
        lengthMonths: monthsBetween(drawdownStart, troughDate),
        recoveryMonths: null,
      });
    }
  }
  return events.sort((a, b) => Math.abs(b.depth) - Math.abs(a.depth));
}
function formatMY(yyyyMM) {
  if (!yyyyMM) return null;
  const [y, m] = yyyyMM.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

// Compute start-date sensitivity: two lines at each reference year —
// "prev 10yr CAGR" and "next 10yr CAGR" — to show how much timing mattered.
// Requires ≥20 years of data for at least one "next" point to exist.
function buildStartDateSensitivityData(monthlyReturns) {
  if (!monthlyReturns?.length) return null;

  const returnMap = new Map();
  for (const row of monthlyReturns) {
    returnMap.set(row.date.slice(0, 7), Number(row.monthly_return));
  }

  const firstYear = parseInt(monthlyReturns[0].date.slice(0, 4));
  const lastYear  = parseInt(monthlyReturns[monthlyReturns.length - 1].date.slice(0, 4));

  function cagr10yr(startYear) {
    let compound = 1;
    for (let y = startYear; y < startYear + 10; y++) {
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const ret = returnMap.get(key);
        if (ret === undefined) return null;
        compound *= (1 + ret / 100);
      }
    }
    return (Math.pow(compound, 12 / 120) - 1) * 100;
  }

  const cutoffYear = lastYear - 9;
  const points = [];
  for (let y = firstYear + 10; y <= lastYear; y++) {
    const prev = cagr10yr(y - 10);
    const next = y <= cutoffYear ? cagr10yr(y) : null;
    if (prev === null) continue;
    points.push({
      year: y,
      prev: Math.round(prev * 100) / 100,
      next: next !== null ? Math.round(next * 100) / 100 : null,
    });
  }
  if (points.length === 0) return null;

  const withNext = points.filter((p) => p.next !== null);
  if (withNext.length === 0) return null;

  const luckiest   = withNext.reduce((best, p)  => p.next > best.next  ? p : best);
  const unluckiest = withNext.reduce((worst, p) => p.next < worst.next ? p : worst);
  return { points, cutoffYear, luckiest, unluckiest };
}

function StatRow({ icon, label, value, valueClass = 'text-primary', definition, benchmarkValue }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        {definition
          ? <StatTooltip label={label} definition={definition} labelClass="font-inter text-[14px] text-on-surface-variant" />
          : <span className="font-inter text-[14px] text-on-surface-variant">{label}</span>
        }
      </div>
      <div className="flex items-center gap-1">
        <span className={`font-inter font-semibold text-[15px] ${valueClass}`}>{value}</span>
        {benchmarkValue != null && (
          <>
            <span className="font-inter text-[13px] text-outline mx-0.5">/</span>
            <span className="font-inter text-[13px] text-on-surface-variant">{benchmarkValue}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default async function PortfolioDetailPage({ params }) {
  const { slug } = await params;

  const [portfolio, allocations, monthlyReturns, relatedPortfolios, benchmark6040, ...rawBenchmarkReturnsList] = await Promise.all([
    getPortfolio(slug),
    getAllocations(slug),
    getMonthlyReturns(slug),
    getRelatedPortfolios(slug),
    slug !== BENCHMARKS[0].slug ? getPortfolio(BENCHMARKS[0].slug) : Promise.resolve(null),
    ...BENCHMARKS.map((b) => getMonthlyReturns(b.slug)),
  ]);

  if (!portfolio) notFound();

  const growthData = buildGrowthData(monthlyReturns);
  const drawdownData = buildDrawdownData(monthlyReturns);
  const rollingDatasets = buildRollingDatasets(monthlyReturns);

  const heatmapData = buildHeatmapData(monthlyReturns);
  const startDateSensitivityData = buildStartDateSensitivityData(monthlyReturns);
  const seasonalityData = buildSeasonalityData(monthlyReturns);
  const drawdownEvents = buildDrawdownEvents(monthlyReturns);
  const withdrawalRates = buildWithdrawalRates(monthlyReturns);
  const last10yrReturns = monthlyReturns.slice(-120);
  const growthData10yr = monthlyReturns.length > 120 ? buildGrowthData(last10yrReturns) : [];

  const benchmarks = {};
  BENCHMARKS.forEach((b, i) => {
    const raw = trimToRange(rawBenchmarkReturnsList[i], monthlyReturns);
    benchmarks[b.slug] = {
      label: b.label,
      growthData: buildGrowthData(raw),
      growthData10yr: raw.length > 120 ? buildGrowthData(raw.slice(-120)) : [],
      drawdownData: buildDrawdownData(raw),
      rollingDatasets: buildRollingDatasets(raw),
    };
  });

  const isTactical = portfolio.category === 'Tactical';
  const allocationLabel = isTactical ? 'Average Allocation' : 'Target Allocation';
  const backtestYears = portfolio.total_months ? Math.round(portfolio.total_months / 12) : null;

  const rawDescription = portfolio.description ? portfolio.description.replace(/\\n/g, '\n') : ''
  const firstParaBreak = rawDescription.indexOf('\n\n')
  const descriptionIntro = firstParaBreak >= 0 ? rawDescription.slice(0, firstParaBreak) : rawDescription
  const descriptionDetail = firstParaBreak >= 0 ? rawDescription.slice(firstParaBreak + 2) : ''

  const hasRollingReturns = ['1yr', '3yr', '5yr', '10yr'].some((p) => portfolio[`rolling_${p}_avg`] != null);
  const navSections = [
    { id: 'allocation',       label: 'Allocation' },
    { id: 'stats',            label: 'Performance' },
    ...(hasRollingReturns ? [{ id: 'rolling-returns',   label: 'Rolling Returns' }] : []),
    { id: 'withdrawal-rates', label: 'Withdrawal Rates' },
    ...(descriptionDetail ? [{ id: 'strategy',          label: 'Strategy' }] : []),
    { id: 'charts',           label: 'Charts' },
    ...(drawdownEvents.length > 0 ? [{ id: 'drawdown-events', label: 'Drawdowns' }] : []),
    { id: 'heatmap',          label: 'Holding Period' },
    ...(startDateSensitivityData ? [{ id: 'start-date-sensitivity', label: 'Timing' }] : []),
    ...(seasonalityData.length > 0 ? [{ id: 'seasonality', label: 'Seasonality' }] : []),
  ];

  return (
    <main className="flex-grow w-full">
      <StructuredData portfolio={portfolio} allocations={allocations} />
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 pt-10 pb-16">

        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-start">
          <div className="lg:col-span-2 space-y-4">

            {/* Badge row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="font-inter text-[11px] font-bold uppercase tracking-widest">Curated Strategy</span>
              </div>
              {backtestYears && (
                <span className="font-inter text-[11px] font-bold text-outline uppercase tracking-widest">
                  · {backtestYears} yr backtest
                </span>
              )}
              <span className="bg-[#D1E4D8] text-primary px-2 py-0.5 rounded font-inter text-[10px] font-bold uppercase tracking-wider">
                {portfolio.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-manrope text-[36px] md:text-[48px] font-bold text-primary leading-tight tracking-tight">
              {portfolio.name}
            </h1>

            {/* Hero stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">CAGR</span>
                <span className="font-manrope text-[26px] font-bold text-primary leading-none">
                  {portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Max Drawdown</span>
                <span className="font-manrope text-[26px] font-bold text-error leading-none">
                  {portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sharpe Ratio</span>
                <span className="font-manrope text-[26px] font-bold text-on-surface leading-none">
                  {portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—'}
                </span>
              </div>
              {portfolio.ytd_return != null ? (
                <div className="px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                  <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">YTD Return</span>
                  <span className={`font-manrope text-[26px] font-bold leading-none ${portfolio.ytd_return >= 0 ? 'text-primary' : 'text-error'}`}>
                    {portfolio.ytd_return.toFixed(1)}%
                  </span>
                </div>
              ) : (
                <div className="hidden lg:block" />
              )}
            </div>

            {descriptionIntro && (
              <div className="font-inter text-[16px] text-on-surface-variant leading-relaxed max-w-2xl">
                <ReactMarkdown
                  components={{
                    p: ({children}) => <p>{children}</p>,
                    strong: ({children}) => <strong className="font-semibold text-on-surface">{children}</strong>,
                    a: ({href, children}) => <a href={href} className="text-[#27624a] hover:text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {descriptionIntro}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Back + M1 buttons */}
          <div className="lg:col-span-1 flex flex-col gap-3 pt-2">
            <Link
              href="/database"
              className="hidden lg:flex items-center justify-center gap-2 py-3 border border-outline-variant rounded-full font-inter text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Database
            </Link>
            <AnalyzeMenu slug={slug} />
            {portfolio.m1_link && (
              <a
                href={portfolio.m1_link}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-full font-inter text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Invest on M1 Finance
              </a>
            )}
            {!portfolio.kofi_link && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">info</span>
                  <span className="font-inter text-[13px] font-semibold text-on-surface">Monthly trading signals</span>
                </div>
                <p className="font-inter text-[12px] text-on-surface-variant leading-relaxed">
                  Signals are available for a curated set of tactical portfolios. This portfolio is not currently covered.
                </p>
                <Link href="/membership" className="font-inter text-[12px] font-semibold text-primary hover:underline flex items-center gap-1">
                  See covered portfolios
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            )}
            {portfolio.kofi_link && <SignalTeaserWrapper slug={portfolio.slug} />}
          </div>
        </section>

        <PortfolioJumpNav sections={navSections} />

        {/* ── Body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Main column ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Allocation */}
            <section id="allocation" className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-manrope text-[22px] font-bold text-primary">{allocationLabel}</h2>
                  {isTactical && (
                    <p className="font-inter text-[13px] text-on-surface-variant mt-1">
                      Based on historical average weights across all rebalance periods.
                    </p>
                  )}
                </div>
                {portfolio.trade_frequency && (
                  <span className="bg-[#D1E4D8] text-primary px-3 py-1 rounded-full font-inter text-[11px] font-bold uppercase tracking-wider flex-shrink-0">
                    {portfolio.trade_frequency}
                  </span>
                )}
              </div>

              {allocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center">
                    <AllocationDonut allocations={allocations} />
                  </div>
                  <div className="space-y-3">
                    {allocations.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                        />
                        <span className="font-inter text-[14px] font-semibold text-on-surface flex-1">
                          {a.asset_class}
                          {a.ticker && (
                            <span className="ml-2 font-normal text-on-surface-variant text-[12px]">({a.ticker})</span>
                          )}
                        </span>
                        <span className="font-inter text-[14px] font-bold text-on-surface">
                          {a.percentage != null ? `${a.percentage}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="font-inter text-[14px] text-on-surface-variant">No allocation data available.</p>
              )}
            </section>

            {/* Performance Snapshot */}
            <section id="stats" className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
              <h2 className="font-manrope text-[22px] font-bold text-primary mb-1">Performance Snapshot</h2>
              <div className="flex items-center justify-between mb-5">
                <p className="font-inter text-[13px]">
                  <Link href="/methodology" className="text-primary underline hover:opacity-75 transition-opacity">How are these calculated? →</Link>
                </p>
                {benchmark6040 && (
                  <span className="font-inter text-[12px] text-on-surface-variant">
                    Portfolio <span className="text-outline mx-0.5">/</span> US 60/40
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <StatRow icon="trending_up" label="CAGR" value={portfolio.cagr != null ? `${portfolio.cagr.toFixed(2)}%` : '—'} definition={STAT_DEFINITIONS['CAGR']}
                  benchmarkValue={benchmark6040?.cagr != null ? `${benchmark6040.cagr.toFixed(1)}%` : null} />
                <StatRow icon="balance" label="Sharpe Ratio" value={portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—'} definition={STAT_DEFINITIONS['Sharpe Ratio']}
                  benchmarkValue={benchmark6040?.sharpe_ratio != null ? benchmark6040.sharpe_ratio.toFixed(2) : null} />
                <StatRow icon="trending_down" label="Max Drawdown" value={portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(2)}%` : '—'} valueClass="text-error" definition={STAT_DEFINITIONS['Max Drawdown']}
                  benchmarkValue={benchmark6040?.max_drawdown != null ? `${benchmark6040.max_drawdown.toFixed(1)}%` : null} />
                <StatRow icon="show_chart" label="Sortino Ratio" value={portfolio.sortino_ratio != null ? portfolio.sortino_ratio.toFixed(2) : '—'} definition={STAT_DEFINITIONS['Sortino Ratio']}
                  benchmarkValue={benchmark6040?.sortino_ratio != null ? benchmark6040.sortino_ratio.toFixed(2) : null} />
                <StatRow icon="arrow_upward" label="Best Year" value={portfolio.best_year != null ? `+${portfolio.best_year.toFixed(1)}%` : '—'} definition={STAT_DEFINITIONS['Best Year']}
                  benchmarkValue={benchmark6040?.best_year != null ? `+${benchmark6040.best_year.toFixed(1)}%` : null} />
                <StatRow icon="arrow_downward" label="Worst Year" value={portfolio.worst_year != null ? `${portfolio.worst_year.toFixed(1)}%` : '—'} valueClass="text-error" definition={STAT_DEFINITIONS['Worst Year']}
                  benchmarkValue={benchmark6040?.worst_year != null ? `${benchmark6040.worst_year.toFixed(1)}%` : null} />
                {portfolio.ytd_return != null && (
                  <StatRow icon="calendar_today" label="YTD Return" value={`${portfolio.ytd_return.toFixed(2)}%`} valueClass={portfolio.ytd_return >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['YTD Return']}
                    benchmarkValue={benchmark6040?.ytd_return != null ? `${benchmark6040.ytd_return.toFixed(1)}%` : null} />
                )}
                {portfolio.cagr_10yr != null && (
                  <StatRow icon="update" label="10-Year CAGR" value={`${portfolio.cagr_10yr.toFixed(2)}%`} valueClass={portfolio.cagr_10yr >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['10-Year CAGR']}
                    benchmarkValue={benchmark6040?.cagr_10yr != null ? `${benchmark6040.cagr_10yr.toFixed(1)}%` : null} />
                )}
                {portfolio.ulcer_index != null && (
                  <StatRow icon="warning" label="Ulcer Index" value={portfolio.ulcer_index.toFixed(2)} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Ulcer Index']}
                    benchmarkValue={benchmark6040?.ulcer_index != null ? benchmark6040.ulcer_index.toFixed(2) : null} />
                )}
                {portfolio.ulcer_performance_index != null && (
                  <StatRow icon="analytics" label="Ulcer Perf. Index" value={portfolio.ulcer_performance_index.toFixed(2)} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Ulcer Perf. Index']}
                    benchmarkValue={benchmark6040?.ulcer_performance_index != null ? benchmark6040.ulcer_performance_index.toFixed(2) : null} />
                )}
                {portfolio.cagr_gfc != null && (
                  <StatRow icon="account_balance" label="GFC CAGR" value={`${portfolio.cagr_gfc >= 0 ? '+' : ''}${portfolio.cagr_gfc.toFixed(1)}%`} valueClass={portfolio.cagr_gfc >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['GFC CAGR']}
                    benchmarkValue={benchmark6040?.cagr_gfc != null ? `${benchmark6040.cagr_gfc >= 0 ? '+' : ''}${benchmark6040.cagr_gfc.toFixed(1)}%` : null} />
                )}
                {portfolio.cagr_dotcom != null && (
                  <StatRow icon="computer" label="Dot-com CAGR" value={`${portfolio.cagr_dotcom >= 0 ? '+' : ''}${portfolio.cagr_dotcom.toFixed(1)}%`} valueClass={portfolio.cagr_dotcom >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['Dot-com CAGR']}
                    benchmarkValue={benchmark6040?.cagr_dotcom != null ? `${benchmark6040.cagr_dotcom >= 0 ? '+' : ''}${benchmark6040.cagr_dotcom.toFixed(1)}%` : null} />
                )}
                {portfolio.annualized_volatility != null && (
                  <StatRow icon="ssid_chart" label="Ann. Volatility" value={`${portfolio.annualized_volatility.toFixed(1)}%`} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Ann. Volatility']}
                    benchmarkValue={benchmark6040?.annualized_volatility != null ? `${benchmark6040.annualized_volatility.toFixed(1)}%` : null} />
                )}
                {portfolio.pct_profitable_months != null && (
                  <StatRow icon="thumb_up" label="Profitable Months" value={`${portfolio.pct_profitable_months.toFixed(1)}%`} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Profitable Months']}
                    benchmarkValue={benchmark6040?.pct_profitable_months != null ? `${benchmark6040.pct_profitable_months.toFixed(1)}%` : null} />
                )}
                {portfolio.best_month != null && (
                  <StatRow icon="north" label="Best Month" value={`+${portfolio.best_month.toFixed(2)}%`} valueClass="text-primary" definition={STAT_DEFINITIONS['Best Month']}
                    benchmarkValue={benchmark6040?.best_month != null ? `+${benchmark6040.best_month.toFixed(1)}%` : null} />
                )}
                {portfolio.worst_month != null && (
                  <StatRow icon="south" label="Worst Month" value={`${portfolio.worst_month.toFixed(2)}%`} valueClass="text-error" definition={STAT_DEFINITIONS['Worst Month']}
                    benchmarkValue={benchmark6040?.worst_month != null ? `${benchmark6040.worst_month.toFixed(1)}%` : null} />
                )}
                {portfolio.longest_drawdown_months != null && portfolio.longest_drawdown_months > 0 && (
                  <StatRow icon="hourglass_bottom" label="Longest Drawdown" value={`${portfolio.longest_drawdown_months} months`} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Longest Drawdown']}
                    benchmarkValue={benchmark6040?.longest_drawdown_months != null ? `${benchmark6040.longest_drawdown_months} mo` : null} />
                )}
                {portfolio.rolling_10yr_high != null && portfolio.rolling_10yr_low != null && (
                  <StatRow icon="tune" label="Timing Sensitivity" value={`${(portfolio.rolling_10yr_high - portfolio.rolling_10yr_low).toFixed(1)}pp`} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Timing Sensitivity']}
                    benchmarkValue={benchmark6040?.rolling_10yr_high != null && benchmark6040?.rolling_10yr_low != null ? `${(benchmark6040.rolling_10yr_high - benchmark6040.rolling_10yr_low).toFixed(1)}pp` : null} />
                )}
                <StatRow icon="sync" label="Trade Frequency" value={portfolio.trade_frequency || 'Buy & Hold'} />
                <StatRow icon="shield" label="Risk Level" value={
                  portfolio.risk_level
                    ? `${portfolio.risk_level}/5 — ${portfolio.risk_level <= 2 ? 'Conservative' : portfolio.risk_level === 3 ? 'Moderate' : 'Aggressive'}`
                    : '—'
                } />
                {portfolio.min_timeline_years && (
                  <StatRow icon="calendar_month" label="Min. Timeline" value={`${portfolio.min_timeline_years} years`} />
                )}
                {backtestYears && (
                  <StatRow icon="history" label="Backtest Period" value={`${backtestYears} years`} />
                )}
              </div>
            </section>

            {/* Rolling Returns Summary */}
            {(['1yr', '3yr', '5yr', '10yr'].some((p) => portfolio[`rolling_${p}_avg`] != null)) && (() => {
              const fmt = (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';
              const rows = [
                { label: '1 Year',  low: portfolio.rolling_1yr_low,  avg: portfolio.rolling_1yr_avg,  high: portfolio.rolling_1yr_high },
                { label: '3 Year',  low: portfolio.rolling_3yr_low,  avg: portfolio.rolling_3yr_avg,  high: portfolio.rolling_3yr_high },
                { label: '5 Year',  low: portfolio.rolling_5yr_low,  avg: portfolio.rolling_5yr_avg,  high: portfolio.rolling_5yr_high },
                { label: '10 Year', low: portfolio.rolling_10yr_low, avg: portfolio.rolling_10yr_avg, high: portfolio.rolling_10yr_high },
              ].filter((r) => r.avg != null);
              return (
                <section id="rolling-returns" className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
                  <h2 className="font-manrope text-[22px] font-bold text-primary mb-6">Rolling Returns</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-outline-variant">
                          <th className="text-left font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 pr-6">Period</th>
                          <th className="text-right font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 px-6">Low</th>
                          <th className="text-right font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 px-6">Average</th>
                          <th className="text-right font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 pl-6">High</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.label} className="border-b border-outline-variant/50 last:border-0">
                            <td className="font-inter text-[14px] font-semibold text-on-surface py-3 pr-6">{r.label}</td>
                            <td className={`text-right font-inter text-[14px] font-semibold py-3 px-6 ${r.low != null && r.low < 0 ? 'text-error' : 'text-primary'}`}>{fmt(r.low)}</td>
                            <td className="text-right font-inter text-[14px] font-semibold text-on-surface py-3 px-6">{fmt(r.avg)}</td>
                            <td className={`text-right font-inter text-[14px] font-semibold py-3 pl-6 ${r.high != null && r.high >= 0 ? 'text-primary' : 'text-error'}`}>{fmt(r.high)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })()}

            <div id="withdrawal-rates">
              <WithdrawalRatesTable rates={withdrawalRates} slug={slug} />
            </div>

            {descriptionDetail && (
              <section id="strategy" className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm font-inter text-[16px] text-on-surface-variant leading-relaxed">
                <ReactMarkdown
                  components={{
                    h2: ({children}) => <h2 className="font-manrope text-[20px] font-bold text-primary mt-6 mb-2 first:mt-0">{children}</h2>,
                    h3: ({children}) => <h3 className="font-manrope text-[17px] font-semibold text-on-surface mt-5 mb-1.5">{children}</h3>,
                    p:  ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                    strong: ({children}) => <strong className="font-semibold text-on-surface">{children}</strong>,
                    em: ({children}) => <em className="italic">{children}</em>,
                    a:  ({href, children}) => <a href={href} className="text-[#27624a] hover:text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    ul: ({children}) => <ul className="list-disc list-outside pl-5 space-y-1 mb-4">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-4">{children}</ol>,
                    li: ({children}) => <li>{children}</li>,
                  }}
                >
                  {descriptionDetail}
                </ReactMarkdown>
              </section>
            )}

          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Implementation */}
            {allocations.some((a) => a.ticker) && (
              <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant">
                <h3 className="font-manrope text-[18px] font-bold text-primary mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">construction</span>
                  Implementation
                </h3>
                <p className="font-inter text-[13px] text-on-surface-variant mb-5">
                  Recommended low-cost ETFs to build this portfolio today.
                </p>
                <div className="space-y-3">
                  {allocations.filter((a) => a.ticker).map((a, i) => (
                    <div key={a.id} className="p-4 bg-surface-container-lowest rounded-lg border border-outline-variant">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-inter font-bold text-primary text-[15px]">{a.ticker}</span>
                        <span className="font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {a.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                        />
                        <span className="font-inter text-[12px] text-on-surface-variant">{a.asset_class}</span>
                      </div>
                      <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${a.percentage}%`,
                            backgroundColor: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {portfolio.m1_link && (
                  <a
                    href={portfolio.m1_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-lg font-inter text-[14px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Open in M1 Finance
                  </a>
                )}
              </div>
            )}

            {/* At a Glance */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
              <h3 className="font-manrope text-[16px] font-bold text-on-surface mb-4">At a Glance</h3>
              <div className="space-y-0">
                {[
                  { label: 'Category', value: portfolio.category },
                  { label: 'Risk Level', value: portfolio.risk_level ? `${portfolio.risk_level} / 5` : '—' },
                  { label: 'Min. Timeline', value: portfolio.min_timeline_years ? `${portfolio.min_timeline_years} yrs` : '—' },
                  { label: 'Rebalance', value: portfolio.trade_frequency || 'Buy & Hold' },
                  { label: 'Backtest', value: backtestYears ? `${backtestYears} years` : '—' },
                  {
                    label: 'Last Updated',
                    value: portfolio.last_updated
                      ? new Date(portfolio.last_updated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-outline-variant/50 last:border-0">
                    <span className="font-inter text-[12px] text-on-surface-variant">{label}</span>
                    <span className="font-inter text-[13px] font-semibold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Membership CTA */}
            {portfolio.kofi_link ? (
            <div className="rounded-xl border border-[#27624a]/30 bg-[#f0f7f3] p-6 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">mark_email_unread</span>
                  <span className="font-manrope text-[17px] font-bold text-primary">Monthly Portfolio Signals</span>
                </div>
                <p className="font-inter text-[13px] text-on-surface-variant leading-relaxed">
                  Members receive monthly rebalancing guidance for a curated selection of portfolios tracked on this site. One email, once a month — no market timing, no guesswork.
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  'Signals for a curated set of portfolios',
                  'Delivered on the last trading day of every month',
                  'Cancel anytime — no long-term commitment',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>
                    <span className="font-inter text-[13px] text-on-surface">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/membership"
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-lg font-inter text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                See membership options
              </Link>
              <p className="font-inter text-[11px] text-on-surface-variant text-center -mt-1">
                Membership billed monthly through Ko-fi
              </p>
            </div>
            ) : (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span>
                <span className="font-inter text-[14px] font-semibold text-on-surface">Monthly trading signals</span>
              </div>
              <p className="font-inter text-[13px] text-on-surface-variant leading-relaxed">
                Signals cover a curated set of tactical portfolios only. This portfolio is not currently in the signal set.
              </p>
              <Link
                href="/membership"
                className="font-inter text-[13px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                See covered portfolios
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            )}


          </aside>

          {/* ── Full-width rows inside the same grid ── */}
          <div id="charts" className="lg:col-span-12 space-y-8">
            <ChartsSection
              slug={slug}
              portfolioName={portfolio.name}
              sharpeRatio={portfolio.sharpe_ratio}
              bestYear={portfolio.best_year}
              worstYear={portfolio.worst_year}
              growthData={growthData}
              growthData10yr={growthData10yr}
              drawdownData={drawdownData}
              rollingDatasets={rollingDatasets}
              benchmarks={benchmarks}
            />
          </div>

          {/* ── Drawdown Events Table ── */}
          {drawdownEvents.length > 0 && (
            <div id="drawdown-events" className="lg:col-span-12">
              <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
                <div className="mb-6">
                  <h2 className="font-manrope text-[22px] font-bold text-primary">Drawdown History</h2>
                  <p className="font-inter text-[13px] text-on-surface-variant mt-1">
                    All drawdowns ≥ 3% sorted by severity. Recovery time is measured from the trough back to the prior peak.
                  </p>
                </div>
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full min-w-[560px] font-inter text-[13px]">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="text-left pb-3 pr-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Peak</th>
                        <th className="text-left pb-3 pr-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Trough</th>
                        <th className="text-left pb-3 pr-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Recovery</th>
                        <th className="text-right pb-3 pr-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Depth</th>
                        <th className="text-right pb-3 pr-4 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Peak → Trough</th>
                        <th className="text-right pb-3 font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Recovery Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawdownEvents.map((ev, i) => (
                        <tr key={i} className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors">
                          <td className="py-3 pr-4 text-on-surface font-semibold">{formatMY(ev.startDate)}</td>
                          <td className="py-3 pr-4 text-on-surface">{formatMY(ev.troughDate)}</td>
                          <td className="py-3 pr-4">
                            {ev.endDate
                              ? <span className="text-on-surface">{formatMY(ev.endDate)}</span>
                              : <span className="font-semibold text-[#b45309]">Ongoing</span>
                            }
                          </td>
                          <td className="py-3 pr-4 text-right font-bold text-error">{ev.depth.toFixed(1)}%</td>
                          <td className="py-3 pr-4 text-right text-on-surface-variant">{ev.lengthMonths} mo</td>
                          <td className="py-3 text-right text-on-surface-variant">
                            {ev.recoveryMonths != null ? `${ev.recoveryMonths} mo` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          <div id="heatmap" className="lg:col-span-12">
            <HoldingPeriodHeatmap heatmapData={heatmapData} />
          </div>

          {startDateSensitivityData && (
            <div className="lg:col-span-12">
              <StartDateSensitivitySection data={startDateSensitivityData} />
            </div>
          )}

          {seasonalityData.length > 0 && (
            <div id="seasonality-wrapper" className="lg:col-span-12">
              <SeasonalitySection data={seasonalityData} />
            </div>
          )}
        </div>

        {/* ── Related Portfolios ── */}
        {relatedPortfolios.length > 0 && (
          <section className="mt-12 pt-10 border-t border-outline-variant">
            <h2 className="font-manrope text-[20px] font-bold text-primary mb-6">Related Portfolios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedPortfolios.map((p) => (
                <Link
                  key={p.slug}
                  href={`/portfolios/${p.slug}`}
                  className="group bg-surface-container-lowest rounded-xl border border-outline-variant p-6 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-manrope text-[17px] font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {p.name}
                    </h3>
                    <span className="flex-shrink-0 bg-[#D1E4D8] text-primary px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {p.category}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">CAGR</span>
                      <span className="font-manrope text-[20px] font-bold text-primary leading-tight">
                        {p.cagr != null ? `${p.cagr.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sharpe</span>
                      <span className="font-manrope text-[20px] font-bold text-on-surface leading-tight">
                        {p.sharpe_ratio != null ? p.sharpe_ratio.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Max DD</span>
                      <span className="font-manrope text-[20px] font-bold text-error leading-tight">
                        {p.max_drawdown != null ? `${p.max_drawdown.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Email Capture ── */}
        <div className="mt-10">
          <EmailCapture />
        </div>

      </div>
    </main>
  );
}
