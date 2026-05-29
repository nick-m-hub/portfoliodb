'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function LoginForm({ next = '/account', authError = null }) {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState(authError);

  const supabase = createBrowserSupabaseClient();
  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(next)}`;

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });

    // On success the browser navigates away — no need to setLoading(false)
    if (err) {
      setLoading(false);
      setError(err.message);
    }
  }

  // ── Sent state ──────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="text-center">
        <span className="material-symbols-outlined text-[44px] text-primary mb-3 block">
          mark_email_unread
        </span>
        <h2 className="font-manrope font-bold text-[20px] text-on-surface mb-2">
          Check your email
        </h2>
        <p className="font-inter text-[14px] text-on-surface-variant leading-relaxed mb-6">
          We sent a sign-in link to{' '}
          <span className="font-semibold text-on-surface">{email}</span>.
          Click the link to finish signing in.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(''); }}
          className="font-inter text-[13px] text-primary hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // ── Sign-in form ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Google OAuth */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-xl px-4 py-3 font-inter font-medium text-[14px] text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 mb-5"
      >
        {/* Google logo */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.438 17.64 12.13 17.64 9.205Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="font-inter text-[12px] text-on-surface-variant">or</span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      {/* Magic link form */}
      <form onSubmit={handleMagicLink} noValidate>
        <label htmlFor="email" className="block font-inter text-[13px] font-medium text-on-surface mb-1.5">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-inter text-[14px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors mb-3"
        />

        {error && (
          <p className="font-inter text-[13px] text-error mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '15px' }}>error</span>
            {error === 'auth_failed' ? 'Sign-in link expired or invalid. Please try again.' : error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full bg-primary text-white font-inter font-semibold text-[14px] px-4 py-3 rounded-xl hover:bg-[#0a5c3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send sign-in link'}
        </button>
      </form>
    </div>
  );
}
