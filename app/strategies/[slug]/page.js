import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPortfoliosByStrategy, getAllStrategiesWithCounts } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const STRATEGY_INFO = {
  'all-weather': {
    label: 'All-Weather',
    brief: 'Designed to perform across every economic environment — growth, recession, inflation, and deflation.',
    intro: [
      'An all-weather portfolio is designed to hold up reasonably well across every economic environment — inflation, deflation, growth, and recession. The concept was popularized by Ray Dalio at Bridgewater Associates, and the core insight is that most portfolios are unknowingly concentrated in a single regime (usually growth). By balancing exposure across all four environments, an all-weather approach aims to reduce volatility without sacrificing long-term returns.',
      'In practice, all-weather portfolios hold a mix of stocks, long-term bonds, intermediate bonds, gold, and commodities. They tend to hold up better during equity crashes and periods of high inflation than traditional 60/40 portfolios, though they may lag during prolonged equity bull markets. Investors drawn to this approach typically prioritize consistency and downside protection over maximizing peak returns.',
    ],
  },
  'bond-heavy': {
    label: 'Bond-Heavy',
    brief: 'Prioritizes capital preservation and income by allocating the majority of weight to fixed income.',
    intro: [
      'Bond-heavy portfolios allocate the majority of their weight to fixed income -- typically investment-grade bonds, Treasuries, or a mix of both. These strategies prioritize capital preservation and income generation over long-term growth, and are often suited to investors with a short time horizon, a low risk tolerance, or a need for regular income from their portfolio.',
      'The tradeoff is straightforward: lower volatility and shallower drawdowns, but meaningfully less growth over time compared to equity-heavy alternatives. Bond-heavy portfolios are particularly sensitive to rising interest rates, which reduce bond prices, so the interest rate environment plays an outsized role in their performance. Investors considering these strategies should weigh the trade-off between short-term stability and long-term purchasing power.',
    ],
  },
  'factor-tilt': {
    label: 'Factor Tilt',
    brief: 'Overweights specific risk factors — such as value, small-cap, or profitability — that academic research links to long-term excess returns.',
    intro: [
      'Factor-tilt portfolios start with broad market exposure and intentionally overweight specific factors -- such as value, small-cap, momentum, or profitability -- that academic research has associated with long-term excess returns. The goal is to earn a return premium above the market by accepting exposure to systematic risks the market prices in. The theoretical foundation stretches back to Fama and French\'s three-factor model and has been extended by decades of subsequent research.',
      'In practice, factor premiums are real but lumpy -- they can underperform the market for years at a time before asserting themselves, which means factor-tilt portfolios require patience and conviction to hold through extended periods of relative weakness. Investors attracted to this approach should understand that the premiums exist precisely because they are uncomfortable to capture.',
    ],
  },
  'global': {
    label: 'Global',
    brief: 'Spreads exposure across multiple countries and regions to reduce concentration in any single market.',
    intro: [
      'Global portfolios hold assets across multiple countries and regions rather than concentrating in any single market. The rationale is diversification: different economies and markets tend not to move in lockstep, so blending them can smooth returns over time and reduce exposure to any single country\'s political or economic risks. In practice, global portfolios typically hold a mix of U.S. equities, international developed-market equities, and sometimes emerging market equities.',
      'The degree of international weighting varies widely across global strategies -- some use global market-cap weights, while others tilt toward specific regions based on valuation, momentum, or other signals. A key ongoing debate is how much international exposure actually improves risk-adjusted returns for U.S.-based investors, given the long stretch of U.S. outperformance since 2010 and the fact that many large U.S. companies already derive significant revenue internationally.',
    ],
  },
  'income': {
    label: 'Income',
    brief: 'Built to generate regular cash flow from dividends and bond interest, prioritizing yield over growth.',
    intro: [
      'Income portfolios are built to generate regular cash flow, prioritizing dividend-paying equities, bond income, and other yield-producing assets over capital appreciation. They appeal to investors who need to draw from their portfolio regularly -- such as retirees -- or who simply prefer to receive returns as income rather than unrealized growth. The emphasis on yield tends to produce portfolios that skew toward more established, slower-growth companies.',
      'Compared to growth-oriented portfolios, income strategies tend to be less volatile but may lag during strong equity bull markets, when high-growth companies that pay little or no dividends lead the market. The stability of income can also be misleading during periods of rising interest rates, when bond prices fall even as yields increase -- creating short-term drawdowns even in otherwise conservative allocations.',
    ],
  },
  'momentum': {
    label: 'Momentum',
    brief: 'Rotates into recent outperformers and out of laggards, exploiting the tendency of trends to persist.',
    intro: [
      'Momentum portfolios rotate into assets that have recently outperformed and out of those that have underperformed, based on the well-documented observation that relative price strength tends to persist over intermediate time horizons of three to twelve months. The strategy exploits a market anomaly: winners continue to win, at least for a while. Momentum is one of the most robustly replicated factors in academic finance, observed across asset classes, geographies, and time periods.',
      'Momentum investing requires discipline and systematic execution. Because momentum portfolios hold whatever has been working recently, they can experience sharp reversals when market leadership changes suddenly -- a phenomenon sometimes called a "momentum crash." Most rules-based momentum systems include risk controls, such as moving to cash or bonds during broad market downturns, to manage this tail risk and improve risk-adjusted returns.',
    ],
  },
  'risk-parity': {
    label: 'Risk Parity',
    brief: 'Allocates based on each asset\'s risk contribution rather than dollar weight, targeting equal volatility across holdings.',
    intro: [
      'Risk parity portfolios allocate capital based on each asset\'s risk contribution rather than its dollar weight. The goal is to ensure that stocks, bonds, and other assets contribute equally to the portfolio\'s total volatility, which typically results in a much higher allocation to bonds -- often with leverage applied -- than a traditional 60/40 approach. The concept was developed at Bridgewater Associates and gained widespread attention after the 2008 financial crisis, when diversified risk-parity funds held up relatively well.',
      'Critics point out that risk-parity strategies can struggle in environments where stocks and bonds fall simultaneously, as rising interest rates can create losses in both asset classes at once. The use of leverage also introduces borrowing costs and potential margin risk that don\'t appear in simpler backtests. Still, for investors focused on volatility-adjusted returns rather than raw performance, risk parity offers a principled alternative to market-cap-weighted allocations.',
    ],
  },
  'robo-advisor': {
    label: 'Robo-Advisor',
    brief: 'Replicates the diversified index-fund allocations used by automated investment platforms.',
    intro: [
      'Robo-advisor portfolios replicate the asset allocations recommended by automated investment platforms such as Betterment, Wealthfront, and Schwab Intelligent Portfolios. These platforms use algorithms to build diversified portfolios based on user inputs like time horizon and risk tolerance, typically using low-cost index funds and ETFs across domestic equities, international equities, and bonds. They\'ve become widely used by investors who want a hands-off, professionally structured portfolio.',
      'The underlying portfolios tend to be relatively conventional -- broadly diversified with geographic diversification -- making them useful benchmarks for comparing more active or differentiated approaches. Their main limitations are that the glide path and allocation are set at the platform level rather than tailored to individual circumstances, and that tax-loss harvesting benefits (available on some platforms) are not captured in simple backtests of the underlying allocations.',
    ],
  },
  'rules-based': {
    label: 'Rules-Based',
    brief: 'Follows a systematic, pre-defined process for buy, sell, and rebalance decisions — no discretionary judgment.',
    intro: [
      'Rules-based portfolios follow a systematic, pre-defined process for making investment decisions -- such as when to buy, sell, or rebalance -- without relying on discretionary judgment. The rules might be based on technical signals, valuation metrics, momentum indicators, or macroeconomic conditions, but the key feature is that they are applied consistently regardless of market sentiment or short-term noise.',
      'By removing emotion and discretion from the investment process, rules-based strategies aim to avoid the behavioral biases that cause many investors to buy high and sell low. The tradeoff is rigidity: a rules-based system will continue following its process even when it seems obviously wrong in the moment, which can produce extended periods of underperformance when market conditions fall outside the strategy\'s design parameters. Understanding the logic behind the rules helps investors stick with the strategy when it struggles.',
    ],
  },
  'simple': {
    label: 'Simple',
    brief: 'Uses just two to four broadly diversified funds to achieve solid risk-adjusted returns with minimal complexity.',
    intro: [
      'Simple portfolios use a small number of broadly diversified funds -- often just two to four -- to achieve well-rounded exposure across asset classes and geographies. The philosophy is that most of the benefit of diversification comes from the first few holdings, and adding complexity beyond that point increases costs and behavioral risk without meaningfully improving outcomes. Popularized by investors like John Bogle, Bill Bernstein, and the Boglehead community, simple portfolios prioritize low cost, low turnover, and ease of implementation.',
      'Because they are easy to understand and stick with, simple portfolios often outperform more complex alternatives in practice, even if they are theoretically less optimized. The main limitation is psychological: simple portfolios offer no mechanism for reducing drawdowns during market crashes, so investors must accept full market volatility in exchange for long-term simplicity. For investors who can stay the course, that is often a worthwhile trade.',
    ],
  },
  'tactical': {
    label: 'Tactical',
    brief: 'Adjusts asset allocation in response to market conditions, moving to defensive positions before major downturns.',
    intro: [
      'Tactical portfolios adjust their asset allocation in response to changing market conditions, moving between asset classes based on signals like momentum, trend, valuation, or volatility. Unlike buy-and-hold approaches, tactical strategies explicitly try to reduce exposure before major market downturns and increase it during recoveries. The appeal is risk management: a well-designed tactical system can meaningfully reduce drawdowns, which improves long-term compounded returns even if it occasionally underperforms during strong bull markets.',
      'The challenge is that tactical signals are imperfect -- they can produce false signals that cause unnecessary trading, and switching to cash or bonds at the wrong time can result in missing significant upside. Most tactical strategies are backtested on the same historical data used to design them, which can make their track records look better in hindsight than they perform going forward. Investors should evaluate tactical strategies on their out-of-sample performance and the robustness of their underlying logic.',
    ],
  },
  'target-date': {
    label: 'Target Date',
    brief: 'Automatically shifts from growth to conservative as the target retirement year approaches via a pre-set glide path.',
    intro: [
      'Target-date portfolios automatically shift from a growth-oriented allocation to a more conservative one as the investor approaches a specific year -- their retirement date. Early on, they hold mostly equities; over time, the "glide path" gradually increases bond exposure as the target date approaches. Target-date funds are widely used in workplace retirement plans because they automate the process of lifecycle asset allocation without requiring any active decision-making from the investor.',
      'Their main limitation is that the glide path is set at the fund level, not tailored to individual circumstances -- two investors with the same target date but very different risk tolerances or spending needs will hold the same portfolio. The performance of target-date portfolios also depends heavily on the interest rate environment in the years surrounding the target date, since the shift to bonds increases sensitivity to rate changes at exactly the point when the portfolio is largest.',
    ],
  },
};

function slugToLabel(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function fmt(val, decimals = 1) {
  if (val == null) return '—';
  return val.toFixed(decimals);
}

export async function generateStaticParams() {
  const strategies = await getAllStrategiesWithCounts();
  return strategies.map((s) => ({ slug: s.strategy_slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const info = STRATEGY_INFO[slug];
  const label = info?.label ?? slugToLabel(slug);
  const title = `${label} Portfolios | PortfolioDB`;
  const description = info?.brief
    ? `${label} portfolio strategies ranked by performance. ${info.brief} Backtested data from 1970.`
    : `Browse ${label.toLowerCase()} portfolio strategies ranked by CAGR, Sharpe ratio, and max drawdown. Backtested data from 1970.`;
  const url = `${siteUrl}/strategies/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'PortfolioDB', type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

const RISK_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };

export default async function StrategyPage({ params }) {
  const { slug } = await params;
  const info = STRATEGY_INFO[slug];
  if (!info) notFound();

  const portfolios = await getPortfoliosByStrategy(slug);
  if (!portfolios.length) notFound();

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="text-sm text-on-surface-variant mb-6">
        <Link href="/strategies" className="hover:text-primary transition-colors">Strategy Types</Link>
        <span className="mx-2">›</span>
        <span>{info.label}</span>
      </nav>

      {/* Heading */}
      <h1 className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface mb-6">
        {info.label} Portfolios
        <span className="block text-lg font-semibold text-on-surface-variant mt-1">Ranked by Performance</span>
      </h1>

      {/* Intro */}
      <div className="space-y-4 text-base leading-relaxed text-on-surface mb-10 max-w-3xl">
        {info.intro.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left font-semibold text-on-surface-variant px-5 py-3">Portfolio</th>
                <th className="text-right font-semibold text-on-surface-variant px-4 py-3">CAGR</th>
                <th className="text-right font-semibold text-on-surface-variant px-4 py-3">Max Drawdown</th>
                <th className="text-right font-semibold text-on-surface-variant px-4 py-3">Sharpe</th>
                <th className="text-right font-semibold text-on-surface-variant px-4 py-3">Worst Year</th>
                <th className="text-right font-semibold text-on-surface-variant px-5 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {portfolios.map((p) => (
                <tr key={p.slug} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/portfolios/${p.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-primary tabular-nums">
                    {fmt(p.cagr)}%
                  </td>
                  <td className="px-4 py-3.5 text-right text-error tabular-nums">
                    -{fmt(Math.abs(p.max_drawdown))}%
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {fmt(p.sharpe_ratio, 2)}
                  </td>
                  <td className={`px-4 py-3.5 text-right tabular-nums ${p.worst_year < 0 ? 'text-error' : 'text-primary'}`}>
                    {p.worst_year >= 0 ? '+' : ''}{fmt(p.worst_year)}%
                  </td>
                  <td className="px-5 py-3.5 text-right text-on-surface-variant">
                    <span title={RISK_LABELS[p.risk_level]}>{p.risk_level}/5</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      <p className="text-xs text-on-surface-variant mt-4">
        Sorted by Sharpe ratio (highest to lowest). All stats backtested from inception.{' '}
        <Link href="/methodology" className="underline hover:text-primary transition-colors">See methodology →</Link>
      </p>
    </main>
  );
}
