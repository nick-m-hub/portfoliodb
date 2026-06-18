'use client';

import dynamic from 'next/dynamic';
import ChartSkeleton from '@/components/ChartSkeleton';

const StartDateSensitivityChart = dynamic(
  () => import('@/components/StartDateSensitivityChart'),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> }
);

export default function StartDateSensitivitySection({ data }) {
  if (!data) return null;
  const { luckiest, unluckiest } = data;
  const spread = luckiest.next - unluckiest.next;
  const fmt = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <section id="start-date-sensitivity" className="bg-surface-container-lowest p-4 md:p-8 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-manrope text-[22px] font-bold text-primary">Start Date Sensitivity</h2>
          <p className="font-inter text-[13px] text-on-surface-variant mt-1">
            10-year annualized return depending on when you started investing. Nominal returns.
          </p>
        </div>
        <div className="grid grid-cols-3 w-full gap-2 md:flex md:w-auto md:gap-6 md:shrink-0">
          <div className="text-right">
            <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Luckiest Start</span>
            <span className="font-manrope text-[20px] font-bold text-[#27624a]">{fmt(luckiest.next)}</span>
          </div>
          <div className="text-right">
            <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Unluckiest Start</span>
            <span className={`font-manrope text-[20px] font-bold ${unluckiest.next < 0 ? 'text-error' : 'text-on-surface'}`}>
              {fmt(unluckiest.next)}
            </span>
          </div>
          <div className="text-right">
            <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Spread</span>
            <span className="font-manrope text-[20px] font-bold text-on-surface">{spread.toFixed(1)}pp</span>
          </div>
        </div>
      </div>
      <div className="flex gap-6 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-[2px] bg-[#27624a] rounded" />
          <span className="font-inter text-[12px] text-on-surface-variant">Next 10 Yrs CAGR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-[2px] bg-[#b71c1c] rounded" />
          <span className="font-inter text-[12px] text-on-surface-variant">Prev 10 Yrs CAGR</span>
        </div>
      </div>
      <StartDateSensitivityChart data={data} />
    </section>
  );
}
