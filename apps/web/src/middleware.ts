import { NextRequest, NextResponse } from 'next/server';

// Paths that don't need auth or verification
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/check-email',
  '/invoice',       // public invoice view
  '/api',           // Next.js API routes if any
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Decode the JWT payload without verifying the signature (Edge-safe). */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // atob is available in Edge runtime
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect logged-in users away from root and auth pages to the app
  if (pathname === '/' || isPublic(pathname)) {
    const token = request.cookies.get('access_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      if (payload) {
        const dest = request.nextUrl.clone();
        dest.pathname = payload['isSuperAdmin'] === true ? '/admin' : '/app';
        dest.search = '';
        return NextResponse.redirect(dest);
      }
    }
    return NextResponse.next();
  }

  const isAppRoute = pathname.startsWith('/app');
  const isAdminRoute = pathname.startsWith('/admin');

  // Only protect /app/* and /admin/* routes
  if (!isAppRoute && !isAdminRoute) return NextResponse.next();

  const token = request.cookies.get('access_token')?.value;

  // No token → send to login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwt(token);
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Superadmin trying to access /app → redirect to /admin
  if (payload['isSuperAdmin'] === true && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Non-superadmin trying to access /admin → redirect to /app
  if (payload['isSuperAdmin'] !== true && isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  // Email not verified → send to check-email page (only for /app routes, superadmin skips)
  if (isAppRoute && payload['emailVerified'] === false) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/check-email';
    if (typeof payload['email'] === 'string') {
      url.searchParams.set('email', payload['email']);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/auth/:path*', '/app/:path*', '/admin/:path*'],
};
