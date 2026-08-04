import { getPortfolios, getAllAllocations, getAllPortfolioStrategies } from '@/lib/db';
import DatabaseClient from '@/components/DatabaseClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Investment Strategy Database - PortfolioDB',
  description: 'Browse 70+ institutional-grade portfolio strategies. Filter by risk level, asset class, CAGR, and more.',
  alternates: { canonical: `${siteUrl}/database` },
  openGraph: {
    title: 'Investment Strategy Database - PortfolioDB',
    description: 'Browse 70+ institutional-grade portfolio strategies. Filter by risk level, asset class, CAGR, and more.',
    url: `${siteUrl}/database`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Investment Strategy Database - PortfolioDB',
    description: 'Browse 70+ institutional-grade portfolio strategies. Filter by risk level, asset class, CAGR, and more.',
  },
};

export default async function DatabasePage() {
  const [portfolios, allAllocations, allStrategies] = await Promise.all([
    getPortfolios(),
    getAllAllocations(),
    getAllPortfolioStrategies(),
  ]);

  // Group allocations by portfolio slug, sorted by percentage desc
  const allocationsBySlug = {};
  for (const a of allAllocations) {
    if (!allocationsBySlug[a.portfolio_slug]) allocationsBySlug[a.portfolio_slug] = [];
    allocationsBySlug[a.portfolio_slug].push(a);
  }
  for (const slug of Object.keys(allocationsBySlug)) {
    allocationsBySlug[slug].sort((a, b) => b.percentage - a.percentage);
  }

  // Group strategies by portfolio slug
  const strategiesBySlug = {};
  for (const s of allStrategies) {
    if (!strategiesBySlug[s.portfolio_slug]) strategiesBySlug[s.portfolio_slug] = [];
    strategiesBySlug[s.portfolio_slug].push(s.strategy_slug);
  }

  // Derive sorted unique strategy list for the filter UI
  const allStrategyOptions = [...new Set(allStrategies.map((s) => s.strategy_slug))].sort();

  const portfoliosWithData = portfolios.map((p) => ({
    ...p,
    allocations: allocationsBySlug[p.slug] ?? [],
    strategies: strategiesBySlug[p.slug] ?? [],
    timing_sensitivity: (p.rolling_10yr_high != null && p.rolling_10yr_low != null)
      ? Math.round((p.rolling_10yr_high - p.rolling_10yr_low) * 100) / 100
      : null,
  }));

  // No Suspense boundary needed: DatabaseClient no longer calls
  // useSearchParams() (it reads window.location in a mount effect instead), so
  // the grid prerenders into the static HTML — no spinner fallback, no swap.
  return (
    <DatabaseClient
      portfolios={portfoliosWithData}
      strategyOptions={allStrategyOptions}
    />
  );
}
