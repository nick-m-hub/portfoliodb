'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { asset_class, percentage } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-slate-800">{asset_class}</p>
      <p className="text-slate-500">{percentage}%</p>
    </div>
  );
}

export default function PortfolioCard({ name, allocations = [], cagr, maxDrawdown, sharpeRatio }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full flex flex-col h-full">

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Heading */}
        <h2 className="text-slate-800 font-bold text-base leading-snug min-h-[3rem]">{name}</h2>

        {/* Donut chart */}
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={allocations}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="percentage"
                paddingAngle={2}
              >
                {allocations.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || `hsl(${(index * 47) % 360}, 65%, 55%)`}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-lg bg-slate-50 border border-slate-200 px-2 py-3">
          <div className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-blue-500 font-semibold text-xs uppercase tracking-wide">CAGR</span>
            <span className="text-sm font-bold text-slate-800">{cagr}%</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-blue-500 font-semibold text-xs uppercase tracking-wide">Max DD</span>
            <span className="text-sm font-bold text-slate-800">{maxDrawdown}%</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-blue-500 font-semibold text-xs uppercase tracking-wide">Sharpe</span>
            <span className="text-sm font-bold text-slate-800">{sharpeRatio}</span>
          </div>
        </div>
      </div>

      {/* Blue accent bar */}
      <div className="h-1.5 bg-blue-500 w-full rounded-b-lg" />
    </div>
  );
}
