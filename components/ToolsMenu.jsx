'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const TOOLS = [
  { href: '/leaderboard',              label: 'Leaderboard',        desc: 'Top strategies by return & Sharpe' },
  { href: '/tools/drawdown-analyzer', label: 'Drawdown Analyzer',  desc: 'How portfolios held up in crashes' },
  { href: '/tools/portfolio-map',     label: 'Portfolio Map',       desc: 'Risk vs. return chart for all portfolios' },
  { href: '/tools/financial-independence', label: 'Financial Independence', desc: 'Estimate years to reach your FI number' },
  { href: '/tools/lump-sum-vs-dca',   label: 'Lump Sum vs. DCA',    desc: 'Invest all at once or spread it out?' },
  { href: '/tools/correlation',       label: 'Correlation Matrix',  desc: 'See which strategies move together' },
  { href: '/compare',                  label: 'Compare',            desc: 'Side-by-side portfolio comparison' },
  { href: '/builder',                  label: 'Builder',            desc: 'Blend portfolios into a custom mix' },
  { href: '/monte-carlo-simulation',   label: 'Monte Carlo',        desc: 'Simulate withdrawals & scenarios' },
];

export default function ToolsMenu() {
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-0.5 text-sm font-medium transition-colors font-inter ${open ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
      >
        Tools
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 bg-white border border-outline-variant rounded-xl shadow-lg py-2 w-56 z-50">
          {TOOLS.map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex flex-col px-4 py-2.5 hover:bg-surface-container-low transition-colors group"
            >
              <span className="font-inter text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                {label}
              </span>
              <span className="font-inter text-xs text-on-surface-variant mt-0.5">
                {desc}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
