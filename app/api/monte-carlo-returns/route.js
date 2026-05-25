import { getMonthlyReturns, getPortfolio } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ error: 'slug required' }, { status: 400 });
  }

  const [returns, portfolio] = await Promise.all([
    getMonthlyReturns(slug),
    getPortfolio(slug),
  ]);

  if (!portfolio) {
    return Response.json({ error: 'Portfolio not found' }, { status: 404 });
  }

  return Response.json({ returns, portfolio });
}
