import crypto from 'crypto';

// ==============================================================================
// HMAC-SHA256 Invitation Code Security & Secret Rotation Support
// ==============================================================================

const DEV_FALLBACK_HMAC_SECRET =
  'luxury-wedding-hmac-secret-v1-local-dev-9f8e7d6c5b4a3f2e1d0c9b8a';

const BLOCKED_PRODUCTION_HMAC_SECRETS = new Set<string>([
  DEV_FALLBACK_HMAC_SECRET,
  'luxury-wedding-hmac-secret-v0-legacy-rotation-key-1a2b3c4d5e6f',
  'replace-with-64-char-random-hex-secret-for-hmac-sha256-invitation-codes',
]);

function isKnownDefaultOrWeakHmacSecret(secret: string): boolean {
  const normalized = secret.trim();
  if (BLOCKED_PRODUCTION_HMAC_SECRETS.has(normalized)) return true;
  if (
    normalized.includes('local-dev') ||
    normalized.includes('legacy-rotation-key') ||
    normalized.includes('replace-with-')
  ) {
    return true;
  }
  return false;
}

export function getCurrentHmacSecret(): string {
  const configured = process.env.INVITATION_HMAC_SECRET_CURRENT;
  if (process.env.NODE_ENV === 'production') {
    if (
      !configured ||
      configured.trim().length < 32 ||
      isKnownDefaultOrWeakHmacSecret(configured)
    ) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: INVITATION_HMAC_SECRET_CURRENT must be set to a unique secret of at least 32 characters in production (default development secrets are forbidden).'
      );
    }
    return configured.trim();
  }
  return configured && configured.trim().length >= 16
    ? configured.trim()
    : DEV_FALLBACK_HMAC_SECRET;
}

function getPreviousHmacSecret(): string {
  const prev = (process.env.INVITATION_HMAC_SECRET_PREVIOUS || '').trim();
  if (!prev) return '';
  if (process.env.NODE_ENV === 'production') {
    if (prev.length < 32 || isKnownDefaultOrWeakHmacSecret(prev)) {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: INVITATION_HMAC_SECRET_PREVIOUS must be unset or a unique secret of at least 32 characters in production.'
      );
    }
  }
  return prev;
}

const CURRENT_KEY_VERSION = Number(process.env.INVITATION_HMAC_KEY_VERSION || '1');

/**
 * Normalizes an invitation code before computing or verifying its digest:
 * trims whitespace, uppercases, and strips zero-width characters.
 */
export function normalizeInvitationCode(rawCode: string): string {
  return rawCode
    .replace(/[\u200B-\u200D\uFEFF\s]+/g, '')
    .toUpperCase();
}

/**
 * Generates a cryptographically strong, readable luxury invitation code.
 * Example format: "INV-8F4K-9M2P"
 */
export function generateSecureInvitationCode(prefix = 'INV'): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes ambiguous 0/O, 1/I
  const bytes = crypto.randomBytes(10);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += alphabet[bytes[i] % alphabet.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += alphabet[bytes[i] % alphabet.length];
  }
  const cleanPrefix =
    prefix
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'INV';
  return `${cleanPrefix}-${part1}-${part2}`;
}

/**
 * Computes an HMAC-SHA256 hex digest for a normalized invitation code.
 */
export function computeInvitationCodeDigest(
  rawCode: string,
  secretOverride?: string
): {
  digest: string;
  keyVersion: number;
  codeHint: string;
  normalizedCode: string;
} {
  const normalizedCode = normalizeInvitationCode(rawCode);
  const secret = secretOverride || getCurrentHmacSecret();
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`wedding_invite_v1:${normalizedCode}`, 'utf8')
    .digest('hex');

  const suffix = normalizedCode.slice(-4);
  const codeHint = `••••-${suffix}`;

  return {
    digest,
    keyVersion: CURRENT_KEY_VERSION,
    codeHint,
    normalizedCode,
  };
}

/**
 * Constant-time comparison between two hex digests using `crypto.timingSafeEqual`.
 */
export function constantTimeHexEquals(hexA: string, hexB: string): boolean {
  if (!hexA || !hexB || hexA.length !== hexB.length) {
    const dummy = Buffer.alloc(32);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies a candidate plaintext invitation code against a stored HMAC-SHA256 digest.
 * Supports secret rotation by checking both the current secret and optional previous secret.
 */
export function verifyInvitationCodeAgainstDigest(
  candidatePlaintextCode: string,
  storedDigest: string
): { matched: boolean; needsKeyRotationUpgrade: boolean } {
  const currentSecret = getCurrentHmacSecret();
  const currentAttempt = computeInvitationCodeDigest(
    candidatePlaintextCode,
    currentSecret
  );
  if (constantTimeHexEquals(currentAttempt.digest, storedDigest)) {
    return { matched: true, needsKeyRotationUpgrade: false };
  }

  const previousSecret = getPreviousHmacSecret();
  if (previousSecret && previousSecret.length >= 16) {
    const previousAttempt = computeInvitationCodeDigest(
      candidatePlaintextCode,
      previousSecret
    );
    if (constantTimeHexEquals(previousAttempt.digest, storedDigest)) {
      return { matched: true, needsKeyRotationUpgrade: true };
    }
  }

  return { matched: false, needsKeyRotationUpgrade: false };
}
