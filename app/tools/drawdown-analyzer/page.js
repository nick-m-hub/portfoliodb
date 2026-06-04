import DrawdownAnalyzerClient from './DrawdownAnalyzerClient';

export const metadata = {
  title: 'Drawdown Analyzer | PortfolioDB',
  description: 'See how all 70+ portfolio strategies held up during major market crashes — dot-com, 2008 financial crisis, COVID, and more.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/drawdown-analyzer`,
  },
  openGraph: {
    title: 'Drawdown Analyzer | PortfolioDB',
    description: 'See how all 70+ portfolio strategies held up during major market crashes — dot-com, 2008 financial crisis, COVID, and more.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/drawdown-analyzer`,
    siteName: 'PortfolioDB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Drawdown Analyzer | PortfolioDB',
    description: 'See how all 70+ portfolio strategies held up during major market crashes — dot-com, 2008 financial crisis, COVID, and more.',
  },
};

export default function DrawdownAnalyzerPage() {
  return (
    <main className="w-full overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-manrope font-bold text-3xl text-on-surface mb-2">
            Drawdown Analyzer
          </h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Pick a market crash or enter a custom date range to see how every portfolio strategy held up — total return and worst drawdown within that window.
          </p>
        </div>
        <DrawdownAnalyzerClient />
      </div>
    </main>
  );
}
