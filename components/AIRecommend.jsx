'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AIRecommend() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const res = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setRecommendations(data.recommendations);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Search bar ── */}
      <div className="w-full max-w-4xl mt-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col md:flex-row items-center gap-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-2 shadow-sm"
        >
          <div className="flex-1 flex items-center gap-3 px-4 w-full">
            <span className="material-symbols-outlined text-[#71a38b]">auto_awesome</span>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe your ideal portfolio (e.g. 'high growth with low volatility for 10 years')…"
              className="flex-1 bg-transparent font-inter text-[15px] text-on-surface placeholder:text-on-surface-variant/60 placeholder:italic focus:outline-none"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !goal.trim()}
            className="w-full md:w-auto bg-[#71a38b] text-white font-inter font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[20px]">progress_activity</span>
                Thinking…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">magic_button</span>
                AI Recommend
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-[13px] text-red-600 font-inter">{error}</p>
        )}

        {!error && !recommendations && (
          <p className="mt-3 text-[12px] text-on-surface-variant/70 font-inter italic">
            Our AI analyzes 50+ years of historical data to find your perfect match.
          </p>
        )}
      </div>

      {/* ── AI Results (appear below the hero when ready) ── */}
      {recommendations && recommendations.length > 0 && (
        <div className="w-full max-w-[1280px] px-8 mt-12 text-left">
          {/* Header */}
          <div className="flex justify-between items-end mb-6 border-b border-[#71a38b]/30 pb-3">
            <h2 className="font-manrope text-[22px] font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#71a38b]">auto_awesome</span>
              AI Recommendations
            </h2>
            <span className="font-inter text-sm bg-[#dbe8e0] text-[#4f6d5a] px-3 py-1 rounded-full">
              Matched to your goal
            </span>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, i) => (
              <Link
                key={rec.slug}
                href={`/portfolios/${rec.slug}`}
                className="relative bg-[#f0f7f4] border border-[#71a38b]/40 rounded-xl p-6 flex flex-col hover:border-[#71a38b] hover:shadow-md transition-all"
              >
                {/* Rank badge */}
                <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#71a38b] text-white font-inter text-[13px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>

                <span className="font-inter text-[11px] font-semibold text-[#4f6d5a] uppercase tracking-wider mb-2">
                  {rec.name}
                </span>

                <p className="font-inter text-[14px] text-on-surface leading-relaxed mt-1 flex-grow">
                  {rec.reason}
                </p>

                <div className="mt-4 flex items-center gap-1 text-[#71a38b] font-inter text-[13px] font-medium">
                  View portfolio
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
