import { NextResponse } from 'next/server';
import { getHouseholdSessionFromCookies } from '@/lib/security/session';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import {
  checkRateLimitDistributed,
  extractClientIp,
} from '@/lib/security/rate-limit';
import { submitRsvpSchema } from '@/lib/validation/schemas';
import {
  getSanitizedHouseholdSessionView,
  submitOrUpdateHouseholdRsvp,
} from '@/lib/db/repository';

export async function POST(request: Request) {
  const clientIp = extractClientIp(request);

  // Rate limit RSVP mutations (20 requests per 5 minutes per IP)
  const limit = await checkRateLimitDistributed(clientIp, {
    namespace: 'public_rsvp_submit',
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many RSVP requests. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  const hhSession = await getHouseholdSessionFromCookies();
  if (!hhSession) {
    return NextResponse.json(
      {
        error:
          'Your household invitation session has expired or has not been verified. Please enter your invitation code first.',
      },
      { status: 401 }
    );
  }

  // Re-verify that the household is still active and its code has not been revoked or regenerated
  const activeView = await getSanitizedHouseholdSessionView(
    hhSession.householdId,
    hhSession.codeDigestPrefix
  );
  if (!activeView) {
    return NextResponse.json(
      {
        error:
          'This household invitation is no longer active or its code was regenerated. Please re-verify your invitation code.',
      },
      { status: 401 }
    );
  }

  const parsedBody = await parseStrictJsonBody(request, 32 * 1024);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status }
    );
  }

  const validation = submitRsvpSchema.safeParse(parsedBody.data);
  if (!validation.success) {
    const firstIssue =
      validation.error.issues[0]?.message ||
      'Invalid RSVP submission data. Please review all fields.';
    return NextResponse.json(
      {
        error: firstIssue,
        issues: validation.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const headerIdempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  const idempotencyKey =
    validation.data.idempotencyKey || headerIdempotencyKey || undefined;

  const result = await submitOrUpdateHouseholdRsvp({
    householdId: activeView.householdId,
    overallStatus: validation.data.overallStatus,
    memberResponses: validation.data.memberResponses,
    additionalGuests: validation.data.additionalGuests,
    contactEmail: validation.data.contactEmail,
    contactPhone: validation.data.contactPhone,
    personalMessage: validation.data.personalMessage,
    expectedVersion: validation.data.expectedVersion,
    idempotencyKey,
    updatedBy: 'guest',
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Unable to submit RSVP.' },
      { status: result.statusCode }
    );
  }

  const updatedSessionView = await getSanitizedHouseholdSessionView(
    activeView.householdId,
    hhSession.codeDigestPrefix
  );

  return NextResponse.json(
    {
      ok: true,
      rsvp: result.rsvp,
      householdSession: updatedSessionView,
      fromIdempotencyCache: Boolean(result.fromIdempotencyCache),
    },
    { status: result.statusCode }
  );
}

