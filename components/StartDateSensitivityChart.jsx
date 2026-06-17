'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const prev = payload.find((p) => p.dataKey === 'prev');
  const next = payload.find((p) => p.dataKey === 'next');
  const fmt = (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm px-3 py-2 font-inter text-[12px]">
      <p className="font-semibold text-on-surface mb-1">Starting {label}</p>
      {prev && <p style={{ color: '#b71c1c' }}>Prev 10 Yrs: {fmt(prev.value)}</p>}
      {next && next.value != null && <p style={{ color: '#27624a' }}>Next 10 Yrs: {fmt(next.value)}</p>}
    </div>
  );
}

export default function StartDateSensitivityChart({ data }) {
  const { points, cutoffYear, luckiest, unluckiest } = data;

  const allVals = points.flatMap((p) => [p.prev, p.next].filter((v) => v != null));
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 10;
  const pad = range * 0.22;
  const yMin = Math.floor((minVal - pad) / 2) * 2;
  const yMax = Math.ceil((maxVal + pad) / 2) * 2;


  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={points} margin={{ top: 28, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde4dd" />
        <XAxis
          dataKey="year"
          tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#707973' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#707973' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#bfc9c2" strokeWidth={1} />
        <ReferenceLine
          x={cutoffYear}
          stroke="#bfc9c2"
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="prev"
          stroke="#b71c1c"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="next"
          stroke="#27624a"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <ReferenceDot
          x={luckiest.year}
          y={luckiest.next}
          r={5}
          fill="#27624a"
          stroke="#fff"
          strokeWidth={2}
        />
        <ReferenceDot
          x={unluckiest.year}
          y={unluckiest.next}
          r={5}
          fill="#b71c1c"
          stroke="#fff"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
