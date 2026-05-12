import Link from 'next/link';
import { getSignalPortfolios, getSignalPortfolioCount } from '@/lib/db';
import EmailCapture from '@/components/EmailCapture';

const KOFI_MEMBERSHIP_URL = 'https://ko-fi.com/portfoliodb';
const MEMBERSHIP_PRICE = '$19';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'PortfolioDB Membership — Monthly Portfolio Signals',
  description:
    'Members receive monthly rebalancing guidance for a curated selection of portfolios tracked on PortfolioDB. One email, once a month — no guesswork, no market timing.',
  alternates: { canonical: `${siteUrl}/membership` },
  openGraph: {
    title: 'PortfolioDB Membership — Monthly Portfolio Signals',
    description:
      'Members receive monthly rebalancing guidance for a curated selection of portfolios tracked on PortfolioDB. One email, once a month — no guesswork, no market timing.',
    url: `${siteUrl}/membership`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PortfolioDB Membership — Monthly Portfolio Signals',
    description:
      'Members receive monthly rebalancing guidance for a curated selection of portfolios tracked on PortfolioDB. One email, once a month — no guesswork, no market timing.',
  },
};

export default async function MembershipPage() {
  const [signalCount, signalPortfolios] = await Promise.all([
    getSignalPortfolioCount(),
    getSignalPortfolios(),
  ]);
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter text-on-surface">

      {/* ── Hero ── */}
      <section className="mb-12">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px] text-primary">mark_email_unread</span>
          <span className="font-inter text-[12px] font-semibold text-primary uppercase tracking-wider">
            Membership
          </span>
        </div>
        <h1 className="font-manrope text-[36px] sm:text-[42px] font-bold text-on-surface leading-tight mb-4 tracking-tight">
          Monthly Rebalancing Guidance<br className="hidden sm:block" /> for {signalCount} Portfolios
        </h1>
        <p className="font-inter text-[17px] text-on-surface-variant leading-relaxed max-w-2xl">
          Once a month, on the last trading day, members receive a concise signal email
          covering a curated set of portfolios in the database — exactly what to hold,
          rebalance, or adjust. No research required.
        </p>
      </section>

      {/* ── What's included ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">What's included</h2>
        <div className="flex flex-col gap-4">

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex gap-4 items-start">
            <span className="material-symbols-outlined text-[24px] text-primary mt-0.5 flex-shrink-0">email</span>
            <div>
              <p className="font-inter text-[15px] font-semibold text-on-surface mb-1">Monthly signal email</p>
              <p className="font-inter text-[14px] text-on-surface-variant leading-relaxed">
                Delivered on the last trading day of every month. Covers each portfolio in the
                membership — current allocation targets, any rebalancing needed, and a brief
                note on what changed.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex gap-4 items-start">
            <span className="material-symbols-outlined text-[24px] text-primary mt-0.5 flex-shrink-0">database</span>
            <div>
              <p className="font-inter text-[15px] font-semibold text-on-surface mb-1">Full database access</p>
              <p className="font-inter text-[14px] text-on-surface-variant leading-relaxed">
                All 70+ portfolios with historical performance data, Sharpe ratios, max drawdown,
                rolling returns, and the full screener — free, as always. Membership adds the
                signal layer on top.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Email Capture ── */}
      <section className="mb-12">
        <EmailCapture />
      </section>

      {/* ── Price + CTA ── */}
      <section className="mb-12">
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-manrope text-[48px] font-bold text-primary leading-none mb-1">
              {MEMBERSHIP_PRICE}
              <span className="font-inter text-[18px] text-on-surface-variant font-normal">/mo</span>
            </div>
            <p className="font-inter text-[13px] text-on-surface-variant">Cancel anytime. No hidden fees.</p>
          </div>
          <a
            href={KOFI_MEMBERSHIP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-on-primary font-inter text-[15px] font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            See membership options
          </a>
        </div>
      </section>

      {/* ── What you get each month ── */}
      <section className="mb-12">
        <h2 className="font-manrope text-[20px] font-semibold text-on-surface mb-4">What you get each month</h2>
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

        {/* Mock email card */}
        <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">

          {/* Email header bar */}
          <div className="bg-surface-container-low border-b border-outline-variant px-5 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-primary">mark_email_unread</span>
            <div>
              <p className="font-inter text-[13px] font-semibold text-on-surface leading-tight">April 2025 Trading Signals</p>
            </div>
            <span className="ml-auto font-inter text-[11px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">Example</span>
          </div>

          {/* Email body */}
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
              + 14 more portfolios in the full signal email
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
          Additional portfolios are added periodically. Members receive signals for all portfolios in this list.
        </p>
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
