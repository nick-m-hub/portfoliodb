'use client';

import Link from 'next/link';

const DURATIONS = [20, 25, 30, 40];

function fmt(v) {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

function RateTable({ rows, columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="text-left font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 pr-6">
              Duration
            </th>
            {columns.map((col) => (
              <th key={col.key} className="text-right font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 px-4">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ years, data }) => (
            <tr key={years} className="border-b border-outline-variant/50 last:border-0">
              <td className="font-inter text-[14px] font-semibold text-on-surface py-3 pr-6">
                {years} years
              </td>
              {data == null ? (
                <td
                  colSpan={columns.length}
                  className="text-right font-inter text-[13px] text-outline py-3 px-4"
                >
                  Insufficient data
                </td>
              ) : (
                columns.map((col) => (
                  <td
                    key={col.key}
                    className={`text-right font-inter text-[14px] font-semibold py-3 px-4 ${col.valueClass}`}
                  >
                    {fmt(data[col.key])}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WithdrawalRatesTable({ rates, slug }) {
  if (!rates) return null;

  const rows = DURATIONS.map((years) => ({ years, data: rates[years] }));
  const hasAny = rows.some((r) => r.data != null);
  if (!hasAny) return null;

  // 4% Rule badge: based on the 30-year real SWR (the classic Bengen benchmark)
  const swr30Real = rates[30]?.swr_real ?? null;
  const passes4PctRule = swr30Real != null && swr30Real >= 4.0;
  const has30yrData = rates[30] != null;

  const swrColumns = [
    { key: 'swr_nominal', label: 'Nominal',          valueClass: 'text-primary' },
    { key: 'swr_real',    label: 'Real (3% infl.)',  valueClass: 'text-primary' },
  ];
  const pwrColumns = [
    { key: 'pwr_nominal', label: 'Nominal',          valueClass: 'text-on-surface' },
    { key: 'pwr_real',    label: 'Real (3% infl.)',  valueClass: 'text-on-surface' },
  ];

  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h2 className="font-manrope text-[22px] font-bold text-primary">
          Withdrawal Rates
        </h2>
        {has30yrData && (
          passes4PctRule ? (
            <span className="flex items-center gap-1 bg-[#f0f7f3] border border-[#27624a]/30 text-primary px-2.5 py-1 rounded-full font-inter text-[11px] font-bold">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              Passes the 4% Rule
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-surface-container-low border border-outline-variant text-on-surface-variant px-2.5 py-1 rounded-full font-inter text-[11px] font-bold">
              Below the 4% Rule at 30 yrs
            </span>
          )
        )}
      </div>
      <p className="font-inter text-[13px] text-on-surface-variant mb-6">
        The highest annual withdrawal rate (as % of starting balance) that succeeded across every
        historical rolling window. 100% success rate — no historical starting point ran out of money.
      </p>

      {/* SWR sub-section */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-inter text-[12px] font-bold text-on-surface uppercase tracking-wider">
            Safe Withdrawal Rate
          </span>
          <span className="font-inter text-[12px] text-on-surface-variant">
            — portfolio value stays above $0
          </span>
        </div>
        <RateTable rows={rows} columns={swrColumns} />
      </div>

      {/* PWR sub-section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-inter text-[12px] font-bold text-on-surface uppercase tracking-wider">
            Perpetual Withdrawal Rate
          </span>
          <span className="font-inter text-[12px] text-on-surface-variant">
            — real purchasing power preserved at end
          </span>
        </div>
        <RateTable rows={rows} columns={pwrColumns} />
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-outline-variant/50 flex flex-wrap items-start justify-between gap-4">
        <p className="font-inter text-[11px] text-on-surface-variant leading-relaxed max-w-lg">
          <strong className="text-on-surface">Nominal</strong> = fixed dollar withdrawals.{' '}
          <strong className="text-on-surface">Real</strong> = withdrawals grow 3%/yr with inflation.
          Based on this portfolio&apos;s full return history using the Bengen rolling-window methodology.
        </p>
        {slug && (
          <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
            <Link
              href={`/tools/financial-independence?slug=${slug}`}
              className="flex items-center gap-1.5 font-inter text-[13px] font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">savings</span>
              Calculate years to FI →
            </Link>
            <Link
              href={`/monte-carlo-simulation?slug=${slug}`}
              className="flex items-center gap-1.5 font-inter text-[13px] font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">monitoring</span>
              Run Monte Carlo →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
