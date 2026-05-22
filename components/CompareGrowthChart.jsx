'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function formatDollar(val) {
  if (val == null) return '';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label, portfolioNames }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.value != null);
  if (!visible.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 shadow-md min-w-[160px]">
      <p className="font-inter text-[11px] text-on-surface-variant mb-1.5">{label}</p>
      {visible.map((p) => {
        const idx = parseInt(p.dataKey.slice(1), 10);
        return (
          <p key={p.dataKey} className="font-inter text-[13px] font-semibold" style={{ color: p.color }}>
            {formatDollar(p.value)}{' '}
            <span className="font-normal text-[10px] text-on-surface-variant">
              {portfolioNames[idx]}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export default function CompareGrowthChart({ data, portfolioNames, colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e2df" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatDollar}
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip portfolioNames={portfolioNames} />} />
        {portfolioNames.map((_, i) => (
          <Line
            key={i}
            type="monotone"
            dataKey={`p${i}`}
            stroke={colors[i]}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: colors[i], strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
