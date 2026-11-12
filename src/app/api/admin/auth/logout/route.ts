import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/security/session';
import { verifyRequestOriginAndCsrf } from '@/lib/security/csrf';

export async function POST(request: Request) {
  const csrf = verifyRequestOriginAndCsrf(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { error: csrf.error || 'Forbidden' },
      { status: csrf.status || 403 }
    );
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

