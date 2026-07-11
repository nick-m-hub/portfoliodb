import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
// Service-role client — used only for the subscription email-fallback link
import { getAdminClient } from '@/lib/supabaseAdmin';
import { getPortfolioNames } from '@/lib/db';
import { getEntitledSubscription } from '@/lib/entitlements';

export async function POST(request) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Primary subscription lookup by user_id (CR-2: shared paid-through rule)
  let subscription = await getEntitledSubscription(supabase, user.id);

  // Fix #3 — Fallback: if no linked subscription found, try linking by email then re-query.
  // Handles the case where auth/callback's linking step failed silently (transient DB error),
  // leaving user_id = NULL on a row that belongs to this user.
  if (!subscription && user.email) {
    await getAdminClient()
      .from('user_subscriptions')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('email', user.email)
      .is('user_id', null);

    subscription = await getEntitledSubscription(supabase, user.id);
  }

  // Saving mixes is a free Builder-tier feature for any signed-in user — only an
  // entitled Signals subscription lifts the 3-mix cap.
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

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { selections } = body;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : null;

  // Fix #4 — Validate both lower bound (≥ 2) and upper bound (≤ 6) on selections array
  if (!Array.isArray(selections) || selections.length < 2 || selections.length > 6) {
    return Response.json({ error: 'Invalid selections' }, { status: 400 });
  }

  // CR-9 — selections is stored as raw JSONB and flows into SavedMixList, the
  // Monte Carlo mix selector, and the Portfolio Map overlay, so validate every
  // element: slug must be a real portfolio, weight must be 0–100, and the
  // weights must sum to ~100. Reject anything else.
  const allPortfolios = (await getPortfolioNames()) ?? [];
  const validSlugs = new Set(allPortfolios.map((p) => p.slug));

  const cleaned = [];
  for (const item of selections) {
    const slug = typeof item?.slug === 'string' ? item.slug.trim() : null;
    const weight = Number(item?.weight);
    if (
      !slug ||
      slug.length >= 100 ||
      !validSlugs.has(slug) ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 100
    ) {
      return Response.json({ error: 'Invalid selections' }, { status: 400 });
    }
    cleaned.push({ slug, weight });
  }

  const totalWeight = cleaned.reduce((sum, s) => sum + s.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.5) {
    return Response.json({ error: 'Weights must sum to 100' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_portfolios')
    .insert({ user_id: user.id, name: name || null, selections: cleaned })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }

  return Response.json({ id: data.id });
}
