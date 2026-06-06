export default function StructuredData({ portfolio, allocations = [] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const plainDescription = portfolio.description
    ? portfolio.description
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_#`\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: portfolio.name,
    description: plainDescription,
    url: `${siteUrl}/portfolios/${portfolio.slug}`,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'CAGR',
        value: portfolio.cagr,
        unitText: '%',
      },
      {
        '@type': 'PropertyValue',
        name: 'Max Drawdown',
        value: portfolio.max_drawdown,
        unitText: '%',
      },
      {
        '@type': 'PropertyValue',
        name: 'Sharpe Ratio',
        value: portfolio.sharpe_ratio,
      },
      {
        '@type': 'PropertyValue',
        name: 'Category',
        value: portfolio.category,
      },
      ...(allocations.length > 0
        ? [
            {
              '@type': 'PropertyValue',
              name: 'Asset Allocation',
              value: allocations.map((a) => `${a.ticker}: ${a.percentage}%`).join(', '),
            },
          ]
        : []),
    ],
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'PortfolioDB',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Database',
        item: `${siteUrl}/database`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: portfolio.name,
        item: `${siteUrl}/portfolios/${portfolio.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
