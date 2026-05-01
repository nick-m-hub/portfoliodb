import { getAllSlugs } from '@/lib/db';

const BASE_URL = 'https://portfoliodb.co';

const staticPages = [
  '/',
  '/database',
  '/portfolio-screener',
  '/glossary-of-terms',
];

export default async function sitemap() {
  const slugs = await getAllSlugs();

  const staticEntries = staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const portfolioEntries = slugs.map((row) => ({
    url: `${BASE_URL}/portfolios/${row.slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...portfolioEntries];
}
