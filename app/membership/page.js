import Link from 'next/link';
import { getSignalPortfolios, getSignalPortfolioCount } from '@/lib/db';

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
              icon: 'summarize',
              heading: 'Brief market context',
              body: 'A short note explaining what drove any changes that month. No noise, no prediction — just the reasoning behind the signal.',
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
