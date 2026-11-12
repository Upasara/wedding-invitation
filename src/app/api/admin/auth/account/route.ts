import { NextResponse } from 'next/server';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { parseStrictJsonBody } from '@/lib/security/csrf';
import {
  adminAccountUpdateSchema,
  adminPasswordResetRequestSchema,
} from '@/lib/validation/schemas';
import { updateAdminUserAccount } from '@/lib/db/repository';
import { getFirebaseAdminAuth } from '@/lib/db/firebase-admin';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from '@/lib/security/session';
import {
  checkRateLimitDistributed,
  extractClientIp,
} from '@/lib/security/rate-limit';

export async function PUT(request: Request) {
  const check = await requireAuthorizedAdmin(request);
  if (!check.ok) {
    return check.response;
  }

  const parsed = await parseStrictJsonBody(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = adminAccountUpdateSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error:
          validation.error.issues[0]?.message || 'Invalid account update fields.',
      },
      { status: 400 }
    );
  }

  const result = await updateAdminUserAccount(check.admin.uid, validation.data);
  if (!result.ok || !result.admin) {
    return NextResponse.json(
      { error: result.error || 'Failed to update administrator account.' },
      { status: 400 }
    );
  }

  // Also sync password with Firebase Auth if configured
  const firebaseAuth = getFirebaseAdminAuth();
  if (firebaseAuth && validation.data.newPassword) {
    try {
      await firebaseAuth.updateUser(check.admin.uid, {
        password: validation.data.newPassword,
        displayName: result.admin.displayName,
      });
    } catch {
      // Ignore if UID only exists in local store
    }
  }

  const refreshedToken = createAdminSessionToken(
    result.admin.uid,
    result.admin.email,
    result.admin.role,
    60 * 60 * 12,
    result.admin.passwordHash
  );

  const response = NextResponse.json(
    {
      ok: true,
      admin: {
        uid: result.admin.uid,
        email: result.admin.email,
        displayName: result.admin.displayName,
        role: result.admin.role,
        photoUrl: result.admin.photoUrl || '',
      },
    },
    { status: 200 }
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, refreshedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}

/**
 * Password-reset workflow initiation endpoint
 */
export async function POST(request: Request) {
  const clientIp = extractClientIp(request);
  const limit = await checkRateLimitDistributed(clientIp, {
    namespace: 'admin_password_reset',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          'Too many password reset requests from this network. Please wait before trying again.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      }
    );
  }

  const parsed = await parseStrictJsonBody(request, 8 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const validation = adminPasswordResetRequestSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Please provide a valid administrator email address.' },
      { status: 400 }
    );
  }

  const firebaseAuth = getFirebaseAdminAuth();
  if (firebaseAuth) {
    try {
      await firebaseAuth.generatePasswordResetLink(validation.data.email);
    } catch {
      // Never disclose whether the email exists
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        'If an active administrator account matches that email address, password reset instructions have been issued.',
    },
    { status: 200 }
  );
}

