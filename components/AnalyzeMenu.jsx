'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const TOOLS = [
  {
    icon: 'compare_arrows',
    label: 'Compare This Portfolio',
    desc: 'Side-by-side stats against up to 3 others',
    href: (slug) => `/compare?slugs=${slug}`,
  },
  {
    icon: 'monitoring',
    label: 'Monte Carlo Simulation',
    desc: 'Simulate withdrawals & retirement scenarios',
    href: (slug) => `/monte-carlo-simulation?slug=${slug}`,
  },
  {
    icon: 'show_chart',
    label: 'Lump Sum vs. DCA',
    desc: 'Invest all at once or spread it out?',
    href: (slug) => `/tools/lump-sum-vs-dca?slug=${slug}`,
  },
  {
    icon: 'savings',
    label: 'FI Calculator',
    desc: 'Estimate years to reach your FI number',
    href: (slug) => `/tools/financial-independence?slug=${slug}`,
  },
];

export default function AnalyzeMenu({ slug }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-center gap-2 py-3 border rounded-full font-inter text-[14px] font-semibold transition-colors ${
          open
            ? 'border-primary text-primary bg-surface-container-low'
            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">analytics</span>
        Analyze
        <span className="material-symbols-outlined text-[16px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md overflow-hidden z-50">
          {TOOLS.map(({ icon, label, desc, href }) => (
            <Link
              key={label}
              href={href(slug)}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-b-0 group"
            >
              <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 flex-shrink-0">{icon}</span>
              <div>
                <div className="font-inter text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors">{label}</div>
                <div className="font-inter text-[11px] text-on-surface-variant mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
