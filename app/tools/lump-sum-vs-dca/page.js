import nextDynamic from 'next/dynamic';
import { getPortfolioNames, getMonthlyReturns, getPortfolio } from '@/lib/db';

const LumpSumVsDCAClient = nextDynamic(() => import('./LumpSumVsDCAClient'));

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const DEFAULT_SLUG = 'united-states-60-40-portfolio';

export const metadata = {
  title: 'Lump Sum vs. Dollar Cost Averaging Calculator | PortfolioDB',
  description:
    'Should you invest all at once or spread it out? See how lump sum investing compared to DCA across every historical starting period for 75+ portfolio strategies, backtested since 1970.',
  alternates: { canonical: `${siteUrl}/tools/lump-sum-vs-dca` },
  openGraph: {
    title: 'Lump Sum vs. Dollar Cost Averaging Calculator | PortfolioDB',
    description:
      'Should you invest all at once or spread it out? See how lump sum investing compared to DCA across every historical starting period for 75+ portfolio strategies, backtested since 1970.',
    url: `${siteUrl}/tools/lump-sum-vs-dca`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Lump Sum vs. Dollar Cost Averaging Calculator | PortfolioDB',
    description:
      'Should you invest all at once or spread it out? See how lump sum investing compared to DCA across every historical starting period for 75+ portfolio strategies, backtested since 1970.',
  },
};

export default async function LumpSumVsDCAPage({ searchParams }) {
  const { slug: slugParam } = await searchParams;

  const allPortfolioNames = (await getPortfolioNames()) ?? [];
  const slug =
    slugParam && allPortfolioNames.some(p => p.slug === slugParam)
      ? slugParam
      : DEFAULT_SLUG;

  const [initialReturns, initialPortfolio] = await Promise.all([
    getMonthlyReturns(slug),
    getPortfolio(slug),
  ]);

  return (
    <LumpSumVsDCAClient
      allPortfolioNames={allPortfolioNames}
      initialSlug={slug}
      initialReturns={initialReturns ?? []}
      initialPortfolio={initialPortfolio}
    />
  );
}
