import { cookies } from 'next/headers';
import { getPortfolioNames } from '@/lib/db';
import BuilderClient from '@/components/BuilderClient';
import { createServerSupabaseClient } from '@/lib/supabase';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.portfoliodb.com';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portfolio Builder — PortfolioDB',
  description:
    'Blend any combination of portfolios and see the backtested stats: CAGR, Sharpe ratio, max drawdown, and more. Free to use — no account required.',
  alternates: { canonical: `${siteUrl}/builder` },
  openGraph: {
    title: 'Portfolio Builder — PortfolioDB',
    description:
      'Blend any combination of portfolios and see the backtested stats. Free to use — no account required.',
    url: `${siteUrl}/builder`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portfolio Builder — PortfolioDB',
    description: 'Blend any combination of portfolios and see the backtested stats.',
  },
};

export default async function BuilderPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  // getSession() reads the already-validated cookie (proxy.js called getUser() for us).
  // getPortfolioNames() is independent of auth — start both in parallel.
  const [{ data: { session } }, allPortfolios] = await Promise.all([
    supabase.auth.getSession(),
    getPortfolioNames(),
  ]);
  const user = session?.user ?? null;

  let tier = null;
  let savedCount = 0;

  if (user) {
    const [{ data: subscription }, { count }] = await Promise.all([
      supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('user_portfolios')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);
    // Builder-tier features are free for any signed-in user — only an active
    // Signals subscription elevates someone past the Builder tier.
    tier = subscription?.plan === 'signals' ? 'signals' : 'builder';
    savedCount = count ?? 0;
  }

  const mixParam = params?.mix ?? null;

  return (
    <main className="w-full overflow-x-hidden bg-surface min-h-screen">
      <BuilderClient
        allPortfolios={allPortfolios ?? []}
        mixParam={mixParam}
        userId={user?.id ?? null}
        tier={tier}
        savedCount={savedCount}
      />
    </main>
  );
}
