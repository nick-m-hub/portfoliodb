import Link from 'next/link';
import NavSearch from '@/components/NavSearch';

/** @param {{ portfolios: Array<{name: string, slug: string}> }} props */
export default function Navbar({ portfolios = [] }) {
  return (
    <nav className="bg-white/90 backdrop-blur-md sticky top-0 w-full z-50 border-b border-outline-variant shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex justify-between items-center h-12">

        {/* Logo + nav links */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-primary flex items-center gap-2 font-manrope"
          >
            <span className="material-symbols-outlined">analytics</span>
            PortfolioDB
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/database"
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
            >
              Database
            </Link>
            <Link
              href="/portfolio-screener"
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
            >
              Screener
            </Link>
          </div>
        </div>

        {/* Search */}
        <NavSearch portfolios={portfolios} />

      </div>
    </nav>
  );
}
