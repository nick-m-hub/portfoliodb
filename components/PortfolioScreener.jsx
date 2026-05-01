'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const COLUMNS = [
  { key: 'name',            label: 'Name',            align: 'left'  },
  { key: 'category',        label: 'Category',        align: 'left'  },
  { key: 'cagr',            label: 'CAGR',            align: 'right' },
  { key: 'max_drawdown',    label: 'Max Drawdown',    align: 'right' },
  { key: 'sharpe_ratio',    label: 'Sharpe Ratio',    align: 'right' },
  { key: 'trade_frequency', label: 'Trade Frequency', align: 'left'  },
];

function SortIcon({ direction }) {
  if (!direction) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

export default function PortfolioScreener({ portfolios }) {
  const [sortKey, setSortKey] = useState('sharpe_ratio');
  const [sortDir, setSortDir] = useState('desc');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = [...new Set(portfolios.map((p) => p.category).filter(Boolean))].sort();
    return ['All', ...cats];
  }, [portfolios]);

  const sorted = useMemo(() => {
    const filtered = activeCategory === 'All'
      ? portfolios
      : portfolios.filter((p) => p.category === activeCategory);

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [portfolios, sortKey, sortDir, activeCategory]);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:text-blue-500 hover:border-blue-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">{sorted.length} portfolio{sorted.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 font-semibold text-slate-800 cursor-pointer select-none whitespace-nowrap hover:bg-slate-100 transition-colors ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${sortKey === col.key ? 'text-blue-500' : ''}`}
                >
                  {col.label}
                  <SortIcon direction={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((p) => (
              <tr key={p.slug} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800 max-w-xs">
                  <Link
                    href={`/portfolios/${p.slug}`}
                    className="text-blue-500 hover:text-blue-500 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {p.category ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                  {p.cagr != null ? `${p.cagr}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                  {p.max_drawdown != null ? `${p.max_drawdown}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                  {p.sharpe_ratio ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {p.trade_frequency ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
