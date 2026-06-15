import { cookies } from 'next/headers';
import nextDynamic from 'next/dynamic';
import { getPortfolioNames, getMonthlyReturns, getPortfolio } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

const MonteCarloClient = nextDynamic(() => import('@/components/MonteCarloClient'));

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Monte Carlo Simulation - PortfolioDB',
  description: 'Run a Monte Carlo simulation on any portfolio strategy. Project retirement outcomes, test withdrawal sustainability, and analyze sequence of returns risk across 1,000 scenarios.',
  alternates: { canonical: `${siteUrl}/monte-carlo-simulation` },
  openGraph: {
    title: 'Monte Carlo Simulation - PortfolioDB',
    description: 'Run a Monte Carlo simulation on any portfolio strategy. Project retirement outcomes, test withdrawal sustainability, and analyze sequence of returns risk across 1,000 scenarios.',
    url: `${siteUrl}/monte-carlo-simulation`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Monte Carlo Simulation - PortfolioDB',
    description: 'Run a Monte Carlo simulation on any portfolio strategy. Project retirement outcomes and sequence of returns risk across 1,000 scenarios.',
  },
};

export default async function MonteCarloPage({ searchParams }) {
  const { slug } = await searchParams;

  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const [allPortfolioNames, savedMixesResult] = await Promise.all([
    getPortfolioNames(),
    user
      ? supabase.from('user_portfolios').select('id, name, selections').eq('user_id', user.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const savedMixes = savedMixesResult.data ?? [];

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
      savedMixes={savedMixes}
      initialSlug={slug ?? ''}
      initialReturns={initialReturns}
      initialPortfolio={initialPortfolio}
    />
  );
}
