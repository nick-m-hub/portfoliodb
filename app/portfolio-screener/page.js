import { getPortfolios, getAllAllocations, getAssetClasses } from '@/lib/db';
import ScreenerClient from '@/components/ScreenerClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Portfolio Screener - PortfolioDB',
  description: 'Screen and filter 70+ portfolio strategies by CAGR, Sharpe ratio, max drawdown, risk level, and asset class. Find the right portfolio for your goals.',
  alternates: { canonical: `${siteUrl}/portfolio-screener` },
  openGraph: {
    title: 'Portfolio Screener - PortfolioDB',
    description: 'Screen and filter 70+ portfolio strategies by CAGR, Sharpe ratio, max drawdown, risk level, and asset class.',
    url: `${siteUrl}/portfolio-screener`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portfolio Screener - PortfolioDB',
    description: 'Screen and filter 70+ portfolio strategies by CAGR, Sharpe ratio, max drawdown, risk level, and asset class.',
  },
};

export default async function PortfolioScreenerPage() {
  const [portfolios, allAllocations, assetClasses] = await Promise.all([
    getPortfolios(),
    getAllAllocations(),
    getAssetClasses(),
  ]);

  // Group allocations by portfolio slug
  const allocationsBySlug = {};
  for (const a of allAllocations) {
    if (!allocationsBySlug[a.portfolio_slug]) allocationsBySlug[a.portfolio_slug] = [];
    allocationsBySlug[a.portfolio_slug].push(a);
  }

  const portfoliosWithAllocations = portfolios.map((p) => ({
    ...p,
    allocations: allocationsBySlug[p.slug] ?? [],
    timing_sensitivity: (p.rolling_10yr_high != null && p.rolling_10yr_low != null)
      ? Math.round((p.rolling_10yr_high - p.rolling_10yr_low) * 100) / 100
      : null,
  }));

  return (
    <ScreenerClient
      portfolios={portfoliosWithAllocations}
      assetClasses={assetClasses}
    />
  );
}
