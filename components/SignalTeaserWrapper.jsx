'use client';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import SignalTeaser from './SignalTeaser';
import Link from 'next/link';

export default function SignalTeaserWrapper({ slug }) {
  const [state, setState] = useState('loading'); // 'loading' | 'locked' | 'unlocked'
  const [holdings, setHoldings] = useState([]);
  const [date, setDate] = useState(null);

  useEffect(() => {
    async function check() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState('locked'); return; }

      const res = await fetch(`/api/current-holdings/${slug}`);
      if (!res.ok) { setState('locked'); return; }

      const json = await res.json();
      setHoldings(json.holdings ?? []);
      setDate(json.date ?? null);
      setState('unlocked');
    }
    check();
  }, [slug]);

  if (state === 'loading' || state === 'locked') {
    return <SignalTeaser />;
  }

  const displayDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 mt-4">
      <h2 className="font-manrope text-base font-bold text-on-surface mb-1">
        Current Asset Allocation
      </h2>
      <p className="font-inter text-xs text-on-surface-variant mb-3">
        {displayDate ? `As of ${displayDate}` : 'Updated monthly'}
      </p>

      {holdings.length === 0 ? (
        <p className="font-inter text-sm text-on-surface-variant">No holdings data yet for this month.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {holdings.map((h) => (
            <div
              key={h.ticker}
              className="flex items-center justify-between bg-surface-container rounded-lg px-3 py-2"
            >
              <span className="font-manrope text-sm font-bold text-on-surface">{h.ticker}</span>
              <span className="font-inter text-sm text-on-surface-variant">{h.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-outline-variant">
        <Link
          href="https://portfoliodb.memberful.com/account"
          target="_blank"
          rel="noopener noreferrer"
          className="font-inter text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">settings</span>
          Manage subscription
        </Link>
      </div>
    </div>
  );
}
