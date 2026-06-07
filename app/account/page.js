import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentSignals, getAllAllocations } from '@/lib/db';
import SignOutButton from '@/components/SignOutButton';
import SavedMixList from '@/components/SavedMixList';
import CurrentSignals from '@/components/CurrentSignals';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'My Account — PortfolioDB',
  description: 'Manage your PortfolioDB membership, saved portfolio mixes, and monthly trading signals.',
  alternates: { canonical: `${siteUrl}/account` },
  robots: { index: false, follow: false },
};

// Don't cache — always show fresh subscription + mix data
export const dynamic = 'force-dynamic';

const TIER_LABELS = { builder: 'Builder', signals: 'Signals' };
const BILLING_LABELS = { monthly: 'Monthly', annual: 'Annual' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');

  // Fetch subscription, saved mixes, and current signals in parallel
  const [{ data: subscription }, { data: savedMixes }, signals] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select('plan, billing_period, status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_portfolios')
      .select('id, name, selections, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getCurrentSignals(),
  ]);

  // Only fetch full allocations if the user has saved mixes (needed for blended holdings display)
  const allAllocations = savedMixes?.length > 0 ? await getAllAllocations() : [];

  // Builder-tier features are free for any signed-in user — only an active
  // Signals subscription elevates someone past the Builder tier.
  const tier = subscription?.plan === 'signals' ? 'signals' : 'builder';
  const mixes = savedMixes ?? [];

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter text-on-surface">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[18px] text-primary">manage_accounts</span>
            <span className="font-inter text-[12px] font-semibold text-primary uppercase tracking-wider">
              Account
            </span>
          </div>
          <h1 className="font-manrope text-[32px] sm:text-[38px] font-bold text-on-surface leading-tight tracking-tight">
            My Account
          </h1>
          <p className="font-inter text-[14px] text-on-surface-variant mt-1">{user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {/* ── Plan ── */}
      <section className="mb-10">
        <h2 className="font-manrope text-[18px] font-semibold text-on-surface mb-3">Plan</h2>

        {subscription ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {/* Tier badge */}
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-inter text-[12px] font-semibold px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>workspace_premium</span>
                  {TIER_LABELS[tier] ?? tier}
                </span>
                <span className="font-inter text-[13px] text-on-surface-variant">
                  {BILLING_LABELS[subscription.billing_period] ?? subscription.billing_period}
                </span>
                {subscription.status === 'cancelled' && (
                  <span className="font-inter text-[12px] text-error bg-error/10 px-2 py-0.5 rounded-full">
                    Cancelled
                  </span>
                )}
              </div>

              <a
                href="https://portfoliodb.memberful.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-[13px] text-primary hover:underline flex items-center gap-1"
              >
                {subscription.status === 'cancelled' ? 'Reactivate' : 'Manage subscription'}
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
              </a>
            </div>

            {subscription.current_period_end && (
              <p className="font-inter text-[12px] text-on-surface-variant mt-3">
                Access until {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-inter font-semibold text-[14px] text-on-surface mb-0.5">No paid plan</p>
              <p className="font-inter text-[13px] text-on-surface-variant">
                Builder features (saved mixes, Performance Snapshot) are free for signed-in
                users. Upgrade to Signals for monthly trade signals on tactical portfolios.
              </p>
            </div>
            <Link
              href="/membership"
              className="inline-flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors whitespace-nowrap"
            >
              View plans
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
            </Link>
          </div>
        )}
      </section>

      {/* ── Saved Mixes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-manrope text-[18px] font-semibold text-on-surface">
            Saved Mixes
            {tier === 'builder' && (
              <span className="ml-2 font-inter text-[13px] font-normal text-on-surface-variant">
                ({mixes.length}/3)
              </span>
            )}
          </h2>
          <Link
            href="/builder"
            className="font-inter text-[13px] text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            New mix
          </Link>
        </div>

        <SavedMixList
          initialMixes={mixes}
          tier={tier}
          allAllocations={allAllocations ?? []}
          allSignals={signals ?? []}
        />
      </section>

      {/* ── Current Signals ── */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-manrope text-[18px] font-semibold text-on-surface">Current Signals</h2>
          <span className="font-inter text-[12px] text-on-surface-variant">— updated monthly</span>
        </div>
        <CurrentSignals
          context="account"
          signals={signals ?? []}
          tier={tier}
        />
      </section>

    </main>
  );
}
