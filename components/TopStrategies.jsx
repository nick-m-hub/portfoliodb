'use client';
import { useState } from 'react';
import Link from 'next/link';

const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

const METRICS = {
  sharpe: {
    label: 'Sharpe Ratio',
    bigStat: (p) => (p.sharpe_ratio ?? 0).toFixed(2),
    bigLabel: 'Sharpe Ratio',
    bigIcon: 'balance',
    secondary: [
      { label: 'CAGR',         value: (p) => `${(p.cagr ?? 0).toFixed(1)}%` },
      { label: 'Max Drawdown', value: (p) => `${(p.max_drawdown ?? 0).toFixed(1)}%` },
    ],
  },
  cagr: {
    label: 'CAGR',
    bigStat: (p) => `${(p.cagr ?? 0).toFixed(1)}%`,
    bigLabel: 'Real CAGR',
    bigIcon: 'trending_up',
    secondary: [
      { label: 'Sharpe Ratio', value: (p) => (p.sharpe_ratio ?? 0).toFixed(2) },
      { label: 'Max Drawdown', value: (p) => `${(p.max_drawdown ?? 0).toFixed(1)}%` },
    ],
  },
  drawdown: {
    label: 'Min. Drawdown',
    bigStat: (p) => `${Math.abs(p.max_drawdown ?? 0).toFixed(1)}%`,
    bigLabel: 'Max Drawdown',
    bigIcon: 'shield',
    secondary: [
      { label: 'CAGR',         value: (p) => `${(p.cagr ?? 0).toFixed(1)}%` },
      { label: 'Sharpe Ratio', value: (p) => (p.sharpe_ratio ?? 0).toFixed(2) },
    ],
  },
};

export default function TopStrategies({ sections }) {
  const [metric, setMetric] = useState('sharpe');
  const portfolios = sections[metric];
  const config = METRICS[metric];

  return (
    <section className="col-span-12 mb-12">
      <div className="flex flex-wrap justify-between items-end mb-8 border-b border-surface-variant pb-3 gap-4">
        <h2 className="font-manrope text-[28px] font-semibold text-primary flex items-center gap-3 flex-wrap">
          <span className="material-symbols-outlined">monitoring</span>
          Top Strategies by
          <div className="relative inline-flex items-center">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="appearance-none bg-primary text-on-primary font-manrope text-[22px] font-semibold rounded-full pl-5 pr-10 py-1 cursor-pointer border-none outline-none"
            >
              <option value="sharpe">Sharpe Ratio</option>
              <option value="cagr">CAGR</option>
              <option value="drawdown">Min. Drawdown</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 pointer-events-none text-on-primary text-[20px]">
              expand_more
            </span>
          </div>
        </h2>
        <span className="font-inter text-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
          Data since Jan 1970
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {portfolios.map((portfolio) => (
          <Link
            key={portfolio.slug}
            href={`/portfolios/${portfolio.slug}`}
            className="bg-surface-container-lowest border border-surface-variant rounded-xl p-8 flex flex-col hover:border-outline-variant hover:shadow-md transition-all"
          >
            {/* Name + arrow */}
            <div className="flex justify-between items-start mb-6">
              <span className="font-inter text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
                {portfolio.name}
              </span>
              <span className="material-symbols-outlined text-outline-variant text-base">arrow_forward</span>
            </div>

            {/* Primary stat */}
            <div className="mb-8">
              <div className="flex items-baseline gap-4">
                <span className="font-manrope text-[48px] leading-none text-primary font-bold">
                  {config.bigStat(portfolio)}
                </span>
                <span className="font-inter text-sm flex items-center font-medium bg-[#e6f4ea] text-[#27624a] px-2 py-1 rounded-md">
                  <span className="material-symbols-outlined text-[18px] mr-1">{config.bigIcon}</span>
                  {config.bigLabel}
                </span>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-surface-variant">
              {config.secondary.map((stat) => (
                <div key={stat.label}>
                  <span className="block font-inter text-sm text-on-surface-variant mb-1">{stat.label}</span>
                  <span className="font-inter text-[14px] text-on-surface font-semibold">{stat.value(portfolio)}</span>
                </div>
              ))}
            </div>

            {/* Allocation bar */}
            {portfolio.allocations.length > 0 && (
              <div className="mt-auto">
                <span className="block font-inter text-sm text-on-surface-variant mb-2">
                  {portfolio.category === 'Tactical' ? 'Average Allocation' : 'Target Allocation'}
                </span>
                <div className="flex w-full h-3 rounded-full overflow-hidden">
                  {[...portfolio.allocations]
                    .sort((a, b) => b.percentage - a.percentage)
                    .map((alloc, i) => (
                      <div
                        key={alloc.id || i}
                        title={`${alloc.asset_class}: ${alloc.percentage}%`}
                        style={{
                          width: `${alloc.percentage}%`,
                          backgroundColor: alloc.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
