'use client';

import { useState } from 'react';

const MEMBERFUL_BUILDER_MONTHLY_URL = 'https://portfoliodb.memberful.com/checkout?plan=147939';
const MEMBERFUL_BUILDER_ANNUAL_URL  = 'https://portfoliodb.memberful.com/checkout?plan=147940';
const MEMBERFUL_SIGNALS_MONTHLY_URL = 'https://portfoliodb.memberful.com/checkout?plan=147941';
const MEMBERFUL_SIGNALS_ANNUAL_URL  = 'https://portfoliodb.memberful.com/checkout?plan=147942';

const PLANS = {
  builder: {
    monthly: { price: '$12', per: '/mo', note: 'Cancel anytime.' },
    annual:  { price: '$9',  per: '/mo', note: 'Billed $108/yr. Cancel anytime.' },
  },
  signals: {
    monthly: { price: '$25', per: '/mo', note: 'Cancel anytime.' },
    annual:  { price: '$19', per: '/mo', note: 'Billed $228/yr. Cancel anytime.' },
  },
};

const BUILDER_FEATURES = [
  'Save up to 3 custom portfolio mixes',
  'Unlimited session-based mixing (already free)',
  'Full database, screener, and comparison tools',
];

const getSignalsFeatures = (signalCount) => [
  `Monthly trade signals for ${signalCount} tactical portfolios`,
  'Signal archive — full history of past signals',
  'Unlimited saved mixes in the Portfolio Builder',
  'Everything in Builder, plus all free features',
];

export default function PricingToggle({ signalCount = 29 }) {
  const [billing, setBilling] = useState('annual');

  const builderUrl  = billing === 'annual' ? MEMBERFUL_BUILDER_ANNUAL_URL  : MEMBERFUL_BUILDER_MONTHLY_URL;
  const signalsUrl  = billing === 'annual' ? MEMBERFUL_SIGNALS_ANNUAL_URL  : MEMBERFUL_SIGNALS_MONTHLY_URL;
  const builderPlan = PLANS.builder[billing];
  const signalsPlan = PLANS.signals[billing];

  return (
    <div>
      {/* ── Billing toggle ── */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`font-inter text-[13px] font-medium transition-colors ${billing === 'monthly' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${billing === 'annual' ? 'bg-primary' : 'bg-outline-variant'}`}
          aria-label="Toggle billing period"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${billing === 'annual' ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
        <span className={`font-inter text-[13px] font-medium transition-colors ${billing === 'annual' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          Yearly
        </span>
        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-inter text-[11px] font-semibold px-2.5 py-1 rounded-full">
          Save ~25%
        </span>
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Builder card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col">
          <div className="mb-4">
            <p className="font-inter text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Builder
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-manrope text-[40px] font-bold text-on-surface leading-none">{builderPlan.price}</span>
              <span className="font-inter text-[16px] text-on-surface-variant mb-1">{builderPlan.per}</span>
            </div>
            <p className="font-inter text-[13px] text-on-surface-variant">{builderPlan.note}</p>
          </div>

          <ul className="space-y-2.5 mb-6 flex-1">
            {BUILDER_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 font-inter text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '15px' }}>check</span>
                {item}
              </li>
            ))}
          </ul>

          {builderUrl === '#' ? (
            <button
              disabled
              className="flex items-center justify-center gap-2 font-inter font-semibold text-[14px] px-6 py-3 rounded-xl bg-surface-container text-on-surface-variant cursor-not-allowed w-full"
            >
              Coming soon
            </button>
          ) : (
            <a
              href={builderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-inter font-semibold text-[14px] px-6 py-3 rounded-xl bg-on-surface text-white hover:opacity-90 transition-opacity"
            >
              Get Builder
            </a>
          )}
        </div>

        {/* Signals card — highlighted */}
        <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 bg-primary text-white font-inter text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>stars</span>
              Most Popular
            </span>
          </div>

          <div className="mb-4">
            <p className="font-inter text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Signals
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="font-manrope text-[40px] font-bold text-primary leading-none">{signalsPlan.price}</span>
              <span className="font-inter text-[16px] text-on-surface-variant mb-1">{signalsPlan.per}</span>
            </div>
            <p className="font-inter text-[13px] text-on-surface-variant">{signalsPlan.note}</p>
          </div>

          <ul className="space-y-2.5 mb-6 flex-1">
            {getSignalsFeatures(signalCount).map((item) => (
              <li key={item} className="flex items-start gap-2.5 font-inter text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '15px' }}>check</span>
                {item}
              </li>
            ))}
          </ul>

          {signalsUrl === '#' ? (
            <button
              disabled
              className="flex items-center justify-center gap-2 font-inter font-semibold text-[14px] px-6 py-3 rounded-xl bg-surface-container text-on-surface-variant cursor-not-allowed w-full"
            >
              Coming soon
            </button>
          ) : (
            <a
              href={signalsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-inter font-semibold text-[14px] px-6 py-3 rounded-xl bg-primary text-white hover:bg-[#0a5c3f] transition-colors"
            >
              Get Signals
            </a>
          )}
        </div>
      </div>

      <p className="font-inter text-[12px] text-on-surface-variant mt-4 text-center">
        Already a Ko-fi member?{' '}
        <a href="mailto:nick@portfoliodb.com" className="underline hover:text-primary transition-colors">
          Contact us
        </a>{' '}
        to migrate your subscription.
      </p>
    </div>
  );
}
