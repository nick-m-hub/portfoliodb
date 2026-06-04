'use client';
import { useState } from 'react';
import Link from 'next/link';

const TABS = [
  { key: 'ytd_return', label: 'YTD',     suffix: '%', description: 'Return from January 1 to the most recent month of data' },
  { key: 'cagr_1yr',  label: '1-Year',  suffix: '%', description: 'Total return over the trailing 12 months' },
  { key: 'cagr_3yr',  label: '3-Year',  suffix: '%', description: 'Annualized return over the trailing 3 years' },
  { key: 'cagr_10yr', label: '10-Year', suffix: '%', description: 'Annualized return over the trailing 10 years' },
  { key: 'sharpe_ratio', label: 'Sharpe', suffix: '', description: 'Risk-adjusted return (higher is better)' },
];

const CATEGORY_COLORS = {
  'Buy and Hold':  'bg-[#e8f5e9] text-[#27624a]',
  'Tactical':      'bg-[#e3f2fd] text-[#1565c0]',
  'Robo-Advisor':  'bg-[#f3e5f5] text-[#7b1fa2]',
};

function fmt(value, suffix) {
  if (value == null) return <span className="text-outline">—</span>;
  const num = Number(value);
  if (suffix === '%') {
    const color = num >= 0 ? 'text-primary' : 'text-error';
    return <span className={color}>{num >= 0 ? '+' : ''}{num.toFixed(1)}%</span>;
  }
  return <span>{num.toFixed(2)}</span>;
}

export default function LeaderboardClient({ portfolios }) {
  const [activeTab, setActiveTab] = useState('cagr_1yr');

  const tab = TABS.find((t) => t.key === activeTab);

  const sorted = [...portfolios]
    .filter((p) => p[activeTab] != null)
    .sort((a, b) => Number(b[activeTab]) - Number(a[activeTab]));

  const nulls = portfolios.filter((p) => p[activeTab] == null);

  return (
    <div>
      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-1">
        <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg font-inter text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="font-inter text-xs text-on-surface-variant mb-6">{tab.description}</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="font-inter text-xs font-semibold text-on-surface-variant text-left px-4 py-3 w-10">#</th>
              <th className="font-inter text-xs font-semibold text-on-surface-variant text-left px-4 py-3">Portfolio</th>
              <th className="font-inter text-xs font-semibold text-on-surface-variant text-right px-4 py-3">{tab.label}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const catClass = CATEGORY_COLORS[p.category] ?? 'bg-surface-container text-on-surface-variant';
              const isTop3 = i < 3;
              const medal = ['🥇', '🥈', '🥉'][i] ?? null;
              return (
                <tr
                  key={p.slug}
                  className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors ${isTop3 ? 'bg-[#f0f7f3]' : 'bg-surface-container-lowest'}`}
                >
                  <td className="px-4 py-3 font-inter text-sm text-on-surface-variant text-center">
                    {medal ?? <span className="text-xs">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/portfolios/${p.slug}`}
                      className="font-manrope text-sm font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                    >
                      {p.name}
                    </Link>
                    <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${catClass}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-manrope text-sm font-bold text-right">
                    {fmt(p[activeTab], tab.suffix)}
                  </td>
                </tr>
              );
            })}
            {nulls.length > 0 && (
              <tr className="border-t border-outline-variant bg-surface-container-lowest">
                <td colSpan={5} className="px-4 py-2 font-inter text-xs text-on-surface-variant">
                  {nulls.length} portfolio{nulls.length !== 1 ? 's' : ''} excluded — insufficient data for this window
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="font-inter text-xs text-on-surface-variant mt-4">
        Returns are trailing from the most recent month of data. 3-year and 10-year figures are annualized. Past performance does not guarantee future results.
      </p>
    </div>
  );
}
