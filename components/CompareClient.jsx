'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AllocationDonut from '@/components/AllocationDonut';
import ChartSkeleton from '@/components/ChartSkeleton';

const CompareGrowthChart = dynamic(() => import('@/components/CompareGrowthChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={320} />,
});

const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];
const PORTFOLIO_COLORS = ['#074a34', '#1565c0', '#b71c1c', '#e67e22'];

const STATS = [
  { key: 'cagr',                    label: 'CAGR',          fmt: (v) => `${v.toFixed(2)}%`,                      higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'max_drawdown',            label: 'Max Drawdown',  fmt: (v) => `${v.toFixed(2)}%`,                      higherBetter: true,  colorFn: ()  => 'text-error'                             },
  { key: 'sharpe_ratio',            label: 'Sharpe Ratio',  fmt: (v) => v.toFixed(3),                            higherBetter: true,  colorFn: ()  => 'text-on-surface'                        },
  { key: 'sortino_ratio',           label: 'Sortino Ratio', fmt: (v) => v.toFixed(3),                            higherBetter: true,  colorFn: ()  => 'text-on-surface'                        },
  { key: 'best_year',               label: 'Best Year',     fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'worst_year',              label: 'Worst Year',    fmt: (v) => `${v.toFixed(1)}%`,                      higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'ytd_return',              label: 'YTD Return',    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'cagr_1yr',                label: '1-Year CAGR',   fmt: (v) => `${v.toFixed(2)}%`,                      higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'cagr_3yr',                label: '3-Year CAGR',   fmt: (v) => `${v.toFixed(2)}%`,                      higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'cagr_10yr',               label: '10-Year CAGR',  fmt: (v) => `${v.toFixed(2)}%`,                      higherBetter: true,  colorFn: (v) => v >= 0 ? 'text-primary' : 'text-error'  },
  { key: 'ulcer_index',             label: 'Ulcer Index',   fmt: (v) => v.toFixed(2),                            higherBetter: false, colorFn: ()  => 'text-on-surface'                        },
  { key: 'ulcer_performance_index', label: 'UPI',           fmt: (v) => v.toFixed(3),                            higherBetter: true,  colorFn: ()  => 'text-on-surface'                        },
  { key: 'risk_level',              label: 'Risk Level',    fmt: (v) => `${v} / 5`,                              higherBetter: null,  colorFn: ()  => 'text-on-surface'                        },
];

const SAMPLE_COMPARISONS = [
  { label: 'Golden Butterfly vs All-Weather',  slugs: 'golden-butterfly-portfolio,ray-dalios-all-weather-portfolio' },
  { label: '60/40 vs Three-Fund',              slugs: 'united-states-60-40-portfolio,bogleheads-three-fund-portfolio' },
  { label: 'Permanent vs Desert',              slugs: 'permanent-portfolio,desert-portfolio' },
];

function mergeGrowthData(portfolios) {
  // Normalize to the portfolio with the shortest lookback (latest start year)
  const startYears = portfolios.map((p) => p.growthData[0]?.label).filter(Boolean);
  const commonStart = startYears.length > 0 ? startYears.reduce((a, b) => (a > b ? a : b)) : null;
  if (!commonStart) return { data: [], commonStart: null };

  const normalizedPortfolios = portfolios.map((p) => {
    const startEntry = p.growthData.find((d) => d.label === commonStart);
    if (!startEntry) return { growthData: [] };
    const baseline = startEntry.value;
    return {
      growthData: p.growthData
        .filter((d) => d.label >= commonStart)
        .map((d) => ({ label: d.label, value: Math.round((d.value / baseline) * 10000 * 100) / 100 })),
    };
  });

  const allYears = new Set();
  for (const p of normalizedPortfolios) for (const d of p.growthData) allYears.add(d.label);
  const sortedYears = [...allYears].sort();

  const data = sortedYears.map((year) => {
    const row = { year };
    for (let i = 0; i < normalizedPortfolios.length; i++) {
      const match = normalizedPortfolios[i].growthData.find((d) => d.label === year);
      row[`p${i}`] = match?.value ?? null;
    }
    return row;
  });

  return { data, commonStart };
}

function getBestWorst(portfolios, key, higherBetter) {
  if (portfolios.length < 2 || higherBetter === null) return { best: null, worst: null };
  const values = portfolios.map((p, i) => ({ i, v: p[key] })).filter((x) => x.v != null);
  if (values.length < 2) return { best: null, worst: null };
  values.sort((a, b) => a.v - b.v);
  return higherBetter
    ? { best: values[values.length - 1].i, worst: values[0].i }
    : { best: values[0].i,                 worst: values[values.length - 1].i };
}

function PortfolioSearchBox({ allPortfolioNames, selectedSlugs, onAdd }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef(null);

  const results = query.trim().length < 1 ? [] : allPortfolioNames
    .filter((p) => !selectedSlugs.includes(p.slug) && p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(slug) {
    setQuery('');
    setOpen(false);
    onAdd(slug);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">search</span>
        <input
          className="bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 font-inter text-[14px] w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-on-surface-variant/60"
          placeholder="Search portfolios to add..."
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); e.target.blur(); }
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0].slug);
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((p) => (
            <button
              key={p.slug}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p.slug); }}
              className="w-full text-left px-4 py-2.5 font-inter text-[13px] text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareClient({ allPortfolioNames, portfolios }) {
  const router                   = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedSlugs            = portfolios.map((p) => p.slug);

  function navigate(slugs) {
    startTransition(() => {
      if (slugs.length === 0) router.push('/compare');
      else router.push(`/compare?slugs=${slugs.join(',')}`);
    });
  }

  function handleAdd(slug) {
    if (selectedSlugs.length >= 4 || selectedSlugs.includes(slug)) return;
    navigate([...selectedSlugs, slug]);
  }

  function handleRemove(slug) {
    navigate(selectedSlugs.filter((s) => s !== slug));
  }

  const { data: chartData = [], commonStart } = portfolios.length > 0 ? mergeGrowthData(portfolios) : {};
  const portfolioNames = portfolios.map((p) => p.name);

  const headerGridClass = portfolios.length <= 1 ? 'grid-cols-1 max-w-sm'
    : portfolios.length === 2 ? 'grid-cols-1 sm:grid-cols-2'
    : portfolios.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-2 lg:grid-cols-4';

  const allocGridClass = portfolios.length <= 1 ? 'grid-cols-1 max-w-sm mx-auto'
    : portfolios.length === 2 ? 'grid-cols-1 sm:grid-cols-2'
    : portfolios.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-2 lg:grid-cols-4';

  return (
    <main className="flex-grow w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 pt-10 pb-16">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="font-manrope text-[36px] md:text-[44px] font-bold text-primary leading-tight tracking-tight mb-3">
            Compare Portfolios
          </h1>
          <p className="font-inter text-[16px] text-on-surface-variant max-w-2xl">
            Select up to 4 portfolios to compare stats, allocations, and historical growth side-by-side.
          </p>
        </div>

        {/* ── Selector ── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8">
          {/* Selected portfolio pills */}
          {selectedSlugs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {portfolios.map((p, i) => (
                <div key={p.slug} className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-full px-3 py-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PORTFOLIO_COLORS[i] }} />
                  <Link
                    href={`/portfolios/${p.slug}`}
                    className="font-inter text-[13px] font-semibold text-on-surface hover:text-primary transition-colors"
                  >
                    {p.name}
                  </Link>
                  <button
                    onClick={() => handleRemove(p.slug)}
                    className="text-on-surface-variant hover:text-error transition-colors ml-0.5"
                    aria-label={`Remove ${p.name}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
              {isPending && (
                <span className="font-inter text-[13px] text-on-surface-variant/60 italic self-center">
                  Loading…
                </span>
              )}
            </div>
          )}

          {/* Search box or max-reached message */}
          {selectedSlugs.length < 4 ? (
            <PortfolioSearchBox
              allPortfolioNames={allPortfolioNames}
              selectedSlugs={selectedSlugs}
              onAdd={handleAdd}
            />
          ) : (
            <p className="font-inter text-[13px] text-on-surface-variant">
              Maximum of 4 portfolios selected. Remove one to add another.
            </p>
          )}
        </div>

        {/* ── Empty state ── */}
        {portfolios.length === 0 && !isPending && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[52px] text-outline block mb-4">compare_arrows</span>
            <h2 className="font-manrope text-[22px] font-bold text-on-surface mb-2">Start comparing</h2>
            <p className="font-inter text-[15px] text-on-surface-variant mb-6 max-w-sm mx-auto">
              Search for portfolios above to begin. Try one of these popular comparisons:
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {SAMPLE_COMPARISONS.map((s) => (
                <button
                  key={s.slugs}
                  onClick={() => navigate(s.slugs.split(','))}
                  className="font-inter text-[13px] font-semibold text-primary border border-primary/30 bg-surface-container-low rounded-full px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Comparison content ── */}
        {portfolios.length > 0 && (
          <div className={`space-y-8 transition-opacity duration-150 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Portfolio header cards */}
            <div className={`grid gap-4 ${headerGridClass}`}>
              {portfolios.map((p, i) => (
                <div
                  key={p.slug}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 flex flex-col gap-3"
                  style={{ borderTopColor: PORTFOLIO_COLORS[i], borderTopWidth: '3px' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/portfolios/${p.slug}`}
                      className="font-manrope text-[16px] font-bold text-on-surface hover:text-primary transition-colors leading-snug line-clamp-2 flex-1"
                    >
                      {p.name}
                    </Link>
                    <button
                      onClick={() => handleRemove(p.slug)}
                      className="text-on-surface-variant hover:text-error transition-colors flex-shrink-0 mt-0.5"
                      aria-label={`Remove ${p.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  <span className="bg-[#D1E4D8] text-primary px-2.5 py-0.5 rounded font-inter text-[10px] font-bold uppercase tracking-wider w-fit">
                    {p.category}
                  </span>
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-outline-variant/50">
                    <div>
                      <div className="font-inter text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">CAGR</div>
                      <div className="font-manrope text-[20px] font-bold text-primary leading-tight">
                        {p.cagr != null ? `${p.cagr.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="font-inter text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Max DD</div>
                      <div className="font-manrope text-[20px] font-bold text-error leading-tight">
                        {p.max_drawdown != null ? `${p.max_drawdown.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="font-inter text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Sharpe</div>
                      <div className="font-manrope text-[20px] font-bold text-on-surface leading-tight">
                        {p.sharpe_ratio != null ? p.sharpe_ratio.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats comparison table (2+ portfolios) */}
            {portfolios.length >= 2 && (
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant">
                  <h2 className="font-manrope text-[20px] font-bold text-primary">Stats Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: `${220 + portfolios.length * 140}px` }}>
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="text-left font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest px-6 py-3 w-48">
                          Metric
                        </th>
                        {portfolios.map((p, i) => (
                          <th
                            key={p.slug}
                            className="text-right font-inter text-[11px] font-bold uppercase tracking-widest px-4 py-3"
                            style={{ color: PORTFOLIO_COLORS[i] }}
                          >
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STATS.map((stat) => {
                        const hasData = portfolios.some((p) => p[stat.key] != null);
                        if (!hasData) return null;
                        const { best } = getBestWorst(portfolios, stat.key, stat.higherBetter);
                        return (
                          <tr key={stat.key} className="border-b border-outline-variant/50 last:border-0">
                            <td className="font-inter text-[13px] text-on-surface-variant font-medium px-6 py-3">
                              {stat.label}
                            </td>
                            {portfolios.map((p, i) => {
                              const val    = p[stat.key];
                              const isBest = i === best && val != null;
                              return (
                                <td key={p.slug} className={`text-right px-4 py-3 ${isBest ? 'bg-[#f0f7f3]' : ''}`}>
                                  <span className={`font-inter text-[14px] font-semibold ${val != null ? stat.colorFn(val) : 'text-on-surface-variant'}`}>
                                    {val != null ? stat.fmt(val) : '—'}
                                  </span>
                                  {isBest && (
                                    <span className="material-symbols-outlined text-[13px] text-on-surface-variant ml-1.5 align-middle">emoji_events</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-outline-variant bg-surface-container-low">
                  <p className="font-inter text-[11px] text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">emoji_events</span>
                    = best in this comparison
                  </p>
                </div>
              </section>
            )}

            {/* Allocations */}
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
              <h2 className="font-manrope text-[20px] font-bold text-primary mb-6">Allocations</h2>
              <div className={`grid gap-8 ${allocGridClass}`}>
                {portfolios.map((p, i) => (
                  <div key={p.slug} className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PORTFOLIO_COLORS[i] }} />
                      <span className="font-inter text-[13px] font-semibold text-on-surface text-center leading-snug">{p.name}</span>
                    </div>
                    {p.allocations?.length > 0 ? (
                      <>
                        <AllocationDonut allocations={p.allocations} />
                        <div className="w-full space-y-1.5">
                          {p.allocations.map((a, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded flex-shrink-0"
                                style={{ backgroundColor: a.color || FALLBACK_COLORS[j % FALLBACK_COLORS.length] }}
                              />
                              <span className="font-inter text-[11px] text-on-surface-variant flex-1 truncate">{a.asset_class}</span>
                              <span className="font-inter text-[11px] font-bold text-on-surface">{a.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="font-inter text-[12px] text-on-surface-variant italic">No allocation data</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Growth of $10K chart */}
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
              <h2 className="font-manrope text-[20px] font-bold text-primary mb-1">Growth of $10,000</h2>
              <p className="font-inter text-[12px] text-on-surface-variant mb-5">
                All portfolios normalized to $10,000 starting in {commonStart ?? '—'}.
              </p>
              <div className="flex flex-wrap gap-5 mb-5">
                {portfolios.map((p, i) => (
                  <div key={p.slug} className="flex items-center gap-2">
                    <span className="w-5 h-0.5 rounded-full inline-block" style={{ backgroundColor: PORTFOLIO_COLORS[i] }} />
                    <span className="font-inter text-[12px] text-on-surface-variant">{p.name}</span>
                  </div>
                ))}
              </div>
              <CompareGrowthChart
                data={chartData}
                portfolioNames={portfolioNames}
                colors={PORTFOLIO_COLORS.slice(0, portfolios.length)}
              />
            </section>

          </div>
        )}

      </div>
    </main>
  );
}
