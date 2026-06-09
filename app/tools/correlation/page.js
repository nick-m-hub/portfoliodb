import CorrelationMatrixClient from './CorrelationMatrixClient';

export const metadata = {
  title: 'Portfolio Correlation Matrix | PortfolioDB',
  description: 'A pairwise correlation heatmap for every portfolio strategy. See which combinations actually diversify your holdings — and which are redundant.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/correlation`,
  },
  openGraph: {
    title: 'Portfolio Correlation Matrix | PortfolioDB',
    description: 'A pairwise correlation heatmap for every portfolio strategy. See which combinations actually diversify your holdings — and which are redundant.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/correlation`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portfolio Correlation Matrix | PortfolioDB',
    description: 'A pairwise correlation heatmap for every portfolio strategy. See which combinations actually diversify your holdings — and which are redundant.',
  },
};

export default function CorrelationMatrixPage() {
  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">
            Correlation Matrix
          </h1>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            How closely do these strategies actually move together? Each cell shows the historical correlation between two portfolios&apos; monthly returns — green means they tend to move independently (good for diversification), red means they tend to move in lockstep (largely redundant to hold both). Filter by category, search to highlight a portfolio, or hover any cell for details. Click a cell to compare the two side by side.
          </p>
        </div>
        <CorrelationMatrixClient />
      </div>
    </main>
  );
}
