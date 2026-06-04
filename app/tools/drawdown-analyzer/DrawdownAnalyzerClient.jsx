'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';

const PRESETS = [
  { label: 'Dot-com Crash',       from: '2000-03', to: '2002-10', desc: 'Mar 2000 – Oct 2002' },
  { label: '2008 Financial Crisis', from: '2007-10', to: '2009-02', desc: 'Oct 2007 – Feb 2009' },
  { label: 'COVID Crash',          from: '2020-02', to: '2020-03', desc: 'Feb 2020 – Mar 2020' },
  { label: '2022 Bear Market',     from: '2022-01', to: '2022-10', desc: 'Jan 2022 – Oct 2022' },
];

const CATEGORY_COLORS = {
  'Buy and Hold': 'bg-[#e8f5e9] text-[#27624a]',
  'Tactical':     'bg-[#e3f2fd] text-[#1565c0]',
  'Robo-Advisor': 'bg-[#f3e5f5] text-[#7b1fa2]',
};

const SORT_OPTIONS = [
  { key: 'totalReturn',  label: 'Total Return' },
  { key: 'maxDrawdown',  label: 'Max Drawdown' },
];

export default function DrawdownAnalyzerClient() {
  const [activePreset, setActivePreset] = useState(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [sortKey, setSortKey]       = useState('totalReturn');
  const [periodLabel, setPeriodLabel] = useState('');

  const fetchAnalysis = useCallback(async (from, to, label) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setPeriodLabel(label);
    try {
      const res = await fetch(`/api/drawdown-analysis?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setResults(json.results);
      setSortKey('totalReturn');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  function handlePreset(preset) {
    setActivePreset(preset.label);
    setCustomFrom('');
    setCustomTo('');
    fetchAnalysis(preset.from, preset.to, preset.desc);
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setActivePreset(null);
    const label = `${formatMonth(customFrom)} – ${formatMonth(customTo)}`;
    fetchAnalysis(customFrom, customTo, label);
  }

  function formatMonth(ym) {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  const sorted = results
    ? [...results].sort((a, b) =>
        sortKey === 'maxDrawdown'
          ? b.maxDrawdown - a.maxDrawdown   // least negative first (best)
          : b.totalReturn - a.totalReturn
      )
    : [];

  // Find the 60/40 benchmark for comparison column
  const benchmark = results?.find((r) => r.slug === 'united-states-60-40-portfolio');

  return (
    <div>
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className={`px-4 py-2 rounded-lg font-inter text-sm font-medium border transition-colors ${
              activePreset === p.label
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
            }`}
          >
            <span className="block">{p.label}</span>
            <span className="block text-xs opacity-75">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-end gap-3 mb-8">
        <div className="flex flex-col gap-1">
          <label className="font-inter text-xs font-medium text-on-surface-variant">From</label>
          <input
            type="month"
            value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setActivePreset(null); }}
            className="font-inter text-sm border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-inter text-xs font-medium text-on-surface-variant">To</label>
          <input
            type="month"
            value={customTo}
            onChange={(e) => { setCustomTo(e.target.value); setActivePreset(null); }}
            className="font-inter text-sm border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={!customFrom || !customTo || loading}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg font-inter text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Analyze
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-on-surface-variant font-inter text-sm py-12 justify-center">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          Analyzing {results === null ? 'portfolios' : ''}…
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-error font-inter text-sm">{error}</p>
      )}

      {/* Results */}
      {!loading && sorted.length > 0 && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="font-inter text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{sorted.length} portfolios</span> during{' '}
              <span className="font-semibold text-on-surface">{periodLabel}</span>
              {benchmark && (
                <span className="ml-2 text-xs">(US 60/40: {benchmark.totalReturn >= 0 ? '+' : ''}{benchmark.totalReturn}%)</span>
              )}
            </p>
            {/* Sort toggle */}
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSortKey(o.key)}
                  className={`px-3 py-1 rounded-md font-inter text-xs font-medium transition-colors ${
                    sortKey === o.key
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-outline-variant">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="font-inter text-xs font-semibold text-on-surface-variant text-left px-4 py-3 w-10">#</th>
                  <th className="font-inter text-xs font-semibold text-on-surface-variant text-left px-4 py-3">Portfolio</th>
                  <th className="font-inter text-xs font-semibold text-on-surface-variant text-right px-4 py-3">Total Return</th>
                  <th className="font-inter text-xs font-semibold text-on-surface-variant text-right px-4 py-3">Max Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const catClass = CATEGORY_COLORS[p.category] ?? 'bg-surface-container text-on-surface-variant';
                  const isTop3 = i < 3;
                  const medal = ['🥇', '🥈', '🥉'][i] ?? null;
                  const vs60_40 = benchmark && p.slug !== benchmark.slug
                    ? p.totalReturn - benchmark.totalReturn
                    : null;

                  return (
                    <tr
                      key={p.slug}
                      className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors ${
                        isTop3 ? 'bg-[#f0f7f3]' : 'bg-surface-container-lowest'
                      }`}
                    >
                      <td className="px-4 py-3 font-inter text-sm text-on-surface-variant text-center">
                        {medal ?? <span className="text-xs">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/portfolios/${p.slug}`}
                            className="font-manrope text-sm font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                          >
                            {p.name}
                          </Link>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${catClass}`}>
                            {p.category}
                          </span>
                        </div>
                        {vs60_40 !== null && (
                          <span className={`text-xs font-inter mt-0.5 block ${vs60_40 >= 0 ? 'text-primary' : 'text-error'}`}>
                            {vs60_40 >= 0 ? '+' : ''}{vs60_40.toFixed(1)}% vs 60/40
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-manrope text-sm font-bold text-right ${p.totalReturn >= 0 ? 'text-primary' : 'text-error'}`}>
                        {p.totalReturn >= 0 ? '+' : ''}{p.totalReturn}%
                      </td>
                      <td className="px-4 py-3 font-inter text-sm text-right text-error">
                        {p.maxDrawdown === 0 ? <span className="text-primary">0%</span> : `${p.maxDrawdown.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="font-inter text-xs text-on-surface-variant mt-4">
            Total return compounds all monthly returns within the selected window. Max drawdown is the worst peak-to-trough decline within the same window. Past performance does not guarantee future results.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results === null && (
        <div className="text-center py-16 text-on-surface-variant font-inter text-sm">
          <span className="material-symbols-outlined text-4xl text-outline mb-3 block">query_stats</span>
          Select a crash period above to see how every portfolio held up.
        </div>
      )}
    </div>
  );
}
