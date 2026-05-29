'use client';

import Link from 'next/link';

// Format "2026-06-01" → "June 2026"
function fmtMonth(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

function fmtWeight(w) {
  const n = Number(w);
  return n % 1 === 0 ? `${n}%` : `${n.toFixed(1)}%`;
}

// ── Holding row ───────────────────────────────────────────────────────────────

function HoldingRow({ ticker, weight }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-outline-variant last:border-0">
      <span className="font-inter font-semibold text-[13px] text-on-surface tracking-wide">
        {ticker}
      </span>
      <span className="font-inter text-[13px] text-on-surface-variant">
        {fmtWeight(weight)}
      </span>
    </div>
  );
}

// ── Single portfolio card (account page) ──────────────────────────────────────

function SignalCard({ name, date, holdings }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-inter font-semibold text-[13px] text-on-surface leading-snug">{name}</p>
        {date && (
          <span className="font-inter text-[11px] text-on-surface-variant whitespace-nowrap shrink-0">
            {fmtMonth(date)}
          </span>
        )}
      </div>
      <div>
        {holdings.map(({ ticker, weight }) => (
          <HoldingRow key={ticker} ticker={ticker} weight={weight} />
        ))}
      </div>
    </div>
  );
}

// ── Upgrade prompt strip ──────────────────────────────────────────────────────

function UpgradeStrip({ isMember }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-outline-variant flex-wrap">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>lock</span>
        <p className="font-inter text-[13px] text-on-surface-variant">
          {isMember === 'builder'
            ? 'Upgrade to Signals to see tactical holdings.'
            : 'Subscribe to Signals to unlock tactical holdings.'}
        </p>
      </div>
      <Link
        href="/membership"
        className="inline-flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors whitespace-nowrap"
      >
        See plans
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
      </Link>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
//
// Builder context:
//   blendedHoldings — { hasTactical: bool, holdings: [{ ticker, weight }] }
//   tier            — null | 'builder' | 'signals'
//
// Account context:
//   signals         — [{ slug, name, date, holdings: [{ ticker, weight }] }]
//   tier            — null | 'builder' | 'signals'

export default function CurrentSignals({
  context = 'account',
  // builder props
  blendedHoldings = null,
  // account props
  signals = [],
  // shared
  tier = null,
}) {
  const isSignalsMember = tier === 'signals';

  // ── Builder: one blended holdings list ──────────────────────────────────────
  if (context === 'builder') {
    if (!blendedHoldings || blendedHoldings.holdings.length === 0) return null;

    const { hasTactical, holdings } = blendedHoldings;
    const locked = hasTactical && !isSignalsMember;

    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
            signal_cellular_alt
          </span>
          <h3 className="font-manrope font-bold text-[16px] text-on-surface">
            Blended Holdings
          </h3>
          {hasTactical && (
            <span className="font-inter text-[11px] text-on-surface-variant ml-auto">
              Reflects current month signals
            </span>
          )}
        </div>

        {/* Holdings list — blurred if tactical + not Signals member */}
        <div className={`transition-[filter] ${locked ? 'blur-sm select-none pointer-events-none' : ''}`}>
          {holdings.map(({ ticker, weight }) => (
            <HoldingRow key={ticker} ticker={ticker} weight={weight} />
          ))}
        </div>

        {locked && <UpgradeStrip isMember={tier} />}
      </div>
    );
  }

  // ── Account: full signal portfolio grid ────────────────────────────────────
  if (signals.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center">
        <p className="font-inter text-[14px] text-on-surface-variant">
          No signals available yet — check back after the last trading day of the month.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Grid — blurred for non-signals members */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-[filter] ${!isSignalsMember ? 'blur-sm select-none pointer-events-none' : ''}`}>
        {signals.map((s) => (
          <SignalCard key={s.slug} name={s.name} date={s.date} holdings={s.holdings} />
        ))}
      </div>

      {/* Lock overlay */}
      {!isSignalsMember && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-surface-container-lowest/80 px-6">
          <span className="material-symbols-outlined text-[36px] text-primary mb-2">lock</span>
          <p className="font-manrope font-bold text-[16px] text-on-surface mb-1 text-center">
            Current Signals
          </p>
          <p className="font-inter text-[13px] text-on-surface-variant mb-4 text-center max-w-xs">
            {tier === 'builder'
              ? 'Upgrade to Signals to see monthly trade signals for all covered portfolios.'
              : 'Subscribe to Signals to see monthly trade signals for all covered portfolios.'}
          </p>
          <Link
            href="/membership"
            className="inline-flex items-center gap-1.5 bg-primary text-white font-inter font-semibold text-[13px] px-4 py-2 rounded-xl hover:bg-[#0a5c3f] transition-colors"
          >
            See plans
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </Link>
        </div>
      )}
    </div>
  );
}
