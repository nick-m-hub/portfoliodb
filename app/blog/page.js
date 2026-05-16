import Link from 'next/link';
import { getBlogPosts } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'PortfolioDB Blog — Index Fund Portfolio Analysis',
  description: 'In-depth analysis of index fund portfolios — backtested performance, crisis-period comparisons, risk metrics, and strategy breakdowns.',
  alternates: { canonical: `${siteUrl}/blog` },
  openGraph: {
    title: 'PortfolioDB Blog — Index Fund Portfolio Analysis',
    description: 'In-depth analysis of index fund portfolios — backtested performance, crisis-period comparisons, risk metrics, and strategy breakdowns.',
    url: `${siteUrl}/blog`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PortfolioDB Blog — Index Fund Portfolio Analysis',
    description: 'In-depth analysis of index fund portfolios — backtested performance, crisis-period comparisons, risk metrics, and strategy breakdowns.',
  },
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-on-surface font-inter">
      <h1 className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface mb-3">
        Blog
      </h1>
      <p className="text-base text-on-surface-variant mb-10 max-w-xl">
        Portfolio analysis, strategy breakdowns, and backtested performance comparisons — all using real data from our database of 70+ index fund portfolios.
      </p>

      {posts.length === 0 ? (
        <p className="text-on-surface-variant text-sm">No posts yet — check back soon.</p>
      ) : (
        <div className="flex flex-col divide-y divide-outline-variant">
          {posts.map((post) => (
            <article key={post.slug} className="py-8 first:pt-0">
              <time
                dateTime={post.published_at}
                className="text-xs text-on-surface-variant uppercase tracking-wide mb-2 block"
              >
                {formatDate(post.published_at)}
              </time>
              <h2 className="font-manrope text-xl font-bold text-on-surface mb-2 leading-snug">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && (
                <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                  {post.excerpt}
                </p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Read more
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
