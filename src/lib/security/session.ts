import crypto from 'crypto';
import { cookies } from 'next/headers';

// ==============================================================================
// Household & Administrator Signed Session Management + Password Hashing
// ==============================================================================

const DEV_FALLBACK_SESSION_SECRET =
  'luxury-wedding-session-signing-secret-2026-local-dev-8a7b6c5d4e3f2a1b';

const BLOCKED_PRODUCTION_SESSION_SECRETS = new Set<string>([
  DEV_FALLBACK_SESSION_SECRET,
  'replace-with-64-char-random-hex-secret-for-session-cookie-signing',
]);

function isKnownDefaultOrWeakSessionSecret(secret: string): boolean {
  const normalized = secret.trim();
  if (BLOCKED_PRODUCTION_SESSION_SECRETS.has(normalized)) return true;
  if (normalized.includes('local-dev') || normalized.includes('replace-with-')) {
    return true;
  }
  return false;
}

export function getSessionSigningSecret(): string {
  const configured = process.env.SESSION_SIGNING_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (
      !configured ||
      configured.trim().length < 32 ||
      isKnownDefaultOrWeakSessionSecret(configured)
    ) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: SESSION_SIGNING_SECRET must be set to a unique secret of at least 32 characters in production (default development secrets are forbidden).'
      );
    }
    return configured.trim();
  }
  return configured && configured.trim().length >= 16
    ? configured.trim()
    : DEV_FALLBACK_SESSION_SECRET;
}

export const HOUSEHOLD_SESSION_COOKIE = 'wedding_hh_session';
export const ADMIN_SESSION_COOKIE = 'wedding_admin_session';

export interface HouseholdSessionPayload {
  type: 'household';
  householdId: string;
  codeDigestPrefix: string; // Binds session to current code digest; regeneration/revocation invalidates session
  iat: number;
  exp: number;
}

export interface AdminSessionPayload {
  type: 'admin';
  uid: string;
  email: string;
  role: 'admin' | 'super_admin';
  pwdVer?: string; // Binds session to current password hash prefix so password changes invalidate old sessions
  iat: number;
  exp: number;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

export function signSessionToken<T extends HouseholdSessionPayload | AdminSessionPayload>(
  payload: T
): string {
  const secret = getSessionSigningSecret();
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload, 'utf8')
    .digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${encodedPayload}.${encodedSignature}`;
}

export function verifySessionToken<T extends HouseholdSessionPayload | AdminSessionPayload>(
  token: string | undefined | null,
  expectedType: T['type']
): T | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const secret = getSessionSigningSecret();
  const [encodedPayload, encodedSignature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload, 'utf8')
    .digest();

  let actualSig: Buffer;
  try {
    actualSig = base64UrlDecode(encodedSignature);
  } catch {
    return null;
  }

  if (
    actualSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(actualSig, expectedSig)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as T;
    if (!parsed || parsed.type !== expectedType) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp <= nowSec) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createHouseholdSessionToken(
  householdId: string,
  codeDigest: string,
  ttlSeconds = 60 * 60 * 24 * 7 // 7 days
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: HouseholdSessionPayload = {
    type: 'household',
    householdId,
    codeDigestPrefix: codeDigest.slice(0, 24),
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  return signSessionToken(payload);
}

export function createAdminSessionToken(
  uid: string,
  email: string,
  role: 'admin' | 'super_admin',
  ttlSeconds = 60 * 60 * 12, // 12 hours
  passwordHashPrefix?: string
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    type: 'admin',
    uid,
    email,
    role,
    pwdVer: passwordHashPrefix ? passwordHashPrefix.slice(0, 16) : undefined,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  return signSessionToken(payload);
}

function extractCookieValueFromHeader(
  cookieHeader: string | null | undefined,
  cookieName: string
): string | undefined {
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === cookieName) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return undefined;
}

export async function getHouseholdSessionFromCookies(
  request?: Request
): Promise<HouseholdSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(HOUSEHOLD_SESSION_COOKIE)?.value;
    if (raw) {
      return verifySessionToken<HouseholdSessionPayload>(raw, 'household');
    }
  } catch {
    // Fallback to request Cookie header when invoked outside Next.js request store
  }
  const rawFromReq = extractCookieValueFromHeader(
    request?.headers.get('cookie'),
    HOUSEHOLD_SESSION_COOKIE
  );
  return verifySessionToken<HouseholdSessionPayload>(rawFromReq, 'household');
}

export async function getAdminSessionFromCookies(
  request?: Request
): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (raw) {
      return verifySessionToken<AdminSessionPayload>(raw, 'admin');
    }
  } catch {
    // Fallback to request Cookie header when invoked outside Next.js request store
  }
  const rawFromReq = extractCookieValueFromHeader(
    request?.headers.get('cookie'),
    ADMIN_SESSION_COOKIE
  );
  return verifySessionToken<AdminSessionPayload>(rawFromReq, 'admin');
}

export function hashAdminPassword(password: string, salt?: string): {
  salt: string;
  hash: string;
} {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

export function verifyAdminPassword(
  candidatePassword: string,
  salt: string,
  expectedHashHex: string
): boolean {
  try {
    const { hash } = hashAdminPassword(candidatePassword, salt);
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(expectedHashHex, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
