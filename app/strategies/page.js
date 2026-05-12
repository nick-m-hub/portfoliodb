import Link from 'next/link';
import { getAllStrategiesWithCounts } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Portfolio Strategy Types | PortfolioDB',
  description: 'Browse all portfolio strategy types — from simple buy-and-hold to tactical momentum. Each category ranked by performance with backtested data from 1970.',
  alternates: { canonical: `${siteUrl}/strategies` },
  openGraph: {
    title: 'Portfolio Strategy Types | PortfolioDB',
    description: 'Browse all portfolio strategy types — from simple buy-and-hold to tactical momentum. Each category ranked by performance with backtested data from 1970.',
    url: `${siteUrl}/strategies`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portfolio Strategy Types | PortfolioDB',
    description: 'Browse all portfolio strategy types — from simple buy-and-hold to tactical momentum. Each category ranked by performance with backtested data from 1970.',
  },
};

const STRATEGY_INFO = {
  'all-weather': {
    label: 'All-Weather',
    brief: 'Designed to hold up across every economic environment — growth, recession, inflation, and deflation — by balancing exposure to all four regimes.',
    icon: 'partly_cloudy_day',
  },
  'bond-heavy': {
    label: 'Bond-Heavy',
    brief: 'Prioritizes capital preservation and income by allocating the majority of weight to fixed income. Lower volatility, lower long-term growth.',
    icon: 'shield',
  },
  'factor-tilt': {
    label: 'Factor Tilt',
    brief: 'Overweights specific risk factors — value, small-cap, profitability — that academic research has linked to long-term excess returns.',
    icon: 'trending_up',
  },
  'global': {
    label: 'Global',
    brief: 'Spreads exposure across multiple countries and regions to reduce concentration risk in any single market or economy.',
    icon: 'public',
  },
  'income': {
    label: 'Income',
    brief: 'Built to generate regular cash flow from dividends and bond interest, suited to investors who draw from their portfolio regularly.',
    icon: 'payments',
  },
  'momentum': {
    label: 'Momentum',
    brief: 'Rotates into recent outperformers and out of laggards, exploiting the tendency of short-to-medium term price trends to persist.',
    icon: 'speed',
  },
  'risk-parity': {
    label: 'Risk Parity',
    brief: 'Allocates by risk contribution rather than dollar weight, targeting equal volatility across asset classes — often with leverage on bonds.',
    icon: 'balance',
  },
  'robo-advisor': {
    label: 'Robo-Advisor',
    brief: 'Replicates the diversified index-fund allocations used by automated platforms like Betterment, Wealthfront, and Schwab.',
    icon: 'smart_toy',
  },
  'rules-based': {
    label: 'Rules-Based',
    brief: 'Follows a systematic, pre-defined process for buy, sell, and rebalance decisions with no discretionary judgment.',
    icon: 'rule',
  },
  'simple': {
    label: 'Simple',
    brief: 'Uses just two to four broadly diversified funds for solid risk-adjusted returns with minimal complexity and low cost.',
    icon: 'dashboard_customize',
  },
  'tactical': {
    label: 'Tactical',
    brief: 'Adjusts asset allocation in response to market conditions, moving to defensive positions before major downturns.',
    icon: 'swap_horiz',
  },
  'target-date': {
    label: 'Target Date',
    brief: 'Automatically shifts from growth to conservative allocations via a pre-set glide path as the target retirement year approaches.',
    icon: 'event',
  },
};

function slugToLabel(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default async function StrategiesPage() {
  const strategiesWithCounts = await getAllStrategiesWithCounts();

  const strategies = strategiesWithCounts.map((s) => ({
    ...s,
    ...(STRATEGY_INFO[s.strategy_slug] ?? { label: slugToLabel(s.strategy_slug), brief: '', icon: 'category' }),
  }));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">
      <h1 className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface mb-3">
        Portfolio Strategy Types
      </h1>
      <p className="text-base text-on-surface-variant mb-10 max-w-2xl">
        Browse all {strategies.length} strategy categories in the PortfolioDB database. Each page shows every portfolio tagged with that strategy, ranked by Sharpe ratio.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <Link
            key={s.strategy_slug}
            href={`/strategies/${s.strategy_slug}`}
            className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-primary hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="material-symbols-outlined text-primary text-[28px]">{s.icon}</span>
              <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full shrink-0">
                {s.count} {s.count === 1 ? 'portfolio' : 'portfolios'}
              </span>
            </div>
            <h2 className="font-manrope text-lg font-bold text-on-surface mb-1.5 group-hover:text-primary transition-colors">
              {s.label}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {s.brief}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
