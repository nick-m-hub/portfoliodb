'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PortfolioCard from '@/components/PortfolioCard';

const METRICS = [
  {
    key: 'sharpe_ratio',
    label: 'Sharpe Ratio',
    subheading: 'Risk-adjusted returns ranked highest to lowest',
    sort: (a, b) => b.sharpe_ratio - a.sharpe_ratio,
  },
  {
    key: 'cagr',
    label: 'CAGR',
    subheading: 'Compound annual growth rate ranked highest to lowest',
    sort: (a, b) => b.cagr - a.cagr,
  },
  {
    key: 'max_drawdown',
    label: 'Min Drawdown',
    subheading: 'Smallest peak-to-trough decline ranked best to worst',
    sort: (a, b) => b.max_drawdown - a.max_drawdown,
  },
];

export default function TopPortfolios({ portfolios }) {
  const [activeKey, setActiveKey] = useState('sharpe_ratio');

  const activeMetric = METRICS.find((m) => m.key === activeKey);

  const top6 = useMemo(() => {
    return [...portfolios].sort(activeMetric.sort).slice(0, 6);
  }, [portfolios, activeMetric]);

  return (
    <section className="max-w-6xl mx-auto px-6 py-14">

      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-slate-800 text-3xl font-bold">Top portfolios by</h2>
            <select
              value={activeKey}
              onChange={(e) => setActiveKey(e.target.value)}
              className="text-3xl font-bold text-blue-500 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg appearance-none"
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className="text-slate-500 text-sm mt-1">{activeMetric.subheading}</p>
        </div>
        <Link
          href="/database"
          className="hidden sm:inline-flex text-sm text-slate-500 hover:text-blue-500 shrink-0 mt-1 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {top6.map((portfolio) => (
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

      <div className="mt-8 text-center sm:hidden">
        <Link href="/database" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">
          View all portfolios →
        </Link>
      </div>
    </section>
  );
}
