import { NextResponse } from 'next/server';
import { verifyInvitationCodeSchema } from '@/lib/validation/schemas';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import {
  checkRateLimitDistributed,
  extractClientIp,
} from '@/lib/security/rate-limit';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import {
  getAdminFullContentAndSettings,
  verifyHouseholdInvitationCode,
} from '@/lib/db/repository';
import {
  createHouseholdSessionToken,
  HOUSEHOLD_SESSION_COOKIE,
} from '@/lib/security/session';

export async function POST(request: Request) {
  const clientIp = extractClientIp(request);

  // Strict rate limit to prevent invitation-code enumeration (12 attempts per 5 minutes per IP)
  const limit = await checkRateLimitDistributed(clientIp, {
    namespace: 'public_verify_code',
    maxRequests: 12,
    windowMs: 5 * 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many verification attempts. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  const parsedBody = await parseStrictJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status }
    );
  }

  const validation = verifyInvitationCodeSchema.safeParse(parsedBody.data);
  if (!validation.success) {
    const firstIssue =
      validation.error.issues[0]?.message || 'Invalid invitation code format.';
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  try {
    const { settings } = await getAdminFullContentAndSettings();
    const turnstileCheck = await verifyTurnstileToken(
      validation.data.turnstileToken,
      clientIp,
      settings.turnstileEnabled
    );

    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || 'Security verification failed.' },
        { status: 403 }
      );
    }

    const result = await verifyHouseholdInvitationCode(validation.data.code);
    if (!result.ok || !result.household || !result.sessionView) {
      return NextResponse.json(
        {
          error:
            result.error ||
            'We could not verify that invitation code. Please check your invitation card and try again.',
        },
        { status: 401 }
      );
    }

    const sessionToken = createHouseholdSessionToken(
      result.household.id,
      result.household.codeDigest
    );

    const response = NextResponse.json(
      {
        ok: true,
        householdSession: result.sessionView,
      },
      { status: 200 }
    );

    response.cookies.set(HOUSEHOLD_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unable to verify invitation code at this time.' },
      { status: 500 }
    );
  }
}

