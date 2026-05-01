'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

const PAGE_SIZE = 25;

// Map asset class names → broad badge buckets
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

const BADGE_STYLES = {
  EQ:  { bg: 'bg-blue-100',   text: 'text-blue-700',    label: 'EQ',  title: 'Equities' },
  FI:  { bg: 'bg-emerald-100',text: 'text-emerald-700', label: 'FI',  title: 'Fixed Income' },
  CMD: { bg: 'bg-amber-100',  text: 'text-amber-700',   label: 'CMD', title: 'Commodities' },
  RE:  { bg: 'bg-slate-100',  text: 'text-slate-600',   label: 'RE',  title: 'Real Estate' },
  ALT: { bg: 'bg-purple-100', text: 'text-purple-700',  label: 'ALT', title: 'Alternatives / Cash' },
};

const ASSET_BUCKETS = ['EQ', 'FI', 'CMD', 'RE', 'ALT'];
const BUCKET_LABELS = { EQ: 'Equities', FI: 'Fixed Income', CMD: 'Commodities', RE: 'Real Estate', ALT: 'Cash / Alt' };

function riskLabel(level) {
  if (!level) return '—';
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

// Export filtered portfolios as CSV
function exportCsv(portfolios) {
  const headers = ['Name', 'Category', 'Risk Level', 'CAGR (%)', 'Max Drawdown (%)', 'Sharpe Ratio', 'Trade Frequency'];
  const rows = portfolios.map((p) => [
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${p.category || ''}"`,
    riskLabel(p.risk_level),
    p.cagr != null ? p.cagr.toFixed(2) : '',
    p.max_drawdown != null ? p.max_drawdown.toFixed(2) : '',
    p.sharpe_ratio != null ? p.sharpe_ratio.toFixed(3) : '',
    `"${p.trade_frequency || ''}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfoliodb-screener.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Slider with live value display ─────────────────────────────────────────
function FilterSlider({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="font-inter text-[11px] font-semibold text-on-surface">{label}</label>
        <span className="font-inter text-[11px] text-primary font-bold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ScreenerClient({ portfolios, assetClasses }) {
  // Sliders — start at the permissive end so everything shows by default
  const [minCagr, setMinCagr] = useState(0);
  const [minSharpe, setMinSharpe] = useState(-0.5);
  const [maxDrawdown, setMaxDrawdown] = useState(80);
  const [minWorstYear, setMinWorstYear] = useState(-70);
  const [minCagr10yr, setMinCagr10yr] = useState(-5);
  const [minSortino, setMinSortino] = useState(-0.5);
  const [maxUlcer, setMaxUlcer] = useState(14);
  const [minRolling1yr, setMinRolling1yr] = useState(-50);
  const [minRolling3yr, setMinRolling3yr] = useState(-30);
  const [minRolling5yr, setMinRolling5yr] = useState(-25);
  const [minRolling10yr, setMinRolling10yr] = useState(-15);

  // Asset bucket filter
  const [bucketFilters, setBucketFilters] = useState([]);

  // Asset class filter
  const [assetClassFilters, setAssetClassFilters] = useState([]);
  const [assetClassesOpen, setAssetClassesOpen] = useState(false);

  // Mobile filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Sort
  const [sortCol, setSortCol] = useState('sharpe_ratio');
  const [sortDir, setSortDir] = useState('desc');

  function toggleAssetClass(name) {
    setPage(1);
    setAssetClassFilters((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  }

  function toggleBucket(b) {
    setPage(1);
    setBucketFilters((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(1);
  }

  function clearFilters() {
    setMinCagr(0);
    setMinSharpe(-0.5);
    setMaxDrawdown(80);
    setMinWorstYear(-70);
    setMinCagr10yr(-5);
    setMinSortino(-0.5);
    setMaxUlcer(14);
    setMinRolling1yr(-50);
    setMinRolling3yr(-30);
    setMinRolling5yr(-25);
    setMinRolling10yr(-15);
    setBucketFilters([]);
    setAssetClassFilters([]);
    setPage(1);
  }

  const hasFilters = minCagr > 0 || minSharpe > -0.5 || maxDrawdown < 80
    || minWorstYear > -70 || minCagr10yr > -5 || minSortino > -0.5 || maxUlcer < 14
    || minRolling1yr > -50 || minRolling3yr > -30 || minRolling5yr > -25 || minRolling10yr > -15
    || bucketFilters.length > 0 || assetClassFilters.length > 0;

  const filtered = useMemo(() => {
    let result = portfolios.filter((p) => {
      if (p.cagr != null && p.cagr < minCagr) return false;
      if (p.sharpe_ratio != null && p.sharpe_ratio < minSharpe) return false;
      if (p.max_drawdown != null && Math.abs(p.max_drawdown) > maxDrawdown) return false;
      if (p.worst_year != null && p.worst_year < minWorstYear) return false;
      if (p.cagr_10yr != null && p.cagr_10yr < minCagr10yr) return false;
      if (p.sortino_ratio != null && p.sortino_ratio < minSortino) return false;
      if (p.ulcer_index != null && p.ulcer_index > maxUlcer) return false;
      if (p.rolling_1yr_low != null && p.rolling_1yr_low < minRolling1yr) return false;
      if (p.rolling_3yr_low != null && p.rolling_3yr_low < minRolling3yr) return false;
      if (p.rolling_5yr_low != null && p.rolling_5yr_low < minRolling5yr) return false;
      if (p.rolling_10yr_low != null && p.rolling_10yr_low < minRolling10yr) return false;
      if (bucketFilters.length > 0) {
        const badges = assetBadges(p.allocations);
        if (!bucketFilters.some((b) => badges.includes(b))) return false;
      }
      if (assetClassFilters.length > 0) {
        if (!p.allocations.some((a) => assetClassFilters.includes(a.asset_class))) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const aVal = a[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const bVal = b[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [portfolios, minCagr, minSharpe, maxDrawdown, minWorstYear, minCagr10yr, minSortino, maxUlcer, minRolling1yr, minRolling3yr, minRolling5yr, minRolling10yr, bucketFilters, assetClassFilters, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="material-symbols-outlined text-[14px] text-outline opacity-40">unfold_more</span>;
    return (
      <span className="material-symbols-outlined text-[14px] text-primary">
        {sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward'}
      </span>
    );
  }

  function SortTh({ col, label, className = '' }) {
    return (
      <th
        className={`px-3 py-2.5 font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest cursor-pointer hover:text-on-surface select-none ${className}`}
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1 justify-end">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  return (
    <div className="flex flex-col flex-grow w-full min-h-screen">
      <div className="flex flex-col lg:flex-row flex-grow max-w-[1440px] mx-auto w-full px-8">

        {/* ── Sticky Sidebar ── */}
        <aside className={`w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] flex-col py-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-outline-variant lg:pr-6 ${showFilters ? 'flex' : 'hidden'} lg:flex`}>

          {/* Header */}
          <div className="mb-5">
            <h3 className="font-manrope text-[18px] font-bold text-primary mb-1">Advanced Filters</h3>
            <p className="font-inter text-[12px] text-on-surface-variant">
              Refine analysis across {portfolios.length} strategies
            </p>
          </div>

          <div className="space-y-6 flex-grow">

            {/* Asset Classes */}
            <div className="space-y-2">
              <button
                onClick={() => setAssetClassesOpen((o) => !o)}
                className="w-full flex items-center justify-between group"
              >
                <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Asset Classes
                  {assetClassFilters.length > 0 && (
                    <span className="ml-1.5 text-primary">({assetClassFilters.length})</span>
                  )}
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {assetClassesOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {assetClassesOpen && (
                <div className="space-y-1.5 pt-1">
                  {assetClasses.map((ac) => (
                    <label
                      key={ac.asset_class}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={assetClassFilters.includes(ac.asset_class)}
                        onChange={() => toggleAssetClass(ac.asset_class)}
                        className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary flex-shrink-0"
                      />
                      {ac.default_color && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ac.default_color }}
                        />
                      )}
                      <span className="font-inter text-[12px] text-on-surface-variant group-hover:text-on-surface transition-colors leading-snug">
                        {ac.asset_class}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Benchmarks */}
            <div className="space-y-4 pt-4 border-t border-outline-variant">
              <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                Performance Benchmarks
              </span>
              <FilterSlider
                label="CAGR (Min)"
                value={minCagr}
                min={0} max={20} step={0.5}
                onChange={(v) => { setMinCagr(v); setPage(1); }}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <FilterSlider
                label="Sharpe Ratio (Min)"
                value={minSharpe}
                min={-0.5} max={2} step={0.05}
                onChange={(v) => { setMinSharpe(v); setPage(1); }}
                format={(v) => v.toFixed(2)}
              />
              <FilterSlider
                label="Max Drawdown (Limit)"
                value={maxDrawdown}
                min={5} max={80} step={1}
                onChange={(v) => { setMaxDrawdown(v); setPage(1); }}
                format={(v) => `-${v}%`}
              />
              <FilterSlider
                label="Worst Year (Min)"
                value={minWorstYear}
                min={-70} max={0} step={1}
                onChange={(v) => { setMinWorstYear(v); setPage(1); }}
                format={(v) => `${v >= 0 ? '+' : ''}${v}%`}
              />
              <FilterSlider
                label="10yr CAGR (Min)"
                value={minCagr10yr}
                min={-5} max={20} step={0.5}
                onChange={(v) => { setMinCagr10yr(v); setPage(1); }}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <FilterSlider
                label="Sortino Ratio (Min)"
                value={minSortino}
                min={-0.5} max={3} step={0.05}
                onChange={(v) => { setMinSortino(v); setPage(1); }}
                format={(v) => v.toFixed(2)}
              />
              <FilterSlider
                label="Ulcer Index (Max)"
                value={maxUlcer}
                min={0} max={14} step={0.5}
                onChange={(v) => { setMaxUlcer(v); setPage(1); }}
                format={(v) => v.toFixed(1)}
              />
            </div>

            {/* Rolling Returns */}
            <div className="space-y-4 pt-4 border-t border-outline-variant">
              <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                Rolling Returns (Min)
              </span>
              <FilterSlider
                label="1yr Rolling (Min)"
                value={minRolling1yr}
                min={-50} max={20} step={1}
                onChange={(v) => { setMinRolling1yr(v); setPage(1); }}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <FilterSlider
                label="3yr Rolling (Min)"
                value={minRolling3yr}
                min={-30} max={15} step={1}
                onChange={(v) => { setMinRolling3yr(v); setPage(1); }}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <FilterSlider
                label="5yr Rolling (Min)"
                value={minRolling5yr}
                min={-25} max={15} step={1}
                onChange={(v) => { setMinRolling5yr(v); setPage(1); }}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <FilterSlider
                label="10yr Rolling (Min)"
                value={minRolling10yr}
                min={-15} max={15} step={1}
                onChange={(v) => { setMinRolling10yr(v); setPage(1); }}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
            </div>

            {/* Asset Exposure */}
            <div className="space-y-2.5 pt-4 border-t border-outline-variant">
              <span className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                Asset Exposure
              </span>
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
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <div className="pt-4 border-t border-outline-variant mt-4">
              <button
                onClick={clearFilters}
                className="w-full bg-surface-container border border-outline-variant text-on-surface-variant py-2 rounded-lg font-inter text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Clear all filters
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <section className="flex-1 min-w-0 py-6 lg:pl-8">

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="lg:hidden flex items-center gap-2 mb-4 font-inter text-[13px] font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-[#D1E4D8] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            {showFilters ? 'Hide Filters' : 'Filters'}
            {hasFilters && <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">ON</span>}
          </button>

          {/* Section header */}
          <div className="flex justify-between items-end mb-5">
            <div>
              <h2 className="font-manrope text-[24px] font-bold text-on-surface">Institutional Screener</h2>
              <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                {filtered.length} {filtered.length === 1 ? 'strategy' : 'strategies'}
                {hasFilters ? ' match your filters' : ' — quantitative analysis across all portfolios'}
              </p>
            </div>
            <button
              onClick={() => exportCsv(filtered)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-inter text-[12px] font-semibold hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2.5 font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-left w-[35%]">
                      Strategy
                    </th>
                    <th className="px-3 py-2.5 font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      Asset Mix
                    </th>
                    <th className="px-3 py-2.5 font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                      Risk
                    </th>
                    <SortTh col="cagr" label="CAGR" />
                    <SortTh col="max_drawdown" label="Max DD" />
                    <SortTh col="sharpe_ratio" label="Sharpe" />
                    <th className="px-3 py-2.5 font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      Rebalance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40 block mb-3">search_off</span>
                        <p className="font-inter text-[14px] text-on-surface-variant">No strategies match your filters.</p>
                        <button onClick={clearFilters} className="mt-3 font-inter text-[13px] text-primary hover:underline">
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => {
                      const badges = assetBadges(p.allocations);
                      return (
                        <tr key={p.slug} className="hover:bg-primary/5 transition-colors group">
                          {/* Strategy name */}
                          <td className="px-4 py-2.5">
                            <Link href={`/portfolios/${p.slug}`} className="flex flex-col">
                              <span className="font-inter font-semibold text-on-surface text-[13px] leading-snug group-hover:text-primary transition-colors">
                                {p.name}
                              </span>
                              <span className="font-inter text-[10px] text-on-surface-variant mt-0.5">
                                {p.category}
                              </span>
                            </Link>
                          </td>

                          {/* Asset mix badges */}
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {badges.map((b) => {
                                const s = BADGE_STYLES[b];
                                return (
                                  <span
                                    key={b}
                                    title={s.title}
                                    className={`px-1.5 py-0.5 ${s.bg} ${s.text} text-[9px] font-bold rounded uppercase`}
                                  >
                                    {s.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Risk */}
                          <td className={`px-3 py-2.5 text-right font-inter text-[12px] font-semibold ${riskColor(p.risk_level)}`}>
                            {riskLabel(p.risk_level)}
                          </td>

                          {/* CAGR */}
                          <td className="px-3 py-2.5 text-right font-inter text-[13px] text-primary font-bold">
                            {p.cagr != null ? `${p.cagr.toFixed(1)}%` : '—'}
                          </td>

                          {/* Max DD */}
                          <td className="px-3 py-2.5 text-right font-inter text-[13px] text-error font-semibold">
                            {p.max_drawdown != null ? `${p.max_drawdown.toFixed(1)}%` : '—'}
                          </td>

                          {/* Sharpe */}
                          <td className="px-3 py-2.5 text-right font-inter text-[13px] text-on-surface">
                            {p.sharpe_ratio != null ? p.sharpe_ratio.toFixed(2) : '—'}
                          </td>

                          {/* Rebalance */}
                          <td className="px-3 py-2.5">
                            {p.trade_frequency ? (
                              <span className="font-inter text-[10px] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full whitespace-nowrap">
                                {p.trade_frequency}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-surface-container-low px-4 py-2.5 flex items-center justify-between border-t border-outline-variant">
                <span className="font-inter text-[11px] text-on-surface-variant">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce((acc, n, i, arr) => {
                      if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 font-inter text-[12px] text-on-surface-variant">…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-7 h-7 rounded font-inter text-[12px] transition-colors ${
                            page === n
                              ? 'bg-primary text-on-primary font-bold'
                              : 'text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
