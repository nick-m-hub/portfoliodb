export const metadata = {
  title: 'Changelog | PortfolioDB',
  description: 'What\'s new on PortfolioDB — new portfolios, tools, data updates, and fixes.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/changelog`,
  },
  openGraph: {
    title: 'Changelog | PortfolioDB',
    description: 'What\'s new on PortfolioDB — new portfolios, tools, data updates, and fixes.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/changelog`,
  },
};

const CHANGELOG = [
  {
    month: 'June 2026',
    entries: [
      {
        type: 'new',
        text: 'JL Collins Wealth Preservation Portfolio added — 50% stocks, 25% real estate, 20% bonds, 5% cash, with data going back to 1996.',
      },
      {
        type: 'new',
        text: 'Strategy Leaderboard — rank all 75 portfolios by trailing 1-year, 3-year, 10-year return, or Sharpe ratio.',
      },
      {
        type: 'new',
        text: 'Drawdown Analyzer — pick a market crash (dot-com, 2008, COVID, 2022) or enter a custom date range to see how every portfolio held up. Shows total return and max drawdown within the window, with a vs US 60/40 comparison on every row.',
      },
      {
        type: 'new',
        text: 'Changelog launched — so you can see what\'s new each month.',
      },
      {
        type: 'improvement',
        text: 'Signals members now see their real current holdings on tactical portfolio pages instead of the blurred placeholder.',
      },
      {
        type: 'improvement',
        text: 'Navbar reorganized — Compare, Builder, Monte Carlo, Leaderboard, and Drawdown Analyzer are now grouped under a Tools menu.',
      },
      {
        type: 'improvement',
        text: 'Account page now clearly shows your access expiry date regardless of subscription status.',
      },
    ],
  },
  {
    month: 'May 2026',
    entries: [
      {
        type: 'new',
        text: 'Portfolio Builder PDF export — download a full analysis report of your custom mix, including stats, annual returns vs benchmarks, and rolling return charts. Available to Builder and Signals members.',
      },
      {
        type: 'new',
        text: 'Monte Carlo Simulation tool — stress-test any portfolio against 1,000 simulated futures. Model withdrawals, inflation, and sequence-of-returns risk.',
      },
      {
        type: 'new',
        text: 'Portfolio Comparison — compare up to 4 portfolios side-by-side with a shared growth chart, stats table, and allocation breakdowns.',
      },
      {
        type: 'new',
        text: 'Portfolio Builder — blend up to 6 portfolios into a custom mix and see the combined stats, Growth of $10K, and current holdings. Save mixes with a Builder or Signals membership.',
      },
      {
        type: 'new',
        text: 'Membership launched — Builder ($9/mo annual) unlocks saved mixes and performance snapshots. Signals ($19/mo annual) adds monthly trade signals for all covered portfolios.',
      },
      {
        type: 'new',
        text: 'US Stock Market and Global Stock Market portfolios added, with data going back to 1980 and 1999 respectively. Available as chart benchmarks on every portfolio page.',
      },
      {
        type: 'new',
        text: 'Ben Felix Model Portfolio added — a factor-tilted, globally diversified portfolio with data back to 1995.',
      },
      {
        type: 'new',
        text: 'Blog launched — articles covering portfolio theory, strategy comparisons, and how to interpret the data on this site.',
      },
      {
        type: 'new',
        text: 'Free PDF report — "How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years." Sign up with your email on the homepage to get it.',
      },
      {
        type: 'improvement',
        text: 'Screener column picker — choose from 23 columns including rolling return windows (1Y/3Y/5Y/10Y) and crisis-period returns for the dot-com crash and 2008 financial crisis.',
      },
      {
        type: 'improvement',
        text: 'Stat tooltips added — click the info icon next to any stat to see a plain-English definition.',
      },
      {
        type: 'improvement',
        text: 'YTD Return now shown on portfolio detail pages, the screener, and the database.',
      },
      {
        type: 'improvement',
        text: 'Chart benchmarks expanded — compare any portfolio against US 60/40, US Stocks, or Global Stocks on the Growth, Drawdown, and Rolling Return charts.',
      },
      {
        type: 'improvement',
        text: 'Tactical Permanent Portfolio data corrected to match the original GestaltU rules — risk-parity weighting with a volatility target, replacing the previous equal-weight approximation.',
      },
    ],
  },
  {
    month: 'April 2026',
    entries: [
      {
        type: 'new',
        text: 'Strategy pages — browse all 12 strategy types (momentum, factor-tilt, global, income, and more) with ranked comparisons of every portfolio in each category.',
      },
      {
        type: 'new',
        text: 'Glossary of Terms — plain-English definitions for 30 investing and portfolio analysis terms.',
      },
      {
        type: 'improvement',
        text: 'Crisis-period stats added — see each portfolio\'s annualized return during the dot-com crash (2000–2002) and the 2008 financial crisis (2007–2009).',
      },
      {
        type: 'improvement',
        text: 'Rolling return charts added — see 1, 3, 5, and 10-year rolling returns for every portfolio, with optional benchmark overlay.',
      },
      {
        type: 'improvement',
        text: 'Ulcer Index and Ulcer Performance Index added to portfolio stats — measures the depth and duration of drawdowns, not just the worst single drop.',
      },
      {
        type: 'improvement',
        text: 'Related Portfolios shown at the bottom of every portfolio page — similar strategies ranked by Sharpe ratio.',
      },
    ],
  },
  {
    month: 'March 2026',
    entries: [
      {
        type: 'new',
        text: 'PortfolioDB.com launched — 70+ portfolio strategies, all backtested from 1970 with live data.',
      },
      {
        type: 'new',
        text: 'Portfolio Database — filter by category, risk level, asset exposure, strategy type, and max drawdown.',
      },
      {
        type: 'new',
        text: 'Portfolio Screener — filter and rank portfolios using 11 performance metrics, with CSV export.',
      },
      {
        type: 'new',
        text: 'Portfolio detail pages — allocation breakdown, Growth of $10K chart, Historical Drawdown chart, and full performance stats.',
      },
      {
        type: 'new',
        text: 'AI Portfolio Finder — describe your investing goal in plain English and get tailored portfolio recommendations.',
      },
    ],
  },
];

const TYPE_STYLES = {
  new: { label: 'New', classes: 'bg-[#e8f5e9] text-[#27624a]' },
  improvement: { label: 'Improvement', classes: 'bg-[#e3f2fd] text-[#1565c0]' },
  fix: { label: 'Fix', classes: 'bg-[#fff3e0] text-[#e65100]' },
};

export default function ChangelogPage() {
  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">Changelog</h1>
        <p className="text-on-surface-variant mb-10">
          New portfolios, tools, data updates, and fixes — updated monthly.
        </p>

        <div className="space-y-12">
          {CHANGELOG.map((section) => (
            <div key={section.month}>
              <h2 className="font-manrope font-bold text-lg text-on-surface mb-4 pb-2 border-b border-outline-variant">
                {section.month}
              </h2>
              <ul className="space-y-3">
                {section.entries.map((entry, i) => {
                  const style = TYPE_STYLES[entry.type];
                  return (
                    <li key={i} className="flex gap-3 items-start">
                      <span
                        className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${style.classes}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-on-surface-variant text-sm leading-relaxed">
                        {entry.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
