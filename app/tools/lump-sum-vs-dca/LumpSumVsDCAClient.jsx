'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const LumpSumResultsChart = dynamic(() => import('./LumpSumResultsChart'), {
  ssr: false,
  loading: () => <div className="h-[280px] bg-surface-container animate-pulse rounded-xl" />,
});

const DCA_OPTIONS = [3, 6, 12];
const HOLDING_OPTIONS = [5, 10, 20, 30];
const MIN_PERIODS = 24;

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function computeResults(returns, amount, dcaMonths, holdingYears) {
  const T = holdingYears * 12;
  if (!returns || returns.length <= T || amount <= 0) return null;

  const monthlyContrib = amount / dcaMonths;
  const results = [];
  const maxStart = returns.length - T;

  for (let i = 0; i <= maxStart; i++) {
    // Lump sum: full amount at the start of month i, held T months
    let lsValue = amount;
    for (let m = 0; m < T; m++) {
      lsValue *= (1 + returns[i + m].monthly_return / 100);
    }

    // DCA: contribute monthlyContrib at the start of each of the first dcaMonths months
    let dcaValue = 0;
    for (let m = 0; m < dcaMonths; m++) {
      dcaValue += monthlyContrib;
      dcaValue *= (1 + returns[i + m].monthly_return / 100);
    }
    for (let m = dcaMonths; m < T; m++) {
      dcaValue *= (1 + returns[i + m].monthly_return / 100);
    }

    results.push({
      label: returns[i].date.slice(0, 7), // YYYY-MM
      lsValue,
      dcaValue,
      advantage: (lsValue / dcaValue - 1) * 100,
    });
  }

  return results;
}

export default function LumpSumVsDCAClient({
  allPortfolioNames,
  initialSlug,
  initialReturns,
  initialPortfolio,
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [returns, setReturns] = useState(initialReturns);
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [fetching, setFetching] = useState(false);

  const [amount, setAmount] = useState(10000);
  const [amountDisplay, setAmountDisplay] = useState('10,000');
  const [dcaMonths, setDcaMonths] = useState(12);
  const [holdingYears, setHoldingYears] = useState(10);

  async function handleSlugChange(newSlug) {
    if (newSlug === slug) return;
    setSlug(newSlug);
    setFetching(true);
    try {
      const res = await fetch(`/api/monte-carlo-returns?slug=${newSlug}`);
      const json = await res.json();
      setReturns(json.returns ?? []);
      setPortfolio(json.portfolio ?? null);
    } catch {
      setReturns([]);
      setPortfolio(null);
    } finally {
      setFetching(false);
    }
  }

  function handleAmountChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    setAmountDisplay(raw ? new Intl.NumberFormat('en-US').format(num) : '');
    setAmount(num);
  }

  const rawResults = useMemo(
    () => computeResults(returns, amount, dcaMonths, holdingYears),
    [returns, amount, dcaMonths, holdingYears],
  );

  const stats = useMemo(() => {
    if (!rawResults || rawResults.length < MIN_PERIODS) return null;
    const total = rawResults.length;
    const lsWins = rawResults.filter(r => r.advantage > 0).length;
    const advantages = rawResults.map(r => r.advantage);
    const lsValues = rawResults.map(r => r.lsValue);
    const dcaValues = rawResults.map(r => r.dcaValue);
    return {
      winRate: Math.round((lsWins / total) * 100),
      total,
      medAdvantage: median(advantages),
      medLs: median(lsValues),
      medDca: median(dcaValues),
    };
  }, [rawResults]);

  const chartData = useMemo(() => {
    if (!rawResults || rawResults.length < MIN_PERIODS) return [];
    return rawResults.map(r => ({
      label: r.label,
      advantage: parseFloat(r.advantage.toFixed(2)),
    }));
  }, [rawResults]);

  const dataMonths = returns?.length ?? 0;
  const T = holdingYears * 12;
  const hasEnoughData = dataMonths > T;
  const enoughPeriods = rawResults && rawResults.length >= MIN_PERIODS;
  const portfolioName =
    portfolio?.name ?? allPortfolioNames.find(p => p.slug === slug)?.name ?? '';
  const dcaLabel = `${dcaMonths}-Month DCA`;

  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">
            Lump Sum vs. Dollar Cost Averaging
          </h1>
          <p className="font-inter text-sm text-on-surface-variant max-w-2xl">
            Should you invest a lump sum all at once, or spread it out over several months?
            See how both approaches have played out across every historical starting period
            in our database.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Inputs ── */}
          <div className="lg:w-72 flex-shrink-0 space-y-6">

            {/* Portfolio */}
            <div>
              <label className="block font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                Portfolio
              </label>
              <select
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                className="w-full font-inter text-sm border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
              >
                {allPortfolioNames.map(p => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                Total Amount to Invest
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-sm text-on-surface-variant pointer-events-none">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  className="w-full font-inter text-sm border border-outline-variant rounded-lg pl-7 pr-3 py-2.5 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* DCA Period */}
            <div>
              <label className="block font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                DCA Period
              </label>
              <p className="font-inter text-xs text-on-surface-variant mb-2">
                Spread the investment over this many months
              </p>
              <div className="flex gap-2">
                {DCA_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setDcaMonths(n)}
                    className={`flex-1 py-2 rounded-lg font-inter text-sm font-medium border transition-colors ${
                      dcaMonths === n
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {n}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Investment Horizon */}
            <div>
              <label className="block font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                Investment Horizon
              </label>
              <p className="font-inter text-xs text-on-surface-variant mb-2">
                Total time invested for both strategies
              </p>
              <div className="grid grid-cols-4 gap-2">
                {HOLDING_OPTIONS.map(y => (
                  <button
                    key={y}
                    onClick={() => setHoldingYears(y)}
                    className={`py-2 rounded-lg font-inter text-sm font-medium border transition-colors ${
                      holdingYears === y
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
            </div>

            {/* Link to portfolio */}
            {portfolioName && (
              <Link
                href={`/portfolios/${slug}`}
                className="inline-flex items-center gap-1 font-inter text-xs text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                View {portfolioName} detail page
              </Link>
            )}
          </div>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {fetching ? (
              <div className="flex items-center gap-2 py-24 justify-center text-on-surface-variant font-inter text-sm">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                Loading portfolio data…
              </div>
            ) : !hasEnoughData ? (
              <div className="text-center py-24 text-on-surface-variant font-inter text-sm">
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">show_chart</span>
                {dataMonths > 0
                  ? `${portfolioName} has ${Math.floor(dataMonths / 12)} years of data — not enough for a ${holdingYears}-year horizon. Try a shorter investment horizon.`
                  : 'Select a portfolio to see the comparison.'}
              </div>
            ) : !enoughPeriods ? (
              <div className="text-center py-24 text-on-surface-variant font-inter text-sm">
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">show_chart</span>
                Not enough historical starting periods for a meaningful comparison. Try a shorter investment horizon.
              </div>
            ) : stats ? (
              <div className="space-y-5">

                {/* Headline */}
                <div className={`rounded-2xl p-5 border ${
                  stats.winRate >= 50
                    ? 'bg-[#f0f7f3] border-[#71a38b]/40'
                    : 'bg-surface-container-lowest border-outline-variant'
                }`}>
                  <p className="font-manrope font-bold text-4xl text-on-surface mb-1.5">
                    {stats.winRate}%
                    <span className="font-inter text-base font-normal text-on-surface-variant ml-2">
                      of the time
                    </span>
                  </p>
                  <p className="font-inter text-sm text-on-surface-variant leading-relaxed">
                    lump sum investing outperformed {dcaLabel} for{' '}
                    <span className="font-medium text-on-surface">{portfolioName}</span>{' '}
                    over a {holdingYears}-year horizon, across{' '}
                    <span className="font-medium text-on-surface">
                      {stats.total} historical starting periods
                    </span>.
                    {' '}The median outcome: {stats.medAdvantage >= 0
                      ? <>lump sum ended <span className="font-medium text-primary">+{stats.medAdvantage.toFixed(1)}%</span> ahead.</>
                      : <>DCA ended <span className="font-medium text-primary">+{Math.abs(stats.medAdvantage).toFixed(1)}%</span> ahead.</>
                    }
                  </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-0.5 bg-[#074a34] rounded" />
                      <span className="font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        Lump Sum
                      </span>
                    </div>
                    <p className="font-manrope font-bold text-xl text-on-surface">{fmtCurrency(stats.medLs)}</p>
                    <p className="font-inter text-xs text-on-surface-variant mt-0.5">median ending value</p>
                  </div>
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-0 border-t-2 border-dashed border-[#1565c0]" />
                      <span className="font-inter text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                        {dcaLabel}
                      </span>
                    </div>
                    <p className="font-manrope font-bold text-xl text-on-surface">{fmtCurrency(stats.medDca)}</p>
                    <p className="font-inter text-xs text-on-surface-variant mt-0.5">median ending value</p>
                  </div>
                </div>

                {/* Chart */}
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
                  <h2 className="font-manrope font-semibold text-base text-on-surface mb-1">
                    Lump Sum Advantage by Starting Period
                  </h2>
                  <p className="font-inter text-xs text-on-surface-variant mb-4">
                    Green zone = lump sum won. Red zone = DCA won. Each point is a different
                    historical start date, measured over {holdingYears} years.
                  </p>
                  <LumpSumResultsChart data={chartData} />
                </div>

                {/* Disclaimer */}
                <p className="font-inter text-xs text-on-surface-variant">
                  Both strategies invest {fmtCurrency(amount)} total. DCA spreads contributions equally
                  over {dcaMonths} months, investing at the start of each month. Both are measured at
                  the same end date — {holdingYears} years from the first investment.
                  Median values reflect a typical historical starting period. Past performance does
                  not guarantee future results.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
