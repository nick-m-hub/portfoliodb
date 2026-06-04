import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getBlogPost, getAllBlogSlugs } from '@/lib/db';

export const dynamicParams = true;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} | PortfolioDB`,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `${siteUrl}/blog/${slug}` },
    openGraph: {
      title: `${post.title} | PortfolioDB`,
      description: post.excerpt ?? undefined,
      url: `${siteUrl}/blog/${slug}`,
      siteName: 'PortfolioDB',
      type: 'article',
      publishedTime: post.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | PortfolioDB`,
      description: post.excerpt ?? undefined,
    },
  };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Blog
      </Link>

      <article>
        <header className="mb-8">
          <time
            dateTime={post.published_at}
            className="text-xs text-on-surface-variant uppercase tracking-wide mb-3 block"
          >
            {formatDate(post.published_at)}
          </time>
          <h1 className="font-manrope text-3xl sm:text-4xl font-bold text-on-surface leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-on-surface-variant leading-relaxed border-l-4 border-outline-variant pl-4">
              {post.excerpt}
            </p>
          )}
        </header>

        <div className="prose-blog">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="font-manrope text-2xl font-bold text-on-surface mt-10 mb-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-manrope text-xl font-bold text-on-surface mt-8 mb-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-base text-on-surface leading-relaxed mb-5">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-5 mb-5 space-y-1.5 text-on-surface">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-5 mb-5 space-y-1.5 text-on-surface">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-base leading-relaxed">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-on-surface">{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-outline-variant pl-4 my-6 text-on-surface-variant italic">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="border-outline-variant my-10" />
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full text-sm border-collapse">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="text-left px-3 py-2 border border-outline-variant font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 border border-outline-variant text-on-surface">
                  {children}
                </td>
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
