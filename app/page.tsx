import Link from 'next/link';
import { getPortfolios, getAllocations } from '@/lib/db';
import AIRecommend from '@/components/AIRecommend';
import FilterBar from '@/components/FilterBar';

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
    card: 'summary',
    title: 'PortfolioDB - Portfolio Performance Database',
    description: 'Compare lazy and tactical portfolio strategies by CAGR, Sharpe ratio, max drawdown, and more. Free database of 70+ portfolios with historical performance data.',
  },
};

export default async function Home() {
  // getPortfolios() already returns rows ordered by sharpe_ratio desc
  const allPortfolios = await getPortfolios();
  const top3 = allPortfolios.slice(0, 3);

  const benchmarks = await Promise.all(
    top3.map(async (p: any) => ({
      ...p,
      allocations: await getAllocations(p.slug),
    }))
  );

  return (
    <>
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
              <Link href="/database" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Ray Dalio All-Weather
              </Link>
              <Link href="/database" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Vanguard Target Date 2050
              </Link>
              <Link href="/database" className="text-[#27624a] hover:text-primary transition-colors font-medium">
                Permanent Portfolio
              </Link>
            </div>
          </section>

          {/* ── Benchmark Strategies ── */}
          <section className="col-span-12 mb-12">
            <div className="flex justify-between items-end mb-8 border-b border-surface-variant pb-3">
              <h2 className="font-manrope text-[28px] font-semibold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">monitoring</span>
                Benchmark Strategies
              </h2>
              <span className="font-inter text-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                Data since Jan 1970
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benchmarks.map((portfolio: any) => (
                <Link
                  key={portfolio.slug}
                  href={`/portfolios/${portfolio.slug}`}
                  className="bg-surface-container-lowest border border-surface-variant rounded-xl p-8 flex flex-col hover:border-outline-variant hover:shadow-md transition-all"
                >
                  {/* Portfolio name + arrow */}
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-inter text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      {portfolio.name}
                    </span>
                    <span className="material-symbols-outlined text-outline-variant text-base">
                      arrow_forward
                    </span>
                  </div>

                  {/* CAGR */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-4">
                      <span className="font-manrope text-[48px] leading-none text-primary font-bold">
                        {(portfolio.cagr ?? 0).toFixed(1)}%
                      </span>
                      <span className="font-inter text-sm flex items-center font-medium bg-[#e6f4ea] text-[#27624a] px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[18px] mr-1">trending_up</span>
                        Real CAGR
                      </span>
                    </div>
                  </div>

                  {/* Max Drawdown + Sharpe */}
                  <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-surface-variant">
                    <div>
                      <span className="block font-inter text-sm text-on-surface-variant mb-1">Max Drawdown</span>
                      <span className="font-inter text-[14px] text-on-surface font-semibold">
                        {(portfolio.max_drawdown ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="block font-inter text-sm text-on-surface-variant mb-1">Sharpe Ratio</span>
                      <span className="font-inter text-[14px] text-on-surface font-semibold">
                        {(portfolio.sharpe_ratio ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Allocation bar */}
                  {portfolio.allocations.length > 0 && (
                    <div className="mt-auto">
                      <span className="block font-inter text-sm text-on-surface-variant mb-2">
                        {portfolio.category === 'Tactical' ? 'Average Allocation' : 'Target Allocation'}
                      </span>
                      <div className="flex w-full h-3 rounded-full overflow-hidden">
                        {[...portfolio.allocations]
                          .sort((a: any, b: any) => b.percentage - a.percentage)
                          .map((alloc: any, i: number) => (
                            <div
                              key={alloc.id || i}
                              title={`${alloc.asset_class}: ${alloc.percentage}%`}
                              style={{
                                width: `${alloc.percentage}%`,
                                backgroundColor: alloc.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>

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

      {/* ── Footer ── */}
      <footer className="bg-surface-container-low border-t border-outline-variant w-full py-12 mt-auto">
        <div className="max-w-[1280px] mx-auto px-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-manrope text-lg font-bold text-on-surface">PortfolioDB</span>
            <p className="font-inter text-sm text-on-surface-variant">
              © 2024 PortfolioDB Analytics. Institutional-grade research.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {['Terms of Service', 'Privacy Policy', 'Methodology', 'Support'].map((item) => (
              <a
                key={item}
                href="#"
                className="font-inter text-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
