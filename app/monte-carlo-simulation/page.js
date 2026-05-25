import { getPortfolioNames, getMonthlyReturns, getPortfolio } from '@/lib/db';
import MonteCarloClient from '@/components/MonteCarloClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Monte Carlo Simulation - PortfolioDB',
  description: 'Run a Monte Carlo simulation on any portfolio strategy. Project retirement outcomes, test withdrawal sustainability, and analyze sequence of returns risk across 1,000 scenarios.',
  alternates: { canonical: `${siteUrl}/monte-carlo-simulation` },
  openGraph: {
    title: 'Monte Carlo Simulation - PortfolioDB',
    description: 'Project retirement outcomes across 1,000 simulated market scenarios.',
    url: `${siteUrl}/monte-carlo-simulation`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Monte Carlo Simulation - PortfolioDB' },
};

export default async function MonteCarloPage({ searchParams }) {
  const { slug } = await searchParams;

  const allPortfolioNames = await getPortfolioNames();

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
    <MonteCarloClient
      allPortfolioNames={allPortfolioNames ?? []}
      initialSlug={slug ?? ''}
      initialReturns={initialReturns}
      initialPortfolio={initialPortfolio}
    />
  );
}
