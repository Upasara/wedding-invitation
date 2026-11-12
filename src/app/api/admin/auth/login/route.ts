import { NextResponse } from 'next/server';
import { adminLoginSchema } from '@/lib/validation/schemas';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import {
  checkRateLimitDistributed,
  extractClientIp,
} from '@/lib/security/rate-limit';
import {
  authenticateAdminCredentials,
  resolveOrProvisionFirebaseAdminUser,
} from '@/lib/db/repository';
import { getFirebaseAdminAuth } from '@/lib/db/firebase-admin';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from '@/lib/security/session';

export async function POST(request: Request) {
  const clientIp = extractClientIp(request);

  // Rate limit admin login attempts (10 per 10 minutes per IP)
  const limit = await checkRateLimitDistributed(clientIp, {
    namespace: 'admin_login',
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    blockDurationMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many sign-in attempts. Please wait ${limit.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  const parsed = await parseStrictJsonBody(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = adminLoginSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid login credentials.',
      },
      { status: 400 }
    );
  }

  try {
    // 1. If a Firebase ID token is supplied and Firebase Admin Auth is configured, verify it first
    const firebaseAuth = getFirebaseAdminAuth();
    if (validation.data.firebaseIdToken && firebaseAuth) {
      const decoded = await firebaseAuth.verifyIdToken(
        validation.data.firebaseIdToken,
        true
      );
      const claimRole = decoded.role as string | undefined;
      const dbAdmin = await resolveOrProvisionFirebaseAdminUser({
        uid: decoded.uid,
        email: decoded.email || validation.data.email,
        displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
        claimRole,
      });
      if (!dbAdmin) {
        return NextResponse.json(
          { error: 'Account does not have wedding administrator privileges.' },
          { status: 403 }
        );
      }

      const token = createAdminSessionToken(
        dbAdmin.uid,
        dbAdmin.email,
        dbAdmin.role,
        60 * 60 * 12,
        dbAdmin.passwordHash
      );
      const response = NextResponse.json(
        {
          ok: true,
          admin: {
            uid: dbAdmin.uid,
            email: dbAdmin.email,
            displayName: dbAdmin.displayName || 'Wedding Administrator',
            role: dbAdmin.role,
            photoUrl: dbAdmin.photoUrl,
          },
        },
        { status: 200 }
      );
      response.cookies.set(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
      return response;
    }

    // 2. Verify against repository admin_users credentials (constant-time scrypt)
    const authResult = await authenticateAdminCredentials(
      validation.data.email,
      validation.data.password
    );
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const token = createAdminSessionToken(
      authResult.admin.uid,
      authResult.admin.email,
      authResult.admin.role,
      60 * 60 * 12,
      authResult.admin.passwordHash
    );

    const response = NextResponse.json(
      {
        ok: true,
        admin: {
          uid: authResult.admin.uid,
          email: authResult.admin.email,
          displayName: authResult.admin.displayName,
          role: authResult.admin.role,
          photoUrl: authResult.admin.photoUrl,
        },
      },
      { status: 200 }
    );

    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
