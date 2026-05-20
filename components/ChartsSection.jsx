'use client';

import { useState } from 'react';
import GrowthChart from '@/components/GrowthChart';
import DrawdownChart from '@/components/DrawdownChart';
import RollingReturnChart from '@/components/RollingReturnChart';

function mergeWithBenchmark(portfolioData, benchmarkData) {
  if (!benchmarkData?.length) return portfolioData;
  const map = new Map(benchmarkData.map((d) => [d.label, d.value]));
  return portfolioData.map((d) => ({ ...d, benchmark: map.get(d.label) ?? null }));
}

export default function ChartsSection({
  slug,
  portfolioName,
  sharpeRatio,
  bestYear,
  worstYear,
  growthData,
  growthData10yr,
  drawdownData,
  rollingDatasets,
  benchmarks,
}) {
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [show10yr, setShow10yr] = useState(false);
  const [logScale, setLogScale] = useState(true);

  // Filter out this page's own slug so a portfolio never compares to itself
  const availableBenchmarks = Object.entries(benchmarks || {}).filter(([s]) => s !== slug);
  const showBenchmarkToggle = availableBenchmarks.length > 0;
  const showTimelineToggle = growthData10yr?.length > 0;

  const activeBenchmark = selectedBenchmark ? benchmarks?.[selectedBenchmark] : null;

  const baseGrowthData = show10yr ? growthData10yr : growthData;
  const baseBenchmarkGrowthData = show10yr ? activeBenchmark?.growthData10yr : activeBenchmark?.growthData;

  const activeGrowthData = activeBenchmark
    ? mergeWithBenchmark(baseGrowthData, baseBenchmarkGrowthData)
    : baseGrowthData;

  const activeDrawdownData = activeBenchmark
    ? mergeWithBenchmark(drawdownData, activeBenchmark.drawdownData)
    : drawdownData;

  const activeRollingDatasets = activeBenchmark
    ? Object.fromEntries(
        Object.entries(rollingDatasets).map(([key, data]) => [
          key,
          mergeWithBenchmark(data, activeBenchmark.rollingDatasets?.[key]),
        ])
      )
    : rollingDatasets;

  const finalValue = show10yr && growthData10yr?.length > 0
    ? growthData10yr[growthData10yr.length - 1].value
    : growthData.length > 0 ? growthData[growthData.length - 1].value : null;

  return (
    <>
      {showBenchmarkToggle && (
        <div className="flex items-center gap-3">
          <span className="font-inter text-[13px] text-on-surface-variant">Compare to:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBenchmark(null)}
              className={`px-4 py-1.5 rounded-full font-inter text-[12px] font-semibold transition-colors ${
                selectedBenchmark === null
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              None
            </button>
            {availableBenchmarks.map(([s, b]) => (
              <button
                key={s}
                onClick={() => setSelectedBenchmark(s)}
                className={`px-4 py-1.5 rounded-full font-inter text-[12px] font-semibold transition-colors ${
                  selectedBenchmark === s
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Growth of $10,000 */}
      {growthData.length > 0 && (
        <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-manrope text-[22px] font-bold text-primary">Growth of $10,000</h2>
              <div className="flex gap-3 mt-2">
                {showTimelineToggle && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShow10yr(false)}
                      className={`px-3 py-1 rounded-full font-inter text-[11px] font-semibold transition-colors ${
                        !show10yr
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      Full
                    </button>
                    <button
                      onClick={() => setShow10yr(true)}
                      className={`px-3 py-1 rounded-full font-inter text-[11px] font-semibold transition-colors ${
                        show10yr
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      Last 10Y
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogScale(true)}
                    className={`px-3 py-1 rounded-full font-inter text-[11px] font-semibold transition-colors ${
                      logScale
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    Log
                  </button>
                  <button
                    onClick={() => setLogScale(false)}
                    className={`px-3 py-1 rounded-full font-inter text-[11px] font-semibold transition-colors ${
                      !logScale
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    Linear
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-primary rounded" />
                <span className="font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {portfolioName}
                </span>
              </div>
              {activeBenchmark && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 rounded" style={{ backgroundColor: '#bfc9c2' }} />
                  <span className="font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {activeBenchmark.label}
                  </span>
                </div>
              )}
            </div>
          </div>
          <GrowthChart data={activeGrowthData} logScale={logScale} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-4 border-t border-outline-variant">
            <div>
              <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Sharpe Ratio</span>
              <span className="font-manrope font-bold text-[20px] text-on-surface">
                {sharpeRatio != null ? sharpeRatio.toFixed(2) : '—'}
              </span>
            </div>
            <div>
              <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Best Year</span>
              <span className="font-manrope font-bold text-[20px] text-primary">
                {bestYear != null ? `+${bestYear.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Worst Year</span>
              <span className="font-manrope font-bold text-[20px] text-error">
                {worstYear != null ? `${worstYear.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Final Value</span>
              <span className="font-manrope font-bold text-[20px] text-on-surface">
                {finalValue != null ? `$${Math.round(finalValue).toLocaleString()}` : '—'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Historical Drawdown */}
      {drawdownData.length > 0 && (
        <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="mb-6">
            <h2 className="font-manrope text-[22px] font-bold text-primary">Historical Drawdown</h2>
            <p className="font-inter text-[13px] text-on-surface-variant mt-1">
              Percentage decline from the portfolio's peak value at each point in time.
            </p>
          </div>
          <DrawdownChart data={activeDrawdownData} />
        </section>
      )}

      {/* Rolling Returns */}
      {Object.values(rollingDatasets).some((d) => d.length > 0) && (
        <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="mb-6">
            <h2 className="font-manrope text-[22px] font-bold text-primary">Rolling Returns</h2>
            <p className="font-inter text-[13px] text-on-surface-variant mt-1">
              Annualised return for each rolling period ending on that date.
            </p>
          </div>
          <RollingReturnChart datasets={activeRollingDatasets} />
        </section>
      )}
    </>
  );
}
