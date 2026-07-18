import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Routes that require a signed-in session
const PROTECTED_ROUTES = ['/account'];

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a server client that can read/write cookies on the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate updated cookies to both the request and response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add any logic between createServerClient and getUser.
  // getUser refreshes the session cookie — skipping it breaks auth.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

// CR-8 (July 2026): only run the middleware where the session actually matters.
// auth.getUser() here is a network round trip to Supabase Auth on every matched
// request, so matching every route made each page view slower for any visitor
// with a session cookie. These routes need it:
//   - /account: protected route (redirect) + page uses getSession()
//   - /builder: page uses getSession()
//   - /api/current-holdings: route uses getSession() (CR-22 dependency — this
//     route MUST stay in the matcher)
//   - /api/builder-save, /api/portfolios: authed API routes (they use getUser()
//     themselves, but the middleware also persists refreshed session cookies)
// Everything else either has no auth or calls auth.getUser() directly
// (e.g. /api/builder-holdings, /monte-carlo-simulation), which stays safe
// without the middleware.
export const config = {
  matcher: [
    '/account/:path*',
    '/builder/:path*',
    '/api/builder-save',
    '/api/portfolios/:path*',
    '/api/current-holdings/:path*',
  ],
};
