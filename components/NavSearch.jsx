'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NavSearch({ portfolios }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef(null);

  const results = query.trim().length === 0 ? [] : portfolios
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      e.target.blur();
    }
    if (e.key === 'Enter' && results.length > 0) {
      navigate(results[0].slug);
    }
  }

  function navigate(slug) {
    setQuery('');
    setOpen(false);
    router.push(`/portfolios/${slug}`);
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">
        search
      </span>
      <input
        className="bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm w-48 md:w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-inter placeholder:text-on-surface-variant/60"
        placeholder="Search strategies..."
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 right-0 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((p) => (
            <button
              key={p.slug}
              onMouseDown={(e) => { e.preventDefault(); navigate(p.slug); }}
              className="w-full text-left px-4 py-2.5 font-inter text-[13px] text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
