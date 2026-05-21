import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPortfolio, getAllocations, getMonthlyReturns, getAllSlugs, getRelatedPortfolios } from '@/lib/db';
import StructuredData from '@/components/StructuredData';
import AllocationDonut from '@/components/AllocationDonut';
import ChartsSection from '@/components/ChartsSection';
import EmailCapture from '@/components/EmailCapture'
import SignalTeaser from '@/components/SignalTeaser';
import StatTooltip from '@/components/StatTooltip';
import { STAT_DEFINITIONS } from '@/lib/statDefinitions';

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
  const startYear = portfolio.last_updated && portfolio.total_months
    ? new Date(portfolio.last_updated).getFullYear() - Math.floor(portfolio.total_months / 12)
    : null;
  const description = startYear
    ? `${nameForDesc} performance, allocations, and risk stats. CAGR ${portfolio.cagr?.toFixed(1)}%, max drawdown ${portfolio.max_drawdown?.toFixed(1)}%, Sharpe ${portfolio.sharpe_ratio?.toFixed(2)} since ${startYear}.`
    : `${nameForDesc} performance data: CAGR ${portfolio.cagr?.toFixed(1)}%, max drawdown ${portfolio.max_drawdown?.toFixed(1)}%, Sharpe ratio ${portfolio.sharpe_ratio?.toFixed(2)}.`;

  const title = `${portfolio.name} - PortfolioDB`;
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
function buildDrawdownData(monthlyReturns) {
  if (!monthlyReturns?.length) return [];
  let value = 10000;
  let peak = 10000;
  return monthlyReturns.map((row) => {
    value = value * (1 + row.monthly_return / 100);
    if (value > peak) peak = value;
    const drawdown = ((value - peak) / peak) * 100;
    return { label: row.date.slice(0, 7), value: Math.round(drawdown * 100) / 100 };
  });
}

// Compute annualised rolling return for a given window (in months)
function buildRollingReturnData(monthlyReturns, windowMonths) {
  if (!monthlyReturns || monthlyReturns.length < windowMonths) return [];
  const result = [];
  for (let i = windowMonths - 1; i < monthlyReturns.length; i++) {
    const window = monthlyReturns.slice(i - windowMonths + 1, i + 1);
    const product = window.reduce((acc, row) => acc * (1 + row.monthly_return / 100), 1);
    const annualized = (Math.pow(product, 12 / windowMonths) - 1) * 100;
    result.push({ label: monthlyReturns[i].date.slice(0, 7), value: Math.round(annualized * 100) / 100 });
  }
  return result;
}

// Compute growth of $10,000 from monthly returns, downsampled to one point per year
function buildGrowthData(monthlyReturns) {
  if (!monthlyReturns?.length) return [];
  let value = 10000;
  const byYear = {};
  for (const row of monthlyReturns) {
    value = value * (1 + row.monthly_return / 100);
    const year = row.date.slice(0, 4);
    byYear[year] = { label: year, value: Math.round(value * 100) / 100 };
  }
  return Object.values(byYear);
}

function StatRow({ icon, label, value, valueClass = 'text-primary', definition }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        {definition
          ? <StatTooltip label={label} definition={definition} labelClass="font-inter text-[14px] text-on-surface-variant" />
          : <span className="font-inter text-[14px] text-on-surface-variant">{label}</span>
        }
      </div>
      <span className={`font-inter font-semibold text-[15px] ${valueClass}`}>{value}</span>
    </div>
  );
}

export default async function PortfolioDetailPage({ params }) {
  const { slug } = await params;

  const [portfolio, allocations, monthlyReturns, relatedPortfolios, ...rawBenchmarkReturnsList] = await Promise.all([
    getPortfolio(slug),
    getAllocations(slug),
    getMonthlyReturns(slug),
    getRelatedPortfolios(slug),
    ...BENCHMARKS.map((b) => getMonthlyReturns(b.slug)),
  ]);

  if (!portfolio) notFound();

  const growthData = buildGrowthData(monthlyReturns);
  const drawdownData = buildDrawdownData(monthlyReturns);
  const rollingDatasets = {
    '1Y': buildRollingReturnData(monthlyReturns, 12),
    '3Y': buildRollingReturnData(monthlyReturns, 36),
    '5Y': buildRollingReturnData(monthlyReturns, 60),
    '10Y': buildRollingReturnData(monthlyReturns, 120),
  };

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
      rollingDatasets: {
        '1Y': buildRollingReturnData(raw, 12),
        '3Y': buildRollingReturnData(raw, 36),
        '5Y': buildRollingReturnData(raw, 60),
        '10Y': buildRollingReturnData(raw, 120),
      },
    };
  });

  const isTactical = portfolio.category === 'Tactical';
  const allocationLabel = isTactical ? 'Average Allocation' : 'Target Allocation';
  const backtestYears = portfolio.total_months ? Math.round(portfolio.total_months / 12) : null;

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
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="px-6 py-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Real CAGR</span>
                <span className="font-manrope text-[36px] font-bold text-primary leading-none">
                  {portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="px-6 py-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Max Drawdown</span>
                <span className="font-manrope text-[36px] font-bold text-error leading-none">
                  {portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="px-6 py-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sharpe Ratio</span>
                <span className="font-manrope text-[36px] font-bold text-on-surface leading-none">
                  {portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {/* Description */}
            {portfolio.description && (
              <div className="font-inter text-[16px] text-on-surface-variant leading-relaxed max-w-2xl">
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
                  {portfolio.description.replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Back + M1 buttons */}
          <div className="lg:col-span-1 flex flex-col gap-3 pt-2">
            <Link
              href="/database"
              className="flex items-center justify-center gap-2 py-3 border border-outline-variant rounded-full font-inter text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Database
            </Link>
            {portfolio.m1_link && (
              <a
                href={portfolio.m1_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-full font-inter text-[14px] font-semibold hover:opacity-90 transition-opacity"
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
            {portfolio.kofi_link && <SignalTeaser />}
          </div>
        </section>

        {/* ── Body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Main column ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Allocation */}
            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
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
            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
              <h2 className="font-manrope text-[22px] font-bold text-primary mb-1">Performance Snapshot</h2>
              <p className="font-inter text-[13px] mb-5">
                <Link href="/methodology" className="text-primary underline hover:opacity-75 transition-opacity">How are these calculated? →</Link>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <StatRow icon="trending_up" label="Real CAGR" value={portfolio.cagr != null ? `${portfolio.cagr.toFixed(2)}%` : '—'} definition={STAT_DEFINITIONS['Real CAGR']} />
                <StatRow icon="balance" label="Sharpe Ratio" value={portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(3) : '—'} definition={STAT_DEFINITIONS['Sharpe Ratio']} />
                <StatRow icon="trending_down" label="Max Drawdown" value={portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(2)}%` : '—'} valueClass="text-error" definition={STAT_DEFINITIONS['Max Drawdown']} />
                <StatRow icon="show_chart" label="Sortino Ratio" value={portfolio.sortino_ratio != null ? portfolio.sortino_ratio.toFixed(3) : '—'} definition={STAT_DEFINITIONS['Sortino Ratio']} />
                <StatRow icon="arrow_upward" label="Best Year" value={portfolio.best_year != null ? `+${portfolio.best_year.toFixed(1)}%` : '—'} definition={STAT_DEFINITIONS['Best Year']} />
                <StatRow icon="arrow_downward" label="Worst Year" value={portfolio.worst_year != null ? `${portfolio.worst_year.toFixed(1)}%` : '—'} valueClass="text-error" definition={STAT_DEFINITIONS['Worst Year']} />
                {portfolio.cagr_10yr != null && (
                  <StatRow icon="update" label="10-Year CAGR" value={`${portfolio.cagr_10yr.toFixed(2)}%`} valueClass={portfolio.cagr_10yr >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['10-Year CAGR']} />
                )}
                {portfolio.ulcer_index != null && (
                  <StatRow icon="warning" label="Ulcer Index" value={portfolio.ulcer_index.toFixed(2)} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Ulcer Index']} />
                )}
                {portfolio.ulcer_performance_index != null && (
                  <StatRow icon="analytics" label="Ulcer Perf. Index" value={portfolio.ulcer_performance_index.toFixed(3)} valueClass="text-on-surface" definition={STAT_DEFINITIONS['Ulcer Perf. Index']} />
                )}
                {portfolio.cagr_gfc != null && (
                  <StatRow icon="account_balance" label="GFC CAGR" value={`${portfolio.cagr_gfc >= 0 ? '+' : ''}${portfolio.cagr_gfc.toFixed(1)}%`} valueClass={portfolio.cagr_gfc >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['GFC CAGR']} />
                )}
                {portfolio.cagr_dotcom != null && (
                  <StatRow icon="computer" label="Dot-com CAGR" value={`${portfolio.cagr_dotcom >= 0 ? '+' : ''}${portfolio.cagr_dotcom.toFixed(1)}%`} valueClass={portfolio.cagr_dotcom >= 0 ? 'text-primary' : 'text-error'} definition={STAT_DEFINITIONS['Dot-com CAGR']} />
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
                <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
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
