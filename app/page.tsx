import Link from 'next/link';
import { getPortfolios, getAllAllocations } from '@/lib/db';
import AIRecommend from '@/components/AIRecommend';
import FilterBar from '@/components/FilterBar';
import TopStrategies from '@/components/TopStrategies';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// Used when an allocation row has no color stored in the DB
const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

export const metadata = {
  title: 'PortfolioDB - Portfolio Performance Database',
  description: 'Compare lazy and tactical portfolio strategies by CAGR, Sharpe ratio, max drawdown, and more. Free database of 70+ portfolios with historical performance data.',
  alternates: { canonical: `${siteUrl}/` },
  openGraph: {
    title: 'PortfolioDB - Portfolio Performance Database',
    description: 'Compare lazy and tactical portfolio strategies by CAGR, Sharpe ratio, max drawdown, and more. Free database of 70+ portfolios with historical performance data.',
    url: `${siteUrl}/`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PortfolioDB - Portfolio Performance Database',
    description: 'Compare lazy and tactical portfolio strategies by CAGR, Sharpe ratio, max drawdown, and more. Free database of 70+ portfolios with historical performance data.',
  },
};

export default async function Home() {
  // getPortfolios() already returns rows ordered by sharpe_ratio desc
  const [allPortfolios, allAllocations] = await Promise.all([
    getPortfolios(),
    getAllAllocations(),
  ]);

  // Group allocations by portfolio slug
  const allocsBySlug: Record<string, any[]> = {};
  for (const alloc of allAllocations) {
    if (!allocsBySlug[alloc.portfolio_slug]) allocsBySlug[alloc.portfolio_slug] = [];
    allocsBySlug[alloc.portfolio_slug].push(alloc);
  }
  const withAllocs = (portfolios: any[]) =>
    portfolios.map((p: any) => ({ ...p, allocations: allocsBySlug[p.slug] ?? [] }));

  const topSections = {
    sharpe:   withAllocs(allPortfolios.slice(0, 3)),
    cagr:     withAllocs([...allPortfolios].sort((a: any, b: any) => (b.cagr ?? 0) - (a.cagr ?? 0)).slice(0, 3)),
    drawdown: withAllocs([...allPortfolios].sort((a: any, b: any) => (b.max_drawdown ?? -100) - (a.max_drawdown ?? -100)).slice(0, 3)),
  };

  return (
    <main className="flex-grow flex justify-center w-full">
        <div className="w-full max-w-[1280px] grid grid-cols-12 gap-8 px-8 py-12 md:py-16">

          {/* ── Hero ── */}
          <section className="col-span-12 flex flex-col items-center text-center py-16 mb-4">

            {/* Trust badge */}
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#dbe8e0] text-[#4f6d5a] text-sm font-medium mb-8 font-inter">
              Trusted by 50,000+ DIY Investors
            </div>

            {/* Headline */}
            <h1 className="font-manrope text-[48px] md:text-[56px] leading-[1.1] text-on-surface font-bold mb-6 max-w-4xl tracking-tight">
              The Modern Engine for<br />
              <span className="text-[#27624a]">Growth-Focused</span> Portfolios
            </h1>

            {/* Subheading */}
            <p className="font-inter text-[18px] text-on-surface-variant mb-12 max-w-2xl leading-relaxed">
              Access institutional-grade asset allocation data and sophisticated screener
              tools designed for the modern individual investor.
            </p>

            {/* ── Filter bar ── */}
            <FilterBar />

            {/* ── AI Recommend bar ── */}
            <AIRecommend />

            {/* Popular links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm mt-8 font-inter">
              <span className="text-on-surface-variant">Popular:</span>
              <Link href="/portfolios/ray-dalios-all-weather-portfolio" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Ray Dalio All-Weather
              </Link>
              <Link href="/portfolios/permanent-portfolio" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Permanent Portfolio
              </Link>
              <Link href="/portfolios/bogleheads-three-fund-portfolio" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Bogleheads Three-Fund
              </Link>
            </div>
          </section>

          {/* ── Top Strategies ── */}
          <TopStrategies sections={topSections} />

          {/* ── Premium ── */}
          <section className="col-span-12 mb-12">
            <div className="bg-surface-container-low border border-surface-variant rounded-2xl p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">

              {/* Copy */}
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">stars</span>
                  <span className="font-inter text-[12px] font-semibold text-primary uppercase tracking-wider">
                    Premium Access
                  </span>
                </div>
                <h2 className="font-manrope text-[28px] font-semibold text-on-surface mb-6 tracking-tight">
                  Monthly Tactical Trade Signals
                </h2>
                <p className="font-inter text-[18px] text-on-surface-variant mb-8 leading-relaxed">
                  Take the guesswork out of rebalancing. Get actionable updates for selected
                  portfolios delivered straight to your inbox.
                </p>
                <ul className="flex flex-col gap-3 mb-8">
                  {[
                    'Real-time rebalancing alerts',
                    'Tactical allocation updates',
                    'Institutional-grade research',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 font-inter text-[15px] text-on-surface">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing card */}
              <div className="w-full md:w-auto flex-shrink-0 bg-surface-container-lowest p-8 rounded-xl border border-surface-variant text-center shadow-sm">
                <div className="font-manrope text-[40px] text-primary font-bold mb-2">
                  $49
                  <span className="font-inter text-[18px] text-on-surface-variant font-normal">/mo</span>
                </div>
                <p className="font-inter text-[15px] text-on-surface-variant mb-8">
                  Cancel anytime. No hidden fees.
                </p>
                <button className="w-full bg-primary text-on-primary font-inter text-[18px] font-medium py-3 px-8 rounded-full hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">
                  Join Premium
                </button>
              </div>
            </div>
          </section>

        </div>
    </main>
  );
}
