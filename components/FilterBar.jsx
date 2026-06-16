'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Buy and Hold', 'Tactical'];

export default function FilterBar() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [riskLevel, setRiskLevel] = useState(null);
  const [maxDrawdown, setMaxDrawdown] = useState('');

  function handleSubmit() {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('cat', selectedCategory);
    if (riskLevel) params.set('risk', String(riskLevel));
    if (maxDrawdown && !isNaN(parseFloat(maxDrawdown))) params.set('max_drawdown', maxDrawdown);
    const qs = params.toString();
    router.push(`/database${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="w-full max-w-5xl bg-surface-container-lowest border border-outline-variant rounded-xl p-2 shadow-sm flex flex-col md:flex-row items-stretch gap-0 mb-6">

      {/* ── Category dropdown ── */}
      <div className="flex-1 flex flex-col items-start px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/50">
        <label htmlFor="filter-category" className="font-inter text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          Category
        </label>
        <div className="relative w-full">
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none font-inter text-sm bg-transparent focus:outline-none pr-6 cursor-pointer text-on-surface"
            style={{ color: selectedCategory ? undefined : 'var(--color-on-surface-variant)' }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">
            expand_more
          </span>
        </div>
      </div>

      {/* ── Risk Tolerance 1-5 ── */}
      <div className="flex-1 flex flex-col items-start px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/50">
        <span className="font-inter text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          Risk Tolerance
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRiskLevel((prev) => (prev === n ? null : n))}
              className={`w-8 h-8 rounded-lg font-inter text-[13px] font-semibold transition-all flex items-center justify-center ${
                riskLevel === n
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
              title={riskLabel(n)}
            >
              {n}
            </button>
          ))}
          {riskLevel && (
            <span className="ml-1 font-inter text-[12px] text-on-surface-variant">
              {riskLabel(riskLevel)}
            </span>
          )}
        </div>
      </div>

      {/* ── Max Drawdown ── */}
      <div className="flex-1 flex flex-col items-start px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/50">
        <label htmlFor="filter-max-dd" className="font-inter text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          Max Drawdown
        </label>
        <div className="relative w-full">
          <select
            id="filter-max-dd"
            value={maxDrawdown}
            onChange={(e) => setMaxDrawdown(e.target.value)}
            className="w-full appearance-none font-inter text-sm bg-transparent focus:outline-none pr-6 cursor-pointer text-on-surface"
            style={{ color: maxDrawdown ? undefined : 'var(--color-on-surface-variant)' }}
          >
            <option value="">No limit</option>
            <option value="10">Less than 10%</option>
            <option value="20">Less than 20%</option>
            <option value="30">Less than 30%</option>
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">
            expand_more
          </span>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="flex items-center px-2 py-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full md:w-auto bg-primary text-on-primary font-inter font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          Find Portfolios
        </button>
      </div>
    </div>
  );
}

function riskLabel(level) {
  if (!level) return '';
  if (level <= 2) return 'Conservative';
  if (level === 3) return 'Moderate';
  return 'Aggressive';
}
