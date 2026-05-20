'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const WINDOWS = [
  { label: '1Y', months: 12 },
  { label: '3Y', months: 36 },
  { label: '5Y', months: 60 },
  { label: '10Y', months: 120 },
];

function CustomTooltip({ active, payload, label, benchmarkLabel }) {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find((p) => p.dataKey === 'value');
  const benchmark = payload.find((p) => p.dataKey === 'benchmark');
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 shadow-md">
      <p className="font-inter text-[11px] text-on-surface-variant mb-1">{label}</p>
      {portfolio && (
        <p className={`font-manrope font-bold text-[14px] ${portfolio.value >= 0 ? 'text-primary' : 'text-error'}`}>
          {portfolio.value >= 0 ? '+' : ''}{portfolio.value.toFixed(2)}%
        </p>
      )}
      {benchmark?.value != null && (
        <p className="font-manrope font-bold text-[13px] text-outline mt-0.5">
          {benchmark.value >= 0 ? '+' : ''}{benchmark.value.toFixed(2)}%{' '}
          {benchmarkLabel && <span className="font-inter font-normal text-[10px]">{benchmarkLabel}</span>}
        </p>
      )}
    </div>
  );
}

export default function RollingReturnChart({ datasets, benchmarkLabel }) {
  const availableTabs = WINDOWS.filter((w) => datasets[w.label]?.length > 0);
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.label ?? '1Y');

  if (availableTabs.length === 0) return null;

  const data = datasets[activeTab] ?? [];
  const hasBenchmark = data.some((d) => d.benchmark != null);

  const values = data.map((d) => d.value);
  const benchmarkValues = hasBenchmark ? data.map((d) => d.benchmark).filter((v) => v != null) : [];
  const allValues = [...values, ...benchmarkValues];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const pad = Math.max(2, (maxVal - minVal) * 0.1);
  const yMin = Math.floor((minVal - pad) / 5) * 5;
  const yMax = Math.ceil((maxVal + pad) / 5) * 5;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {availableTabs.map((w) => (
          <button
            key={w.label}
            onClick={() => setActiveTab(w.label)}
            className={`px-4 py-1.5 rounded-full font-inter text-[12px] font-semibold transition-colors ${
              activeTab === w.label
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e2df" vertical={false} />
          <ReferenceLine y={0} stroke="#bfc9c2" strokeWidth={1} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(val) => val.slice(0, 4)}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(val) => `${val}%`}
            tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip benchmarkLabel={benchmarkLabel} />} />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#bfc9c2"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#bfc9c2', strokeWidth: 0 }}
              strokeDasharray="4 3"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#074a34"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#074a34', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="font-inter text-[11px] text-on-surface-variant mt-3">
        Annualised return for each {activeTab} period ending on that date.
      </p>
    </div>
  );
}
