import { NextResponse } from 'next/server';
import { getPortfolios, getPortfolio } from '@/lib/db';

export async function GET() {
  const portfolios = await getPortfolios();
  const firstSlug = portfolios?.[0]?.slug ?? null;
  const portfolio = firstSlug ? await getPortfolio(firstSlug) : null;

  return NextResponse.json({
    portfolios,
    portfolio,
    testedSlug: firstSlug,
  });
}
