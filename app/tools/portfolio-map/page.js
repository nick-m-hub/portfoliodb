import { supabase } from '@/lib/supabase';
import PortfolioMapClient from './PortfolioMapClient';

export const metadata = {
  title: 'Portfolio Risk vs. Return Map | PortfolioDB',
  description: 'See every portfolio strategy plotted by annualized volatility and CAGR. Instantly spot which strategies offer the best return for their level of risk.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/portfolio-map`,
  },
  openGraph: {
    title: 'Portfolio Risk vs. Return Map | PortfolioDB',
    description: 'See every portfolio strategy plotted by annualized volatility and CAGR. Instantly spot which strategies offer the best return for their level of risk.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/portfolio-map`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portfolio Risk vs. Return Map | PortfolioDB',
    description: 'See every portfolio strategy plotted by annualized volatility and CAGR. Instantly spot which strategies offer the best return for their level of risk.',
  },
};

async function getMapData() {
  const { data, error } = await supabase
    .from('portfolio_stats')
    .select('slug, name, category, cagr, annualized_volatility, sharpe_ratio, max_drawdown')
    .not('annualized_volatility', 'is', null)
    .not('cagr', 'is', null)
    .order('cagr', { ascending: false });

  if (error) {
    console.error('getMapData error:', error.message);
    return [];
  }
  return data;
}

export default async function PortfolioMapPage() {
  const portfolios = await getMapData();

  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">
            Portfolio Map
          </h1>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Every portfolio mapped by risk and return. Toggle the X-axis between annualized volatility and max drawdown for two views of risk — portfolios in the upper-left of the chart are the most efficient. Filter by category, search by name, or narrow to a 10- or 20-year window to compare portfolios over the same period. Hover any dot for stats, click to open the portfolio.
          </p>
        </div>
        <PortfolioMapClient portfolios={portfolios} />
      </div>
    </main>
  );
}
