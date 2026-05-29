import Link from 'next/link';
import LoginForm from '@/components/LoginForm';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata = {
  title: 'Sign In — PortfolioDB',
  description: 'Sign in to your PortfolioDB account to access saved portfolio mixes and trading signals.',
  alternates: { canonical: `${siteUrl}/login` },
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next      = params?.next ?? '/account';
  const authError = params?.error ?? null;

  return (
    <main className="min-h-[calc(100vh-48px)] bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/portfoliodb-icon.svg" alt="" width={28} height={28} />
          <span className="font-manrope font-bold text-[22px] text-primary tracking-tight">
            PortfolioDB
          </span>
        </Link>

        {/* Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="font-manrope font-bold text-[22px] text-on-surface mb-1.5">
              Sign in
            </h1>
            <p className="font-inter text-[14px] text-on-surface-variant">
              Access your saved mixes and membership benefits.
            </p>
          </div>

          <LoginForm next={next} authError={authError} />
        </div>

        {/* Footer note */}
        <p className="font-inter text-[12px] text-on-surface-variant text-center mt-5">
          Don&apos;t have a membership yet?{' '}
          <Link href="/membership" className="text-primary hover:underline">
            View plans →
          </Link>
        </p>

      </div>
    </main>
  );
}
