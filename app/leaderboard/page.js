import { supabase } from '@/lib/supabase';
import LeaderboardClient from './LeaderboardClient';

export const revalidate = 86400; // revalidate once per day

export const metadata = {
  title: 'Portfolio Strategy Leaderboard | PortfolioDB',
  description: 'See which portfolio strategies are leading by YTD return, 1-year, 3-year, 10-year average return, and Sharpe ratio — updated monthly.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/leaderboard`,
  },
  openGraph: {
    title: 'Portfolio Strategy Leaderboard | PortfolioDB',
    description: 'See which portfolio strategies are leading by YTD return, 1-year, 3-year, 10-year average return, and Sharpe ratio — updated monthly.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/leaderboard`,
  },
};

async function getLeaderboardData() {
  const { data, error } = await supabase
    .from('portfolio_stats')
    .select('slug, name, category, ytd_return, cagr_1yr, cagr_3yr, cagr_10yr, sharpe_ratio, last_updated')
    .order('sharpe_ratio', { ascending: false });

  if (error) {
    console.error('leaderboard fetch error:', error.message);
    return [];
  }
  return data ?? [];
}

export default async function LeaderboardPage() {
  const portfolios = await getLeaderboardData();

  // Pull last_updated from the first portfolio that has it
  const lastUpdated = portfolios.find((p) => p.last_updated)?.last_updated ?? null;
  const displayDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">
            Strategy Leaderboard
          </h1>
          <p className="text-on-surface-variant text-sm">
            All {portfolios.length} strategies ranked by performance.
            {displayDate && <> Data through {displayDate}.</>}
          </p>
        </div>

        <LeaderboardClient portfolios={portfolios} />
      </div>
    </main>
  );
}
