import { NextResponse } from 'next/server';
import { getHouseholdSessionFromCookies } from '@/lib/security/session';
import { getPublicInvitationPayload } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hhSession = await getHouseholdSessionFromCookies();
    const payload = await getPublicInvitationPayload(
      hhSession
        ? {
            householdId: hhSession.householdId,
            codeDigestPrefix: hhSession.codeDigestPrefix,
          }
        : null
    );

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to load wedding invitation content.' },
      { status: 500 }
    );
  }
}

