'use client';

import { useState } from 'react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[22px]">check_circle</span>
        <p className="font-inter text-[14px] text-on-surface">
          <span className="font-semibold">You're in.</span> Check your inbox for a confirmation email.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-manrope text-[15px] font-semibold text-on-surface mb-0.5">
            Free portfolio insights, monthly.
          </p>
          <p className="font-inter text-[13px] text-on-surface-variant">
            No spam. Unsubscribe anytime.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={status === 'loading'}
            className="font-inter text-[14px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 flex-1 min-w-0 sm:w-56 sm:flex-none placeholder:text-outline focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-inter text-[14px] font-semibold bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap flex items-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Subscribing…
              </>
            ) : (
              'Subscribe free'
            )}
          </button>
        </form>
      </div>
      {status === 'error' && (
        <p className="font-inter text-[12px] text-error mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
