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
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Changelog | PortfolioDB',
    description: 'What\'s new on PortfolioDB — new portfolios, tools, data updates, and fixes.',
  },
};

const CHANGELOG = [
  {
    month: 'July 2026',
    entries: [
      {
        type: 'new',
        text: 'Efficient Frontier chart added to the Portfolio Builder (paid) — see where your custom mix sits relative to the best possible risk/return combinations of your selected portfolios.',
      },
      {
        type: 'improvement',
        text: 'Portfolio Builder — added Max Sortino as a 4th Auto-allocate option, optimizing weights for the best return relative to downside risk only (ignores upside volatility).',
      },
      {
        type: 'new',
        text: 'Efficient frontier line added to the Portfolio Map — see the best risk/return combinations across every portfolio in the database, plotted directly on the risk vs. return chart.',
      },
      {
        type: 'new',
        text: 'Volatility-Weighted Global Momentum Portfolio added — a tactical strategy holding the top 3 of 8 global asset classes by momentum, weighted by inverse volatility. Included in the monthly Signals trade alerts.',
      },
    ],
  },
  {
    month: 'June 2026',
    entries: [
      {
        type: 'new',
        text: 'Portfolio Map added — a risk vs. return scatter chart plotting every portfolio by volatility (or max drawdown) against CAGR, with category filters and a search box to highlight any portfolio.',
      },
      {
        type: 'new',
        text: 'Correlation Matrix added — a full pairwise correlation heatmap across every portfolio in the database. Filter by category or strategy, or click any pair to open both in the Portfolio Builder at equal weights.',
      },
      {
        type: 'improvement',
        text: 'Portfolio Builder — added an Auto-allocate menu with Equal Weight, Risk Parity, and Max Sharpe options to instantly reweight your mix.',
      },
      {
        type: 'new',
        text: 'Seasonality chart added to every portfolio detail page — average return by calendar month, so you can see which months have historically been strongest and weakest.',
      },
      {
        type: 'new',
        text: 'Drawdown History table added to every portfolio detail page — every historical decline of 3% or more, with depth, length, and recovery time.',
      },
      {
        type: 'improvement',
        text: 'Portfolio detail pages — added an "Analyze ▾" menu with quick links to Compare, Monte Carlo, Lump Sum vs. DCA, and the FI Calculator for that portfolio.',
      },
      {
        type: 'new',
        text: 'Ben Felix Model Portfolio - Timing added — a tactical version of the Ben Felix Model Portfolio with a 10-month moving average trend overlay.',
      },
      {
        type: 'improvement',
        text: 'Homepage redesigned — now leads with a live stat strip and a Tools Strip linking directly to the Builder, Monte Carlo, Correlation Matrix, and FI Calculator.',
      },
      {
        type: 'improvement',
        text: 'AI Portfolio Finder moved to the Database page — describe your goal and its picks now appear right above your filtered results.',
      },
      {
        type: 'new',
        text: 'Start Date Sensitivity chart added to every portfolio page — see how a 10-year holding period would have played out depending on when you started investing, with "Luckiest" and "Unluckiest" start annotations. The spread between best and worst is also shown as a Timing Sensitivity stat in the Performance Snapshot and as a column in the Portfolio Screener.',
      },
      {
        type: 'new',
        text: 'Lump Sum vs. DCA Calculator added — see how investing all at once compared to spreading contributions over 3, 6, or 12 months, across every historical starting period for any portfolio. Shows win rate, median ending values, and a chart of the lump sum advantage over time.',
      },
      {
        type: 'new',
        text: 'Financial Independence Calculator added — enter your income, savings rate, current savings, and target retirement spending to see a range of years to reach financial independence for any portfolio, based on 1,000 bootstrap simulations of historical returns. Toggle between Safe Withdrawal Rate (SWR) and Perpetual Withdrawal Rate (PWR) to set your FI Number.',
      },
      {
        type: 'improvement',
        text: 'Portfolio Builder is now free for any signed-in user — saved mixes, the full Performance Snapshot, charts, withdrawal rate analysis, and PDF export no longer require a paid plan. Just create a free account. Signals membership remains paid and adds monthly trade signals on top.',
      },
      {
        type: 'improvement',
        text: 'Portfolio Builder (paid): added Historical Drawdown chart, Rolling Returns chart, Safe/Perpetual Withdrawal Rate table, and Holding Period heatmap — the same analysis available on individual portfolio pages, now computed for any custom blend.',
      },
      {
        type: 'improvement',
        text: 'Portfolio Builder (paid): Performance Snapshot now shows 5 additional stats — Annualised Volatility, Best Month, Worst Month, % Profitable Months, and Longest Drawdown Duration.',
      },
      {
        type: 'new',
        text: 'Paul Merriman 4-Fund United States Portfolio added — equal 25% split across S&P 500, US Large Cap Value, US Small Cap Blend, and US Small Cap Value, with data going back to April 1993.',
      },
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
      {
        type: 'new',
        text: 'Holding Period Returns heatmap — every portfolio detail page now shows a triangular grid of annualised CAGR for every start year and holding period combination, up to 30 years. Hover any cell to see the exact return.',
      },
      {
        type: 'improvement',
        text: 'Portfolio detail page layout updated — Historical Drawdown, Rolling Returns chart, and Holding Period heatmap now span the full page width for easier reading.',
      },
      {
        type: 'improvement',
        text: '1-Year and 3-Year CAGR added to the Portfolio Comparison stats table.',
      },
      {
        type: 'improvement',
        text: 'Monte Carlo Simulation — four new inputs: monthly contribution, contribution duration, withdrawal delay (start withdrawals in a future year), and a Safe Withdrawal Rate result card showing the highest annual withdrawal rate at 90% success.',
      },
      {
        type: 'improvement',
        text: 'Monte Carlo Simulation — saved mixes from the Portfolio Builder now appear in the portfolio selector under "Custom Mixes" for logged-in members.',
      },
      {
        type: 'new',
        text: 'Withdrawal Rates table added to every portfolio detail page — shows Safe Withdrawal Rate and Perpetual Withdrawal Rate across 20, 25, 30, and 40-year horizons, in both nominal (fixed withdrawals) and real (inflation-adjusted) terms. Includes a "Passes the 4% Rule" badge when the 30-year real SWR is at or above 4%.',
      },
      {
        type: 'improvement',
        text: 'Portfolio detail page — all three charts (Growth of $10,000, Historical Drawdown, Rolling Returns) now span the full page width.',
      },
      {
        type: 'improvement',
        text: 'Portfolio detail pages now have a sticky jump navigation bar — click any section (Allocation, Performance, Rolling Returns, Withdrawal Rates, Strategy, Charts, Holding Period) to scroll directly to it. Active section highlights as you scroll.',
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
