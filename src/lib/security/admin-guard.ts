import { NextResponse } from 'next/server';
import {
  AdminSessionPayload,
  getAdminSessionFromCookies,
} from '@/lib/security/session';
import { getAdminUserByUid } from '@/lib/db/repository';
import { verifyRequestOriginAndCsrf } from '@/lib/security/csrf';

export interface VerifiedAdminContext {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'super_admin';
}

export async function requireAuthorizedAdmin(
  request?: Request
): Promise<
  | { ok: true; admin: VerifiedAdminContext }
  | { ok: false; response: NextResponse }
> {
  if (request) {
    const csrf = verifyRequestOriginAndCsrf(request);
    if (!csrf.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: csrf.error || 'Cross-origin request denied.' },
          { status: csrf.status || 403 }
        ),
      };
    }
  }

  const session: AdminSessionPayload | null = await getAdminSessionFromCookies(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Administrator sign-in required.' },
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'admin' && session.role !== 'super_admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient administrator privileges.' },
        { status: 403 }
      ),
    };
  }

  const dbUser = await getAdminUserByUid(session.uid);
  if (!dbUser || !dbUser.active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Administrator account is inactive or revoked.' },
        { status: 401 }
      ),
    };
  }

  if (dbUser.role !== 'admin' && dbUser.role !== 'super_admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Account does not hold administrator privileges.' },
        { status: 403 }
      ),
    };
  }

  // Verify session password version fingerprint matches current passwordHash whenever a local passwordHash exists
  if (
    dbUser.passwordHash &&
    (!session.pwdVer || !dbUser.passwordHash.startsWith(session.pwdVer))
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Session expired because administrator credentials were changed. Please sign in again.',
        },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    admin: {
      uid: dbUser.uid,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
    },
  };
}
