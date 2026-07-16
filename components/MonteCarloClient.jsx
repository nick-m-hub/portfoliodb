'use client';

import { useState } from 'react';
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

import { buildBlendedReturns } from '@/lib/portfolioStats';

// ── Constants ─────────────────────────────────────────────────────────────────

const INFLATION_MONTHLY = Math.pow(1.03, 1 / 12) - 1;
const N_SIMS = 1000;
const N_SIMS_SWR = 300; // reduced sim count for binary search speed

const FREQ_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const METHOD_OPTIONS = [
  { value: 'historical', label: 'Historical' },
  { value: 'statistical', label: 'Statistical' },
];

const SEQUENCE_OPTIONS = [
  { value: 0, label: 'None (random order)' },
  { value: 1, label: 'Worst 1 year first' },
  { value: 2, label: 'Worst 2 years first' },
  { value: 3, label: 'Worst 3 years first' },
  { value: 4, label: 'Worst 4 years first' },
  { value: 5, label: 'Worst 5 years first' },
  { value: 6, label: 'Worst 6 years first' },
  { value: 7, label: 'Worst 7 years first' },
  { value: 8, label: 'Worst 8 years first' },
  { value: 9, label: 'Worst 9 years first' },
  { value: 10, label: 'Worst 10 years first' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function boxMuller(mu, sigma) {
  // CR-16: Math.random() can return exactly 0 → Math.log(0) = -Infinity.
  // 1 - Math.random() is in (0, 1], which keeps log() finite.
  const u1 = 1 - Math.random();
  const u2 = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function getPercentile(sortedArr, p) {
  const idx = Math.max(0, Math.min(sortedArr.length - 1, Math.floor(sortedArr.length * p)));
  return sortedArr[idx];
}

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
  if (v <= 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

// ── Simulation ────────────────────────────────────────────────────────────────

function runMonteCarlo({
  initialValue,
  withdrawalAmount,
  withdrawalFrequency,
  adjustForInflation,
  years,
  returnMethod,
  sequenceRiskYears,
  monthlyReturns,
  contributionAmount = 0,
  contributionEndYear = 0,  // 0 = full period
  withdrawalDelay = 0,       // years to wait before withdrawals begin
  nSims = N_SIMS,
}) {
  const totalMonths = years * 12;
  const allRates = monthlyReturns.map((r) => r.monthly_return);

  // Group returns by calendar year and sort worst-to-best
  const yearMap = {};
  for (const row of monthlyReturns) {
    const yr = row.date.slice(0, 4);
    if (!yearMap[yr]) yearMap[yr] = [];
    yearMap[yr].push(row.monthly_return);
  }
  const yearBlocks = Object.values(yearMap)
    .map((months) => ({
      months,
      annual: months.reduce((acc, r) => acc * (1 + r / 100), 1) - 1,
    }))
    .sort((a, b) => a.annual - b.annual);

  const worstBlocks = yearBlocks.slice(0, sequenceRiskYears);
  // Keep the full history (including the worst years) in the resampling pool so
  // the random remainder still carries full tail risk. The worst years are only
  // *additionally* forced to the front via worstBlocks — they are not removed
  // from the random draws.
  const bootstrapPool = yearBlocks;

  // Statistical params (mean/std of monthly returns)
  // CR-3: sample variance (/ n−1), matching lib/portfolioStats.js and the
  // portfolio_stats SQL view (Postgres stddev is sample stddev).
  const mean = allRates.reduce((a, b) => a + b, 0) / allRates.length;
  const variance =
    allRates.length > 1
      ? allRates.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (allRates.length - 1)
      : 0;
  const std = Math.sqrt(variance);

  function buildSequence() {
    const seq = [];

    // Prepend worst N calendar years (up to totalMonths)
    for (const yr of worstBlocks) {
      if (seq.length >= totalMonths) break;
      const toAdd = yr.months.slice(0, totalMonths - seq.length);
      seq.push(...toAdd);
    }

    const rem = totalMonths - seq.length;

    if (returnMethod === 'historical') {
      let added = 0;
      while (added < rem) {
        const yr = bootstrapPool[Math.floor(Math.random() * bootstrapPool.length)];
        for (const r of yr.months) {
          if (added >= rem) break;
          seq.push(r);
          added++;
        }
      }
    } else {
      for (let i = 0; i < rem; i++) {
        seq.push(boxMuller(mean, std));
      }
    }

    return seq;
  }

  const allSims = [];

  for (let s = 0; s < nSims; s++) {
    const returns = buildSequence();
    let value = initialValue;
    let withdrawal = withdrawalAmount;
    const yVals = [Math.round(value)]; // year 0

    for (let m = 0; m < totalMonths; m++) {
      value *= 1 + returns[m] / 100;

      const currentYear = Math.floor(m / 12) + 1;

      // Withdrawals: only after the delay period
      if (currentYear > withdrawalDelay) {
        const isWDMonth =
          withdrawalFrequency === 'monthly' ||
          (withdrawalFrequency === 'quarterly' && (m + 1) % 3 === 0) ||
          (withdrawalFrequency === 'annually' && (m + 1) % 12 === 0);
        if (isWDMonth && withdrawal > 0) {
          value = Math.max(0, value - withdrawal);
        }
      }

      // Contributions: only within the contribution duration (0 = full period)
      if (contributionAmount > 0 && (!contributionEndYear || currentYear <= contributionEndYear)) {
        value += contributionAmount;
      }

      // Inflation grows the withdrawal amount every month (even during delay)
      if (adjustForInflation) {
        withdrawal *= 1 + INFLATION_MONTHLY;
      }

      if ((m + 1) % 12 === 0) {
        yVals.push(Math.round(value));
      }
    }

    allSims.push(yVals);
  }

  // Compute percentile fan chart data
  const chartData = [];
  for (let yr = 0; yr <= years; yr++) {
    const vals = allSims.map((s) => s[yr]).sort((a, b) => a - b);
    const p10 = getPercentile(vals, 0.1);
    const p25 = getPercentile(vals, 0.25);
    const p50 = getPercentile(vals, 0.5);
    const p75 = getPercentile(vals, 0.75);
    const p90 = getPercentile(vals, 0.9);

    chartData.push({
      label: yr === 0 ? 'Start' : `Yr ${yr}`,
      p10,
      p25,
      p50,
      p75,
      p90,
    });
  }

  const finals = allSims.map((s) => s[s.length - 1]).sort((a, b) => a - b);
  const successRate = (finals.filter((v) => v > 0).length / nSims) * 100;

  return {
    chartData,
    successRate,
    medianFinal: getPercentile(finals, 0.5),
    p10Final: getPercentile(finals, 0.1),
    p90Final: getPercentile(finals, 0.9),
  };
}

// ── Safe Withdrawal Rate ──────────────────────────────────────────────────────

function computeSWR({ initialValue, adjustForInflation, years, returnMethod, sequenceRiskYears, monthlyReturns, contributionAmount, contributionEndYear, withdrawalDelay }) {
  if (!initialValue || initialValue <= 0 || !monthlyReturns?.length) return null;

  // Binary search: find monthly withdrawal where success rate ≈ 90%
  let lo = 0;
  let hi = (initialValue * 0.25) / 12; // 25% annual is the upper bound

  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const { successRate } = runMonteCarlo({
      initialValue,
      withdrawalAmount: mid,
      // SWR is expressed as an annual rate withdrawn monthly — frequency is
      // normalized here, but delay and contribution duration are respected so
      // the card matches the rest of the configured simulation.
      withdrawalFrequency: 'monthly',
      adjustForInflation,
      years,
      returnMethod,
      sequenceRiskYears,
      monthlyReturns,
      contributionAmount,
      contributionEndYear,
      withdrawalDelay,
      nSims: N_SIMS_SWR,
    });
    if (successRate >= 90) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const monthlyWD = (lo + hi) / 2;
  return ((monthlyWD * 12) / initialValue) * 100; // annual %
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

// ── Pill Group ────────────────────────────────────────────────────────────────

function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg border border-outline-variant overflow-hidden">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 text-[13px] font-inter font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary text-on-primary'
              : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MonteCarloClient({
  allPortfolioNames,
  savedMixes = [],
  initialSlug,
  initialReturns,
  initialPortfolio,
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [monthlyReturns, setMonthlyReturns] = useState(initialReturns);
  const [portfolioStats, setPortfolioStats] = useState(initialPortfolio);
  const [fetching, setFetching] = useState(false);

  const [initialValue, setInitialValue] = useState('500000');
  const [withdrawalAmount, setWithdrawalAmount] = useState('2000');
  const [contributionAmount, setContributionAmount] = useState('0');
  const [contributionEndYear, setContributionEndYear] = useState('');
  const [withdrawalDelay, setWithdrawalDelay] = useState('');
  const [withdrawalFrequency, setWithdrawalFrequency] = useState('monthly');
  const [adjustForInflation, setAdjustForInflation] = useState(true);
  const [years, setYears] = useState('30');
  const [returnMethod, setReturnMethod] = useState('historical');
  const [sequenceRiskYears, setSequenceRiskYears] = useState(0);

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  async function handlePortfolioChange(newSlug) {
    setSlug(newSlug);
    setResults(null);
    if (!newSlug) {
      setMonthlyReturns([]);
      setPortfolioStats(null);
      return;
    }
    setFetching(true);
    try {
      if (newSlug.startsWith('mix:')) {
        const mixId = newSlug.slice(4);
        const mix = savedMixes.find((m) => m.id === mixId);
        if (!mix) throw new Error('Mix not found');
        const slugs = mix.selections.map((s) => s.slug).join(',');
        const res = await fetch(`/api/builder-returns?slugs=${encodeURIComponent(slugs)}`);
        const data = await res.json();
        const blended = buildBlendedReturns(data, mix.selections);
        setMonthlyReturns(blended);
        setPortfolioStats({ name: mix.name || 'Custom Mix' });
      } else {
        const res = await fetch(`/api/monte-carlo-returns?slug=${encodeURIComponent(newSlug)}`);
        const data = await res.json();
        setMonthlyReturns(data.returns ?? []);
        setPortfolioStats(data.portfolio ?? null);
      }
    } catch (e) {
      console.error('Failed to fetch portfolio data:', e);
      setMonthlyReturns([]);
      setPortfolioStats(null);
    } finally {
      setFetching(false);
    }
  }

  function handleRun() {
    if (!monthlyReturns.length) return;
    const yearsInt = Math.max(1, Math.min(50, parseInt(years) || 30));
    setRunning(true);
    // Defer to let React render the loading state
    setTimeout(() => {
      const initVal = parseFloat(initialValue) || 0;
      const contribution = parseFloat(contributionAmount) || 0;
      const simParams = {
        initialValue: initVal,
        withdrawalAmount: parseFloat(withdrawalAmount) || 0,
        withdrawalFrequency,
        adjustForInflation,
        years: yearsInt,
        returnMethod,
        sequenceRiskYears: Number(sequenceRiskYears),
        monthlyReturns,
        contributionAmount: contribution,
        contributionEndYear: parseInt(contributionEndYear) || 0,
        withdrawalDelay: parseInt(withdrawalDelay) || 0,
      };
      const res = runMonteCarlo(simParams);
      const swrAnnual = computeSWR({ ...simParams, initialValue: initVal });
      setResults({ ...res, swrAnnual });
      setRunning(false);
    }, 10);
  }

  const canRun = monthlyReturns.length > 0 && !fetching && !running;
  const yearsInt = Math.max(1, Math.min(50, parseInt(years) || 30));
  const histYears = monthlyReturns.length > 0 ? Math.round(monthlyReturns.length / 12) : null;
  const tickInterval = yearsInt <= 15 ? 1 : yearsInt <= 30 ? 4 : 9;

  const successColor =
    results?.successRate >= 90
      ? 'text-primary'
      : results?.successRate >= 70
      ? 'text-[#b45309]'
      : 'text-error';

  return (
    <main className="flex-grow w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-manrope text-[32px] md:text-[42px] font-bold text-primary leading-tight tracking-tight mb-2">
            Monte Carlo Simulation
          </h1>
          <p className="font-inter text-[16px] text-on-surface-variant max-w-2xl">
            Project portfolio longevity across 1,000 simulated market scenarios. Test withdrawal sustainability and sequence of returns risk.
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
                  {savedMixes.length > 0 && (
                    <optgroup label="Custom Mixes">
                      {savedMixes.map((mix) => (
                        <option key={`mix:${mix.id}`} value={`mix:${mix.id}`}>
                          {mix.name || 'Untitled Mix'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {savedMixes.length > 0 ? (
                    <optgroup label="All Portfolios">
                      {allPortfolioNames.map((p) => (
                        <option key={p.slug} value={p.slug}>{p.name}</option>
                      ))}
                    </optgroup>
                  ) : (
                    allPortfolioNames.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))
                  )}
                </select>
                {histYears && (
                  <p className="font-inter text-[11px] text-on-surface-variant mt-1">
                    {histYears} years of historical data available
                  </p>
                )}
              </div>

              {/* Initial value */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Initial Portfolio Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(initialValue)}
                    onChange={handleNumberInput(setInitialValue)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Withdrawal amount */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(withdrawalAmount)}
                    onChange={handleNumberInput(setWithdrawalAmount)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Monthly contribution */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Monthly Contribution{' '}
                  <span className="font-normal normal-case tracking-normal text-outline">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(contributionAmount)}
                    onChange={handleNumberInput(setContributionAmount)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg pl-6 pr-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Contribution duration */}
              {(parseFloat(contributionAmount) || 0) > 0 && (
                <div>
                  <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Contribution Duration{' '}
                    <span className="font-normal normal-case tracking-normal text-outline">(blank = full period)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={contributionEndYear}
                      onChange={(e) => setContributionEndYear(e.target.value)}
                      min="1"
                      max="50"
                      placeholder="—"
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 pr-14 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                      years
                    </span>
                  </div>
                </div>
              )}

              {/* Withdrawal frequency */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Withdrawal Frequency
                </label>
                <PillGroup
                  options={FREQ_OPTIONS}
                  value={withdrawalFrequency}
                  onChange={setWithdrawalFrequency}
                />
              </div>

              {/* Withdrawal delay */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Delay Withdrawals{' '}
                  <span className="font-normal normal-case tracking-normal text-outline">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawalDelay}
                    onChange={(e) => setWithdrawalDelay(e.target.value)}
                    min="0"
                    max="49"
                    placeholder="0"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 pr-14 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    years
                  </span>
                </div>
                {(parseInt(withdrawalDelay) || 0) > 0 && (
                  <p className="font-inter text-[11px] text-on-surface-variant mt-1">
                    Withdrawals begin in year {(parseInt(withdrawalDelay) || 0) + 1}.
                  </p>
                )}
              </div>

              {/* Inflation */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Inflation-Adjust Withdrawals{' '}
                  <span className="font-normal normal-case tracking-normal text-outline">(3% / yr)</span>
                </label>
                <PillGroup
                  options={[
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No' },
                  ]}
                  value={adjustForInflation}
                  onChange={(v) => setAdjustForInflation(v)}
                />
              </div>

              {/* Simulation period */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Simulation Period
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    min="1"
                    max="50"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 pr-14 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-on-surface-variant">
                    years
                  </span>
                </div>
              </div>

              {/* Return method */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Return Method
                </label>
                <PillGroup
                  options={METHOD_OPTIONS}
                  value={returnMethod}
                  onChange={setReturnMethod}
                />
                <p className="font-inter text-[11px] text-on-surface-variant mt-1.5">
                  {returnMethod === 'historical'
                    ? 'Resamples full calendar years from the actual return history (bootstrap).'
                    : 'Draws random returns from a normal distribution fitted to the historical mean and standard deviation.'}
                </p>
              </div>

              {/* Sequence of returns risk */}
              <div>
                <label className="block font-inter text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Sequence of Returns Risk
                </label>
                <select
                  value={sequenceRiskYears}
                  onChange={(e) => setSequenceRiskYears(Number(e.target.value))}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 font-inter text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  {SEQUENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {sequenceRiskYears > 0 && (
                  <p className="font-inter text-[11px] text-on-surface-variant mt-1.5">
                    Forces the {sequenceRiskYears} worst historical year
                    {sequenceRiskYears > 1 ? 's' : ''} to occur at the start of every simulation.
                  </p>
                )}
              </div>

              {/* Run button */}
              <button
                onClick={handleRun}
                disabled={!canRun}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-full font-inter text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running || fetching ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]" style={{ animation: 'spin 1s linear infinite' }}>
                      progress_activity
                    </span>
                    {running ? 'Running…' : 'Loading data…'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Run Simulation
                  </>
                )}
              </button>

              {!slug && (
                <p className="font-inter text-[12px] text-on-surface-variant text-center">
                  Select a portfolio above to get started.
                </p>
              )}
            </div>
          </div>

          {/* ── Results panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-8">
            {!results ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col items-center justify-center text-center min-h-[480px] p-12">
                <span className="material-symbols-outlined text-[52px] text-outline mb-4">
                  monitoring
                </span>
                <h2 className="font-manrope text-[20px] font-bold text-on-surface mb-2">
                  Your simulation results will appear here
                </h2>
                <p className="font-inter text-[14px] text-on-surface-variant max-w-sm">
                  Select a portfolio, configure your withdrawal parameters, and click{' '}
                  <strong>Run Simulation</strong> to see 1,000 projected outcomes as a percentile fan chart.
                </p>
              </div>
            ) : (
              <div className="space-y-5">

                {/* SWR highlight card */}
                {results.swrAnnual != null && (
                  <div className="bg-[#f0f7f3] border border-[#27624a]/30 rounded-xl p-4 shadow-sm flex items-center gap-5">
                    <div className="flex-shrink-0">
                      <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Safe Withdrawal Rate
                      </div>
                      <div className="font-manrope text-[36px] font-bold text-primary leading-none">
                        {results.swrAnnual.toFixed(1)}%
                        <span className="font-inter text-[14px] font-semibold text-on-surface-variant ml-1">/yr</span>
                      </div>
                    </div>
                    <p className="font-inter text-[12px] text-on-surface-variant leading-relaxed">
                      The highest annual withdrawal rate at which this portfolio survives in 90% of simulated scenarios over {yearsInt} years.
                    </p>
                  </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Success Rate
                    </div>
                    <div className={`font-manrope text-[28px] font-bold leading-none ${successColor}`}>
                      {results.successRate.toFixed(1)}%
                    </div>
                    <div className="font-inter text-[11px] text-on-surface-variant mt-1">
                      portfolio survives
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      Median Ending Balance
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-on-surface leading-none">
                      {formatFull(results.medianFinal)}
                    </div>
                    <div className="font-inter text-[11px] text-on-surface-variant mt-1">
                      at year {yearsInt}
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      90th Percentile
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-primary leading-none">
                      {formatFull(results.p90Final)}
                    </div>
                    <div className="font-inter text-[11px] text-on-surface-variant mt-1">
                      best-case scenario
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                    <div className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      10th Percentile
                    </div>
                    <div className="font-manrope text-[22px] font-bold text-error leading-none">
                      {formatFull(results.p10Final)}
                    </div>
                    <div className="font-inter text-[11px] text-on-surface-variant mt-1">
                      worst-case scenario
                    </div>
                  </div>
                </div>

                {/* Fan chart */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h2 className="font-manrope text-[18px] font-bold text-on-surface">
                        Portfolio Value Over Time
                      </h2>
                      <p className="font-inter text-[12px] text-on-surface-variant mt-0.5">
                        {portfolioStats?.name} · {yearsInt}-year projection · {N_SIMS.toLocaleString()} simulations
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
                        interval={tickInterval}
                      />
                      <YAxis
                        tickFormatter={formatCompact}
                        tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#707973' }}
                        axisLine={false}
                        tickLine={false}
                        width={62}
                      />
                      <Tooltip content={<CustomTooltip />} />

                      {/* Initial value reference line */}
                      <ReferenceLine
                        y={parseFloat(initialValue) || 0}
                        stroke="#bfc9c2"
                        strokeDasharray="5 3"
                        strokeWidth={1}
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
                      {returnMethod === 'historical'
                        ? `Returns are bootstrapped by randomly resampling full calendar years from ${portfolioStats?.name ?? 'this portfolio'}'s actual return history.`
                        : `Returns are randomly drawn from a normal distribution fitted to ${portfolioStats?.name ?? 'this portfolio'}'s historical mean and standard deviation.`}
                      {adjustForInflation && ' Withdrawals increase by 3% per year to account for inflation.'}
                      {sequenceRiskYears > 0 &&
                        ` The ${sequenceRiskYears} worst historical year${sequenceRiskYears > 1 ? 's' : ''} are forced to the start of every simulation to stress-test early retirement risk.`}
                      {(parseFloat(contributionAmount) || 0) > 0 && ` Monthly contributions of ${formatFull(parseFloat(contributionAmount))} are added${(parseInt(contributionEndYear) || 0) > 0 ? ` for the first ${contributionEndYear} years` : ' for the full period'}.`}
                      {(parseInt(withdrawalDelay) || 0) > 0 && ` Withdrawals begin in year ${(parseInt(withdrawalDelay) || 0) + 1}.`}
                      {(parseFloat(contributionAmount) || 0) === 0 && ' No taxes, transaction costs, or contributions are modeled.'}
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
