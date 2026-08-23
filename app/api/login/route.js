import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const passcode = process.env.APP_PASSCODE;

  // If no passcode is configured, there's nothing to log in to.
  if (!passcode) {
    return NextResponse.json({ ok: true });
  }

  if (body.passcode !== passcode) {
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('wl_auth', passcode, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
