import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
// Service-role client — used only for the subscription email-fallback link
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Primary subscription lookup by user_id
  let { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fix #3 — Fallback: if no linked subscription found, try linking by email then re-query.
  // Handles the case where auth/callback's linking step failed silently (transient DB error),
  // leaving user_id = NULL on a row that belongs to this user.
  if (!subscription && user.email) {
    await getAdminClient()
      .from('user_subscriptions')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('email', user.email)
      .eq('status', 'active')
      .is('user_id', null);

    const { data: retried } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    subscription = retried;
  }

  // Saving mixes is a free Builder-tier feature for any signed-in user — only an
  // active Signals subscription lifts the 3-mix cap.
  if (subscription?.plan !== 'signals') {
    // Fix #2 — Fail closed: treat a null count (query error) as "limit reached" rather than
    // allowing the insert, which would silently bypass the 3-mix guard.
    const { count, error: countError } = await supabase
      .from('user_portfolios')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError || count === null || count >= 3) {
      return Response.json({ error: 'Mix limit reached' }, { status: 429 });
    }
  }

  const body = await request.json();
  const { selections } = body;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : null;

  // Fix #4 — Validate both lower bound (≥ 2) and upper bound (≤ 6) on selections array
  if (!Array.isArray(selections) || selections.length < 2 || selections.length > 6) {
    return Response.json({ error: 'Invalid selections' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_portfolios')
    .insert({ user_id: user.id, name: name || null, selections })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }

  return Response.json({ id: data.id });
}
