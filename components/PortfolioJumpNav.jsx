'use client';
import { useEffect, useRef, useState } from 'react';

export default function PortfolioJumpNav({ sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const navRef = useRef(null);
  const mainNavHeightRef = useRef(49);

  useEffect(() => {
    const mainNav = document.querySelector('nav[class*="z-50"]');
    const measure = () => {
      if (mainNav) {
        mainNavHeightRef.current = mainNav.getBoundingClientRect().height;
        if (navRef.current) {
          navRef.current.style.top = `${mainNavHeightRef.current}px`;
        }
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const offset = mainNavHeightRef.current + 70;
      const scrollY = window.scrollY + offset;
      let current = sections[0]?.id ?? '';
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top <= scrollY) current = id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = mainNavHeightRef.current + 56;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav
      ref={navRef}
      style={{ top: '49px' }}
      className="sticky z-40 -mx-8 md:-mx-12 bg-surface-container-low border-b border-outline-variant mb-8"
    >
      <div className="px-8 md:px-12 flex items-center gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full font-inter text-[13px] font-medium transition-colors whitespace-nowrap ${
              activeId === id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
