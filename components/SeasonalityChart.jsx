'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts';

const POSITIVE_COLOR = '#074a34';
const NEGATIVE_COLOR = '#ba1a1a';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.avg == null) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-md px-4 py-3 font-inter text-[13px]">
      <p className="font-bold text-on-surface mb-1">{d.month}</p>
      <p className={d.avg >= 0 ? 'text-primary' : 'text-error'}>
        Avg return: {d.avg >= 0 ? '+' : ''}{d.avg.toFixed(2)}%
      </p>
      <p className="text-on-surface-variant text-[12px] mt-0.5">
        {d.positive}/{d.count} months positive
      </p>
    </div>
  );
}

export default function SeasonalityChart({ data }) {
  if (!data?.length) return null;

  const values = data.map((d) => d.avg ?? 0);
  const absMax = Math.max(Math.abs(Math.min(...values)), Math.abs(Math.max(...values)));
  const yPad = Math.ceil(absMax * 1.3 * 10) / 10;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#bfc9c2" strokeDasharray="4 2" />
        <XAxis
          dataKey="month"
          tick={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fill: '#404943' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
          tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#707973' }}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={[-yPad, yPad]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(191,201,194,0.2)' }} />
        <ReferenceLine y={0} stroke="#bfc9c2" strokeWidth={1} />
        <Bar dataKey="avg" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {data.map((d, i) => (
            <Cell key={i} fill={(d.avg ?? 0) >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
