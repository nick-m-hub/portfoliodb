import { createServerSupabaseClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // RLS ensures users can only delete their own rows
  const { error } = await supabase
    .from('user_portfolios')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[portfolios/delete]', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
