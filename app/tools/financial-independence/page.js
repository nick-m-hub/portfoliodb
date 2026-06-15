import nextDynamic from 'next/dynamic';
import { getPortfolioNames, getMonthlyReturns, getPortfolio } from '@/lib/db';

const FinancialIndependenceClient = nextDynamic(() => import('@/components/FinancialIndependenceClient'));

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Financial Independence Calculator - PortfolioDB',
  description: 'Estimate how many years it could take to reach financial independence with a given portfolio, savings rate, and spending target, based on 1,000 bootstrap simulations of historical returns.',
  alternates: { canonical: `${siteUrl}/tools/financial-independence` },
  openGraph: {
    title: 'Financial Independence Calculator - PortfolioDB',
    description: 'Estimate how many years it could take to reach financial independence with a given portfolio, savings rate, and spending target, based on 1,000 bootstrap simulations of historical returns.',
    url: `${siteUrl}/tools/financial-independence`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Financial Independence Calculator - PortfolioDB',
    description: 'Estimate how many years it could take to reach financial independence with a given portfolio, savings rate, and spending target, based on 1,000 bootstrap simulations of historical returns.',
  },
};

export default async function FinancialIndependencePage({ searchParams }) {
  const { slug: slugParam } = await searchParams;

  const allPortfolioNames = (await getPortfolioNames()) ?? [];
  const slug = slugParam || allPortfolioNames[0]?.slug || '';

  let initialReturns = [];
  let initialPortfolio = null;

  if (slug) {
    const [returns, portfolio] = await Promise.all([
      getMonthlyReturns(slug),
      getPortfolio(slug),
    ]);
    if (portfolio) {
      initialReturns = returns ?? [];
      initialPortfolio = portfolio;
    }
  }

  return (
    <FinancialIndependenceClient
      allPortfolioNames={allPortfolioNames}
      initialSlug={slug}
      initialReturns={initialReturns}
      initialPortfolio={initialPortfolio}
    />
  );
}
