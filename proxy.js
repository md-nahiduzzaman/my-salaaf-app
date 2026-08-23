import { NextResponse } from 'next/server';

export function proxy(req) {
  const passcode = process.env.APP_PASSCODE;

  // No passcode configured -> app stays fully open.
  if (!passcode) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('wl_auth');
  if (cookie?.value === passcode) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
