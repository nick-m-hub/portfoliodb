import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ─── Service-role Supabase client (bypasses RLS) ──────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── Verify HMAC-SHA256 signature from Memberful ─────────────────────────────
function verifySignature(rawBody, signature) {
  const secret = process.env.MEMBERFUL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── Map Memberful plan name → internal plan slug ────────────────────────────
function mapPlan(planName) {
  const lower = (planName || '').toLowerCase();
  if (lower.includes('signals')) return 'signals';
  if (lower.includes('builder')) return 'builder';
  return null;
}

// ─── Infer billing period from plan name ─────────────────────────────────────
function mapBillingPeriod(planName) {
  const lower = (planName || '').toLowerCase();
  if (lower.includes('annual') || lower.includes('yearly') || lower.includes('year')) {
    return 'annual';
  }
  return 'monthly';
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-memberful-webhook-signature');

  if (!verifySignature(rawBody, signature)) {
    console.warn('[memberful] Invalid signature — request rejected');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, subscription } = payload;

  // Memberful payload structure: { event, subscription: { id, member: { id, email }, plan: { name }, expires_at, active } }
  const member   = subscription?.member;
  const memberId = member?.id != null ? String(member.id) : null;

  if (!memberId || !member?.email) {
    console.warn('[memberful] Missing member data — event:', event);
    return NextResponse.json({ ok: true });
  }

  const supabase = getAdminClient();

  // ── Subscription activated / created / renewed / updated ───────────────────
  if (
    event === 'subscription.activated' ||
    event === 'subscription.created'   ||
    event === 'subscription.renewed'   ||
    event === 'subscription.updated'
  ) {
    const plan = mapPlan(subscription.subscription_plan?.name);
    if (!plan) {
      console.warn('[memberful] Unknown plan name:', subscription.plan?.name, '— skipping');
      return NextResponse.json({ ok: true });
    }

    const billingPeriod    = mapBillingPeriod(subscription.subscription_plan?.name);
    const currentPeriodEnd = subscription.expires_at
      ? new Date(
          typeof subscription.expires_at === 'number'
            ? subscription.expires_at * 1000
            : subscription.expires_at
        ).toISOString()
      : null;

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          memberful_member_id: memberId,
          email:               member.email,
          plan,
          billing_period:      billingPeriod,
          status:              'active',
          current_period_end:  currentPeriodEnd,
          updated_at:          new Date().toISOString(),
        },
        { onConflict: 'memberful_member_id' }
      );

    if (error) {
      console.error('[memberful] Upsert error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    console.log(`[memberful] ${event} — ${member.email} → ${plan} (${billingPeriod})`);
  }

  // ── Subscription deactivated (cancelled but may still have access until period end) ──
  else if (event === 'subscription.deactivated') {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('memberful_member_id', memberId);

    if (error) {
      console.error('[memberful] Deactivate error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    console.log(`[memberful] subscription.deactivated — ${member.email}`);
  }

  // ── Subscription deleted ────────────────────────────────────────────────────
  else if (event === 'subscription.deleted') {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('memberful_member_id', memberId);

    if (error) {
      console.error('[memberful] Delete error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    console.log(`[memberful] subscription.deleted — ${member.email}`);
  }

  // ── Member deleted ──────────────────────────────────────────────────────────
  else if (event === 'member.deleted') {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('memberful_member_id', memberId);

    if (error) {
      console.error('[memberful] Member delete error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    console.log(`[memberful] member.deleted — ${member.email}`);
  }

  // Memberful requires a 200 response
  return NextResponse.json({ ok: true });
}
