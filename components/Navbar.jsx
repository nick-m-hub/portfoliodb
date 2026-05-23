import Link from 'next/link';
import NavSearch from '@/components/NavSearch';
import MobileMoreMenu from '@/components/MobileMoreMenu';

/** @param {{ portfolios: Array<{name: string, slug: string}> }} props */
export default function Navbar({ portfolios = [] }) {
  return (
    <nav className="bg-white/90 backdrop-blur-md sticky top-0 w-full z-50 border-b border-outline-variant shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">

        {/* Main row */}
        <div className="flex justify-between items-center h-12">

          {/* Logo + nav links */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-primary flex items-center gap-2 font-manrope"
            >
              <img src="/portfoliodb-icon.svg" alt="PortfolioDB" width={24} height={24} />
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
              <Link
                href="/strategies"
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
              >
                Strategies
              </Link>
              <Link
                href="/compare"
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
              >
                Compare
              </Link>
              <Link
                href="/membership"
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
              >
                Membership
              </Link>
            </div>
          </div>

          {/* Search */}
          <NavSearch portfolios={portfolios} />

        </div>

        {/* Mobile-only nav links row */}
        <div className="flex md:hidden items-center justify-between border-t border-outline-variant/40 py-2">
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
          <Link
            href="/strategies"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors font-inter"
          >
            Strategies
          </Link>
          <MobileMoreMenu />
        </div>

      </div>
    </nav>
  );
}
