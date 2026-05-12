import { getAllSlugs, getAllStrategiesWithCounts } from '@/lib/db';

const BASE_URL = 'https://portfoliodb.co';

const staticPages = [
  '/',
  '/database',
  '/portfolio-screener',
  '/glossary-of-terms',
  '/methodology',
  '/membership',
  '/strategies',
];

export default async function sitemap() {
  const [slugs, strategies] = await Promise.all([
    getAllSlugs(),
    getAllStrategiesWithCounts(),
  ]);

  const staticEntries = staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const portfolioEntries = slugs.map((row) => ({
    url: `${BASE_URL}/portfolios/${row.slug}`,
    lastModified: new Date(),
  }));

  const strategyEntries = strategies.map((s) => ({
    url: `${BASE_URL}/strategies/${s.strategy_slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...portfolioEntries, ...strategyEntries];
}
