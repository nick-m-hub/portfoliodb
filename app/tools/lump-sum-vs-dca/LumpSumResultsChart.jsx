'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';

function fmtLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  const lsWins = v >= 0;
  return (
    <div className="bg-white border border-outline-variant rounded-lg shadow-md p-3 font-inter text-xs">
      <p className="text-on-surface-variant mb-1">{fmtLabel(label)}</p>
      <p className={`font-semibold ${lsWins ? 'text-primary' : 'text-error'}`}>
        {lsWins ? 'Lump sum +' : 'DCA +'}
        {Math.abs(v).toFixed(1)}% ahead
      </p>
    </div>
  );
}

export default function LumpSumResultsChart({ data }) {
  if (!data || data.length === 0) return null;

  const advantages = data.map(d => d.advantage);
  const maxAdv = Math.max(...advantages, 0);
  const minAdv = Math.min(...advantages, 0);
  const pad = Math.max((maxAdv - minAdv) * 0.08, 2);
  const yTop = Math.ceil((maxAdv + pad) / 5) * 5;
  const yBot = Math.floor((minAdv - pad) / 5) * 5;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        {/* Shaded zones */}
        <ReferenceArea y1={0} y2={yTop} fill="#f0f7f3" fillOpacity={0.7} ifOverflow="extendDomain" />
        {minAdv < 0 && (
          <ReferenceArea y1={yBot} y2={0} fill="#fce4e4" fillOpacity={0.7} ifOverflow="extendDomain" />
        )}

        <CartesianGrid strokeDasharray="3 3" stroke="#e8ede8" />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#707973' }}
          tickFormatter={v => v.slice(0, 4)}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[yBot, yTop]}
          tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
          tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#707973' }}
          width={52}
        />

        <Tooltip content={<CustomTooltip />} />

        <ReferenceLine y={0} stroke="#707973" strokeWidth={1.5} />

        <Line
          type="monotone"
          dataKey="advantage"
          stroke="#074a34"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
