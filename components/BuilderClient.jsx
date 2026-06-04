'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import GrowthChart from '@/components/GrowthChart';
import CurrentSignals from '@/components/CurrentSignals';

const PORTFOLIO_COLORS = ['#074a34', '#1565c0', '#b71c1c', '#e67e22', '#7b1fa2', '#00796b'];
const RF_MONTHLY = 0.375; // 4.5% annual risk-free rate / 12
const MAX_PORTFOLIOS = 6;

// ─────────────────────────────────────────────────────────────
// Stat computation (mirrors portfolio_stats view math)
// ─────────────────────────────────────────────────────────────

function buildBlendedReturns(portfolioReturns, selections) {
  if (selections.length < 2) return [];

  // Build a date → return lookup map for each selected portfolio
  const maps = {};
  for (const { slug } of selections) {
    maps[slug] = {};
    for (const r of portfolioReturns[slug] || []) {
      maps[slug][r.date] = Number(r.monthly_return);
    }
  }

  // Find months present in every selected portfolio
  const dateSets = selections.map(({ slug }) => new Set(Object.keys(maps[slug])));
  if (dateSets.some((s) => s.size === 0)) return [];

  const commonDates = [...dateSets[0]]
    .filter((date) => dateSets.every((s) => s.has(date)))
    .sort();

  return commonDates.map((date) => ({
    date,
    monthly_return: selections.reduce(
      (sum, { slug, weight }) => sum + (parseFloat(weight) / 100) * maps[slug][date],
      0
    ),
  }));
}

function computeStats(blended) {
  const n = blended.length;
  if (n < 12) return null;

  // Single-pass: running value for CAGR + drawdown + growth chart + ulcer index
  let value = 10000;
  let peak = 10000;
  let maxDrawdown = 0;
  let sumDDSquared = 0;
  const byYear = {};

  for (const r of blended) {
    value *= 1 + r.monthly_return / 100;
    if (value > peak) peak = value;
    const dd = ((value - peak) / peak) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;
    sumDDSquared += dd * dd;
    const year = r.date.slice(0, 4);
    byYear[year] = Math.round(value * 100) / 100;
  }

  const growthData = Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, val]) => ({ label, value: val }));

  // CAGR from total growth factor
  const totalGrowth = value / 10000;
  const cagr = (Math.pow(totalGrowth, 12 / n) - 1) * 100;

  // Sharpe ratio (annualised)
  const returns = blended.map((r) => r.monthly_return);
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / Math.max(n - 1, 1);
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev === 0 ? 0 : ((mean - RF_MONTHLY) / stdDev) * Math.sqrt(12);

  // Sortino ratio (downside deviation)
  const downsideVar =
    returns.reduce((s, r) => s + Math.pow(Math.min(0, r - RF_MONTHLY), 2), 0) / n;
  const downsideStdDev = Math.sqrt(downsideVar);
  const sortino =
    downsideStdDev === 0 ? 0 : ((mean - RF_MONTHLY) / downsideStdDev) * Math.sqrt(12);

  // Best / worst year (full 12-month years only)
  const yearCounts = {};
  const yearFactors = {};
  for (const r of blended) {
    const year = r.date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + 1;
    yearFactors[year] = (yearFactors[year] || 1) * (1 + r.monthly_return / 100);
  }
  const fullYearReturns = Object.entries(yearFactors)
    .filter(([year]) => yearCounts[year] === 12)
    .map(([, f]) => (f - 1) * 100);

  const bestYear = fullYearReturns.length ? Math.max(...fullYearReturns) : null;
  const worstYear = fullYearReturns.length ? Math.min(...fullYearReturns) : null;

  // Ulcer Index — sqrt of mean squared percentage drawdowns
  const ulcerIndex = Math.sqrt(sumDDSquared / n);

  // Ulcer Performance Index — (CAGR − RF_annual) / UI
  const RF_ANNUAL = RF_MONTHLY * 12;
  const ulcerPerformanceIndex = ulcerIndex === 0 ? null : (cagr - RF_ANNUAL) / ulcerIndex;

  // YTD Return — compound all months in the current calendar year
  const currentYear = new Date().getFullYear().toString();
  const ytdMonths = blended.filter((r) => r.date.startsWith(currentYear));
  const ytdReturn = ytdMonths.length > 0
    ? (ytdMonths.reduce((v, r) => v * (1 + r.monthly_return / 100), 1) - 1) * 100
    : null;

  // 10-Year CAGR — requires at least 120 months of history
  let cagr10yr = null;
  if (blended.length >= 120) {
    const last120 = blended.slice(-120);
    const growth10 = last120.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    cagr10yr = (Math.pow(growth10, 12 / 120) - 1) * 100;
  }

  // Crisis-period CAGR helper (returns null if fewer than 6 months of data in range)
  function crisisCagr(startDate, endDate) {
    const subset = blended.filter((r) => r.date >= startDate && r.date <= endDate);
    if (subset.length < 6) return null;
    const growth = subset.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    return (Math.pow(growth, 12 / subset.length) - 1) * 100;
  }

  const gfcCagr     = crisisCagr('2007-10-01', '2009-03-31'); // GFC peak-to-trough
  const dotcomCagr  = crisisCagr('2000-03-01', '2002-10-31'); // Dot-com peak-to-trough

  // Annual returns and year-end portfolio values (for PDF table)
  const annualReturns = Object.entries(yearFactors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, f]) => ({
      year,
      return: (f - 1) * 100,
      fullYear: yearCounts[year] === 12,
      endValue: byYear[year],
    }));

  return {
    cagr,
    maxDrawdown,
    sharpe,
    sortino,
    bestYear,
    worstYear,
    ulcerIndex,
    ulcerPerformanceIndex,
    ytdReturn,
    cagr10yr,
    gfcCagr,
    dotcomCagr,
    growthData,
    annualReturns,
    totalMonths: n,
    startDate: blended[0].date,
    endDate: blended[blended.length - 1].date,
  };
}

// Equal weight distribution across n portfolios (last slot absorbs rounding)
function equalWeights(n) {
  if (n === 0) return [];
  const base = Math.floor(100 / n);
  const weights = Array(n).fill(String(base));
  weights[n - 1] = String(100 - base * (n - 1));
  return weights;
}

// Format "YYYY-MM-DD" → "Jan 2010"
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.slice(0, 7).split('-');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StatCard({ label, value, positive, error }) {
  return (
    <div className="bg-surface-container-low rounded-xl px-4 py-3">
      <div className="font-inter text-[11px] uppercase tracking-wide text-on-surface-variant mb-1">
        {label}
      </div>
      <div
        className={`font-manrope font-bold text-[24px] ${
          error ? 'text-error' : positive ? 'text-primary' : 'text-on-surface'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SnapshotRow({ icon, label, value, positive, error }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-outline-variant last:border-0">
      <span
        className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
        style={{ fontSize: '16px' }}
      >
        {icon}
      </span>
      <span className="flex-1 font-inter text-[13px] text-on-surface-variant">{label}</span>
      <span
        className={`font-inter font-semibold text-[13px] ${
          error ? 'text-error' : positive ? 'text-primary' : 'text-on-surface'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

// Parse "slug1:50,slug2:30" from the ?mix= URL param
function parseMixParam(mixParam, allPortfolios) {
  if (!mixParam) return [];
  const lookup = Object.fromEntries(allPortfolios.map((p) => [p.slug, p.name]));
  return mixParam
    .split(',')
    .map((item) => {
      const [slug, weight] = item.split(':');
      const name = lookup[slug?.trim()];
      if (!name) return null;
      return { slug: slug.trim(), name, weight: weight?.trim() ?? '0' };
    })
    .filter(Boolean)
    .slice(0, MAX_PORTFOLIOS);
}

export default function BuilderClient({ allPortfolios, mixParam = null, userId = null, tier = null, savedCount = 0 }) {
  // Pre-populate from ?mix= URL param if provided
  const initialSelections = parseMixParam(mixParam, allPortfolios);

  // Derive which slugs are tactical (signal) portfolios from the kofi_link field
  const tacticalSlugs = useMemo(
    () => new Set(allPortfolios.filter((p) => p.kofi_link).map((p) => p.slug)),
    [allPortfolios]
  );

  // Each selection: { slug, name, weight: string }
  const [selections, setSelections] = useState(initialSelections);
  // Fix #5 — Track saves made during this session so the 3/3 limit UI shows immediately
  // after saving, without requiring a page reload. Starts at the server-rendered count.
  const [localSavedCount, setLocalSavedCount] = useState(savedCount);
  // Fetched monthly returns keyed by slug
  const [portfolioReturns, setPortfolioReturns] = useState({});
  const [loadingSlugs, setLoadingSlugs] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [logScale, setLogScale] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [holdingsData, setHoldingsData] = useState({ allocations: [], signals: [] });
  const searchRef = useRef(null);

  // Filter portfolio list for the search dropdown
  const filteredPortfolios = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const selected = new Set(selections.map((s) => s.slug));
    return allPortfolios
      .filter((p) => !selected.has(p.slug) && p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, selections, allPortfolios]);

  const totalWeight = selections.reduce((s, p) => s + (parseFloat(p.weight) || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;
  const allDataLoaded = selections.every((s) => s.slug in portfolioReturns);
  const isLoading = loadingSlugs.size > 0;

  const isReady = selections.length >= 2 && weightOk && allDataLoaded && !isLoading;

  const stats = useMemo(() => {
    if (!isReady) return null;
    try {
      const blended = buildBlendedReturns(portfolioReturns, selections);
      return computeStats(blended);
    } catch {
      return null;
    }
  }, [isReady, portfolioReturns, selections]);

  // Compute blended holdings for the Current Holdings card.
  // Weights each portfolio's holdings (allocations or tactical signals) by the
  // user's chosen mix weight, then aggregates by ticker.
  // Returns: { hasTactical, holdings: [{ ticker, weight }] } or null if not ready.
  const blendedHoldings = useMemo(() => {
    if (selections.length < 2 || !weightOk) return null;

    // Group fetched allocations by portfolio slug for fast lookup
    const allocBySlug = {};
    for (const a of holdingsData.allocations) {
      if (!allocBySlug[a.portfolio_slug]) allocBySlug[a.portfolio_slug] = [];
      allocBySlug[a.portfolio_slug].push(a);
    }
    const signalBySlug = Object.fromEntries(holdingsData.signals.map((s) => [s.slug, s]));

    let hasTactical = false;
    const tickerTotals = {}; // ticker → blended weight (0–100 scale)

    for (const sel of selections) {
      const portFrac = parseFloat(sel.weight) / 100; // e.g. 0.6 for 60%
      const isTactical = tacticalSlugs.has(sel.slug);
      if (isTactical) hasTactical = true;

      let holdings = [];
      if (isTactical) {
        const signal = signalBySlug[sel.slug];
        if (signal) {
          // signal.holdings[].weight is already in % (0–100) after fix in db.js
          holdings = signal.holdings.map((h) => ({ ticker: h.ticker, frac: h.weight / 100 }));
        }
      } else {
        // allocation.percentage is 0–100
        const allocs = allocBySlug[sel.slug] ?? [];
        holdings = allocs.map((a) => ({ ticker: a.ticker, frac: Number(a.percentage) / 100 }));
      }

      for (const { ticker, frac } of holdings) {
        tickerTotals[ticker] = (tickerTotals[ticker] || 0) + portFrac * frac;
      }
    }

    const holdings = Object.entries(tickerTotals)
      .map(([ticker, frac]) => ({ ticker, weight: frac * 100 }))
      .sort((a, b) => b.weight - a.weight);

    return holdings.length > 0 ? { hasTactical, holdings } : null;
  }, [selections, weightOk, holdingsData, tacticalSlugs]);

  // Fetch monthly returns for a single slug (no-op if already fetched)
  const fetchReturns = useCallback(
    async (slug) => {
      if (slug in portfolioReturns) return;
      setLoadingSlugs((prev) => new Set([...prev, slug]));
      try {
        const res = await fetch(`/api/builder-returns?slugs=${slug}`);
        const data = await res.json();
        setPortfolioReturns((prev) => ({ ...prev, ...data }));
      } catch {
        // Mark as fetched (empty) so we don't retry forever
        setPortfolioReturns((prev) => ({ ...prev, [slug]: [] }));
      } finally {
        setLoadingSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [portfolioReturns]
  );

  // Add a portfolio — redistributes all weights equally
  const addPortfolio = useCallback(
    (portfolio) => {
      if (selections.length >= MAX_PORTFOLIOS) return;
      setSelections((prev) => {
        const newList = [
          ...prev,
          { slug: portfolio.slug, name: portfolio.name, weight: '0' },
        ];
        const weights = equalWeights(newList.length);
        return newList.map((s, i) => ({ ...s, weight: weights[i] }));
      });
      setSearchQuery('');
      setShowDropdown(false);
      fetchReturns(portfolio.slug);
    },
    [selections.length, fetchReturns]
  );

  // Remove a portfolio — redistributes remaining weights equally
  const removePortfolio = useCallback((slug) => {
    setSelections((prev) => {
      const remaining = prev.filter((s) => s.slug !== slug);
      if (remaining.length === 0) return [];
      const weights = equalWeights(remaining.length);
      return remaining.map((s, i) => ({ ...s, weight: weights[i] }));
    });
    setShowSavePrompt(false);
  }, []);

  // Update a single weight (numeric characters only)
  const updateWeight = useCallback((slug, raw) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    setSelections((prev) =>
      prev.map((s) => (s.slug === slug ? { ...s, weight: clean } : s))
    );
  }, []);

  // Set a portfolio's weight to whatever is left after all others
  const fillRemaining = useCallback((slug) => {
    setSelections((prev) => {
      const otherTotal = prev
        .filter((s) => s.slug !== slug)
        .reduce((s, p) => s + (parseFloat(p.weight) || 0), 0);
      const remaining = Math.max(0, Math.round((100 - otherTotal) * 10) / 10);
      return prev.map((s) => (s.slug === slug ? { ...s, weight: String(remaining) } : s));
    });
  }, []);

  // Fetch return data for any pre-populated selections (from ?mix= param)
  useEffect(() => {
    if (initialSelections.length > 0) {
      initialSelections.forEach((s) => fetchReturns(s.slug));
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Reset save UI when the portfolio set changes (add/remove), not on weight edits
  const selectionSlugs = selections.map((s) => s.slug).join(',');
  useEffect(() => {
    setShowSavePrompt(false);
    setSaveName('');
    setSaveStatus('idle');
  }, [selectionSlugs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch allocations + signals for the current selection client-side.
  // Only runs when there are 2+ portfolios — avoids loading this data on page load.
  useEffect(() => {
    if (selections.length < 2) {
      setHoldingsData({ allocations: [], signals: [] });
      return;
    }
    const slugs = selectionSlugs; // already joined
    fetch(`/api/builder-holdings?slugs=${encodeURIComponent(slugs)}`)
      .then((r) => r.json())
      .then((data) => setHoldingsData(data))
      .catch(() => {});
  }, [selectionSlugs]); // eslint-disable-line react-hooks/exhaustive-deps

  // POST the blended mix to /api/builder-save
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/builder-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim() || null,
          selections: selections.map(({ slug, weight }) => ({ slug, weight })),
        }),
      });
      if (!res.ok) throw new Error('failed');
      setSaveStatus('saved');
      setShowSavePrompt(false);
      setLocalSavedCount((prev) => prev + 1);
    } catch {
      setSaveStatus('error');
    }
  }, [saveName, selections]);

  const handleDownloadPDF = useCallback(async () => {
    if (!stats) return;
    setPdfLoading(true);
    try {
      // Compute blended returns from current portfolio selections
      const blendedReturns = buildBlendedReturns(portfolioReturns, selections);

      // Fetch benchmark returns in parallel with library imports
      const [{ pdf }, { BuilderPDFDocument }, benchRes] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/BuilderPDF'),
        fetch('/api/builder-returns?slugs=united-states-60-40-portfolio,us-stock-market'),
      ]);
      const benchData  = benchRes.ok ? await benchRes.json() : {};
      const returns6040 = benchData['united-states-60-40-portfolio'] ?? [];
      const returnsUS   = benchData['us-stock-market'] ?? [];

      const blob = await pdf(
        <BuilderPDFDocument
          selections={selections}
          stats={stats}
          mixName={saveName.trim() || null}
          blendedReturns={blendedReturns}
          returns6040={returns6040}
          returnsUS={returnsUS}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio-mix-analysis.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }, [stats, selections, saveName, portfolioReturns]);

  // Weight display — show integer if whole number, one decimal otherwise
  const weightDisplay =
    totalWeight % 1 === 0 ? String(totalWeight) : totalWeight.toFixed(1);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-manrope font-bold text-[32px] md:text-[40px] text-on-surface leading-tight mb-2">
          Portfolio Builder
        </h1>
        <p className="font-inter text-[16px] text-on-surface-variant max-w-2xl">
          Blend any combination of portfolios from the database and see the
          backtested stats. Adjust the weights to model your ideal mix — free to
          use, no account required.
        </p>
      </div>

      {/* Two-column layout: selector left, results right */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

        {/* ── Selector Card ── */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 lg:sticky lg:top-[60px]">
          <h2 className="font-manrope font-bold text-[17px] text-on-surface mb-0.5">
            Build Your Mix
          </h2>
          <p className="font-inter text-[13px] text-on-surface-variant mb-4">
            Add 2–{MAX_PORTFOLIOS} portfolios and set weights that total 100%.
          </p>

          {/* Search box */}
          <div className="relative mb-3" ref={searchRef}>
            <div
              className={`flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2.5 border transition-colors ${
                selections.length >= MAX_PORTFOLIOS
                  ? 'border-outline-variant opacity-50'
                  : 'border-outline-variant focus-within:border-primary'
              }`}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
                style={{ fontSize: '18px' }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={
                  selections.length >= MAX_PORTFOLIOS
                    ? `Maximum ${MAX_PORTFOLIOS} portfolios`
                    : 'Search and add a portfolio…'
                }
                disabled={selections.length >= MAX_PORTFOLIOS}
                className="flex-1 min-w-0 bg-transparent font-inter text-[14px] text-on-surface placeholder:text-on-surface-variant/50 outline-none"
              />
            </div>

            {/* Dropdown results */}
            {showDropdown && filteredPortfolios.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-outline-variant rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto">
                {filteredPortfolios.map((p) => (
                  <button
                    key={p.slug}
                    onMouseDown={() => addPortfolio(p)}
                    className="w-full text-left px-4 py-2.5 font-inter text-[14px] text-on-surface hover:bg-surface-container-low transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {selections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="material-symbols-outlined text-[44px] text-outline-variant mb-2">
                tune
              </span>
              <p className="font-inter text-[13px] text-on-surface-variant">
                Search for a portfolio above to get started.
              </p>
            </div>
          )}

          {/* Selected portfolios */}
          {selections.length > 0 && (
            <div className="space-y-2">
              {selections.map((sel, i) => {
                const loading = loadingSlugs.has(sel.slug);
                const otherTotal = selections
                  .filter((s) => s.slug !== sel.slug)
                  .reduce((s, p) => s + (parseFloat(p.weight) || 0), 0);
                const remaining = Math.max(
                  0,
                  Math.round((100 - otherTotal) * 10) / 10
                );
                const canFill =
                  Math.abs((parseFloat(sel.weight) || 0) - remaining) > 0.05;

                return (
                  <div
                    key={sel.slug}
                    className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5"
                  >
                    {/* Colour dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PORTFOLIO_COLORS[i] }}
                    />

                    {/* Name */}
                    <span className="flex-1 min-w-0 font-inter text-[13px] text-on-surface truncate">
                      {sel.name}
                    </span>

                    {/* Loading spinner */}
                    {loading && (
                      <span
                        className="material-symbols-outlined text-on-surface-variant animate-spin flex-shrink-0"
                        style={{ fontSize: '15px' }}
                      >
                        progress_activity
                      </span>
                    )}

                    {/* Fill-remaining shortcut */}
                    {!loading && canFill && (
                      <button
                        onClick={() => fillRemaining(sel.slug)}
                        title={`Set to ${remaining}%`}
                        className="font-inter text-[11px] text-primary hover:underline whitespace-nowrap flex-shrink-0"
                      >
                        ↑{remaining}%
                      </button>
                    )}

                    {/* Weight input */}
                    <div className="flex items-center flex-shrink-0 bg-white border border-outline-variant rounded-lg overflow-hidden">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sel.weight}
                        onChange={(e) => updateWeight(sel.slug, e.target.value)}
                        className="w-9 text-right font-inter font-semibold text-[13px] text-on-surface py-1 px-1.5 outline-none"
                      />
                      <span className="font-inter text-[12px] text-on-surface-variant pr-1.5 select-none">
                        %
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removePortfolio(sel.slug)}
                      aria-label={`Remove ${sel.name}`}
                      className="flex-shrink-0 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        close
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weight total */}
          {selections.length > 0 && (
            <div
              className={`mt-3 flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-inter ${
                weightOk
                  ? 'bg-[#f0f7f3] border border-[#c0e0ce]'
                  : 'bg-surface-container-low border border-outline-variant'
              }`}
            >
              <span className="text-on-surface-variant">Total</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  weightOk
                    ? 'text-primary'
                    : totalWeight > 100
                    ? 'text-error'
                    : 'text-on-surface'
                }`}
              >
                {weightDisplay}%
                {weightOk && (
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: '13px' }}
                  >
                    check_circle
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Status hints */}
          {selections.length === 1 && (
            <p className="mt-2 font-inter text-[12px] text-on-surface-variant text-center">
              Add at least one more portfolio
            </p>
          )}
          {selections.length >= 2 && !weightOk && (
            <p className="mt-2 font-inter text-[12px] text-error text-center">
              Weights must total 100% (currently {weightDisplay}%)
            </p>
          )}
          {selections.length >= 2 && weightOk && isLoading && (
            <p className="mt-2 font-inter text-[12px] text-on-surface-variant text-center">
              Loading return data…
            </p>
          )}
        </div>

        {/* ── Results Panel ── */}
        <div className="space-y-4">

          {/* Placeholder — not enough to compute */}
          {!isReady && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col items-center justify-center min-h-[280px] text-center p-8">
              <span className="material-symbols-outlined text-[52px] text-outline-variant mb-3">
                area_chart
              </span>
              <p className="font-manrope font-bold text-[18px] text-on-surface-variant mb-1">
                Results will appear here
              </p>
              <p className="font-inter text-[14px] text-on-surface-variant max-w-xs">
                Add 2 or more portfolios and set weights that total 100%.
              </p>
            </div>
          )}

          {/* Ready but no overlapping data */}
          {isReady && !stats && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col items-center justify-center min-h-[200px] text-center p-8">
              <span className="material-symbols-outlined text-[40px] text-outline-variant mb-3">
                warning
              </span>
              <p className="font-inter text-[14px] text-on-surface-variant max-w-sm">
                The selected portfolios don&apos;t share enough overlapping monthly
                data to compute stats. Try portfolios with longer shared history.
              </p>
            </div>
          )}

          {/* Full results */}
          {isReady && stats && (
            <>
              {/* Stats card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                {/* Header: title + date range + weight pills */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-manrope font-bold text-[18px] text-on-surface">
                      Blended Backtest
                    </h2>
                    <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                      {fmtDate(stats.startDate)} – {fmtDate(stats.endDate)}&nbsp;&middot;&nbsp;
                      {stats.totalMonths} months
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                  {tier && (
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfLoading}
                      title="Download PDF report"
                      className="flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {pdfLoading ? 'progress_activity' : 'download'}
                      </span>
                      {pdfLoading ? 'Generating…' : 'Download PDF'}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {selections.map((s, i) => (
                      <span
                        key={s.slug}
                        className="inline-flex items-center font-inter text-[11px] font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: PORTFOLIO_COLORS[i] }}
                      >
                        {s.weight}%&nbsp;{s.name}
                      </span>
                    ))}
                  </div>
                  </div>
                </div>

                {/* 3-stat grid — always visible */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="CAGR"
                    value={`${stats.cagr >= 0 ? '+' : ''}${stats.cagr.toFixed(1)}%`}
                    positive={stats.cagr >= 0}
                  />
                  <StatCard
                    label="Max Drawdown"
                    value={`−${Math.abs(stats.maxDrawdown).toFixed(1)}%`}
                    error
                  />
                  <StatCard
                    label="Sharpe Ratio"
                    value={stats.sharpe.toFixed(2)}
                    positive={stats.sharpe >= 0}
                  />
                </div>

                <p className="mt-4 font-inter text-[11px] text-on-surface-variant">
                  Only months where all selected portfolios have return data are included.
                  Assumes monthly rebalancing to target weights. Past performance does not
                  guarantee future results.
                </p>
              </div>

              {/* Growth chart card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-manrope font-bold text-[16px] text-on-surface">
                    Growth of $10,000
                  </h3>
                  <div className="flex gap-1">
                    {['Log', 'Linear'].map((label) => (
                      <button
                        key={label}
                        onClick={() => setLogScale(label === 'Log')}
                        className={`font-inter text-[12px] px-3 py-1 rounded-lg transition-colors ${
                          (label === 'Log') === logScale
                            ? 'bg-primary text-white'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <GrowthChart data={stats.growthData} logScale={logScale} />
              </div>

              {/* Performance Snapshot — blurred for non-members */}
              <div className="relative">
                {/* Blurred content layer */}
                <div
                  className={`bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 transition-[filter] ${
                    !tier ? 'blur-sm select-none pointer-events-none' : ''
                  }`}
                >
                  <h3 className="font-manrope font-bold text-[16px] text-on-surface mb-4">
                    Performance Snapshot
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
                    {/* Left column */}
                    <div>
                      <SnapshotRow
                        icon="show_chart"
                        label="Sortino Ratio"
                        value={stats.sortino.toFixed(2)}
                        positive={stats.sortino >= 0}
                      />
                      <SnapshotRow
                        icon="arrow_upward"
                        label="Best Year"
                        value={stats.bestYear != null ? `+${stats.bestYear.toFixed(1)}%` : null}
                        positive
                      />
                      <SnapshotRow
                        icon="calendar_today"
                        label="YTD Return"
                        value={stats.ytdReturn != null ? `${stats.ytdReturn >= 0 ? '+' : ''}${stats.ytdReturn.toFixed(1)}%` : null}
                        positive={stats.ytdReturn != null && stats.ytdReturn >= 0}
                        error={stats.ytdReturn != null && stats.ytdReturn < 0}
                      />
                      <SnapshotRow
                        icon="warning"
                        label="Ulcer Index"
                        value={stats.ulcerIndex.toFixed(2)}
                      />
                      <SnapshotRow
                        icon="account_balance"
                        label="GFC CAGR"
                        value={stats.gfcCagr != null ? `${stats.gfcCagr >= 0 ? '+' : ''}${stats.gfcCagr.toFixed(1)}%` : null}
                        positive={stats.gfcCagr != null && stats.gfcCagr >= 0}
                        error={stats.gfcCagr != null && stats.gfcCagr < 0}
                      />
                    </div>
                    {/* Right column */}
                    <div>
                      <SnapshotRow
                        icon="arrow_downward"
                        label="Worst Year"
                        value={stats.worstYear != null ? `${stats.worstYear >= 0 ? '+' : ''}${stats.worstYear.toFixed(1)}%` : null}
                        positive={stats.worstYear != null && stats.worstYear >= 0}
                        error={stats.worstYear != null && stats.worstYear < 0}
                      />
                      <SnapshotRow
                        icon="history"
                        label="10-Year CAGR"
                        value={stats.cagr10yr != null ? `${stats.cagr10yr >= 0 ? '+' : ''}${stats.cagr10yr.toFixed(1)}%` : null}
                        positive={stats.cagr10yr != null && stats.cagr10yr >= 0}
                        error={stats.cagr10yr != null && stats.cagr10yr < 0}
                      />
                      <SnapshotRow
                        icon="monitoring"
                        label="Ulcer Perf. Index"
                        value={stats.ulcerPerformanceIndex != null ? stats.ulcerPerformanceIndex.toFixed(2) : null}
                        positive={stats.ulcerPerformanceIndex != null && stats.ulcerPerformanceIndex >= 0}
                      />
                      <SnapshotRow
                        icon="computer"
                        label="Dot-com CAGR"
                        value={stats.dotcomCagr != null ? `${stats.dotcomCagr >= 0 ? '+' : ''}${stats.dotcomCagr.toFixed(1)}%` : null}
                        positive={stats.dotcomCagr != null && stats.dotcomCagr >= 0}
                        error={stats.dotcomCagr != null && stats.dotcomCagr < 0}
                      />
                    </div>
                  </div>
                </div>

                {/* Lock overlay */}
                {!tier && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest/75">
                    <span className="material-symbols-outlined text-[32px] text-primary mb-2">lock</span>
                    <p className="font-manrope font-bold text-[16px] text-on-surface mb-1">
                      Performance Snapshot
                    </p>
                    <p className="font-inter text-[13px] text-on-surface-variant mb-4 text-center px-6">
                      Unlock with a Builder or Signals membership
                    </p>
                    <Link
                      href="/membership"
                      className="inline-flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors"
                    >
                      See plans
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Current Holdings — blended view of all selected portfolios */}
              {blendedHoldings && (
                <CurrentSignals
                  context="builder"
                  blendedHoldings={blendedHoldings}
                  tier={tier}
                />
              )}

              {/* Save CTA card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                {!userId ? (
                  /* State A: not logged in */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-manrope font-bold text-[16px] text-on-surface">Like this mix?</p>
                      <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                        Sign in to save it permanently to your account.
                      </p>
                    </div>
                    <Link
                      href="/login?next=/builder"
                      className="flex items-center gap-2 bg-primary text-white font-inter font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-[#0a5c3f] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                      Sign in to save
                    </Link>
                  </div>
                ) : !tier ? (
                  /* State B: logged in, no plan */
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '24px' }}>
                        workspace_premium
                      </span>
                      <div>
                        <p className="font-manrope font-bold text-[16px] text-on-surface mb-2">Save this mix</p>
                        <ul className="space-y-1.5">
                          {[
                            'Save up to 3 custom mixes permanently',
                            'Unlock the Performance Snapshot with 8 additional stats',
                            'Download a full PDF report for any mix',
                          ].map((item) => (
                            <li key={item} className="flex items-start gap-2 font-inter text-[13px] text-on-surface-variant">
                              <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '15px' }}>check</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Link
                      href="/membership"
                      className="inline-flex items-center gap-2 bg-primary text-white font-inter font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-[#0a5c3f] transition-colors self-start"
                    >
                      See plans
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </Link>
                  </div>
                ) : tier === 'builder' && localSavedCount >= 3 ? (
                  /* State C: builder at 3-mix limit */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-manrope font-bold text-[16px] text-on-surface">3/3 mixes saved</p>
                      <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                        You&apos;ve reached the Builder limit. Manage your mixes or upgrade for unlimited saves.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        href="/account"
                        className="flex items-center gap-2 bg-primary text-white font-inter font-semibold text-[14px] px-4 py-2.5 rounded-xl hover:bg-[#0a5c3f] transition-colors"
                      >
                        Manage mixes
                      </Link>
                      <Link
                        href="/membership"
                        className="font-inter text-[14px] text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Upgrade to Signals
                      </Link>
                    </div>
                  </div>
                ) : saveStatus === 'saved' ? (
                  /* Saved success */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>check_circle</span>
                      <div>
                        <p className="font-manrope font-bold text-[16px] text-on-surface">Mix saved</p>
                        <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                          You can load it any time from your account.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/account"
                      className="font-inter text-[14px] font-semibold text-primary hover:underline"
                    >
                      View your mixes →
                    </Link>
                  </div>
                ) : !showSavePrompt ? (
                  /* State D default: teaser */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-manrope font-bold text-[16px] text-on-surface">Like this mix?</p>
                      <p className="font-inter text-[13px] text-on-surface-variant mt-0.5">
                        Save it permanently to your account.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSavePrompt(true)}
                      className="flex items-center gap-2 bg-primary text-white font-inter font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-[#0a5c3f] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bookmark</span>
                      Save This Mix
                    </button>
                  </div>
                ) : (
                  /* State D expanded: name input + save button */
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block font-inter text-[13px] font-semibold text-on-surface mb-1.5">
                        Name this mix (optional)
                      </label>
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="e.g. My Retirement Mix"
                        maxLength={80}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 font-inter text-[14px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={handleSave}
                        disabled={saveStatus === 'saving'}
                        className="flex items-center gap-2 bg-primary text-white font-inter font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-[#0a5c3f] transition-colors disabled:opacity-60"
                      >
                        <span
                          className={`material-symbols-outlined ${saveStatus === 'saving' ? 'animate-spin' : ''}`}
                          style={{ fontSize: '18px' }}
                        >
                          {saveStatus === 'saving' ? 'progress_activity' : 'bookmark'}
                        </span>
                        {saveStatus === 'saving' ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setShowSavePrompt(false); setSaveStatus('idle'); }}
                        className="font-inter text-[14px] text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Cancel
                      </button>
                      {saveStatus === 'error' && (
                        <p className="font-inter text-[13px] text-error">Failed to save. Please try again.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
