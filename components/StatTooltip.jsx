'use client';

import { useState, useRef, useEffect } from 'react';
export { STAT_DEFINITIONS } from '@/lib/statDefinitions';

export default function StatTooltip({ label, definition, labelClass = '' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (tipRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  function show() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, r.left - 80),
      window.innerWidth - 232
    );
    setCoords({ top: r.bottom + 6, left });
    setOpen(true);
  }

  return (
    <span className={`inline-flex items-center gap-1 ${labelClass}`}>
      {label}
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : show(); }}
        aria-label={`About ${label}`}
        className="text-outline hover:text-primary transition-colors flex-shrink-0 cursor-help"
      >
        <span className="material-symbols-outlined leading-none" style={{ fontSize: '11px' }}>info</span>
      </button>
      {open && (
        <div
          ref={tipRef}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="fixed w-56 bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-[12px] font-inter font-normal leading-relaxed rounded-lg px-3 py-2.5 shadow-xl z-[200]"
          style={{ top: coords.top, left: coords.left }}
        >
          {definition}
        </div>
      )}
    </span>
  );
}
