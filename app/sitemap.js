import { getAllSlugs, getAllStrategiesWithCounts, getBlogPosts } from '@/lib/db';

const BASE_URL = 'https://www.portfoliodb.com';

const staticPages = [
  { path: '/',                        changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/database',                changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/portfolio-screener',      changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/leaderboard',             changeFrequency: 'monthly', priority: 0.8 },
  { path: '/compare',                 changeFrequency: 'monthly', priority: 0.8 },
  { path: '/builder',                 changeFrequency: 'monthly', priority: 0.8 },
  { path: '/monte-carlo-simulation',  changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/drawdown-analyzer', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/portfolio-map',     changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/financial-independence', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/lump-sum-vs-dca',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/correlation',       changeFrequency: 'monthly', priority: 0.7 },
  { path: '/strategies',              changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog',                    changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/membership',              changeFrequency: 'monthly', priority: 0.7 },
  { path: '/glossary-of-terms',       changeFrequency: 'monthly', priority: 0.6 },
  { path: '/methodology',             changeFrequency: 'monthly', priority: 0.6 },
  { path: '/changelog',               changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms-of-service',        changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy-policy',          changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/contact',                 changeFrequency: 'yearly',  priority: 0.3 },
];

export default async function sitemap() {
  const [slugs, strategies, blogPosts] = await Promise.all([
    getAllSlugs(),
    getAllStrategiesWithCounts(),
    getBlogPosts(),
  ]);

  const staticEntries = staticPages.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const portfolioEntries = slugs.map((row) => ({
    url: `${BASE_URL}/portfolios/${row.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const strategyEntries = strategies.map((s) => ({
    url: `${BASE_URL}/strategies/${s.strategy_slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Use actual published_at date so Google sees when each post was last modified
  const blogEntries = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...portfolioEntries, ...strategyEntries, ...blogEntries];
}
