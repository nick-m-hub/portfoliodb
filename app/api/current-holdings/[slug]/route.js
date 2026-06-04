import { createServerSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify active Signals subscription
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('plan', 'signals')
    .maybeSingle();

  if (!sub) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch latest holdings for this portfolio
  const { data, error } = await supabase
    .from('tactical_monthly_holdings')
    .select('ticker, weight, date')
    .eq('portfolio_slug', slug)
    .order('date', { ascending: false })
    .order('weight', { ascending: false })
    .limit(20);

  if (error) {
    return Response.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }

  if (!data?.length) {
    return Response.json({ holdings: [], date: null });
  }

  // Keep only the most recent date
  const latestDate = data[0].date;
  const holdings = data
    .filter((r) => r.date === latestDate)
    .map((r) => ({ ticker: r.ticker, weight: Number(r.weight) * 100 }));

  return Response.json({ holdings, date: latestDate });
}
