// Historical withdrawal rate calculator (Bengen methodology).
// All rates expressed as annualised % of the starting $10,000 portfolio.
// 100% historical success: the rate must hold for every rolling window of the given length.

const INFLATION_MONTHLY = Math.pow(1.03, 1 / 12) - 1;
const DURATIONS = [20, 25, 30, 40]; // years
const BINARY_SEARCH_STEPS = 20;

// Simulate one window of monthly returns, applying withdrawals.
// inflate: true = withdrawals grow 3%/yr (real); false = fixed dollar (nominal)
// minEndValue: ending portfolio value must be >= this (use 0 for SWR, 10000 for PWR)
function simulateWindow(monthlyReturns, start, length, annualRate, inflate, minEndValue) {
  const monthlyWD = ((annualRate / 100) / 12) * 10000;
  let value = 10000;
  let wd = monthlyWD;
  let cumulativeInflation = 1;

  for (let i = start; i < start + length; i++) {
    value *= 1 + monthlyReturns[i].monthly_return / 100;
    value = Math.max(0, value - wd);
    if (inflate) {
      wd *= 1 + INFLATION_MONTHLY;
      cumulativeInflation *= 1 + INFLATION_MONTHLY;
    }
    if (value <= 0) return false;
  }

  // For PWR: real ending value must be >= real starting value
  const realEndValue = inflate ? value / cumulativeInflation : value;
  return realEndValue >= minEndValue;
}

function findMaxRate(monthlyReturns, windowLength, windowCount, inflate, isPWR) {
  const minEndValue = isPWR ? 10000 : 0;
  let lo = 0;
  let hi = 25; // 25% annual is a safe upper bound for both SWR and PWR

  for (let step = 0; step < BINARY_SEARCH_STEPS; step++) {
    const mid = (lo + hi) / 2;
    let allPass = true;
    for (let start = 0; start < windowCount; start++) {
      if (!simulateWindow(monthlyReturns, start, windowLength, mid, inflate, minEndValue)) {
        allPass = false;
        break;
      }
    }
    if (allPass) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

export function buildWithdrawalRates(monthlyReturns) {
  if (!monthlyReturns?.length) return null;

  const total = monthlyReturns.length;
  const results = {};

  for (const years of DURATIONS) {
    const windowLength = years * 12;
    // CR-18: + 1 includes the window ending at the latest month — without it,
    // a portfolio with exactly `windowLength` months reported "insufficient data".
    const windowCount = total - windowLength + 1;
    if (windowCount < 1) {
      results[years] = null;
      continue;
    }

    results[years] = {
      swr_nominal: findMaxRate(monthlyReturns, windowLength, windowCount, false, false),
      swr_real:    findMaxRate(monthlyReturns, windowLength, windowCount, true,  false),
      pwr_nominal: findMaxRate(monthlyReturns, windowLength, windowCount, false, true),
      pwr_real:    findMaxRate(monthlyReturns, windowLength, windowCount, true,  true),
    };
  }

  return results;
}
