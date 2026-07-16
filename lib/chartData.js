// Shared chart-data builders used by portfolio detail pages, the Compare page,
// and the Portfolio Builder. Plain JS (no 'use client') so both server and
// client components can import it.
//
// CR-12 (July 2026): these were previously duplicated across
// app/portfolios/[slug]/page.js, app/compare/page.js, and
// components/BuilderClient.jsx — which is exactly the kind of drift that
// produced CR-3. Any change to chart math belongs here, in one place.

// Growth of $10,000 from monthly returns, downsampled to one point per year.
export function buildGrowthData(monthlyReturns) {
  if (!monthlyReturns?.length) return [];
  let value = 10000;
  const byYear = {};
  for (const row of monthlyReturns) {
    value = value * (1 + row.monthly_return / 100);
    const year = row.date.slice(0, 4);
    byYear[year] = { label: year, value: Math.round(value * 100) / 100 };
  }
  return Object.values(byYear);
}

// % decline from the running peak for every month (values always ≤ 0).
export function buildDrawdownData(monthlyReturns) {
  if (!monthlyReturns?.length) return [];
  let value = 10000;
  let peak = 10000;
  return monthlyReturns.map((row) => {
    value = value * (1 + row.monthly_return / 100);
    if (value > peak) peak = value;
    const drawdown = ((value - peak) / peak) * 100;
    return { label: row.date.slice(0, 7), value: Math.round(drawdown * 100) / 100 };
  });
}

// Annualised rolling return for a given window (in months).
export function buildRollingReturnData(monthlyReturns, windowMonths) {
  if (!monthlyReturns || monthlyReturns.length < windowMonths) return [];
  const result = [];
  for (let i = windowMonths - 1; i < monthlyReturns.length; i++) {
    const window = monthlyReturns.slice(i - windowMonths + 1, i + 1);
    const product = window.reduce((acc, row) => acc * (1 + row.monthly_return / 100), 1);
    const annualized = (Math.pow(product, 12 / windowMonths) - 1) * 100;
    result.push({ label: monthlyReturns[i].date.slice(0, 7), value: Math.round(annualized * 100) / 100 });
  }
  return result;
}

// All four standard rolling windows keyed by label. Windows with no data are
// omitted entirely — every consumer (RollingReturnChart, ChartsSection,
// mergeRollingBench in BuilderClient) treats a missing key and an empty array
// identically, so this is the canonical shape.
export function buildRollingDatasets(monthlyReturns) {
  const windows = [
    { label: '1Y', months: 12 },
    { label: '3Y', months: 36 },
    { label: '5Y', months: 60 },
    { label: '10Y', months: 120 },
  ];
  const datasets = {};
  for (const { label, months } of windows) {
    const data = buildRollingReturnData(monthlyReturns, months);
    if (data.length > 0) datasets[label] = data;
  }
  return datasets;
}

// Holding-period returns heatmap: for every (startYear, N-year hold) pair,
// the annualised CAGR — or null where the window is incomplete. Max 30 columns.
export function buildHeatmapData(monthlyReturns) {
  if (!monthlyReturns?.length) return null;

  const returnMap = new Map();
  for (const row of monthlyReturns) {
    returnMap.set(row.date.slice(0, 7), Number(row.monthly_return));
  }

  const firstYear = parseInt(monthlyReturns[0].date.slice(0, 4));
  const lastYear  = parseInt(monthlyReturns[monthlyReturns.length - 1].date.slice(0, 4));

  const startYears = [];
  for (let y = firstYear; y <= lastYear; y++) startYears.push(y);

  const maxPeriod = Math.min(30, lastYear - firstYear + 1);
  const holdingPeriods = [];
  for (let n = 1; n <= maxPeriod; n++) holdingPeriods.push(n);

  const data = startYears.map((startYear) =>
    holdingPeriods.map((n) => {
      const endYear = startYear + n - 1;
      if (endYear > lastYear) return null;
      let compound = 1;
      for (let y = startYear; y <= endYear; y++) {
        for (let m = 1; m <= 12; m++) {
          const key = `${y}-${String(m).padStart(2, '0')}`;
          const ret = returnMap.get(key);
          if (ret === undefined) return null;
          compound *= (1 + ret / 100);
        }
      }
      return Math.round((Math.pow(compound, 1 / n) - 1) * 10000) / 100;
    })
  );

  return { startYears, holdingPeriods, data };
}
