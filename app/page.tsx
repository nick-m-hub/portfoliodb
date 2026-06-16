import Link from 'next/link';
import { getPortfolios, getAllAllocations, getSignalPortfolioCount } from '@/lib/db';
import FilterBar from '@/components/FilterBar';
import TopStrategies from '@/components/TopStrategies';
import EmailCapture from '@/components/EmailCapture';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

const TOOLS = [
  {
    href: '/builder',
    icon: 'tune',
    name: 'Portfolio Builder',
    description: 'Mix portfolios, see blended stats, and save your custom combination.',
  },
  {
    href: '/monte-carlo-simulation',
    icon: 'query_stats',
    name: 'Monte Carlo Simulation',
    description: "Run 1,000 simulations to see your portfolio's survival odds in retirement.",
  },
  {
    href: '/tools/correlation',
    icon: 'grid_on',
    name: 'Correlation Matrix',
    description: 'Find portfolios that move independently of each other to reduce risk.',
  },
  {
    href: '/tools/financial-independence',
    icon: 'savings',
    name: 'FI Calculator',
    description: 'Calculate how many years until your portfolio supports full financial independence.',
  },
];

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
  const [allPortfolios, allAllocations, signalCount] = await Promise.all([
    getPortfolios(),
    getAllAllocations(),
    getSignalPortfolioCount(),
  ]);

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

  const portfolioCount = allPortfolios.length;
  const yearsOfData = new Date().getFullYear() - 1970;

  return (
    <main className="flex-grow flex justify-center w-full">
      <div className="w-full max-w-[1280px] grid grid-cols-12 gap-y-8 md:gap-8 px-8 py-12 md:py-16">

        {/* ── Hero ── */}
        <section className="col-span-12 flex flex-col items-center text-center py-16 mb-4">

          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low border border-outline-variant text-on-surface-variant text-sm font-medium mb-6 font-inter">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            Trusted by 20,000+ DIY Investors
          </div>

          {/* Headline */}
          <h1 className="font-manrope text-[48px] md:text-[56px] leading-[1.1] text-on-surface font-bold mb-6 max-w-4xl tracking-tight">
            75+ Portfolio Strategies,<br />
            <span className="text-[#27624a]">Backtested Since 1970</span>
          </h1>

          {/* Subheading */}
          <p className="font-inter text-[18px] text-on-surface-variant mb-10 max-w-2xl leading-relaxed">
            Compare lazy and tactical portfolios by CAGR, Sharpe ratio, max drawdown, and rolling returns. Find your strategy, then get monthly rebalancing signals.
          </p>

          {/* ── Stat strip ── */}
          <div className="flex items-stretch mb-10 bg-surface-container-lowest border border-surface-variant rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-r border-surface-variant text-center">
              <div className="font-manrope text-[32px] font-bold text-primary leading-none">{portfolioCount}</div>
              <div className="font-inter text-[11px] text-on-surface-variant mt-1.5 font-medium">portfolios tracked</div>
            </div>
            <div className="px-8 py-5 border-r border-surface-variant text-center">
              <div className="font-manrope text-[32px] font-bold text-primary leading-none">{yearsOfData}</div>
              <div className="font-inter text-[11px] text-on-surface-variant mt-1.5 font-medium">years of data</div>
            </div>
            <div className="px-8 py-5 border-r border-surface-variant text-center">
              <div className="font-manrope text-[32px] font-bold text-primary leading-none">{signalCount}</div>
              <div className="font-inter text-[11px] text-on-surface-variant mt-1.5 font-medium">signal portfolios</div>
            </div>
            <div className="px-8 py-5 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">check_circle</span>
              <div className="font-inter text-[11px] text-on-surface-variant mt-1.5 font-medium">free to use</div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <FilterBar />

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

        {/* ── Tools Strip ── */}
        <section className="col-span-12 mb-12">
          <div className="mb-6">
            <h2 className="font-manrope text-[22px] font-semibold text-on-surface mb-1">Explore the Tools</h2>
            <p className="font-inter text-[14px] text-on-surface-variant">Free analysis tools built around the same {yearsOfData}-year dataset.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="bg-surface-container-lowest border border-surface-variant rounded-xl p-5 flex flex-col gap-3 hover:border-outline-variant hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 bg-surface-container-low rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">{tool.icon}</span>
                </div>
                <div>
                  <div className="font-manrope text-[14px] font-semibold text-on-surface mb-1">{tool.name}</div>
                  <div className="font-inter text-[12px] text-on-surface-variant leading-relaxed">{tool.description}</div>
                </div>
                <div className="font-inter text-[12px] font-medium text-[#27624a] flex items-center gap-1 mt-auto">
                  Try it
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Email Capture ── */}
        <section className="col-span-12">
          <EmailCapture />
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
              <h2 className="font-manrope text-[28px] font-semibold text-on-surface mb-4 tracking-tight">
                Monthly Signals for {signalCount} Portfolios
              </h2>
              <p className="font-inter text-[18px] text-on-surface-variant mb-8 leading-relaxed">
                Every month: what to buy, what to sell, and a plain-English summary of what drove the rotation.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  `Exact ticker allocations for ${signalCount} covered portfolios`,
                  'Month-over-month diff — what entered, what exited',
                  "Brief market context: the macro theme behind that month's changes",
                  'Full Portfolio Builder + PDF export, free with any account',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-inter text-[15px] text-on-surface">
                    <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <Link
                href="/membership"
                className="bg-primary text-on-primary font-inter text-[16px] font-semibold py-3 px-8 rounded-full hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
              >
                See Membership Options
              </Link>
              <p className="font-inter text-[13px] text-on-surface-variant">Cancel anytime. No hidden fees.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
