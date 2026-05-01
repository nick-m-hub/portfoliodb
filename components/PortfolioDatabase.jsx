'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PortfolioCard from '@/components/PortfolioCard';

const CATEGORY_OPTIONS = ['All', 'Buy and Hold', 'Tactical', 'Robo-Advisor'];

const DEFAULTS = {
  minCagr:        0,
  maxDrawdown:    -60,
  category:       'All',
  minRolling1yr:  -15,
  minRolling3yr:  -15,
  minRolling5yr:  -15,
  minRolling10yr: -15,
};

export default function PortfolioDatabase({ portfolios }) {
  const [minCagr,        setMinCagr]        = useState(DEFAULTS.minCagr);
  const [maxDrawdown,    setMaxDrawdown]    = useState(DEFAULTS.maxDrawdown);
  const [category,       setCategory]       = useState(DEFAULTS.category);
  const [minRolling1yr,  setMinRolling1yr]  = useState(DEFAULTS.minRolling1yr);
  const [minRolling3yr,  setMinRolling3yr]  = useState(DEFAULTS.minRolling3yr);
  const [minRolling5yr,  setMinRolling5yr]  = useState(DEFAULTS.minRolling5yr);
  const [minRolling10yr, setMinRolling10yr] = useState(DEFAULTS.minRolling10yr);

  const activeCount = [
    minCagr        !== DEFAULTS.minCagr,
    maxDrawdown    !== DEFAULTS.maxDrawdown,
    category       !== DEFAULTS.category,
    minRolling1yr  !== DEFAULTS.minRolling1yr,
    minRolling3yr  !== DEFAULTS.minRolling3yr,
    minRolling5yr  !== DEFAULTS.minRolling5yr,
    minRolling10yr !== DEFAULTS.minRolling10yr,
  ].filter(Boolean).length;

  function reset() {
    setMinCagr(DEFAULTS.minCagr);
    setMaxDrawdown(DEFAULTS.maxDrawdown);
    setCategory(DEFAULTS.category);
    setMinRolling1yr(DEFAULTS.minRolling1yr);
    setMinRolling3yr(DEFAULTS.minRolling3yr);
    setMinRolling5yr(DEFAULTS.minRolling5yr);
    setMinRolling10yr(DEFAULTS.minRolling10yr);
  }

  const filtered = useMemo(() => {
    return portfolios.filter((p) => {
      if (p.cagr != null && p.cagr < minCagr) return false;
      if (p.max_drawdown != null && p.max_drawdown < maxDrawdown) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (p.rolling_1yr_avg  != null && p.rolling_1yr_avg  < minRolling1yr)  return false;
      if (p.rolling_3yr_avg  != null && p.rolling_3yr_avg  < minRolling3yr)  return false;
      if (p.rolling_5yr_avg  != null && p.rolling_5yr_avg  < minRolling5yr)  return false;
      if (p.rolling_10yr_avg != null && p.rolling_10yr_avg < minRolling10yr) return false;
      return true;
    });
  }, [portfolios, minCagr, maxDrawdown, category,
      minRolling1yr, minRolling3yr, minRolling5yr, minRolling10yr]);

  const sliders = [
    { label: 'Min CAGR',              value: minCagr,        set: setMinCagr,        min: 0,   max: 20,  step: 0.5, suffix: '%', default: DEFAULTS.minCagr        },
    { label: 'Drawdown tolerance',    value: maxDrawdown,    set: setMaxDrawdown,    min: -60, max: -5,  step: 1,   suffix: '%', default: DEFAULTS.maxDrawdown    },
    { label: 'Min 1yr rolling avg',   value: minRolling1yr,  set: setMinRolling1yr,  min: -15, max: 25,  step: 0.5, suffix: '%', default: DEFAULTS.minRolling1yr  },
    { label: 'Min 3yr rolling avg',   value: minRolling3yr,  set: setMinRolling3yr,  min: -15, max: 25,  step: 0.5, suffix: '%', default: DEFAULTS.minRolling3yr  },
    { label: 'Min 5yr rolling avg',   value: minRolling5yr,  set: setMinRolling5yr,  min: -15, max: 25,  step: 0.5, suffix: '%', default: DEFAULTS.minRolling5yr  },
    { label: 'Min 10yr rolling avg',  value: minRolling10yr, set: setMinRolling10yr, min: -15, max: 25,  step: 0.5, suffix: '%', default: DEFAULTS.minRolling10yr },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* ── Filters panel ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <h2 className="text-slate-800 font-bold text-base">Filter portfolios</h2>
          <button
            onClick={reset}
            disabled={activeCount === 0}
            className={`text-sm rounded-lg px-3 py-1.5 border transition-colors ${
              activeCount > 0
                ? 'border-blue-500 text-blue-500 hover:bg-blue-50'
                : 'border-slate-200 text-slate-400 cursor-default'
            }`}
          >
            Reset filters
            {activeCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">

          {/* Sliders */}
          {sliders.map(({ label, value, set, min, max, step, suffix }) => (
            <div key={label} className="flex flex-col gap-2">
              <label className="text-blue-500 font-semibold text-xs uppercase tracking-wide flex justify-between">
                {label}
                <span className="text-slate-800 font-bold normal-case tracking-normal">
                  {value > 0 ? '+' : ''}{value}{suffix}
                </span>
              </label>
              <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{min}{suffix}</span>
                <span>{max > 0 ? '+' : ''}{max}{suffix}</span>
              </div>
            </div>
          ))}

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-blue-500 font-semibold text-xs uppercase tracking-wide">
              Category
            </label>
            <div className="flex flex-col gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium text-left transition-colors ${
                    category === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-blue-500 hover:border-blue-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Results ── */}
      <div>
        <p className="text-sm text-slate-500 mb-6">
          {filtered.length} portfolio{filtered.length !== 1 ? 's' : ''} match your filters
        </p>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-slate-800 font-bold text-base mb-1">No portfolios match</p>
            <p className="text-slate-500 text-sm">Try relaxing your filters.</p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg px-4 py-2 bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((portfolio) => (
              <Link
                key={portfolio.slug}
                href={`/portfolios/${portfolio.slug}`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                <PortfolioCard
                  name={portfolio.name}
                  allocations={portfolio.allocations}
                  cagr={portfolio.cagr}
                  maxDrawdown={portfolio.max_drawdown}
                  sharpeRatio={portfolio.sharpe_ratio}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
