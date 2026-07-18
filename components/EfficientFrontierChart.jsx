'use client';

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const MIX_COLOR = '#e67e22'; // matches PortfolioMapClient's "your mix" dot color

function CurrentMixShape({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="white" fillOpacity={0.9} />
      <circle cx={cx} cy={cy} r={6.5} fill={MIX_COLOR} />
    </g>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 shadow-md">
      <p className="font-inter text-[11px] text-on-surface-variant mb-1">
        {p.isCurrent ? 'Your mix' : 'Frontier point'}
      </p>
      <p className="font-manrope font-bold text-[13px] text-on-surface">
        {p.y.toFixed(1)}% CAGR
      </p>
      <p className="font-inter text-[11px] text-on-surface-variant">
        {p.x.toFixed(1)}% volatility
      </p>
    </div>
  );
}

// frontier: [{ annualizedVolatility, cagr }] — Pareto-dominant candidates from
// sampleEfficientPortfolios()/computeFrontier() in BuilderClient.jsx.
// current: { x, y } | null — the user's actual selected weights, for comparison.
export default function EfficientFrontierChart({ frontier, current }) {
  const frontierPoints = (frontier || []).map((p) => ({
    x: p.annualizedVolatility,
    y: p.cagr,
  }));
  const currentPoint = current ? [{ x: current.x, y: current.y, isCurrent: true }] : [];

  if (frontierPoints.length < 2) {
    return (
      <p className="font-inter text-[13px] text-on-surface-variant">
        Insufficient data to compute a frontier for this combination of portfolios.
      </p>
    );
  }

  const allX = [...frontierPoints.map((p) => p.x), ...currentPoint.map((p) => p.x)];
  const allY = [...frontierPoints.map((p) => p.y), ...currentPoint.map((p) => p.y)];
  const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.1 || 1;
  const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dde4dd" />
        <XAxis
          type="number"
          dataKey="x"
          name="Annualized Volatility"
          domain={[Math.max(0, Math.min(...allX) - xPad), Math.max(...allX) + xPad]}
          tickFormatter={(val) => `${val.toFixed(1)}%`}
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          label={{
            value: 'Annualized Volatility',
            position: 'insideBottom',
            offset: -4,
            fontSize: 11,
            fill: '#404943',
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="CAGR"
          domain={[Math.min(...allY) - yPad, Math.max(...allY) + yPad]}
          tickFormatter={(val) => `${val.toFixed(1)}%`}
          tick={{ fontFamily: 'var(--font-inter-loaded)', fontSize: 10, fill: '#707973' }}
          tickLine={false}
          axisLine={false}
          width={44}
          label={{
            value: 'CAGR',
            angle: -90,
            position: 'insideLeft',
            fontSize: 11,
            fill: '#404943',
          }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: '#bfc9c2' }}
          content={<CustomTooltip />}
        />

        {/* Frontier line — rendered first so the current-mix dot paints on top */}
        <Scatter
          data={frontierPoints}
          line={{ stroke: '#27624a', strokeWidth: 2, strokeOpacity: 0.55 }}
          lineJointType="monotoneX"
          shape={() => null}
          tooltipType="none"
          isAnimationActive={false}
        />

        {currentPoint.length > 0 && (
          <Scatter data={currentPoint} shape={CurrentMixShape} isAnimationActive={false} />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
