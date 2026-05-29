'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function MobileMoreMenu() {
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
        className="flex items-center gap-0.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
      >
        More
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-outline-variant rounded-lg shadow-md py-1 min-w-[120px] z-50">
          <Link
            href="/compare"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-inter"
          >
            Compare
          </Link>
          <Link
            href="/builder"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-inter"
          >
            Builder
          </Link>
          <Link
            href="/monte-carlo-simulation"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-inter"
          >
            Monte Carlo
          </Link>
          <Link
            href="/membership"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-inter"
          >
            Membership
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-inter"
          >
            Account
          </Link>
        </div>
      )}
    </div>
  );
}
