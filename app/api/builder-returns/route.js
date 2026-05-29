import { supabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get('slugs');

  if (!slugsParam) {
    return Response.json({ error: 'slugs required' }, { status: 400 });
  }

  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (slugs.length === 0) {
    return Response.json({ error: 'slugs required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('monthly_returns')
    .select('portfolio_slug, date, monthly_return')
    .in('portfolio_slug', slugs)
    .order('date', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Group rows by slug
  const grouped = {};
  for (const row of data) {
    if (!grouped[row.portfolio_slug]) grouped[row.portfolio_slug] = [];
    grouped[row.portfolio_slug].push({
      date: row.date,
      monthly_return: Number(row.monthly_return),
    });
  }

  return Response.json(grouped);
}
