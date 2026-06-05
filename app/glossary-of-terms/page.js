const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: "Glossary of Terms | PortfolioDB",
  description:
    "Plain-English definitions of the investing terms, performance metrics, and portfolio strategies used on PortfolioDB.",
  alternates: {
    canonical: `${siteUrl}/glossary-of-terms`,
  },
  openGraph: {
    title: "Glossary of Terms | PortfolioDB",
    description:
      "Plain-English definitions of the investing terms, performance metrics, and portfolio strategies used on PortfolioDB.",
    url: `${siteUrl}/glossary-of-terms`,
    siteName: "PortfolioDB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Glossary of Terms | PortfolioDB",
    description:
      "Plain-English definitions of the investing terms, performance metrics, and portfolio strategies used on PortfolioDB.",
  },
};

const ACTIVE_LETTERS = new Set([
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "M", "P", "R", "S", "T", "U", "V",
]);
const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function LetterSection({ letter, children }) {
  return (
    <section id={letter} className="mb-10 scroll-mt-6">
      <div className="flex items-center gap-4 mb-4">
        <span className="font-manrope text-2xl font-bold text-primary w-8 shrink-0">
          {letter}
        </span>
        <hr className="flex-1 border-outline-variant" />
      </div>
      <dl className="space-y-6">{children}</dl>
    </section>
  );
}

function Term({ id, term, children }) {
  return (
    <div id={id} className="scroll-mt-6">
      <dt className="font-inter text-base font-semibold text-on-surface mb-1">
        {term}
      </dt>
      <dd className="text-base leading-relaxed text-on-surface ml-0">
        {children}
      </dd>
    </div>
  );
}

export default function GlossaryOfTermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">

      {/* Page header */}
      <h1 className="font-manrope text-3xl font-bold text-on-surface mb-2">
        Glossary of Terms
      </h1>
      <p className="font-inter text-sm text-on-surface-variant mb-8">
        Plain-English definitions for the metrics, strategies, and concepts used
        across PortfolioDB.
      </p>

      {/* Alphabet nav */}
      <nav
        aria-label="Jump to letter"
        className="flex flex-wrap gap-1 mb-10 p-4 bg-surface-container-low border border-outline-variant rounded-xl"
      >
        {ALL_LETTERS.map((l) =>
          ACTIVE_LETTERS.has(l) ? (
            <a
              key={l}
              href={`#${l}`}
              className="w-8 h-8 flex items-center justify-center rounded font-manrope text-sm font-semibold text-primary hover:bg-surface-container transition-colors"
            >
              {l}
            </a>
          ) : (
            <span
              key={l}
              className="w-8 h-8 flex items-center justify-center font-manrope text-sm text-outline-variant select-none"
            >
              {l}
            </span>
          )
        )}
      </nav>

      {/* ── A ── */}
      <LetterSection letter="A">
        <Term id="asset-allocation" term="Asset Allocation">
          The mix of asset classes — stocks, bonds, real estate, commodities,
          and so on — that a portfolio holds. Asset allocation is typically the
          single biggest driver of long-term returns and risk. Two portfolios
          with identical assets but different proportions can behave very
          differently over time.
        </Term>
        <Term id="asset-class" term="Asset Class">
          A broad category of investments that share similar characteristics and
          tend to move together in the market. The main asset classes tracked on
          PortfolioDB are equities, fixed income, commodities, real estate
          (REITs), and alternatives.
        </Term>
      </LetterSection>

      {/* ── B ── */}
      <LetterSection letter="B">
        <Term id="backtesting" term="Backtesting">
          Running a portfolio strategy through historical market data to see how
          it would have performed. All return histories on PortfolioDB are
          backtested for periods before the relevant ETFs existed, and live data
          after. Backtested results are illustrative -- they do not guarantee
          future performance and may reflect decisions that were obvious only in
          hindsight.
        </Term>
        <Term id="benchmark" term="Benchmark">
          A reference portfolio used to put performance in context. On
          PortfolioDB, the default benchmark is the{" "}
          <a
            href="/portfolios/united-states-60-40-portfolio"
            className="text-primary underline underline-offset-2"
          >
            US 60/40 Portfolio
          </a>{" "}
          — 60% US stocks and 40% US bonds — which represents a conventional
          balanced investor.
        </Term>
        <Term id="bonds" term="Bonds / Fixed Income">
          Loans made to governments or corporations that pay a fixed rate of
          interest over time. Bonds are typically less volatile than stocks but
          offer lower long-term returns. They play a stabilizing role in
          diversified portfolios, often rising when stocks fall.
        </Term>
        <Term id="buy-and-hold" term="Buy and Hold">
          An investment approach where you build a fixed portfolio and hold it
          for the long term, rebalancing periodically to restore target weights
          but never trying to time the market. Most portfolios in the PortfolioDB
          database are buy-and-hold strategies.
        </Term>
      </LetterSection>

      {/* ── C ── */}
      <LetterSection letter="C">
        <Term id="cagr" term="CAGR — Compound Annual Growth Rate">
          The annualized rate of return that would take a portfolio from its
          starting value to its ending value over a given period, assuming
          returns compound continuously. CAGR is the most useful single summary
          of long-term performance because it smooths out the year-to-year
          variability. See the{" "}
          <a
            href="/methodology"
            className="text-primary underline underline-offset-2"
          >
            Methodology page
          </a>{" "}
          for how we calculate it.
        </Term>
        <Term id="commodities" term="Commodities">
          Raw materials and physical goods traded on global markets -- gold,
          silver, oil, agricultural products, and industrial metals. Commodities
          can act as an inflation hedge and provide diversification because they
          often move independently of stocks and bonds. Many portfolios hold
          commodities through broad ETFs or via a dedicated gold allocation.
        </Term>
        <Term id="compound-interest" term="Compound Interest">
          Earning returns on your returns. When investment gains are reinvested
          rather than withdrawn, the portfolio grows at an accelerating rate over
          time. All returns on PortfolioDB assume full reinvestment of dividends
          and income (total returns), which is why the difference between a 6%
          and an 8% CAGR compounds dramatically over decades.
        </Term>
      </LetterSection>

      {/* ── D ── */}
      <LetterSection letter="D">
        <Term id="diversification" term="Diversification">
          Spreading investments across multiple asset classes, geographies, or
          strategies so that no single holding dominates performance. The goal is
          to reduce risk without proportionally reducing expected return. A
          well-diversified portfolio may hold assets that sometimes move in
          opposite directions, cushioning losses during market downturns.
        </Term>
        <Term id="drawdown-duration" term="Drawdown Duration">
          The number of consecutive months a portfolio remained below its prior
          peak value. While{" "}
          <a href="#max-drawdown" className="text-primary underline underline-offset-2">
            max drawdown
          </a>{" "}
          measures how deep a loss was, drawdown duration measures how long
          recovery took. A portfolio might have a moderate max drawdown but take
          years to fully recover, which can be just as punishing for investors
          who need to stay the course. PortfolioDB displays the longest
          historical drawdown duration in the Performance Snapshot on every
          portfolio detail page.
        </Term>
        <Term id="dual-momentum" term="Dual Momentum">
          A strategy developed by Gary Antonacci that combines two momentum
          signals: relative momentum (which asset class is outperforming peers)
          and absolute momentum (whether an asset is in an uptrend relative to
          cash at all). When absolute momentum turns negative, the strategy moves
          to the safety of short-term bonds or cash. See the{" "}
          <a
            href="/portfolios/gem-dual-momentum"
            className="text-primary underline underline-offset-2"
          >
            GEM Dual Momentum
          </a>{" "}
          portfolio for an example.
        </Term>
      </LetterSection>

      {/* ── E ── */}
      <LetterSection letter="E">
        <Term id="equities" term="Equities / Stocks">
          Ownership shares in publicly traded companies. Equities have
          historically delivered the highest long-term returns of any major asset
          class but also carry the highest volatility and deepest drawdowns. A
          heavy equity allocation is appropriate for investors with long time
          horizons and the temperament to hold through large losses.
        </Term>
        <Term id="etf" term="ETF — Exchange-Traded Fund">
          A fund that holds a basket of assets (such as every stock in an index)
          and trades on an exchange like a single stock. ETFs make it easy to
          implement diversified portfolio strategies at low cost. Almost every
          portfolio on PortfolioDB can be built with a small number of broad-
          market ETFs.
        </Term>
      </LetterSection>

      {/* ── F ── */}
      <LetterSection letter="F">
        <Term id="factor-investing" term="Factor Investing">
          An approach that tilts a portfolio toward specific characteristics
          ("factors") -- like small-cap stocks, value stocks, or high-momentum
          stocks -- that have historically outperformed the broad market over
          long periods. Factor investing sits between passive index investing and
          active stock picking. Common factors include size, value, momentum,
          profitability, and low volatility.
        </Term>
      </LetterSection>

      {/* ── G ── */}
      <LetterSection letter="G">
        <Term id="global-asset-allocation" term="Global Asset Allocation">
          A portfolio strategy that diversifies broadly across multiple asset
          classes and geographies -- stocks, bonds, commodities, real estate --
          rather than concentrating in a single country or region. The idea is
          that no one asset class leads forever, so spreading globally smooths
          returns over time. Examples include the{" "}
          <a
            href="/portfolios/ray-dalios-all-weather-portfolio"
            className="text-primary underline underline-offset-2"
          >
            All Weather Portfolio
          </a>{" "}
          and the{" "}
          <a
            href="/portfolios/ivy-portfolio-faber"
            className="text-primary underline underline-offset-2"
          >
            Ivy Portfolio
          </a>
          .
        </Term>
      </LetterSection>

      {/* ── H ── */}
      <LetterSection letter="H">
        <Term id="holding-period" term="Holding Period">
          The length of time an investor holds a portfolio before selling. The
          Holding Period Heatmap on every portfolio detail page shows the
          annualized CAGR for every combination of start year and holding length
          in the historical record — letting you see at a glance how results
          varied depending on when you started and how long you stayed invested.
          A long holding period generally reduces the risk of poor outcomes
          because short-term volatility smooths out over time.
        </Term>
      </LetterSection>

      {/* ── I ── */}
      <LetterSection letter="I">
        <Term id="index-fund" term="Index Fund">
          A fund that tracks a market index -- like the S&P 500 or the global
          bond market -- rather than trying to pick individual winners. Index
          funds offer broad diversification at very low cost. They are the
          building blocks of most portfolios on PortfolioDB.
        </Term>
      </LetterSection>

      {/* ── M ── */}
      <LetterSection letter="M">
        <Term id="monte-carlo" term="Monte Carlo Simulation">
          A technique that runs thousands of randomized scenarios to estimate
          the range of possible future outcomes for a portfolio. Rather than
          projecting a single average return, a Monte Carlo simulation randomly
          samples from the portfolio&rsquo;s historical return distribution to
          produce a spread of results -- from optimistic to pessimistic. The{" "}
          <a
            href="/monte-carlo-simulation"
            className="text-primary underline underline-offset-2"
          >
            PortfolioDB Monte Carlo tool
          </a>{" "}
          runs 1,000 simulations and reports the median outcome alongside 10th
          and 90th percentile results, along with the Safe Withdrawal Rate at
          which 90% of simulations survive.
        </Term>
        <Term id="max-drawdown" term="Max Drawdown">
          The largest peak-to-trough decline in portfolio value over the full
          historical record, expressed as a percentage. It represents the
          worst-case loss an investor would have experienced if they bought at
          the highest point and sold at the lowest (before recovery). On
          PortfolioDB, max drawdown is the primary input for both the risk rating
          and the minimum suggested timeline. See the{" "}
          <a
            href="/methodology"
            className="text-primary underline underline-offset-2"
          >
            Methodology page
          </a>{" "}
          for details.
        </Term>
        <Term id="momentum" term="Momentum Investing">
          A strategy based on the observation that assets that have recently
          outperformed tend to continue outperforming in the near term.
          Momentum strategies rotate into recent winners and out of recent losers
          on a regular schedule. It is one of the most studied and persistent
          factors in financial research, though it can suffer sharp reversals
          during sudden market regime changes.
        </Term>
      </LetterSection>

      {/* ── P ── */}
      <LetterSection letter="P">
        <Term id="perpetual-withdrawal-rate" term="PWR — Perpetual Withdrawal Rate">
          The highest annual withdrawal rate at which a portfolio would have
          maintained its real (inflation-adjusted) purchasing power at the end
          of the period -- not just avoided running dry. PWR is a stricter
          standard than the{" "}
          <a href="#safe-withdrawal-rate" className="text-primary underline underline-offset-2">
            Safe Withdrawal Rate
          </a>
          : the portfolio must finish at least as large as it started in real
          terms. It is the appropriate benchmark for investors who need their
          portfolio to last indefinitely rather than just for a fixed number of
          years. PortfolioDB displays PWR alongside SWR across 20-, 25-, 30-,
          and 40-year horizons on every portfolio detail page.
        </Term>
      </LetterSection>

      {/* ── R ── */}
      <LetterSection letter="R">
        <Term id="real-estate" term="Real Estate / REITs">
          Real Estate Investment Trusts (REITs) are companies that own
          income-producing properties -- office buildings, apartment complexes,
          shopping centers, and more. REIT index funds provide exposure to real
          estate returns without owning property directly. REITs are often
          included in diversified portfolios for their income and partial
          inflation-hedging properties.
        </Term>
        <Term id="rebalancing" term="Rebalancing">
          Periodically restoring a portfolio back to its target allocation. If
          stocks have grown from 60% to 70% of a portfolio after a bull market,
          rebalancing means selling some stocks and buying other assets to restore
          the 60% target. Most buy-and-hold portfolios on PortfolioDB rebalance
          annually. Rebalancing enforces a "buy low, sell high" discipline
          automatically.
        </Term>
        <Term id="risk-free-rate" term="Risk-Free Rate">
          The theoretical return of an investment with zero risk, used as a
          baseline in ratio calculations like the Sharpe and Sortino ratios.
          PortfolioDB uses 4.5% annually (0.375% per month), approximating the
          long-run average yield on short-term U.S. Treasury bills.
        </Term>
        <Term id="risk-level" term="Risk Level">
          PortfolioDB&rsquo;s 1--5 scale rating each portfolio&rsquo;s
          historical risk. Level 1 is very conservative; level 5 is very
          aggressive. Ratings are based on max drawdown and worst calendar year
          return over the full history. See the{" "}
          <a
            href="/methodology#risk-rating"
            className="text-primary underline underline-offset-2"
          >
            Methodology page
          </a>{" "}
          for the exact thresholds.
        </Term>
        <Term id="risk-parity" term="Risk Parity">
          A portfolio construction approach that allocates based on each
          asset&rsquo;s risk contribution rather than its dollar weight. Since
          bonds are less volatile than stocks, a risk parity portfolio gives bonds
          a larger share of capital so that every asset contributes equally to
          total portfolio risk. Ray Dalio&rsquo;s{" "}
          <a
            href="/portfolios/ray-dalios-all-weather-portfolio"
            className="text-primary underline underline-offset-2"
          >
            All Weather Portfolio
          </a>{" "}
          is a well-known example.
        </Term>
        <Term id="rolling-returns" term="Rolling Returns">
          Returns measured over a sliding window -- for example, every possible
          1-year or 5-year period in the historical record. Rolling returns show
          how a portfolio has performed across many different market environments,
          not just over one fixed start and end date. The low, average, and high
          rolling return figures on PortfolioDB summarize the range of outcomes
          investors have historically experienced.
        </Term>
      </LetterSection>

      {/* ── S ── */}
      <LetterSection letter="S">
        <Term id="sharpe-ratio" term="Sharpe Ratio">
          A measure of how much return a portfolio has generated per unit of
          risk (volatility). A higher Sharpe ratio means more return for the
          amount of risk taken. It is calculated by subtracting the risk-free
          rate from the portfolio&rsquo;s return, then dividing by the standard
          deviation of monthly returns. See the{" "}
          <a
            href="/methodology"
            className="text-primary underline underline-offset-2"
          >
            Methodology page
          </a>{" "}
          for our risk-free rate assumption.
        </Term>
        <Term id="sortino-ratio" term="Sortino Ratio">
          Similar to the Sharpe ratio, but it only penalizes for downside
          volatility -- months where the portfolio lost money -- rather than all
          volatility. This makes it a more useful measure for investors who
          don&rsquo;t mind upside swings but do care about losses. A higher
          Sortino ratio is better.
        </Term>
        <Term id="safe-withdrawal-rate" term="SWR — Safe Withdrawal Rate">
          The highest annual withdrawal rate (as a percentage of starting
          portfolio value) at which a portfolio would never have run out of
          money across all historical rolling windows of a given length. For
          example, a 30-year real SWR of 4.5% means that, starting from any
          year in the historical record and adjusting withdrawals for inflation,
          the portfolio would have lasted at least 30 years. The widely cited
          "4% Rule" is based on this concept. PortfolioDB shows both nominal
          and inflation-adjusted (real) SWR across 20-, 25-, 30-, and 40-year
          horizons on every portfolio detail page, and awards a "Passes the 4%
          Rule" badge when the 30-year real SWR meets or exceeds 4.0%.
        </Term>
        <Term id="sequence-of-returns-risk" term="Sequence of Returns Risk">
          The risk that a portfolio suffers large losses early in the withdrawal
          phase, which can permanently deplete savings even if the long-run
          average return is the same. Withdrawing money during a downturn forces
          you to sell more shares at low prices, reducing the portfolio&rsquo;s
          ability to recover when markets rebound. Sequence of returns risk is
          most damaging in the first five to ten years of retirement. The{" "}
          <a
            href="/monte-carlo-simulation"
            className="text-primary underline underline-offset-2"
          >
            PortfolioDB Monte Carlo tool
          </a>{" "}
          includes a &ldquo;worst years first&rdquo; option to stress-test a
          portfolio against this scenario.
        </Term>
        <Term id="strategic-asset-allocation" term="Strategic Asset Allocation">
          A long-term, fixed asset allocation that is periodically rebalanced
          back to target weights regardless of market conditions. The investor
          decides upfront on a mix (say, 60% stocks / 40% bonds) and sticks to
          it through market cycles. This is the approach used by all Buy and Hold
          portfolios on PortfolioDB.
        </Term>
      </LetterSection>

      {/* ── T ── */}
      <LetterSection letter="T">
        <Term id="tactical-asset-allocation" term="Tactical Asset Allocation">
          An approach that actively adjusts the portfolio&rsquo;s mix based on
          market conditions, economic signals, or momentum rules. Unlike buy-and-
          hold, tactical portfolios may hold cash, shift dramatically between
          asset classes, or go defensive during downturns. Higher potential for
          reducing drawdowns, but also higher complexity and the risk of
          whipsawing in choppy markets.
        </Term>
        <Term id="total-return" term="Total Return">
          Return that includes both price appreciation and any income paid by the
          investment -- dividends from stocks, interest from bonds -- with income
          assumed to be reinvested. Total return is the most meaningful way to
          measure long-term performance. All returns on PortfolioDB are total
          returns.
        </Term>
      </LetterSection>

      {/* ── U ── */}
      <LetterSection letter="U">
        <Term id="ulcer-index" term="Ulcer Index">
          A measure of downside risk that captures both the depth and duration
          of drawdowns. Unlike max drawdown -- which only measures the single
          worst peak-to-trough drop -- the Ulcer Index penalizes portfolios that
          spend a long time underwater, even in a series of smaller declines.
          Lower is better.
        </Term>
        <Term id="upi" term="UPI — Ulcer Performance Index">
          The portfolio&rsquo;s excess return (above the risk-free rate) divided
          by its Ulcer Index. Think of it as a Sharpe ratio that uses the Ulcer
          Index as the risk measure instead of standard deviation. Because it
          focuses on downside risk and recovery time, some investors find UPI
          more intuitive than Sharpe. Higher is better.
        </Term>
      </LetterSection>

      {/* ── V ── */}
      <LetterSection letter="V">
        <Term id="volatility" term="Volatility / Annualized Volatility">
          The degree to which a portfolio&rsquo;s returns fluctuate over time,
          measured as the standard deviation of periodic returns. High volatility
          means bigger swings in both directions. PortfolioDB displays{" "}
          <em>annualized volatility</em> -- the standard deviation of monthly
          returns multiplied by the square root of 12 -- as an explicit stat in
          the Performance Snapshot on every portfolio detail page. Volatility is
          also the risk measure used in the{" "}
          <a href="#sharpe-ratio" className="text-primary underline underline-offset-2">
            Sharpe
          </a>{" "}
          and{" "}
          <a href="#sortino-ratio" className="text-primary underline underline-offset-2">
            Sortino
          </a>{" "}
          ratio calculations. It is distinct from drawdown: a portfolio can be
          volatile without experiencing deep sustained losses, and vice versa.
        </Term>
      </LetterSection>

      {/* Footer note */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-6 mt-4">
        <h2 className="font-inter text-base font-semibold text-on-surface mb-2">
          Want more detail?
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The{" "}
          <a
            href="/methodology"
            className="text-primary underline underline-offset-2"
          >
            Methodology page
          </a>{" "}
          covers how every performance metric on the site is calculated, where
          our data comes from, and the limitations you should keep in mind.
        </p>
      </section>

    </main>
  );
}
