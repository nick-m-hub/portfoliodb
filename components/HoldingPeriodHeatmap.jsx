'use client';
import { useState } from 'react';

function cellStyle(cagr) {
  if (cagr === null) return null;
  if (cagr >= 20)  return { bg: '#0d3d26', text: '#fff' };
  if (cagr >= 15)  return { bg: '#1a5c3a', text: '#fff' };
  if (cagr >= 10)  return { bg: '#27824f', text: '#fff' };
  if (cagr >= 5)   return { bg: '#6ab98e', text: '#1a1c1a' };
  if (cagr >= 0)   return { bg: '#c0e8d2', text: '#1a1c1a' };
  if (cagr >= -5)  return { bg: '#fce4e4', text: '#1a1c1a' };
  if (cagr >= -10) return { bg: '#e88080', text: '#fff' };
  return               { bg: '#b71c1c', text: '#fff' };
}

const LEGEND = [
  { label: '≥20%',     style: { bg: '#0d3d26', text: '#fff' } },
  { label: '15–20%',   style: { bg: '#1a5c3a', text: '#fff' } },
  { label: '10–15%',   style: { bg: '#27824f', text: '#fff' } },
  { label: '5–10%',    style: { bg: '#6ab98e', text: '#1a1c1a' } },
  { label: '0–5%',     style: { bg: '#c0e8d2', text: '#1a1c1a' } },
  { label: '-5–0%',    style: { bg: '#fce4e4', text: '#1a1c1a' } },
  { label: '-10–-5%',  style: { bg: '#e88080', text: '#fff' } },
  { label: '<-10%',    style: { bg: '#b71c1c', text: '#fff' } },
];

export default function HoldingPeriodHeatmap({ heatmapData }) {
  const [tooltip, setTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!heatmapData) return null;
  const { startYears, holdingPeriods, data } = heatmapData;

  // Render rows newest-first
  const reversedYears = [...startYears].reverse();

  return (
    <section className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant shadow-sm">
      <div className="mb-5">
        <h2 className="font-manrope text-[22px] font-bold text-primary">Holding Period Returns</h2>
        <p className="font-inter text-[13px] text-on-surface-variant mt-1">
          Annualised CAGR for every start year and holding period. Each cell answers: "What if I invested in January of that year and held for N years?"
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {LEGEND.map((l) => (
          <div
            key={l.label}
            className="flex items-center gap-1 font-inter text-[11px] font-medium"
          >
            <span
              className="inline-block w-4 h-4 rounded-sm"
              style={{ backgroundColor: l.style.bg }}
            />
            <span className="text-on-surface-variant">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="font-inter text-[11px] font-semibold text-on-surface-variant text-right pr-2 pb-1 w-12" style={{ minWidth: '48px' }}>
                Year
              </th>
              {holdingPeriods.map((n) => (
                <th
                  key={n}
                  className="font-inter text-[10px] font-medium text-on-surface-variant text-center pb-1"
                  style={{ width: '32px', minWidth: '32px' }}
                >
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reversedYears.map((startYear) => {
              const rowIndex = startYears.indexOf(startYear);
              return (
                <tr key={startYear}>
                  <td className="font-inter text-[11px] font-medium text-on-surface-variant text-right pr-2 py-px">
                    {startYear}
                  </td>
                  {holdingPeriods.map((n, colIndex) => {
                    const cagr = data[rowIndex]?.[colIndex] ?? null;
                    const style = cellStyle(cagr);
                    return (
                      <td
                        key={n}
                        className="py-px px-px cursor-default"
                        onMouseEnter={() => cagr !== null && setTooltip({ startYear, years: n, cagr })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {style ? (
                          <div
                            className="rounded-sm flex items-center justify-center font-inter text-[9px] font-medium"
                            style={{
                              width: '30px',
                              height: '18px',
                              backgroundColor: style.bg,
                              color: style.text,
                            }}
                          >
                            {Math.abs(cagr) >= 10 ? Math.round(cagr) : cagr.toFixed(1)}
                          </div>
                        ) : (
                          <div style={{ width: '30px', height: '18px' }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="font-inter text-[11px] text-on-surface-variant mt-3">
        Numbers show annualised CAGR (%). Only full calendar years included. Cells with insufficient data are blank.
      </p>

      {/* Cursor tooltip — floats next to the mouse over the grid */}
      {tooltip && (() => {
        const TOOLTIP_W = 300;
        const TOOLTIP_H = 36;
        const OFFSET = 14;
        const left = mousePos.x + OFFSET + TOOLTIP_W > window.innerWidth
          ? mousePos.x - TOOLTIP_W - OFFSET
          : mousePos.x + OFFSET;
        const top = mousePos.y + OFFSET + TOOLTIP_H > window.innerHeight
          ? mousePos.y - TOOLTIP_H - OFFSET
          : mousePos.y + OFFSET;
        return (
          <div
            className="bg-white border border-outline-variant rounded-lg shadow-lg px-3 py-2 font-inter text-[13px] text-on-surface-variant whitespace-nowrap"
            style={{ position: 'fixed', left, top, zIndex: 200, pointerEvents: 'none' }}
          >
            <span className="font-semibold text-on-surface">Jan {tooltip.startYear}</span>
            {' · '}
            <span>{tooltip.years}-year hold ({tooltip.startYear}–{tooltip.startYear + tooltip.years - 1})</span>
            {' · '}
            <span
              className="font-bold"
              style={{ color: tooltip.cagr >= 0 ? '#27624a' : '#b71c1c' }}
            >
              {tooltip.cagr >= 0 ? '+' : ''}{tooltip.cagr.toFixed(2)}% CAGR
            </span>
          </div>
        );
      })()}
    </section>
  );
}
