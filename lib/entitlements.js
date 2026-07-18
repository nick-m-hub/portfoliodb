// Shared subscription entitlement logic (CR-2, July 2026).
//
// A subscription row grants access when:
//   status IN ('active', 'cancelled') AND current_period_end is in the future
//
// 'cancelled' means the member turned off auto-renew but is paid through the
// end of the current billing period — they keep access until then. 'expired'
// means the period actually ended (subscription.deactivated / .deleted
// webhooks). A null current_period_end is treated as non-expiring, since the
// webhook only omits it when Memberful sent no expires_at.
//
// Every server-side tier/entitlement check must go through these helpers so
// the paid-through rule can't drift between routes again.

export const ENTITLED_STATUSES = ['active', 'cancelled'];

// True if a single user_subscriptions row currently grants access.
export function isEntitled(subscription) {
  if (!subscription) return false;
  if (!ENTITLED_STATUSES.includes(subscription.status)) return false;
  if (
    subscription.current_period_end &&
    new Date(subscription.current_period_end) <= new Date()
  ) {
    return false;
  }
  return true;
}

// Fetch the user's best currently-entitled subscription row, or null.
// Preference order: an entitled Signals row wins over any other entitled row
// (a user can have multiple rows, e.g. a legacy Builder plan plus Signals);
// ties fall back to most recently created.
export async function getEntitledSubscription(supabaseClient, userId) {
  console.time('entitlements:getEntitledSubscription:query');
  const { data } = await supabaseClient
    .from('user_subscriptions')
    .select('plan, billing_period, status, current_period_end, created_at')
    .eq('user_id', userId)
    .in('status', ENTITLED_STATUSES)
    .order('created_at', { ascending: false });
  console.timeEnd('entitlements:getEntitledSubscription:query');

  const entitled = (data ?? []).filter(isEntitled);
  return entitled.find((s) => s.plan === 'signals') ?? entitled[0] ?? null;
}

// Effective feature tier for a signed-in user. Builder-tier features are free
// for any account; only an entitled Signals subscription elevates further.
export function tierFromSubscription(subscription) {
  return isEntitled(subscription) && subscription.plan === 'signals'
    ? 'signals'
    : 'builder';
}

// True if the user currently has Signals access (paid through today).
export async function isSignalsEntitled(supabaseClient, userId) {
  const sub = await getEntitledSubscription(supabaseClient, userId);
  return sub?.plan === 'signals';
}
