'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NavSearch({ portfolios }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const results = query.trim().length === 0 ? [] : portfolios
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setExpanded(false);
      setQuery('');
    }
    if (e.key === 'Enter' && results.length > 0) {
      navigate(results[0].slug);
    }
  }

  function navigate(slug) {
    setQuery('');
    setExpanded(false);
    router.push(`/portfolios/${slug}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setExpanded(true)}
        aria-label="Search portfolios"
        className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>search</span>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 p-2">
          <div className="flex items-center gap-2 bg-surface-container rounded-lg px-3 py-2">
            <span
              className="material-symbols-outlined text-on-surface-variant flex-shrink-0"
              style={{ fontSize: '16px' }}
            >
              search
            </span>
            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-transparent text-sm font-inter text-on-surface placeholder:text-on-surface-variant/60 outline-none"
              placeholder="Search portfolios…"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="mt-1">
              {results.map((p) => (
                <button
                  key={p.slug}
                  onMouseDown={(e) => { e.preventDefault(); navigate(p.slug); }}
                  className="w-full text-left px-3 py-2 font-inter text-[13px] text-on-surface hover:bg-surface-container-low transition-colors rounded-lg"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
