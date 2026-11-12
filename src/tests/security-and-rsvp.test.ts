import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeInvitationCodeDigest,
  generateSecureInvitationCode,
  getCurrentHmacSecret,
  verifyInvitationCodeAgainstDigest,
} from '@/lib/security/hmac';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  createHouseholdSessionToken,
  getSessionSigningSecret,
  verifySessionToken,
} from '@/lib/security/session';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { submitRsvpSchema } from '@/lib/validation/schemas';
import { createInitialSeedDatabase } from '@/lib/db/seed-data';
import {
  authenticateAdminCredentials,
  getAdminUserByUid,
  getDashboardOverviewStats,
  getSanitizedHouseholdSessionView,
  manageHouseholdInvitationCode,
  resetLocalDatabaseToSeed,
  submitOrUpdateHouseholdRsvp,
  updateAdminUserAccount,
  updateWeddingSettings,
  verifyHouseholdInvitationCode,
} from '@/lib/db/repository';

describe('Luxury Wedding Invitation & RSVP Security & Functional Suite', () => {
  beforeEach(() => {
    process.env.WEDDING_STORAGE_DRIVER = 'local';
    resetLocalDatabaseToSeed();
  });

  it('1. generates unpredictable CSPRNG codes and verifies HMAC-SHA256 digests in constant time', () => {
    const code1 = generateSecureInvitationCode('PERERA');
    const code2 = generateSecureInvitationCode('PERERA');
    expect(code1).not.toEqual(code2);

    const { digest } = computeInvitationCodeDigest(code1);
    expect(digest).toHaveLength(64);

    const validCheck = verifyInvitationCodeAgainstDigest(code1, digest);
    expect(validCheck.matched).toBe(true);

    const invalidCheck = verifyInvitationCodeAgainstDigest('WRONG-CODE-123', digest);
    expect(invalidCheck.matched).toBe(false);
  });

  it('2. rejects invalid and revoked invitation codes without leaking household existence', async () => {
    const invalidRes = await verifyHouseholdInvitationCode('NON-EXISTENT-CODE-999');
    expect(invalidRes.ok).toBe(false);

    const revokedRes = await verifyHouseholdInvitationCode('REVOKED-9999');
    expect(revokedRes.ok).toBe(false);
    // Error messages must be identical to prevent enumeration
    expect(invalidRes.error).toEqual(revokedRes.error);
  });

  it('3. verifies active household code and returns strictly isolated household session view', async () => {
    const res = await verifyHouseholdInvitationCode('PERERA-2026');
    expect(res.ok).toBe(true);
    expect(res.sessionView?.householdId).toBe('hh_perera');
    expect(res.sessionView?.displayName).toBe('The Perera Family');
    expect(res.sessionView?.members).toHaveLength(4);
    // Ensure sensitive fields are never present in sessionView
    expect(
      (res.sessionView as unknown as Record<string, unknown>).codeDigest
    ).toBeUndefined();
    expect(
      (res.sessionView as unknown as Record<string, unknown>).adminNotes
    ).toBeUndefined();
  });

  it('4. invalidates existing household session immediately when invitation code is revoked or regenerated', async () => {
    const verifyRes = await verifyHouseholdInvitationCode('PERERA-2026');
    expect(verifyRes.ok).toBe(true);
    const oldDigestPrefix = verifyRes.household!.codeDigest.slice(0, 24);

    // Session view works before regeneration
    const beforeView = await getSanitizedHouseholdSessionView(
      'hh_perera',
      oldDigestPrefix
    );
    expect(beforeView).not.toBeNull();

    // Regenerate code as admin
    const regen = await manageHouseholdInvitationCode({
      householdId: 'hh_perera',
      action: 'regenerate',
      adminUid: 'adm_primary',
    });
    expect(regen.ok).toBe(true);

    // Old session bound to oldDigestPrefix is now rejected
    const afterView = await getSanitizedHouseholdSessionView(
      'hh_perera',
      oldDigestPrefix
    );
    expect(afterView).toBeNull();

    // Old plaintext code is also rejected
    const oldCodeAttempt = await verifyHouseholdInvitationCode('PERERA-2026');
    expect(oldCodeAttempt.ok).toBe(false);
  });

  it('5. rejects unknown/unauthorized fields in RSVP payload via strict Zod validation', () => {
    const payloadWithUnauthorizedField = {
      overallStatus: 'attending',
      memberResponses: [{ memberId: 'mem_1', attending: true }],
      additionalGuests: [],
      isAdminHack: true,
    };
    const parsed = submitRsvpSchema.safeParse(payloadWithUnauthorizedField);
    expect(parsed.success).toBe(false);
  });

  it('6. enforces household member ownership — prevents responding for another household member', async () => {
    // Attempt to submit RSVP for hh_kensington using a member ID from hh_perera
    const res = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_kensington',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_perera_1', // Belongs to Perera Family, NOT Kensington!
          attending: true,
          mealOptionId: 'meal_herb_lamb',
        },
      ],
      additionalGuests: [],
      updatedBy: 'guest',
    });

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain('does not belong to this household');
  });

  it('7. enforces capacity limits on additional guests (+1s) and global toggle', async () => {
    // Dr. & Mrs. Sterling have 0 additionalGuestAllowance
    const overCapacity = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_sterling',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_sterling_1',
          attending: true,
          mealOptionId: 'meal_herb_lamb',
        },
        {
          memberId: 'mem_sterling_2',
          attending: true,
          mealOptionId: 'meal_sea_bass',
        },
      ],
      additionalGuests: [
        { fullName: 'Unauthorized Plus One', mealOptionId: 'meal_herb_lamb' },
      ],
      expectedVersion: 1,
      updatedBy: 'guest',
    });

    expect(overCapacity.ok).toBe(false);
    expect(overCapacity.statusCode).toBe(400);
    expect(overCapacity.error).toContain('maximum of 0 additional guest');

    // Disable additional guests globally and verify even households with allowance cannot add +1s
    await updateWeddingSettings({ allowAdditionalGuestsGlobal: false });
    const globalDisabledAttempt = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_kensington',
      overallStatus: 'attending',
      memberResponses: [
        { memberId: 'mem_kens_1', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_kens_2', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_kens_3', attending: false },
        { memberId: 'mem_kens_4', attending: false },
        { memberId: 'mem_kens_5', attending: false },
      ],
      additionalGuests: [
        { fullName: 'Blocked Global Guest', mealOptionId: 'meal_herb_lamb' },
      ],
      updatedBy: 'guest',
    });

    expect(globalDisabledAttempt.ok).toBe(false);
    expect(globalDisabledAttempt.error).toContain('not enabled');
  });

  it('8. enforces declined household rules (no attending members, no +1s, no meals)', async () => {
    const invalidDecline = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'declined',
      memberResponses: [
        { memberId: 'mem_desilva_1', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_desilva_2', attending: false },
        { memberId: 'mem_desilva_3', attending: false },
      ],
      additionalGuests: [],
      updatedBy: 'guest',
    });
    expect(invalidDecline.ok).toBe(false);
    expect(invalidDecline.statusCode).toBe(400);
  });

  it('9. enforces idempotency and optimistic concurrency version checks on RSVP updates', async () => {
    const idemKey = 'idem-test-desilva-001';
    const firstSubmit = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'attending',
      memberResponses: [
        { memberId: 'mem_desilva_1', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_desilva_2', attending: true, mealOptionId: 'meal_sea_bass' },
        { memberId: 'mem_desilva_3', attending: false },
      ],
      additionalGuests: [
        { fullName: 'Guest One', mealOptionId: 'meal_wild_mushroom' },
      ],
      idempotencyKey: idemKey,
      updatedBy: 'guest',
    });

    expect(firstSubmit.ok).toBe(true);
    expect(firstSubmit.rsvp?.version).toBe(1);
    expect(firstSubmit.rsvp?.totalAttendingCount).toBe(3);

    // Retry with identical idempotency key returns cached response without incrementing version
    const duplicateRetry = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'attending',
      memberResponses: [
        { memberId: 'mem_desilva_1', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_desilva_2', attending: true, mealOptionId: 'meal_sea_bass' },
        { memberId: 'mem_desilva_3', attending: false },
      ],
      additionalGuests: [
        { fullName: 'Guest One', mealOptionId: 'meal_wild_mushroom' },
      ],
      idempotencyKey: idemKey,
      updatedBy: 'guest',
    });

    expect(duplicateRetry.ok).toBe(true);
    expect(duplicateRetry.fromIdempotencyCache).toBe(true);
    expect(duplicateRetry.rsvp?.version).toBe(1);

    // Stale expectedVersion (0 instead of 1) is rejected with 409 Conflict
    const staleUpdate = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'declined',
      memberResponses: [
        { memberId: 'mem_desilva_1', attending: false },
        { memberId: 'mem_desilva_2', attending: false },
        { memberId: 'mem_desilva_3', attending: false },
      ],
      additionalGuests: [],
      expectedVersion: 0,
      updatedBy: 'guest',
    });

    expect(staleUpdate.ok).toBe(false);
    expect(staleUpdate.statusCode).toBe(409);

    // Concurrent first-write race (expectedVersion undefined when RSVP already exists) is also rejected with 409 Conflict
    const concurrentFirstWriteAttempt = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'declined',
      memberResponses: [
        { memberId: 'mem_desilva_1', attending: false },
        { memberId: 'mem_desilva_2', attending: false },
        { memberId: 'mem_desilva_3', attending: false },
      ],
      additionalGuests: [],
      updatedBy: 'guest',
    });

    expect(concurrentFirstWriteAttempt.ok).toBe(false);
    expect(concurrentFirstWriteAttempt.statusCode).toBe(409);
  });

  it('10. verifies administrator authentication, session token signing, and overview aggregation', async () => {
    const badAuth = await authenticateAdminCredentials(
      'organizer@luxurywedding.example',
      'WrongPassword123'
    );
    expect(badAuth.ok).toBe(false);

    const goodAuth = await authenticateAdminCredentials(
      'organizer@luxurywedding.example',
      'LuxuryWedding!2026'
    );
    expect(goodAuth.ok).toBe(true);

    const adminToken = createAdminSessionToken(
      'adm_primary',
      'organizer@luxurywedding.example',
      'super_admin'
    );
    const verifiedAdmin = verifySessionToken(adminToken, 'admin');
    expect(verifiedAdmin && 'uid' in verifiedAdmin ? verifiedAdmin.uid : null).toBe(
      'adm_primary'
    );

    // Household token cannot be used as an admin token
    const hhToken = createHouseholdSessionToken('hh_perera', 'abcd1234567890');
    expect(verifySessionToken(hhToken, 'admin')).toBeNull();

    const stats = await getDashboardOverviewStats();
    expect(stats.totalHouseholds).toBe(6); // Excludes revoked household
    expect(stats.totalExpectedAttendees).toBe(7); // 3 (Perera) + 2 (Vance) + 2 (Sterling)
  });

  it('11. prevents duplicate invitation code digest collisions against active and revoked households', async () => {
    // Attempt to regenerate hh_desilva with a custom code already assigned to hh_perera ("PERERA-2026")
    const collisionAttempt = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'regenerate',
      customPlaintextCode: 'PERERA-2026',
      adminUid: 'adm_primary',
    });

    expect(collisionAttempt.ok).toBe(false);
    expect(collisionAttempt.error).toContain('collides with an existing');

    // Attempt to regenerate hh_desilva with a code that was previously revoked ("REVOKED-9999")
    const revokedCollisionAttempt = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'regenerate',
      customPlaintextCode: 'REVOKED-9999',
      adminUid: 'adm_primary',
    });

    expect(revokedCollisionAttempt.ok).toBe(false);
    expect(revokedCollisionAttempt.error).toContain('collides with an existing or previously revoked');
  });

  it('12. rejects missing, short, or default .env.example HMAC and session secrets in production mode', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevHmac = process.env.INVITATION_HMAC_SECRET_CURRENT;
    const prevSession = process.env.SESSION_SIGNING_SECRET;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      // Missing secrets must throw
      delete process.env.INVITATION_HMAC_SECRET_CURRENT;
      expect(() => getCurrentHmacSecret()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);

      delete process.env.SESSION_SIGNING_SECRET;
      expect(() => getSessionSigningSecret()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);

      // Default .env.example secrets must also throw even though >= 32 chars
      process.env.INVITATION_HMAC_SECRET_CURRENT =
        'luxury-wedding-hmac-secret-v1-2026-local-dev-9f8e7d6c5b4a3f2e1d0c';
      expect(() => getCurrentHmacSecret()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);

      process.env.SESSION_SIGNING_SECRET =
        'luxury-wedding-session-signing-secret-2026-local-dev-8a7b6c5d4e3f2a1b';
      expect(() => getSessionSigningSecret()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);

      // Strong unique 64-char hex secrets succeed in production
      process.env.INVITATION_HMAC_SECRET_CURRENT =
        'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
      process.env.SESSION_SIGNING_SECRET =
        'f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f';
      expect(getCurrentHmacSecret()).toHaveLength(64);
      expect(getSessionSigningSecret()).toHaveLength(64);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
      if (prevHmac === undefined) {
        delete process.env.INVITATION_HMAC_SECRET_CURRENT;
      } else {
        process.env.INVITATION_HMAC_SECRET_CURRENT = prevHmac;
      }
      if (prevSession === undefined) {
        delete process.env.SESSION_SIGNING_SECRET;
      } else {
        process.env.SESSION_SIGNING_SECRET = prevSession;
      }
    }
  });

  it('13. invalidates prior admin sessions immediately when administrator password is changed', async () => {
    const initialAdmin = await getAdminUserByUid('adm_primary');
    expect(initialAdmin).not.toBeNull();

    // Token without pwdVer is rejected when local passwordHash exists
    const tokenWithoutPwdVer = createAdminSessionToken(
      'adm_primary',
      initialAdmin!.email,
      initialAdmin!.role,
      3600
    );
    const missingPwdVerReq = new Request('http://localhost:3000/api/admin/overview', {
      method: 'GET',
      headers: {
        Cookie: `${ADMIN_SESSION_COOKIE}=${tokenWithoutPwdVer}`,
      },
    });
    const missingPwdVerCheck = await requireAuthorizedAdmin(missingPwdVerReq);
    expect(missingPwdVerCheck.ok).toBe(false);

    // Token with matching initial pwdVer succeeds
    const validOldToken = createAdminSessionToken(
      'adm_primary',
      initialAdmin!.email,
      initialAdmin!.role,
      3600,
      initialAdmin!.passwordHash
    );
    const validOldReq = new Request('http://localhost:3000/api/admin/overview', {
      method: 'GET',
      headers: {
        Cookie: `${ADMIN_SESSION_COOKIE}=${validOldToken}`,
      },
    });
    const beforeChangeCheck = await requireAuthorizedAdmin(validOldReq);
    expect(beforeChangeCheck.ok).toBe(true);

    // Change administrator password
    const pwdUpdate = await updateAdminUserAccount('adm_primary', {
      displayName: initialAdmin!.displayName,
      currentPassword: 'LuxuryWedding!2026',
      newPassword: 'UpdatedLuxuryPassword!2027',
    });
    expect(pwdUpdate.ok).toBe(true);

    // Old session token is now rejected with 401
    const afterChangeCheck = await requireAuthorizedAdmin(validOldReq);
    expect(afterChangeCheck.ok).toBe(false);
    if (!afterChangeCheck.ok) {
      expect(afterChangeCheck.response.status).toBe(401);
    }
  });

  it('14. backs up corrupt .data/wedding-db.json and throws an explicit error instead of silently overwriting data', async () => {
    const dbFilePath = path.join(process.cwd(), '.data', 'wedding-db.json');
    const dataDir = path.dirname(dbFilePath);
    const originalRaw = fs.readFileSync(dbFilePath, 'utf8');

    try {
      fs.writeFileSync(dbFilePath, '{ CORRUPT_JSON_PAYLOAD ', 'utf8');
      await expect(getDashboardOverviewStats()).rejects.toThrow(
        /Local database file appears corrupted and was backed up to wedding-db\.json\.corrupt\./
      );

      const backupFiles = fs
        .readdirSync(dataDir)
        .filter((f) => f.startsWith('wedding-db.json.corrupt.'));
      expect(backupFiles.length).toBeGreaterThanOrEqual(1);

      // Clean up generated .corrupt backup files
      for (const bak of backupFiles) {
        fs.unlinkSync(path.join(dataDir, bak));
      }
    } finally {
      fs.writeFileSync(dbFilePath, originalRaw, 'utf8');
    }
  });

  it('15. enforces production seed protection (rejects SEED_SAMPLE_DATA=true, rejects missing/default admin credentials, never seeds sample codes in production, and preserves sample data in development and test)', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevHmac = process.env.INVITATION_HMAC_SECRET_CURRENT;
    const prevAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const prevAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const prevSeedSample = process.env.SEED_SAMPLE_DATA;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.INVITATION_HMAC_SECRET_CURRENT =
        'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

      // Case 1: Production with missing or default administrator credentials must fail
      delete process.env.SEED_SAMPLE_DATA;
      delete process.env.INITIAL_ADMIN_EMAIL;
      delete process.env.INITIAL_ADMIN_PASSWORD;
      expect(() => createInitialSeedDatabase()).toThrow(
        /CRITICAL SECURITY CONFIGURATION ERROR: INITIAL_ADMIN_EMAIL/
      );

      process.env.INITIAL_ADMIN_EMAIL = 'organizer@luxurywedding.example';
      process.env.INITIAL_ADMIN_PASSWORD = 'TestOnlyStrongPass!2027';
      expect(() => createInitialSeedDatabase()).toThrow(
        /CRITICAL SECURITY CONFIGURATION ERROR: INITIAL_ADMIN_EMAIL/
      );

      process.env.INITIAL_ADMIN_EMAIL = 'admin@test-wedding.invalid';
      process.env.INITIAL_ADMIN_PASSWORD = 'LuxuryWedding!2026';
      expect(() => createInitialSeedDatabase()).toThrow(
        /CRITICAL SECURITY CONFIGURATION ERROR: INITIAL_ADMIN_PASSWORD/
      );

      // Case 2: Production with SEED_SAMPLE_DATA=true must fail with explicit configuration error
      process.env.INITIAL_ADMIN_EMAIL = 'admin@test-wedding.invalid';
      process.env.INITIAL_ADMIN_PASSWORD = 'TestOnlyStrongPass!2027';
      process.env.SEED_SAMPLE_DATA = 'true';
      expect(() => createInitialSeedDatabase()).toThrow(
        /CRITICAL SECURITY CONFIGURATION ERROR: SEED_SAMPLE_DATA=true is strictly forbidden in production/
      );

      // Case 3: Production with no sample-data flag omits all sample households, RSVPs, and revoked codes,
      // and sample invitation code PERERA-2026 is not valid against the seeded database
      delete process.env.SEED_SAMPLE_DATA;
      const prodSeed = resetLocalDatabaseToSeed();
      expect(prodSeed.admin_users.adm_primary.email).toBe(
        'admin@test-wedding.invalid'
      );
      expect(Object.keys(prodSeed.households)).toHaveLength(0);
      expect(Object.keys(prodSeed.rsvps)).toHaveLength(0);
      expect(Object.keys(prodSeed.revoked_invitations)).toHaveLength(0);
      expect(prodSeed.wedding_content.main.isPlaceholderContent).toBe(false);

      const sampleCodeAttempt = await verifyHouseholdInvitationCode('PERERA-2026');
      expect(sampleCodeAttempt.ok).toBe(false);

      // Case 4: Development environment with sample data enabled
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      process.env.SEED_SAMPLE_DATA = 'true';
      const devSeed = createInitialSeedDatabase();
      expect(Object.keys(devSeed.households).length).toBeGreaterThanOrEqual(6);
      expect(devSeed.households.hh_perera).toBeDefined();
      expect(Object.keys(devSeed.rsvps).length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(devSeed.revoked_invitations)).toHaveLength(1);

      // Case 5: Test environment with sample data enabled
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
      process.env.SEED_SAMPLE_DATA = 'true';
      const testSeed = resetLocalDatabaseToSeed();
      expect(Object.keys(testSeed.households).length).toBeGreaterThanOrEqual(6);
      const testCodeAttempt = await verifyHouseholdInvitationCode('PERERA-2026');
      expect(testCodeAttempt.ok).toBe(true);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
      if (prevHmac === undefined) {
        delete process.env.INVITATION_HMAC_SECRET_CURRENT;
      } else {
        process.env.INVITATION_HMAC_SECRET_CURRENT = prevHmac;
      }
      if (prevAdminEmail === undefined) {
        delete process.env.INITIAL_ADMIN_EMAIL;
      } else {
        process.env.INITIAL_ADMIN_EMAIL = prevAdminEmail;
      }
      if (prevAdminPassword === undefined) {
        delete process.env.INITIAL_ADMIN_PASSWORD;
      } else {
        process.env.INITIAL_ADMIN_PASSWORD = prevAdminPassword;
      }
      if (prevSeedSample === undefined) {
        delete process.env.SEED_SAMPLE_DATA;
      } else {
        process.env.SEED_SAMPLE_DATA = prevSeedSample;
      }
      resetLocalDatabaseToSeed();
    }
  });
});
