'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { buildWithdrawalRates } from '@/lib/withdrawalRates';
import { getDefaultWithdrawalRate, getWithdrawalRateSource, getFINumber, runFISimulation } from '@/lib/fiCalculator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWithCommas(val) {
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? '' : num.toLocaleString('en-US');
}

function handleNumberInput(setter) {
  return (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setter(raw);
  };
}

function formatCompact(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function formatFull(v) {
  if (v == null) return '—';
  if (v <= 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function yearsLabel(v) {
  if (v == null) return '50+ years';
  return v === 1 ? '1 year' : `${v} years`;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [
    ['90th pct', d.p90],
    ['75th pct', d.p75],
    ['Median (50th)', d.p50],
    ['25th pct', d.p25],
    ['10th pct', d.p10],
  ];
  return (
    <div className="bg-white border border-outline-variant rounded-lg p-3 shadow-md font-inter text-[13px]">
      <div className="font-semibold text-on-surface mb-2">{d.label}</div>
      {rows.map(([label, val]) => (
        <div key={label} className="flex justify-between gap-6">
          <span className="text-on-surface-variant">{label}</span>
          <span className="font-semibold text-primary">{formatFull(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FinancialIndependenceClient({
  allPortfolioNames,
  initialSlug,
  initialReturns,
  initialPortfolio,
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [monthlyReturns, setMonthlyReturns] = useState(initialReturns);
  const [portfolioStats, setPortfolioStats] = useState(initialPortfolio);
  const [fetching, setFetching] = useState(false);

  const [annualIncome, setAnnualIncome] = useState('80000');
  const [savingsRate, setSavingsRate] = useState('20');
  const [currentSavings, setCurrentSavings] = useState('50000');
  const [annualSpending, setAnnualSpending] = useState('40000');

  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [wrMode, setWrMode] = useState('swr'); // 'swr' | 'pwr'
  const [wrOverride, setWrOverride] = useState(null); // null = use computed default
  const [editingWR, setEditingWR] = useState(false);

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  async function handlePortfolioChange(newSlug) {
    setSlug(newSlug);
    setWrOverride(null);
    setEditingWR(false);
    if (!newSlug) {
      setMonthlyReturns([]);
      setPortfolioStats(null);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(`/api/monte-carlo-returns?slug=${encodeURIComponent(newSlug)}`);
      const data = await res.json();
      setMonthlyReturns(data.returns ?? []);
      setPortfolioStats(data.portfolio ?? null);
    } catch (e) {
      console.error('Failed to fetch portfolio data:', e);
      setMonthlyReturns([]);
      setPortfolioStats(null);
    } finally {
      setFetching(false);
    }
  }

  // Compute withdrawal rate table (deferred to avoid blocking the initial render)
  useEffect(() => {
    setRatesLoading(true);
    setRates(null);
    const t = setTimeout(() => {
      setRates(buildWithdrawalRates(monthlyReturns));
      setRatesLoading(false);
    }, 10);
    return () => clearTimeout(t);
  }, [monthlyReturns]);

  const defaultWR = useMemo(() => (rates ? getDefaultWithdrawalRate(rates, wrMode) : null), [rates, wrMode]);
  const wrSource = useMemo(() => (rates ? getWithdrawalRateSource(rates, wrMode) : null), [rates, wrMode]);
  const effectiveWR = wrOverride != null ? parseFloat(wrOverride) || 0 : defaultWR;

  function handleWrModeChange(mode) {
    setWrMode(mode);
    setWrOverride(null);
    setEditingWR(false);
  }

  const fiNumber = useMemo(() => {
    const spending = parseFloat(annualSpending) || 0;
    return effectiveWR ? getFINumber(spending, effectiveWR) : null;
  }, [annualSpending, effectiveWR]);

  // Auto-run the bootstrap simulation whenever inputs change (debounced)
  useEffect(() => {
    if (!monthlyReturns.length || fiNumber == null || ratesLoading) {
      setResults(null);
      return;
    }
    setRunning(true);
    const t = setTimeout(() => {
      const contribution = ((parseFloat(annualIncome) || 0) * (parseFloat(savingsRate) || 0)) / 100;
      const res = runFISimulation({
        currentSavings: parseFloat(currentSavings) || 0,
        annualContribution: contribution,
        fiNumber,
        monthlyReturns,
      });
      setResults(res);
      setRunning(false);
    }, 250);
    return () => clearTimeout(t);
  }, [monthlyReturns, annualIncome, savingsRate, currentSavings, fiNumber, ratesLoading]);

  const isLoading = fetching || ratesLoading || running;

  const wrModeLabel = wrMode === 'pwr' ? 'perpetual withdrawal rate' : 'safe withdrawal rate';

  const wrSourceLabel =
    wrOverride != null
      ? 'Custom override'
      : wrSource != null
      ? `${wrSource}-year ${wrModeLabel} (real) for this portfolio`
      : 'Default 4% rule (insufficient history for a portfolio-specific rate)';

  return (
    <main className="flex-grow w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-manrope text-[32px] md:text-[42px] font-bold text-primary leading-tight tracking-tight mb-2">
            Financial Independence Calculator
          </h1>
          <p className="font-inter text-[16px] text-on-surface-variant max-w-2xl">
            Estimate how many years it could take to reach financial independence with a given portfolio, savings rate, and spending target — based on 1,000 bootstrap simulations of historical returns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Inputs panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5 lg:sticky lg:top-20">

              {/* Portfolio selector */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Portfolio
                </label>
                <select
                  value={slug}
                  onChange={(e) => handlePortfolioChange(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">— Select a portfolio —</option>
                  {allPortfolioNames.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Annual income */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Annual Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(annualIncome)}
                    onChange={handleNumberInput(setAnnualIncome)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Savings rate */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Savings Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={savingsRate}
                    onChange={(e) => setSavingsRate(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 pr-9 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    %
                  </span>
                </div>
                <p className="font-inter text-[11px] text-on-surface-variant mt-1">
                  {formatFull(((parseFloat(annualIncome) || 0) * (parseFloat(savingsRate) || 0)) / 100)} per year
                </p>
              </div>

              {/* Current savings */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Current Savings
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(currentSavings)}
                    onChange={handleNumberInput(setCurrentSavings)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Annual spending */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Annual Spending in Retirement
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(annualSpending)}
                    onChange={handleNumberInput(setAnnualSpending)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Withdrawal rate (computed, overridable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Withdrawal Rate
                  </label>
                  {!editingWR && (
                    <button
                      onClick={() => setEditingWR(true)}
                      className="flex items-center gap-1 font-inter text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      Edit
                    </button>
                  )}
                </div>

                {/* SWR / PWR toggle */}
                <div className="flex gap-1.5 mb-2">
                  {[
                    { key: 'swr', label: 'SWR' },
                    { key: 'pwr', label: 'PWR' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleWrModeChange(key)}
                      className={`px-3 py-1 rounded-full font-inter text-[11px] font-semibold transition-colors ${
                        wrMode === key
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {editingWR ? (
                  <>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={wrOverride != null ? wrOverride : (effectiveWR != null ? effectiveWR.toFixed(2) : '')}
                        onChange={(e) => setWrOverride(e.target.value)}
                        min="0.1"
                        max="25"
                        step="0.1"
                        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 pr-9 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                        %
                      </span>
                    </div>
                    <button
                      onClick={() => { setWrOverride(null); setEditingWR(false); }}
                      className="font-inter text-[11px] font-semibold text-primary hover:underline mt-1.5"
                    >
                      Reset to default
                    </button>
                  </>
                ) : (
                  <div className="bg-surface-container rounded-lg px-3 py-2.5">
                    <span className="font-inter text-[14px] font-semibold text-on-surface">
                      {effectiveWR != null ? `${effectiveWR.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                )}
                <p className="font-inter text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                  {wrSourceLabel}
                </p>
                <p className="font-inter text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                  {wrMode === 'pwr'
                    ? 'PWR (Perpetual Withdrawal Rate) preserves the starting balance indefinitely, so it’s always lower than SWR — expect a higher FI Number and more years to reach it.'
                    : 'SWR (Safe Withdrawal Rate) allows the balance to be drawn down to zero by the end of the period.'}
                </p>
              </div>

              {/* FI Number (computed, read-only) */}
              <div className="bg-[#f0f7f3] border border-[#27624a]/30 rounded-lg p-4">
                <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Your FI Number
                </div>
                <div className="font-manrope text-[24px] font-bold text-primary leading-none">
                  {formatFull(fiNumber)}
                </div>
                <p className="font-inter text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                  Annual spending ÷ withdrawal rate. The portfolio value at which {formatFull(annualSpending ? parseFloat(annualSpending) : 0)}/yr of spending is considered sustainable.
                </p>
              </div>

            </div>
          </div>

          {/* ── Results panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-8">
            {!slug || !monthlyReturns.length ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] p-12">
                <span className="material-symbols-outlined text-[52px] text-outline mb-4">
                  savings
                </span>
                <h2 className="font-manrope text-[20px] font-bold text-on-surface mb-2">
                  {fetching ? 'Loading portfolio data…' : 'Select a portfolio to get started'}
                </h2>
                <p className="font-inter text-[14px] text-on-surface-variant max-w-sm">
                  Choose a portfolio, set your income, savings rate, current savings, and target spending — your years-to-FI estimate will appear here.
                </p>
              </div>
            ) : results?.alreadyFI ? (
              <div className="bg-[#f0f7f3] border border-[#27624a]/30 rounded-xl shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] p-12">
                <span className="material-symbols-outlined text-[52px] text-primary mb-4">
                  celebration
                </span>
                <h2 className="font-manrope text-[24px] font-bold text-primary mb-2">
                  You&apos;ve already reached financial independence
                </h2>
                <p className="font-inter text-[14px] text-on-surface-variant max-w-md">
                  Your current savings of {formatFull(parseFloat(currentSavings) || 0)} already meet or exceed your FI Number of {formatFull(fiNumber)}, based on a {effectiveWR?.toFixed(2)}% withdrawal rate.
                </p>
              </div>
            ) : !results ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] p-12">
                <span className="material-symbols-outlined text-[52px] text-outline mb-4" style={{ animation: 'spin 1s linear infinite' }}>
                  progress_activity
                </span>
                <h2 className="font-manrope text-[20px] font-bold text-on-surface mb-2">
                  Calculating…
                </h2>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Years to FI headline card */}
                <div className="bg-[#f0f7f3] border border-[#27624a]/30 rounded-xl p-5 shadow-sm">
                  <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                    Years to Financial Independence (Median)
                  </div>
                  <div className="font-manrope text-[40px] font-bold text-primary leading-none">
                    {yearsLabel(results.yearsToFI.p50)}
                  </div>
                  <p className="font-inter text-[12px] text-on-surface-variant mt-2 leading-relaxed">
                    Across 1,000 simulations using {portfolioStats?.name ?? 'this portfolio'}&apos;s historical returns,
                    50% of outcomes reach the FI Number of {formatFull(fiNumber)} within{' '}
                    <strong className="text-on-surface">{yearsLabel(results.yearsToFI.p50)}</strong>.
                    The fastest 10% get there in <strong className="text-on-surface">{yearsLabel(results.yearsToFI.p10)}</strong>;
                    the slowest 10% take <strong className="text-on-surface">{yearsLabel(results.yearsToFI.p90)}</strong> or longer.
                  </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Fastest (10th pct)
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-primary leading-none">
                      {yearsLabel(results.yearsToFI.p10)}
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Median (50th pct)
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-on-surface leading-none">
                      {yearsLabel(results.yearsToFI.p50)}
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Slowest (90th pct)
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-error leading-none">
                      {yearsLabel(results.yearsToFI.p90)}
                    </div>
                  </div>
                </div>

                {/* Percentile chart */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h2 className="font-manrope text-[18px] font-bold text-on-surface">
                        Projected Portfolio Value Over Time
                      </h2>
                      <p className="font-inter text-[12px] text-on-surface-variant mt-0.5">
                        {portfolioStats?.name} · 50-year projection · 1,000 simulations
                      </p>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-1 items-end">
                      {[
                        { color: '#4a8a68', label: '90th percentile', dash: false },
                        { color: '#27624a', label: '75th percentile', dash: false },
                        { color: '#074a34', label: 'Median (50th)',    dash: false, bold: true },
                        { color: '#27624a', label: '25th percentile', dash: true },
                        { color: '#4a8a68', label: '10th percentile', dash: true },
                      ].map(({ color, label, dash, bold }) => (
                        <div key={label} className="flex items-center gap-2">
                          <svg width="20" height="10">
                            <line
                              x1="0" y1="5" x2="20" y2="5"
                              stroke={color}
                              strokeWidth={bold ? 2.5 : 1.5}
                              strokeDasharray={dash ? '4 3' : ''}
                            />
                          </svg>
                          <span className="font-inter text-[11px] text-on-surface-variant">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart
                      data={results.chartData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#bfc9c2"
                        strokeOpacity={0.45}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#707973' }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        scale="log"
                        domain={['auto', 'auto']}
                        allowDataOverflow
                        tickFormatter={formatCompact}
                        tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#707973' }}
                        axisLine={false}
                        tickLine={false}
                        width={62}
                      />
                      <Tooltip content={<CustomTooltip />} />

                      {/* FI Number reference line */}
                      <ReferenceLine
                        y={fiNumber}
                        stroke="#b71c1c"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{ value: 'FI Number', position: 'insideTopRight', fill: '#b71c1c', fontSize: 11, fontFamily: 'Inter' }}
                      />

                      {/* 90th percentile — solid medium green */}
                      <Line type="monotone" dataKey="p90" stroke="#4a8a68" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      {/* 75th percentile — solid darker green */}
                      <Line type="monotone" dataKey="p75" stroke="#27624a" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      {/* Median — bold primary green */}
                      <Line type="monotone" dataKey="p50" stroke="#074a34" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      {/* 25th percentile — dashed darker green */}
                      <Line type="monotone" dataKey="p25" stroke="#27624a" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                      {/* 10th percentile — dashed medium green */}
                      <Line type="monotone" dataKey="p10" stroke="#4a8a68" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Assumptions note */}
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0 mt-0.5">
                      info
                    </span>
                    <p className="font-inter text-[12px] text-on-surface-variant leading-relaxed">
                      <strong className="text-on-surface">Assumptions: </strong>
                      Returns are bootstrapped by randomly resampling full calendar years from {portfolioStats?.name ?? 'this portfolio'}&apos;s actual return history.
                      Contributions of {formatFull(((parseFloat(annualIncome) || 0) * (parseFloat(savingsRate) || 0)) / 100)}/yr are added monthly.
                      All figures are in nominal (today&apos;s) dollars — inflation is not modeled on contributions or the FI Number.
                      No taxes, fees, or other expenses are modeled.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
