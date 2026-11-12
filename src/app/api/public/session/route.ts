import { NextResponse } from 'next/server';
import {
  getHouseholdSessionFromCookies,
  HOUSEHOLD_SESSION_COOKIE,
} from '@/lib/security/session';
import { getSanitizedHouseholdSessionView } from '@/lib/db/repository';
import { verifyRequestOriginAndCsrf } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getHouseholdSessionFromCookies();
  if (!session) {
    return NextResponse.json({ householdSession: null }, { status: 200 });
  }

  const view = await getSanitizedHouseholdSessionView(
    session.householdId,
    session.codeDigestPrefix
  );

  return NextResponse.json({ householdSession: view }, { status: 200 });
}

export async function DELETE(request: Request) {
  const csrfCheck = verifyRequestOriginAndCsrf(request);
  if (!csrfCheck.ok) {
    return NextResponse.json(
      { error: csrfCheck.error || 'Forbidden' },
      { status: csrfCheck.status || 403 }
    );
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(HOUSEHOLD_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

