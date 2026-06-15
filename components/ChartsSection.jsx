'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ChartSkeleton from '@/components/ChartSkeleton';

const GrowthChart = dynamic(() => import('@/components/GrowthChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={300} />,
});
const DrawdownChart = dynamic(() => import('@/components/DrawdownChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
});
const RollingReturnChart = dynamic(() => import('@/components/RollingReturnChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
});

function mergeWithBenchmark(portfolioData, benchmarkData) {
  if (!benchmarkData?.length) return portfolioData;
  const map = new Map(benchmarkData.map((d) => [d.label, d.value]));
  return portfolioData.map((d) => ({ ...d, benchmark: map.get(d.label) ?? null }));
}

// When a benchmark is active, both lines must start at $10,000 in the same year.
// Slices to the benchmark's first available data point and re-indexes the
// portfolio values so both lines start at 10000.
function alignGrowthToCommonStart(mergedData) {
  if (!mergedData?.length) return mergedData;
  const firstIdx = mergedData.findIndex((d) => d.benchmark != null);
  if (firstIdx < 0) return mergedData; // no benchmark data at all
  const slice = mergedData.slice(firstIdx);
  const basePortfolio = slice[0].value;
  const baseBenchmark = slice[0].benchmark;
  if (!basePortfolio || !baseBenchmark) return slice;
  return slice.map((d) => ({
    ...d,
    value:     Math.round((d.value     / basePortfolio) * 10000 * 100) / 100,
    benchmark: d.benchmark != null
      ? Math.round((d.benchmark / baseBenchmark) * 10000 * 100) / 100
      : null,
  }));
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
  section = 'all', // 'all' | 'growth' | 'charts'
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
    ? alignGrowthToCommonStart(mergeWithBenchmark(baseGrowthData, baseBenchmarkGrowthData))
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

  const showGrowth = section === 'all' || section === 'growth';
  const showCharts = section === 'all' || section === 'charts';

  return (
    <>
      {showBenchmarkToggle && (showGrowth || showCharts) && (
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
      {showGrowth && growthData.length > 0 && (
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
          <GrowthChart data={activeGrowthData} logScale={logScale} benchmarkLabel={activeBenchmark?.label} />
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
      {showCharts && drawdownData.length > 0 && (
        <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="mb-6">
            <h2 className="font-manrope text-[22px] font-bold text-primary">Historical Drawdown</h2>
            <p className="font-inter text-[13px] text-on-surface-variant mt-1">
              Percentage decline from the portfolio's peak value at each point in time.
            </p>
          </div>
          <DrawdownChart data={activeDrawdownData} benchmarkLabel={activeBenchmark?.label} />
        </section>
      )}

      {/* Rolling Returns */}
      {showCharts && Object.values(rollingDatasets).some((d) => d.length > 0) && (
        <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="mb-6">
            <h2 className="font-manrope text-[22px] font-bold text-primary">Rolling Returns</h2>
            <p className="font-inter text-[13px] text-on-surface-variant mt-1">
              Annualised return for each rolling period ending on that date.
            </p>
          </div>
          <RollingReturnChart datasets={activeRollingDatasets} benchmarkLabel={activeBenchmark?.label} />
        </section>
      )}
    </>
  );
}
