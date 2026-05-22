import { getPortfolio, getAllocations, getMonthlyReturns, getPortfolioNames } from '@/lib/db';
import CompareClient from '@/components/CompareClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Compare Portfolios - PortfolioDB',
  description: 'Compare up to 4 index fund portfolio strategies side-by-side. Analyze CAGR, max drawdown, Sharpe ratio, allocations, and growth of $10,000.',
  alternates: { canonical: `${siteUrl}/compare` },
  openGraph: {
    title: 'Compare Portfolios - PortfolioDB',
    description: 'Compare up to 4 portfolio strategies side-by-side.',
    url: `${siteUrl}/compare`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Compare Portfolios - PortfolioDB' },
};

function buildGrowthData(monthlyReturns) {
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

export default async function ComparePage({ searchParams }) {
  const { slugs: slugsParam } = await searchParams;
  const rawSlugs = typeof slugsParam === 'string' ? slugsParam.split(',').filter(Boolean) : [];
  const slugs = [...new Set(rawSlugs)].slice(0, 4);

  const allPortfolioNames = await getPortfolioNames();

  if (!slugs.length) {
    return <CompareClient allPortfolioNames={allPortfolioNames} portfolios={[]} />;
  }

  const portfolioResults = await Promise.all(
    slugs.map(async (slug) => {
      const [portfolio, allocations, monthlyReturns] = await Promise.all([
        getPortfolio(slug),
        getAllocations(slug),
        getMonthlyReturns(slug),
      ]);
      if (!portfolio) return null;
      return {
        ...portfolio,
        allocations: allocations ?? [],
        growthData: buildGrowthData(monthlyReturns),
      };
    })
  );

  const portfolios = portfolioResults.filter(Boolean);

  return <CompareClient allPortfolioNames={allPortfolioNames} portfolios={portfolios} />;
}
