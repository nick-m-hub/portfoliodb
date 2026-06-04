import Link from 'next/link';

const links = [
  { label: 'Membership', href: '/membership' },
  { label: 'Blog', href: '/blog' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Glossary', href: '/glossary-of-terms' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Support', href: '/contact' },
];

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant w-full py-12 mt-auto">
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-manrope text-lg font-bold text-on-surface">PortfolioDB</span>
          <p className="font-inter text-sm text-on-surface-variant">
            © 2026 PortfolioDB Analytics. Institutional-grade research.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="font-inter text-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
