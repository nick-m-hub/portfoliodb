'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const PORTFOLIO_COLORS = ['#074a34', '#1565c0', '#b71c1c', '#e67e22', '#7b1fa2', '#00796b'];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function buildLoadUrl(selections) {
  const param = selections.map((s) => `${s.slug}:${s.weight}`).join(',');
  return `/builder?mix=${encodeURIComponent(param)}`;
}

// Blend each portfolio's holdings/allocations by the user's mix weights.
// Returns [{ ticker, weight }] sorted by weight desc, or [] if no data.
function computeBlended(selections, allocBySlug, signalBySlug, tacticalSlugs) {
  const tickerTotals = {};

  for (const sel of selections) {
    const portFrac = parseFloat(sel.weight) / 100;
    if (!portFrac || isNaN(portFrac)) continue;

    const isTactical = tacticalSlugs.has(sel.slug);
    let holdings = [];

    if (isTactical) {
      const signal = signalBySlug[sel.slug];
      if (signal) {
        // signal.holdings[].weight is already in % (0–100)
        holdings = signal.holdings.map((h) => ({ ticker: h.ticker, frac: h.weight / 100 }));
      }
    } else {
      const allocs = allocBySlug[sel.slug] ?? [];
      holdings = allocs.map((a) => ({ ticker: a.ticker, frac: Number(a.percentage) / 100 }));
    }

    for (const { ticker, frac } of holdings) {
      tickerTotals[ticker] = (tickerTotals[ticker] || 0) + portFrac * frac;
    }
  }

  return Object.entries(tickerTotals)
    .map(([ticker, frac]) => ({ ticker, weight: frac * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

function fmtW(w) {
  const n = Number(w);
  return n % 1 === 0 ? `${n}%` : `${n.toFixed(1)}%`;
}

// ── Blended holdings display inside a mix card ────────────────────────────────

function BlendedHoldings({ selections, allocBySlug, signalBySlug, tacticalSlugs, tier }) {
  const hasTactical = selections.some((s) => tacticalSlugs.has(s.slug));
  const isSignalsMember = tier === 'signals';
  const holdings = computeBlended(selections, allocBySlug, signalBySlug, tacticalSlugs);

  // CR-1 (July 2026): non-Signals members never receive tactical signal data, so
  // `holdings` only contains the buy-and-hold portion of the mix for them. That
  // portion is public allocation data — shown unblurred — with a note explaining
  // the tactical remainder is hidden.
  const locked = hasTactical && !isSignalsMember;

  if (holdings.length === 0 && !locked) return null;

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant">
      <p className="font-inter text-[11px] uppercase tracking-wide text-on-surface-variant mb-2">
        Blended holdings
      </p>

      {holdings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {holdings.map(({ ticker, weight }) => (
            <span
              key={ticker}
              className="inline-flex items-center gap-1 font-inter text-[11px] font-medium bg-surface-container px-2 py-0.5 rounded-full text-on-surface"
            >
              <span className="font-semibold">{ticker}</span>
              <span className="text-on-surface-variant">{fmtW(weight)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Inline upgrade prompt for Builder members with tactical portfolios */}
      {locked && (
        <div className={`flex items-center gap-2 ${holdings.length > 0 ? 'mt-2' : ''}`}>
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '13px' }}>lock</span>
          <span className="font-inter text-[11px] text-on-surface-variant">
            This mix includes tactical holdings — visible with{' '}
            <Link href="/membership" className="text-primary hover:underline">
              Signals membership
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SavedMixList({ initialMixes, tier, allAllocations = [], allSignals = [], tacticalSlugs: tacticalSlugsProp = [] }) {
  const [mixes, setMixes]           = useState(initialMixes);
  const [confirmId, setConfirmId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError]           = useState(null);

  // Pre-compute lookup maps once for all cards.
  // tacticalSlugs comes from the server (kofi_link, public info) rather than
  // from allSignals — non-Signals members receive allSignals=[] (CR-1), but the
  // "tactical holdings hidden" note still needs to know which slugs are tactical.
  const { allocBySlug, signalBySlug, tacticalSlugs } = useMemo(() => {
    const allocBySlug = {};
    for (const a of allAllocations) {
      if (!allocBySlug[a.portfolio_slug]) allocBySlug[a.portfolio_slug] = [];
      allocBySlug[a.portfolio_slug].push(a);
    }
    const signalBySlug = Object.fromEntries(allSignals.map((s) => [s.slug, s]));
    const tacticalSlugs = new Set(
      tacticalSlugsProp.length ? tacticalSlugsProp : allSignals.map((s) => s.slug)
    );
    return { allocBySlug, signalBySlug, tacticalSlugs };
  }, [allAllocations, allSignals, tacticalSlugsProp]);

  async function handleDelete(id) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setMixes((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Could not delete mix. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  if (mixes.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col items-center justify-center py-14 text-center px-8">
        <span className="material-symbols-outlined text-[44px] text-outline-variant mb-3">bookmark</span>
        <p className="font-manrope font-bold text-[16px] text-on-surface mb-1">No saved mixes yet</p>
        <p className="font-inter text-[14px] text-on-surface-variant mb-4">
          Head to the Builder, create a mix you like, and save it here.
        </p>
        <Link
          href="/builder"
          className="inline-flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors"
        >
          Go to Builder
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-inter text-[13px] text-error">{error}</p>
      )}
      {mixes.map((mix) => (
        <div
          key={mix.id}
          className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5"
        >
          {/* Mix name + date + actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-manrope font-bold text-[15px] text-on-surface">
                {mix.name || 'Untitled Mix'}
              </p>
              <p className="font-inter text-[12px] text-on-surface-variant mt-0.5">
                Saved {formatDate(mix.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {confirmId === mix.id ? (
                <>
                  <span className="font-inter text-[12px] text-on-surface-variant">Delete?</span>
                  <button
                    onClick={() => handleDelete(mix.id)}
                    disabled={deletingId === mix.id}
                    className="font-inter text-[12px] font-semibold text-error hover:underline disabled:opacity-50"
                  >
                    {deletingId === mix.id ? 'Deleting…' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="font-inter text-[12px] text-on-surface-variant hover:underline"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={buildLoadUrl(mix.selections)}
                    className="inline-flex items-center gap-1 font-inter text-[12px] font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    Load
                  </Link>
                  <button
                    onClick={() => setConfirmId(mix.id)}
                    className="font-inter text-[12px] text-on-surface-variant hover:text-error transition-colors"
                    aria-label="Delete mix"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Portfolio weight pills */}
          <div className="flex flex-wrap gap-1.5">
            {mix.selections.map((s, i) => (
              <span
                key={s.slug}
                className="inline-flex items-center font-inter text-[11px] font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length] }}
              >
                {s.weight}%{s.name ? ` ${s.name}` : ''}
              </span>
            ))}
          </div>

          {/* Blended holdings — Signals tier sees real data; Builder tier sees blurred */}
          <BlendedHoldings
            selections={mix.selections}
            allocBySlug={allocBySlug}
            signalBySlug={signalBySlug}
            tacticalSlugs={tacticalSlugs}
            tier={tier}
          />
        </div>
      ))}

      {/* Builder tier limit indicator */}
      {tier === 'builder' && (
        <p className="font-inter text-[12px] text-on-surface-variant text-right">
          {mixes.length}/3 mixes used &mdash;{' '}
          <Link href="/membership" className="text-primary hover:underline">
            upgrade to Signals for unlimited
          </Link>
        </p>
      )}
    </div>
  );
}
