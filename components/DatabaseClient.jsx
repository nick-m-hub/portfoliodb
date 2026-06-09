'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

function assetBadges(allocations) {
  const badges = new Set();
  for (const a of allocations) {
    const name = (a.asset_class || '').toLowerCase();
    if (name.includes('equity') || name.includes('stock') || name.includes('equit')) badges.add('EQ');
    else if (name.includes('bond') || name.includes('treasury') || name.includes('fixed') || name.includes('corporate') || name.includes('inflation-protected') || name.includes('high yield')) badges.add('FI');
    else if (name.includes('gold') || name.includes('commodit') || name.includes('natural resource') || name.includes('broad comm')) badges.add('CMD');
    else if (name.includes('real estate') || name.includes('reit')) badges.add('RE');
    else if (name.includes('cash') || name.includes('alternative') || name.includes('hedge')) badges.add('ALT');
  }
  return [...badges];
}

const ASSET_BUCKETS = ['EQ', 'FI', 'CMD', 'RE', 'ALT'];
const BUCKET_LABELS = { EQ: 'Equities', FI: 'Fixed Income', CMD: 'Commodities', RE: 'Real Estate', ALT: 'Cash / Alt' };

function riskLabel(level) {
  if (!level) return 'Unknown';
  if (level <= 2) return 'Conservative';
  if (level === 3) return 'Moderate';
  return 'Aggressive';
}

function riskColor(level) {
  if (!level) return 'text-on-surface-variant';
  if (level <= 2) return 'text-[#27624a]';
  if (level === 3) return 'text-[#715229]';
  return 'text-error';
}

function backtestYears(totalMonths) {
  if (!totalMonths) return null;
  const yrs = Math.round(totalMonths / 12);
  return `${yrs} YR BACKTEST`;
}

function categoryBadgeLabel(category) {
  if (!category) return '';
  if (category === 'Buy and Hold') return 'BUY & HOLD';
  if (category === 'Tactical') return 'TACTICAL';
  return category.toUpperCase();
}

// ── Portfolio Card (Grid View) ──────────────────────────────────────────────
function PortfolioCard({ portfolio }) {
  const { allocations = [] } = portfolio;

  return (
    <Link
      href={`/portfolios/${portfolio.slug}`}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
    >
      {/* Top row: badge + backtest */}
      <div className="flex items-center gap-3">
        <span className="bg-[#D1E4D8] text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-inter">
          {categoryBadgeLabel(portfolio.category)}
        </span>
        {portfolio.total_months && (
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest font-inter">
            {backtestYears(portfolio.total_months)}
          </span>
        )}
      </div>

      {/* Portfolio name */}
      <h3 className="font-manrope text-[18px] font-bold text-on-surface leading-snug">
        {portfolio.name}
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-low rounded-lg p-3 text-center">
          <span className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1 font-inter">CAGR</span>
          <span className="text-primary font-manrope font-bold text-[18px]">
            {portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3 text-center">
          <span className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1 font-inter">MAX DD</span>
          <span className="text-error font-manrope font-bold text-[18px]">
            {portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3 text-center">
          <span className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1 font-inter">SHARPE</span>
          <span className="text-on-surface font-manrope font-bold text-[18px]">
            {portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—'}
          </span>
        </div>
      </div>

      {/* Allocation bar */}
      {allocations.length > 0 && (
        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest font-inter">ALLOCATION</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-inter">
              {portfolio.trade_frequency || 'BUY & HOLD'}
            </span>
          </div>
          <div className="h-2 w-full flex rounded-full overflow-hidden">
            {allocations.map((a, i) => (
              <div
                key={a.id || i}
                style={{
                  width: `${a.percentage}%`,
                  backgroundColor: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                }}
                title={`${a.asset_class}: ${a.percentage}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {allocations.slice(0, 4).map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase font-inter">
                  {a.asset_class} ({a.percentage}%)
                </span>
              </div>
            ))}
            {allocations.length > 4 && (
              <span className="text-[10px] text-on-surface-variant font-inter">
                +{allocations.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

// ── Portfolio Row (List View) ───────────────────────────────────────────────
function PortfolioRow({ portfolio }) {
  return (
    <tr className="hover:bg-surface-container transition-colors cursor-pointer group border-b border-outline-variant last:border-b-0">
      <td className="px-6 py-4">
        <Link href={`/portfolios/${portfolio.slug}`} className="block">
          <span className="font-manrope font-semibold text-on-surface text-[15px] group-hover:text-primary transition-colors">
            {portfolio.name}
          </span>
          <span className="block text-[11px] text-on-surface-variant font-inter mt-0.5">
            {categoryBadgeLabel(portfolio.category)}
          </span>
        </Link>
      </td>
      <td className="px-6 py-4">
        <span className={`font-inter text-[13px] font-semibold ${riskColor(portfolio.risk_level)}`}>
          {riskLabel(portfolio.risk_level)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-manrope font-bold text-primary text-[15px]">
          {portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}%` : '—'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-manrope font-semibold text-error text-[15px]">
          {portfolio.max_drawdown != null ? `${portfolio.max_drawdown.toFixed(1)}%` : '—'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-inter text-on-surface text-[14px]">
          {portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className={`font-inter font-semibold text-[14px] ${portfolio.ytd_return != null ? (portfolio.ytd_return >= 0 ? 'text-primary' : 'text-error') : 'text-on-surface-variant'}`}>
          {portfolio.ytd_return != null ? `${portfolio.ytd_return.toFixed(1)}%` : '—'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          href={`/portfolios/${portfolio.slug}`}
          className="font-inter text-[13px] text-primary font-medium flex items-center justify-end gap-1 group-hover:gap-2 transition-all"
        >
          View
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </td>
    </tr>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
function strategyLabel(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DatabaseClient({ portfolios, strategyOptions = [] }) {
  const searchParams = useSearchParams();

  // Initialise filters from URL params (set by the home page FilterBar)
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [riskFilters, setRiskFilters] = useState(() => {
    const risk = searchParams.get('risk');
    if (!risk) return [];
    const label = riskLabel(parseInt(risk, 10));
    return label ? [label] : [];
  });
  const [categoryFilters, setCategoryFilters] = useState(() => {
    const cat = searchParams.get('cat');
    return cat ? [cat] : [];
  });
  const [bucketFilters, setBucketFilters] = useState([]);
  const [strategyFilters, setStrategyFilters] = useState([]);
  const [maxDrawdownFilter, setMaxDrawdownFilter] = useState(() => {
    const md = searchParams.get('max_drawdown');
    return md ? parseFloat(md) : null;
  });
  const [sortBy, setSortBy] = useState('sharpe_ratio'); // default sort
  const [showFilters, setShowFilters] = useState(false);

  function toggleRisk(label) {
    setRiskFilters((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  }

  function toggleCategory(c) {
    setCategoryFilters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function toggleBucket(b) {
    setBucketFilters((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  }

  function toggleStrategy(s) {
    setStrategyFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function clearFilters() {
    setRiskFilters([]);
    setCategoryFilters([]);
    setBucketFilters([]);
    setStrategyFilters([]);
    setMaxDrawdownFilter(null);
  }

  const filtered = useMemo(() => {
    let result = [...portfolios];

    // Category filter
    if (categoryFilters.length > 0) {
      result = result.filter((p) => categoryFilters.includes(p.category));
    }

    // Risk filter
    if (riskFilters.length > 0) {
      result = result.filter((p) => riskFilters.includes(riskLabel(p.risk_level)));
    }

    // Asset exposure filter — portfolio must have at least one of the selected buckets
    if (bucketFilters.length > 0) {
      result = result.filter((p) => {
        const badges = assetBadges(p.allocations);
        return bucketFilters.some((b) => badges.includes(b));
      });
    }

    // Strategy filter — portfolio must have at least one of the selected strategies
    if (strategyFilters.length > 0) {
      result = result.filter((p) =>
        p.strategies.some((s) => strategyFilters.includes(s))
      );
    }

    // Max drawdown filter
    if (maxDrawdownFilter != null) {
      result = result.filter(
        (p) => p.max_drawdown != null && Math.abs(p.max_drawdown) <= maxDrawdownFilter
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'cagr') return (b.cagr ?? -Infinity) - (a.cagr ?? -Infinity);
      if (sortBy === 'max_drawdown') return (b.max_drawdown ?? -Infinity) - (a.max_drawdown ?? -Infinity);
      if (sortBy === 'sharpe_ratio') return (b.sharpe_ratio ?? -Infinity) - (a.sharpe_ratio ?? -Infinity);
      return 0;
    });

    return result;
  }, [portfolios, categoryFilters, riskFilters, bucketFilters, strategyFilters, maxDrawdownFilter, sortBy]);

  const hasFilters = categoryFilters.length > 0 || riskFilters.length > 0 || bucketFilters.length > 0 || strategyFilters.length > 0 || maxDrawdownFilter != null;

  return (
    <main className="flex-grow w-full">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 py-12">

        {/* ── Page Header ── */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-manrope text-[36px] font-bold text-on-surface tracking-tight">
              Investment Strategy Database
            </h1>
            <p className="font-inter text-[16px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              Explore our curated selection of institutional-grade portfolio models designed for long-term capital preservation and growth.
            </p>
          </div>

          {/* Grid / List toggle */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg flex-shrink-0">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                view === 'grid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-white/60'
              }`}
              title="Grid view"
            >
              <span className="material-symbols-outlined text-[22px]">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                view === 'list'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-white/60'
              }`}
              title="List view"
            >
              <span className="material-symbols-outlined text-[22px]">view_list</span>
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar Filters ── */}
          <aside className={`w-full lg:w-56 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="sticky top-24 space-y-8">

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[13px] font-inter font-medium text-primary flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Clear filters
                </button>
              )}

              {/* Category */}
              <section>
                <h3 className="font-manrope text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">
                  Category
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[...new Set(portfolios.map((p) => p.category).filter(Boolean))].sort().map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      className={`py-1.5 px-1 rounded text-[10px] font-bold border transition-colors leading-tight ${
                        categoryFilters.includes(c)
                          ? 'border-primary bg-[#D1E4D8] text-primary'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </section>

              {/* Risk Level */}
              <section>
                <h3 className="font-manrope text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">
                  Risk Level
                </h3>
                <div className="space-y-2.5">
                  {['Conservative', 'Moderate', 'Aggressive'].map((label) => (
                    <label key={label} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={riskFilters.includes(label)}
                        onChange={() => toggleRisk(label)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span className="font-inter text-[14px] text-on-surface-variant group-hover:text-on-surface transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Asset Exposure */}
              <section>
                <h3 className="font-manrope text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">
                  Asset Exposure
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ASSET_BUCKETS.map((b) => (
                    <button
                      key={b}
                      onClick={() => toggleBucket(b)}
                      className={`py-1.5 rounded text-[10px] font-bold border transition-colors ${
                        bucketFilters.includes(b)
                          ? 'border-primary bg-[#D1E4D8] text-primary'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary'
                      }`}
                    >
                      {b} <span className="font-normal opacity-70">({BUCKET_LABELS[b]})</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Strategy */}
              {strategyOptions.length > 0 && (
                <section>
                  <h3 className="font-manrope text-[14px] font-bold text-on-surface mb-3 uppercase tracking-wider">
                    Strategy
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {strategyOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStrategy(s)}
                        className={`py-1.5 px-1 rounded text-[10px] font-bold border transition-colors leading-tight ${
                          strategyFilters.includes(s)
                            ? 'border-primary bg-[#D1E4D8] text-primary'
                            : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary'
                        }`}
                      >
                        {strategyLabel(s)}
                      </button>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className="flex-grow min-w-0">

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="lg:hidden flex items-center gap-2 mb-4 font-inter text-[13px] font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-[#D1E4D8] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              {showFilters ? 'Hide Filters' : 'Filters'}
              {hasFilters && <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">ON</span>}
            </button>

            {/* Result count + sort */}
            <div className="flex items-center justify-between mb-5">
              <span className="font-inter text-[14px] text-on-surface-variant">
                {filtered.length} {filtered.length === 1 ? 'strategy' : 'strategies'}
                {hasFilters ? ' match your filters' : ''}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-inter text-[13px] text-on-surface-variant">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="font-inter text-[13px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="sharpe_ratio">Sharpe Ratio</option>
                  <option value="cagr">CAGR</option>
                  <option value="max_drawdown">Max Drawdown</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block mb-4">
                  search_off
                </span>
                <p className="font-inter text-on-surface-variant">No strategies match your filters.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 font-inter text-[14px] text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : view === 'grid' ? (
              /* Grid view */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map((p) => (
                  <PortfolioCard key={p.slug} portfolio={p} />
                ))}
              </div>
            ) : (
              /* List view */
              <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="overflow-x-auto">
                <table className="min-w-[600px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Strategy
                      </th>
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">
                        CAGR
                      </th>
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">
                        Max DD
                      </th>
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">
                        Sharpe
                      </th>
                      <th className="px-6 py-4 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">
                        YTD
                      </th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <PortfolioRow key={p.slug} portfolio={p} />
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
