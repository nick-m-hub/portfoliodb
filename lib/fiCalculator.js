// Financial Independence Calculator — bootstrap simulation engine.
// Self-contained, simplified copy of the Monte Carlo bootstrap approach (ADR 0001):
// accumulation-only (no withdrawals/contributions-end/sequence-risk/statistical mode),
// fixed 50-year cap, nominal terms only (v1).

const N_SIMS = 1000;
const MAX_YEARS = 50;
const WR_FALLBACK = 4.0; // hardcoded floor when no SWR duration is available
const WR_CASCADE = [30, 25, 20];

// Cascade: 30yr -> 25yr -> 20yr real SWR (or PWR), else hardcoded 4%.
export function getDefaultWithdrawalRate(rates, mode = 'swr') {
  const key = mode === 'pwr' ? 'pwr_real' : 'swr_real';
  for (const years of WR_CASCADE) {
    if (rates?.[years]?.[key] != null) return rates[years][key];
  }
  return WR_FALLBACK;
}

// Returns which duration (30/25/20) the default came from, or null if the
// hardcoded 4% fallback was used.
export function getWithdrawalRateSource(rates, mode = 'swr') {
  const key = mode === 'pwr' ? 'pwr_real' : 'swr_real';
  for (const years of WR_CASCADE) {
    if (rates?.[years]?.[key] != null) return years;
  }
  return null;
}

export function getFINumber(annualSpending, withdrawalRatePct) {
  if (!withdrawalRatePct || withdrawalRatePct <= 0) return null;
  return annualSpending / (withdrawalRatePct / 100);
}

function getPercentile(sortedArr, p) {
  const idx = Math.max(0, Math.min(sortedArr.length - 1, Math.floor(sortedArr.length * p)));
  return sortedArr[idx];
}

// Resamples full calendar years from monthlyReturns (same approach as Monte Carlo's
// historical bootstrap), grows currentSavings by annualContribution/12 each month.
function buildSequence(yearBlocks, totalMonths) {
  const seq = [];
  let added = 0;
  while (added < totalMonths) {
    const yr = yearBlocks[Math.floor(Math.random() * yearBlocks.length)];
    for (const r of yr.months) {
      if (added >= totalMonths) break;
      seq.push(r);
      added++;
    }
  }
  return seq;
}

// Returns { chartData, yearsToFI: { p10, p50, p90 } | null, alreadyFI: boolean }
// chartData: [{ label, p10, p25, p50, p75, p90 }] for years 0..MAX_YEARS
export function runFISimulation({ currentSavings, annualContribution, fiNumber, monthlyReturns }) {
  if (fiNumber != null && currentSavings >= fiNumber) {
    return { chartData: [], yearsToFI: null, alreadyFI: true };
  }

  const yearMap = {};
  for (const row of monthlyReturns) {
    const yr = row.date.slice(0, 4);
    if (!yearMap[yr]) yearMap[yr] = [];
    yearMap[yr].push(row.monthly_return);
  }
  const yearBlocks = Object.values(yearMap).map((months) => ({ months }));

  const totalMonths = MAX_YEARS * 12;
  const monthlyContribution = annualContribution / 12;

  const allSims = [];
  const crossingYears = [];

  for (let s = 0; s < N_SIMS; s++) {
    const returns = buildSequence(yearBlocks, totalMonths);
    let value = currentSavings;
    // Clamp chart-only values to a $1 floor — keeps the log-scale Y axis valid
    // when currentSavings is 0; doesn't affect the crossing-year calc below.
    const yVals = [Math.max(1, Math.round(value))];
    let crossedAt = null;

    for (let m = 0; m < totalMonths; m++) {
      value *= 1 + returns[m] / 100;
      value += monthlyContribution;

      if (crossedAt == null && fiNumber != null && value >= fiNumber) {
        crossedAt = Math.floor(m / 12) + 1; // whole year, rounded up to crossing year
      }

      if ((m + 1) % 12 === 0) {
        yVals.push(Math.max(1, Math.round(value)));
      }
    }

    allSims.push(yVals);
    crossingYears.push(crossedAt); // null = not reached within MAX_YEARS
  }

  const chartData = [];
  for (let yr = 0; yr <= MAX_YEARS; yr++) {
    const vals = allSims.map((sim) => sim[yr]).sort((a, b) => a - b);
    chartData.push({
      label: yr === 0 ? 'Start' : `Yr ${yr}`,
      p10: getPercentile(vals, 0.1),
      p25: getPercentile(vals, 0.25),
      p50: getPercentile(vals, 0.5),
      p75: getPercentile(vals, 0.75),
      p90: getPercentile(vals, 0.9),
    });
  }

  // Sort with "not reached" (null) treated as worse than any finite year (MAX_YEARS + 1)
  // so percentiles of a slow/never-reaching distribution still make sense.
  const sortedYears = crossingYears
    .map((y) => (y == null ? MAX_YEARS + 1 : y))
    .sort((a, b) => a - b);

  const toLabel = (v) => (v > MAX_YEARS ? null : v);

  return {
    chartData,
    yearsToFI: {
      p10: toLabel(getPercentile(sortedYears, 0.1)),
      p50: toLabel(getPercentile(sortedYears, 0.5)),
      p90: toLabel(getPercentile(sortedYears, 0.9)),
    },
    alreadyFI: false,
  };
}
