'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find((p) => p.dataKey === 'value');
  const benchmark = payload.find((p) => p.dataKey === 'benchmark');
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 shadow-md">
      <p className="font-inter text-[11px] text-on-surface-variant mb-1">{label}</p>
      {portfolio && (
        <p className="font-manrope font-bold text-[14px] text-error">
          {portfolio.value.toFixed(2)}%
        </p>
      )}
      {benchmark?.value != null && (
        <p className="font-manrope font-bold text-[13px] text-outline mt-0.5">
          {benchmark.value.toFixed(2)}%{' '}
          <span className="font-inter font-normal text-[10px]">60/40</span>
        </p>
      )}
    </div>
  );
}

export default function DrawdownChart({ data }) {
  const hasBenchmark = data.some((d) => d.benchmark != null);
  const minVal = Math.min(...data.map((d) => d.value));
  const yMin = Math.floor(minVal / 5) * 5 - 5;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ba1a1a" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#ba1a1a" stopOpacity={0.04} />
          </linearGradient>
        </defs>
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
          domain={[yMin, 0]}
          tickFormatter={(val) => `${val}%`}
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
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
          stroke="#ba1a1a"
          strokeWidth={2}
          fill="url(#drawdownGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#ba1a1a', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
