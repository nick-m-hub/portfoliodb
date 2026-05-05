const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: "Methodology | PortfolioDB",
  description:
    "How PortfolioDB collects return data, calculates performance metrics, and rates portfolio risk. A plain-English explanation of every number on the site.",
  alternates: {
    canonical: `${siteUrl}/methodology`,
  },
  openGraph: {
    title: "Methodology | PortfolioDB",
    description:
      "How PortfolioDB collects return data, calculates performance metrics, and rates portfolio risk.",
    url: `${siteUrl}/methodology`,
    siteName: "PortfolioDB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Methodology | PortfolioDB",
    description:
      "How PortfolioDB collects return data, calculates performance metrics, and rates portfolio risk.",
  },
};

export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">

      {/* Page header */}
      <h1 className="font-manrope text-3xl font-bold text-on-surface mb-2">Methodology</h1>
      <p className="font-inter text-sm text-on-surface-variant mb-10">
        Last updated: May 2026
      </p>

      {/* Intro */}
      <section className="mb-10">
        <p className="text-base leading-relaxed">
          PortfolioDB tracks passive, rules-based investment portfolios — mostly
          buy-and-hold strategies built from low-cost ETFs. This page explains
          exactly where our data comes from, how we calculate every number you
          see on the site, and what the limitations of that data are. We believe
          in showing our work.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 1 — Data Sources */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">1. Return Data</h2>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-6 mb-2">Where the numbers come from</h3>
        <p className="text-base leading-relaxed mb-4">
          Monthly return figures are sourced from well-regarded financial data
          platforms and research tools that specialize in portfolio backtesting
          and tactical strategy analysis. We cross-reference multiple sources to
          catch discrepancies before any data goes into our database.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-6 mb-2">Total returns, not price returns</h3>
        <p className="text-base leading-relaxed mb-4">
          All returns on PortfolioDB are <strong>total returns</strong>, meaning
          dividends are included and assumed to be reinvested. This is the most
          meaningful way to measure long-term performance. Price-only returns
          (which ignore dividends) can significantly understate what an investor
          actually earned.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-6 mb-2">How data is stored</h3>
        <p className="text-base leading-relaxed mb-4">
          We store one number per portfolio per month: the portfolio&rsquo;s
          total return for that month, expressed as a percentage (e.g.,{" "}
          <code className="bg-surface-container px-1 rounded text-sm">+1.8</code> or{" "}
          <code className="bg-surface-container px-1 rounded text-sm">-0.9</code>). Every
          other number you see on the site — CAGR, current value, max drawdown,
          Sharpe ratio, and so on — is calculated automatically from this stream
          of monthly returns. Nothing is manually entered or adjusted after the
          fact.
        </p>

        <h3 className="font-inter text-base font-semibold text-on-surface mt-6 mb-2">Backtested vs. live data</h3>
        <p className="text-base leading-relaxed">
          Many portfolios on this site have histories that predate the ETFs used
          to implement them. In those cases, returns may use index data or
          simulated ETF equivalents for earlier periods, transitioning to actual
          ETF returns as funds became available. We note the start date for each
          portfolio. Backtested performance should be treated as illustrative,
          not a guarantee of future results.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 2 — Performance Metrics */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">2. Performance Metrics</h2>

        <p className="text-base leading-relaxed mb-6">
          All metrics are calculated from monthly return data. Here is what each
          one means and how it is derived.
        </p>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">
            CAGR — Compound Annual Growth Rate
          </h3>
          <p className="text-base leading-relaxed">
            CAGR is the annualized rate of return that would take a portfolio
            from its starting value to its ending value over a given period,
            assuming returns compound continuously. It is the single most useful
            summary of long-term performance. We calculate it by compounding
            each month&rsquo;s return in sequence — starting from a $10,000
            baseline — then converting the total growth into an annualized
            percentage.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">Current Value</h3>
          <p className="text-base leading-relaxed">
            The hypothetical value of a $10,000 investment made at the start of
            the portfolio&rsquo;s history, assuming all monthly returns are
            applied in sequence with no withdrawals or additional contributions.
            This is a useful way to compare growth across portfolios on an
            equal-dollar basis.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">Max Drawdown</h3>
          <p className="text-base leading-relaxed">
            Max drawdown is the largest peak-to-trough decline in portfolio
            value over the full history, expressed as a percentage. It
            represents the worst-case loss an investor would have experienced if
            they bought at the highest point and sold at the lowest point
            (before a full recovery). We calculate it from the running portfolio
            value derived from monthly returns — not from daily prices, which
            would produce more severe figures. Max drawdown is the metric we
            weight most heavily when assigning a risk level.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">Sharpe Ratio</h3>
          <p className="text-base leading-relaxed">
            The Sharpe ratio measures how much return a portfolio has generated
            per unit of risk (volatility). A higher Sharpe ratio means more
            return for the amount of risk taken. It is calculated by subtracting
            the risk-free rate from the portfolio&rsquo;s return, then dividing
            by the standard deviation of monthly returns.
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            <strong>Risk-free rate used:</strong> 4.5% annually (0.375% per
            month), approximating the long-run yield on short-term U.S.
            Treasury bills.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">Sortino Ratio</h3>
          <p className="text-base leading-relaxed">
            The Sortino ratio is similar to the Sharpe ratio, but it only
            penalizes for downside volatility — months where the portfolio lost
            money — rather than all volatility. This makes it a more useful
            measure for investors who don&rsquo;t mind upside swings but do care
            about losses. A higher Sortino ratio is better. We use the same
            4.5% annual risk-free rate as the Sharpe calculation.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="font-inter text-base font-semibold text-on-surface mb-1">Best Year / Worst Year</h3>
          <p className="text-base leading-relaxed">
            The calendar year with the highest and lowest total return,
            respectively, over the full history of the portfolio. These are
            calculated by grouping monthly returns into calendar years and
            compounding within each year. They give a quick sense of the range
            of outcomes an investor might have experienced.
          </p>
        </div>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 3 — Risk Rating */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">3. Risk Rating (1–5)</h2>
        <p className="text-base leading-relaxed mb-4">
          Every portfolio is assigned a risk level from 1 (most conservative)
          to 5 (most aggressive). The rating is based on two factors from the
          portfolio&rsquo;s full history: <strong>max drawdown</strong> and{" "}
          <strong>worst calendar year return</strong>. Both must qualify for a
          given level.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-outline-variant rounded-lg overflow-hidden">
            <thead className="bg-surface-container-low text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-on-surface">Risk Level</th>
                <th className="px-4 py-3 font-semibold text-on-surface">Max Drawdown</th>
                <th className="px-4 py-3 font-semibold text-on-surface">Worst Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <tr>
                <td className="px-4 py-3 font-medium">1 — Very Low</td>
                <td className="px-4 py-3">Below 12%</td>
                <td className="px-4 py-3">Better than −5%</td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3 font-medium">2 — Low</td>
                <td className="px-4 py-3">12%–22%</td>
                <td className="px-4 py-3">−5% to −15%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">3 — Moderate</td>
                <td className="px-4 py-3">22%–35%</td>
                <td className="px-4 py-3">−15% to −25%</td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3 font-medium">4 — High</td>
                <td className="px-4 py-3">35%–50%</td>
                <td className="px-4 py-3">−25% to −35%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">5 — Very High</td>
                <td className="px-4 py-3">Above 50%</td>
                <td className="px-4 py-3">Worse than −35%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-on-surface-variant mt-4">
          Both conditions must be met to qualify for a level. Risk ratings are
          backward-looking — they reflect historical behavior, not a prediction
          of future risk.
        </p>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 4 — Minimum Timeline */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">4. Minimum Suggested Timeline</h2>
        <p className="text-base leading-relaxed mb-4">
          Each portfolio is assigned a minimum suggested holding period based on
          its historical max drawdown. The idea is simple: if a portfolio has
          declined significantly in the past, an investor needs enough time to
          recover from a similar event in the future. These are guidelines, not
          guarantees.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-outline-variant rounded-lg overflow-hidden">
            <thead className="bg-surface-container-low text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-on-surface">Max Drawdown</th>
                <th className="px-4 py-3 font-semibold text-on-surface">Minimum Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <tr>
                <td className="px-4 py-3">Below 15%</td>
                <td className="px-4 py-3">3 years</td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3">15%–25%</td>
                <td className="px-4 py-3">5 years</td>
              </tr>
              <tr>
                <td className="px-4 py-3">25%–40%</td>
                <td className="px-4 py-3">7 years</td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="px-4 py-3">Above 40%</td>
                <td className="px-4 py-3">10 years</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 5 — Limitations */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">5. Important Limitations</h2>

        <ul className="space-y-4 text-base leading-relaxed">
          <li>
            <strong>Past performance is not a guarantee of future results.</strong>{" "}
            All statistics on this site are backward-looking. A portfolio that
            has done well historically may underperform — or lose money — going
            forward.
          </li>
          <li>
            <strong>No taxes or fees.</strong> All returns are shown gross —
            before taxes and before transaction costs. Your actual after-tax,
            after-fee returns will be lower. The size of that difference depends
            on the account type (taxable vs. tax-advantaged), your tax bracket,
            and the expense ratios of the specific funds used.
          </li>
          <li>
            <strong>No inflation adjustment.</strong> Returns are shown in
            nominal terms. A 7% return during a period of 4% inflation is a
            real gain of roughly 3%. We may add inflation-adjusted views in the
            future.
          </li>
          <li>
            <strong>Monthly, not daily.</strong> All calculations use
            end-of-month returns. Intra-month volatility is not captured. Max
            drawdown figures calculated from daily prices would typically be
            more severe than what we show.
          </li>
          <li>
            <strong>This is not financial advice.</strong> PortfolioDB is an
            informational and educational resource. Nothing on this site
            constitutes investment advice. Please consult a qualified financial
            advisor before making investment decisions.
          </li>
        </ul>
      </section>

      <hr className="my-8 border-outline-variant" />

      {/* Section 6 — Updates */}
      <section className="mb-10">
        <h2 className="font-manrope text-xl font-semibold text-primary mb-4">6. Data Updates</h2>
        <p className="text-base leading-relaxed">
          Portfolio returns are updated once per month, typically within the
          first week after each calendar month closes. All statistics recalculate
          automatically when new return data is added — no manual adjustment
          required. The &ldquo;Last Updated&rdquo; date shown on each portfolio
          page reflects when the most recent monthly return was entered.
        </p>
      </section>

      {/* Questions CTA */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-6 mt-4">
        <h2 className="font-inter text-base font-semibold text-on-surface mb-2">Questions or corrections?</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          If you spot something that looks wrong, or if you have a question
          about how a specific number is calculated, reach out via the contact
          page. We take data accuracy seriously and will investigate any
          reported discrepancies.
        </p>
      </section>

    </main>
  );
}
