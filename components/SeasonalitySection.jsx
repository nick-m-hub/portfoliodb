'use client';

import dynamic from 'next/dynamic';
import ChartSkeleton from '@/components/ChartSkeleton';

const SeasonalityChart = dynamic(() => import('@/components/SeasonalityChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export default function SeasonalitySection({ data }) {
  if (!data?.length) return null;
  return (
    <section id="seasonality" className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="mb-6">
        <h2 className="font-manrope text-[22px] font-bold text-primary">Seasonality</h2>
        <p className="font-inter text-[13px] text-on-surface-variant mt-1">
          Average return for each calendar month across the full backtest history.
        </p>
      </div>
      <SeasonalityChart data={data} />
      <div className="grid grid-cols-6 md:grid-cols-12 gap-2 mt-6 pt-4 border-t border-outline-variant">
        {data.map((d) => (
          <div key={d.month} className="text-center">
            <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{d.month}</span>
            <span className={`font-manrope text-[13px] font-bold ${d.avg == null ? 'text-on-surface-variant' : d.avg >= 0 ? 'text-primary' : 'text-error'}`}>
              {d.avg == null ? '—' : `${d.avg >= 0 ? '+' : ''}${d.avg.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
