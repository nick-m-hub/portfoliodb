'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="font-inter text-[13px] text-on-surface-variant hover:text-error transition-colors flex items-center gap-1.5"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
      Sign out
    </button>
  );
}
