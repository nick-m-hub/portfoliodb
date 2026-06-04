export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account', '/login'],
    },
    sitemap: 'https://www.portfoliodb.com/sitemap.xml',
  };
}
