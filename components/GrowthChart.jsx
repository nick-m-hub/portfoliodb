'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function formatDollar(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label, benchmarkLabel }) {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find((p) => p.dataKey === 'value');
  const benchmark = payload.find((p) => p.dataKey === 'benchmark');
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 shadow-md">
      <p className="font-inter text-[11px] text-on-surface-variant mb-1">{label}</p>
      {portfolio && (
        <p className="font-manrope font-bold text-[14px] text-primary">
          {formatDollar(portfolio.value)}
        </p>
      )}
      {benchmark?.value != null && (
        <p className="font-manrope font-bold text-[13px] text-outline mt-0.5">
          {formatDollar(benchmark.value)}{' '}
          {benchmarkLabel && <span className="font-inter font-normal text-[10px]">{benchmarkLabel}</span>}
        </p>
      )}
    </div>
  );
}

export default function GrowthChart({ data, logScale = false, benchmarkLabel }) {
  const hasBenchmark = data.some((d) => d.benchmark != null);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#074a34" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#074a34" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e2df" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          scale={logScale ? 'log' : 'auto'}
          domain={logScale ? ['auto', 'auto'] : undefined}
          allowDataOverflow={logScale}
          tickFormatter={formatDollar}
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip benchmarkLabel={benchmarkLabel} />} />
        {hasBenchmark && (
          <Area
            type="monotone"
            dataKey="benchmark"
            stroke="#bfc9c2"
            strokeWidth={1.5}
            fill="none"
            dot={false}
            activeDot={{ r: 3, fill: '#bfc9c2', strokeWidth: 0 }}
            strokeDasharray="4 3"
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke="#074a34"
          strokeWidth={2.5}
          fill="url(#growthGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#074a34', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
