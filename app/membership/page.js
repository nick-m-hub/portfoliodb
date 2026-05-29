import Link from 'next/link';
import { getSignalPortfolios, getSignalPortfolioCount } from '@/lib/db';
import EmailCapture from '@/components/EmailCapture';
import PricingToggle from '@/components/PricingToggle';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'PortfolioDB Membership — Builder & Signals Plans',
  description:
    'Two membership tiers: Builder (from $9/mo) to save custom portfolio mixes, and Signals (from $19/mo) for monthly rebalancing guidance on 29+ tactical portfolios.',
  alternates: { canonical: `${siteUrl}/membership` },
  openGraph: {
    title: 'PortfolioDB Membership — Builder & Signals Plans',
    description:
      'Two membership tiers: Builder (from $9/mo) to save custom portfolio mixes, and Signals (from $19/mo) for monthly rebalancing guidance on 29+ tactical portfolios.',
    url: `${siteUrl}/membership`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PortfolioDB Membership — Builder & Signals Plans',
    description:
      'Two membership tiers: Builder (from $9/mo) to save custom portfolio mixes, and Signals (from $19/mo) for monthly rebalancing guidance on 29+ tactical portfolios.',
  },
};

export default async function MembershipPage() {
  const [signalCount, signalPortfolios] = await Promise.all([
    getSignalPortfolioCount(),
    getSignalPortfolios(),
  ]);

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter text-on-surface overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="mb-12">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px] text-primary">workspace_premium</span>
          <span className="font-inter text-[12px] font-semibold text-primary uppercase tracking-wider">
            Membership
          </span>
        </div>
        <h1 className="font-manrope text-[36px] sm:text-[42px] font-bold text-on-surface leading-tight mb-4 tracking-tight">
          Two ways to get more<br className="hidden sm:block" /> from PortfolioDB
        </h1>
        <p className="font-inter text-[17px] text-on-surface-variant leading-relaxed max-w-2xl">
          The full database, screener, and tools are free for everyone. Membership adds
          the ability to save custom portfolio mixes and receive monthly rebalancing
          signals for tactical portfolios.
        </p>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="mb-12">
        <PricingToggle signalCount={signalCount} />
      </section>

      {/* ── Top Performer Stats (Signals) ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">
          Top performers in the signal set
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Top Sharpe Ratio', value: '0.98', portfolio: 'Defensive Asset Allocation' },
            { label: 'Top CAGR',         value: '16.1%', portfolio: 'Vigilant Asset Allocation G4' },
            { label: 'Best Worst Year',  value: '-8.4%', portfolio: 'Defensive Asset Allocation' },
          ].map(({ label, value, portfolio }) => (
            <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5">
              <p className="font-inter text-[10px] sm:text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
              <p className="font-manrope text-[22px] sm:text-[30px] font-bold text-primary leading-none mb-1">{value}</p>
              <p className="font-inter text-[10px] sm:text-[12px] text-on-surface-variant leading-snug">{portfolio}</p>
            </div>
          ))}
        </div>
        <p className="font-inter text-[12px] text-on-surface-variant mt-3">
          Backtested from inception. Past performance does not guarantee future results.
        </p>
      </section>

      {/* ── What you get each month (Signals) ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">What the Signals plan delivers each month</h2>
        <ul className="space-y-4">
          {[
            {
              icon: 'sync_alt',
              heading: 'Current allocation targets',
              body: 'Exact percentage targets for every asset class in each covered portfolio, updated to reflect the latest signal.',
            },
            {
              icon: 'task_alt',
              heading: 'Clear hold / rebalance guidance',
              body: 'A plain verdict for each portfolio — hold as-is, or rebalance — so you know immediately whether any action is needed.',
            },
            {
              icon: 'history',
              heading: 'Signal archive',
              body: 'Access to all past signals so you can review the history and see how guidance has evolved over time.',
            },
          ].map(({ icon, heading, body }) => (
            <li key={heading} className="flex gap-4 items-start">
              <span className="material-symbols-outlined text-[22px] text-primary mt-0.5 flex-shrink-0">{icon}</span>
              <div>
                <p className="font-inter text-[15px] font-semibold text-on-surface mb-0.5">{heading}</p>
                <p className="font-inter text-[14px] text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── What a signal looks like ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">What a signal looks like</h2>

        <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="bg-surface-container-low border-b border-outline-variant px-5 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-primary">mark_email_unread</span>
            <p className="font-inter text-[13px] font-semibold text-on-surface leading-tight">April 2025 Trading Signals</p>
            <span className="ml-auto font-inter text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">Example</span>
          </div>

          <div className="bg-surface-container-lowest divide-y divide-surface-variant">
            {[
              { name: 'Accelerating Dual Momentum', holdings: [{ ticker: 'SCZ', pct: '100%' }] },
              { name: 'Composite Dual Momentum', holdings: [{ ticker: 'GLD', pct: '25%' }, { ticker: 'HYG', pct: '25%' }, { ticker: 'REM', pct: '25%' }, { ticker: 'SPY', pct: '25%' }] },
              { name: 'GEM Dual Momentum', holdings: [{ ticker: 'SPY', pct: '100%' }] },
            ].map(({ name, holdings }) => (
              <div key={name} className="px-5 py-4">
                <p className="font-inter text-[13px] font-semibold text-on-surface mb-2">{name}</p>
                <div className="flex flex-wrap gap-2">
                  {holdings.map(({ ticker, pct }) => (
                    <span key={ticker} className="inline-flex items-center gap-1.5 bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-[12px]">
                      <span className="font-semibold text-primary font-mono">{ticker}</span>
                      <span className="text-on-surface-variant">{pct}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="px-5 py-3 font-inter text-[12px] text-on-surface-variant italic">
              + {signalCount - 3} more portfolios in the full signal email
            </p>
          </div>
        </div>

        <p className="font-inter text-[12px] text-on-surface-variant mt-3">
          Illustrative example only — actual signals vary each month based on portfolio rules.
        </p>
      </section>

      {/* ── Signal portfolio list ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">Portfolios currently in the signal set</h2>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          <ul className="divide-y divide-outline-variant">
            {signalPortfolios.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/portfolios/${p.slug}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-container transition-colors group"
                >
                  <span className="font-inter text-[14px] text-on-surface group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">arrow_forward</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="font-inter text-[12px] text-on-surface-variant mt-3 leading-relaxed">
          Additional portfolios are added periodically. Signals members receive guidance for all portfolios in this list.
        </p>
      </section>

      {/* ── Email Capture ── */}
      <section className="mb-12">
        <EmailCapture />
      </section>

      {/* ── Disclaimer ── */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5">
        <p className="font-inter text-[13px] text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">Not financial advice.</strong> Membership signals are
          informational and educational — they reflect rules-based portfolio logic, not personalized
          investment recommendations. Past signals are not a guarantee of future results. Please
          consult a qualified financial advisor before making investment decisions.
        </p>
      </section>

    </main>
  );
}
