import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  getFirebaseAdminApp,
  getFirebaseAdminAuth,
  getFirestoreDb,
  isFirebaseDriverConfigured,
} from '@/lib/db/firebase-admin';
import { computeInvitationCodeDigest } from '@/lib/security/hmac';
import {
  getClientFirebaseAuth,
  isClientFirebaseAuthConfigured,
  signInAdminWithFirebaseClient,
} from '@/lib/firebase-client';
import {
  createOrUpdateHousehold,
  ensureFirestoreSeededOnce,
  getAdminUserByUid,
  getDashboardOverviewStats,
  getSanitizedHouseholdSessionView,
  manageHouseholdInvitationCode,
  resetFirestoreSeedStateForTesting,
  resetLocalDatabaseToSeed,
  submitOrUpdateHouseholdRsvp,
  verifyHouseholdInvitationCode,
} from '@/lib/db/repository';
import {
  ADMIN_SESSION_COOKIE,
  AdminSessionPayload,
  createAdminSessionToken,
  verifySessionToken,
} from '@/lib/security/session';
import { requireAuthorizedAdmin } from '@/lib/security/admin-guard';
import { checkRateLimitDistributed } from '@/lib/security/rate-limit';
import { POST as adminLoginPost } from '@/app/api/admin/auth/login/route';
import { PUT as adminAccountPut } from '@/app/api/admin/auth/account/route';
import { POST as adminUploadPost } from '@/app/api/admin/upload/route';
import { POST as verifyCodePost } from '@/app/api/public/verify-code/route';

const EXPECTED_PROJECT_ID = 'demo-luxury-wedding';
const EXPECTED_AUTH_HOST = '127.0.0.1:9099';
const EXPECTED_FIRESTORE_HOST = '127.0.0.1:8080';
const EXPECTED_STORAGE_HOST = '127.0.0.1:9199';
const EXPECTED_UI_HOST = '127.0.0.1:4000';

async function assertEmulatorEndpointReachable(
  name: string,
  url: string
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    throw new Error(
      `FATAL EMULATOR ISOLATION ASSERTION FAILED: ${name} at ${url} is unreachable (${
        err instanceof Error ? err.message : String(err)
      }). Refusing to run integration tests or fall back to another database.`
    );
  }
  if (!res) {
    throw new Error(
      `FATAL EMULATOR ISOLATION ASSERTION FAILED: No response from ${name} at ${url}.`
    );
  }
}

async function clearAndReseedEmulators(): Promise<void> {
  // 1. Clear all Firestore documents in demo-luxury-wedding via Emulator REST API
  const fsClearRes = await fetch(
    `http://${EXPECTED_FIRESTORE_HOST}/emulator/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  if (!fsClearRes.ok) {
    throw new Error(
      `Failed to clear Firestore Emulator documents: HTTP ${fsClearRes.status}`
    );
  }

  // 2. Clear all Auth accounts in demo-luxury-wedding via Emulator REST API
  const authClearRes = await fetch(
    `http://${EXPECTED_AUTH_HOST}/emulator/v1/projects/${EXPECTED_PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
  if (!authClearRes.ok) {
    throw new Error(
      `Failed to clear Auth Emulator accounts: HTTP ${authClearRes.status}`
    );
  }

  // 3. Reset in-process seed flag and re-seed Firestore Emulator transactionally
  resetFirestoreSeedStateForTesting();
  await ensureFirestoreSeededOnce();
}

describe(
  'Stage 3 — Firebase Emulator Suite Integration Tests (demo-luxury-wedding)',
  { timeout: 25000 },
  () => {
  beforeAll(async () => {
    // Enforce strict demo-only emulator environment variables if not already injected by emulators:exec
    process.env.WEDDING_STORAGE_DRIVER = 'firestore';
    process.env.FIREBASE_PROJECT_ID =
      process.env.FIREBASE_PROJECT_ID || EXPECTED_PROJECT_ID;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || EXPECTED_PROJECT_ID;
    process.env.FIREBASE_STORAGE_BUCKET =
      process.env.FIREBASE_STORAGE_BUCKET || `${EXPECTED_PROJECT_ID}.appspot.com`;
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${EXPECTED_PROJECT_ID}.appspot.com`;
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      EXPECTED_AUTH_HOST;

    // Startup Isolation Assertions: Refuse to run if project ID is not demo-luxury-wedding
    // or if any production credentials are present or if emulator hosts are missing.
    if (
      process.env.FIREBASE_PROJECT_ID !== EXPECTED_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== EXPECTED_PROJECT_ID
    ) {
      throw new Error(
        `FATAL: Firebase project ID must be "${EXPECTED_PROJECT_ID}", got "${process.env.FIREBASE_PROJECT_ID}".`
      );
    }

    if (
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      throw new Error(
        'FATAL: Production Firebase service account credentials detected during emulator test run. Aborting immediately.'
      );
    }

    if (
      process.env.FIRESTORE_EMULATOR_HOST !== EXPECTED_FIRESTORE_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== EXPECTED_AUTH_HOST ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST !== EXPECTED_STORAGE_HOST
    ) {
      throw new Error(
        `FATAL: Expected local emulator hosts (Firestore=${EXPECTED_FIRESTORE_HOST}, Auth=${EXPECTED_AUTH_HOST}, Storage=${EXPECTED_STORAGE_HOST}), but got Firestore=${process.env.FIRESTORE_EMULATOR_HOST}, Auth=${process.env.FIREBASE_AUTH_EMULATOR_HOST}, Storage=${process.env.FIREBASE_STORAGE_EMULATOR_HOST}.`
      );
    }

    // Probe live emulator endpoints before executing a single test
    await assertEmulatorEndpointReachable(
      'Firestore Emulator',
      `http://${EXPECTED_FIRESTORE_HOST}/`
    );
    await assertEmulatorEndpointReachable(
      'Auth Emulator',
      `http://${EXPECTED_AUTH_HOST}/`
    );
    await assertEmulatorEndpointReachable(
      'Storage Emulator',
      `http://${EXPECTED_STORAGE_HOST}/v0/b/${EXPECTED_PROJECT_ID}.appspot.com/o`
    );
    await assertEmulatorEndpointReachable(
      'Emulator UI',
      `http://${EXPECTED_UI_HOST}/`
    );

    expect(isFirebaseDriverConfigured()).toBe(true);
    expect(isClientFirebaseAuthConfigured()).toBe(true);

    const adminApp = getFirebaseAdminApp();
    expect(adminApp).not.toBeNull();
    expect(adminApp?.options.projectId).toBe(EXPECTED_PROJECT_ID);

    const clientAuth = getClientFirebaseAuth();
    expect(clientAuth).not.toBeNull();
    expect(clientAuth?.app.options.projectId).toBe(EXPECTED_PROJECT_ID);
  });

  beforeEach(async () => {
    process.env.WEDDING_STORAGE_DRIVER = 'firestore';
    await clearAndReseedEmulators();
  });

  afterAll(async () => {
    // Clean up emulator data after suite finishes
    try {
      await clearAndReseedEmulators();
    } catch {
      // Ignore if shutting down
    }
    resetLocalDatabaseToSeed();
  });

  it('Scenario 1: Firebase administrator authentication (Client SDK -> Auth Emulator -> Server verifyIdToken -> Session Cookie)', async () => {
    const firebaseAuth = getFirebaseAdminAuth();
    expect(firebaseAuth).not.toBeNull();

    // Provision the primary admin in the Firebase Auth Emulator with a distinct Firebase Auth UID
    const createdAuthUser = await firebaseAuth!.createUser({
      uid: 'fb_auth_primary_organizer',
      email: 'organizer@luxurywedding.example',
      emailVerified: true,
      password: 'LuxuryWedding!2026',
      displayName: 'Chief Wedding Organizer',
    });
    expect(createdAuthUser.uid).toBe('fb_auth_primary_organizer');

    // Sign in using the client Firebase SDK connected to 127.0.0.1:9099
    const idToken = await signInAdminWithFirebaseClient(
      'organizer@luxurywedding.example',
      'LuxuryWedding!2026'
    );
    expect(idToken).toBeTruthy();
    expect(typeof idToken).toBe('string');

    // Submit the Firebase ID token to POST /api/admin/auth/login
    const loginReq = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'organizer@luxurywedding.example',
        password: 'LuxuryWedding!2026',
        firebaseIdToken: idToken,
      }),
    });

    const loginRes = await adminLoginPost(loginReq);
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.ok).toBe(true);
    expect(loginData.admin.email).toBe('organizer@luxurywedding.example');
    expect(loginData.admin.role).toBe('super_admin');

    const setCookie = loginRes.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
  });

  it('Scenario 2: Admin UID/email resolution and custom-claim admin provisioning in Firestore', async () => {
    const firebaseAuth = getFirebaseAdminAuth()!;
    const firestore = getFirestoreDb()!;

    // Part A: Email resolution when Firebase Auth UID ('fb_uid_mismatch_test') differs from seeded Firestore doc ('adm_primary')
    await firebaseAuth.createUser({
      uid: 'fb_uid_mismatch_test',
      email: 'organizer@luxurywedding.example',
      emailVerified: true,
      password: 'LuxuryWedding!2026',
    });

    const idTokenA = await signInAdminWithFirebaseClient(
      'organizer@luxurywedding.example',
      'LuxuryWedding!2026'
    );
    const loginReqA = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'organizer@luxurywedding.example',
        password: 'LuxuryWedding!2026',
        firebaseIdToken: idTokenA,
      }),
    });
    const loginResA = await adminLoginPost(loginReqA);
    expect(loginResA.status).toBe(200);
    const dataA = await loginResA.json();
    // Resolved to seeded adm_primary record via verified email match
    expect(dataA.admin.uid).toBe('adm_primary');

    // Part B: Custom-claim admin ('role: admin') who does not yet exist in Firestore admin_users is atomically provisioned
    const customClaimUid = 'fb_custom_claim_admin_99';
    await firebaseAuth.createUser({
      uid: customClaimUid,
      email: 'co-planner@luxurywedding.example',
      emailVerified: true,
      password: 'CoPlannerPassword!2026',
      displayName: 'Co-Planner Admin',
    });
    await firebaseAuth.setCustomUserClaims(customClaimUid, { role: 'admin' });

    const idTokenB = await signInAdminWithFirebaseClient(
      'co-planner@luxurywedding.example',
      'CoPlannerPassword!2026'
    );
    const loginReqB = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'co-planner@luxurywedding.example',
        password: 'CoPlannerPassword!2026',
        firebaseIdToken: idTokenB,
      }),
    });
    const loginResB = await adminLoginPost(loginReqB);
    expect(loginResB.status).toBe(200);
    const dataB = await loginResB.json();
    expect(dataB.admin.uid).toBe(customClaimUid);
    expect(dataB.admin.role).toBe('admin');

    // Verify document was provisioned in Firestore admin_users
    const provisionedDoc = await firestore
      .collection('admin_users')
      .doc(customClaimUid)
      .get();
    expect(provisionedDoc.exists).toBe(true);
    expect(provisionedDoc.data()?.email).toBe('co-planner@luxurywedding.example');
    expect(provisionedDoc.data()?.active).toBe(true);

    // Extract session cookie and verify requireAuthorizedAdmin authorizes subsequent protected route calls
    const cookieHeader = loginResB.headers.get('set-cookie') || '';
    const tokenMatch = cookieHeader.match(
      new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`)
    );
    expect(tokenMatch?.[1]).toBeTruthy();

    const overviewReq = new Request('http://localhost:3000/api/admin/overview', {
      method: 'GET',
      headers: {
        Host: 'localhost:3000',
        Cookie: `${ADMIN_SESSION_COOKIE}=${tokenMatch![1]}`,
      },
    });
    const authCheck = await requireAuthorizedAdmin(overviewReq);
    expect(authCheck.ok).toBe(true);
  });

  it('Scenario 3: Admin authorization and non-admin rejection (ordinary Firebase Auth user denied 403)', async () => {
    const firebaseAuth = getFirebaseAdminAuth()!;

    // Create an ordinary authenticated Firebase user with NO admin role claim and NO admin_users record
    await firebaseAuth.createUser({
      uid: 'fb_ordinary_guest_user',
      email: 'ordinary-guest@example.com',
      emailVerified: true,
      password: 'GuestPassword!2026',
      displayName: 'Ordinary Guest',
    });

    const guestIdToken = await signInAdminWithFirebaseClient(
      'ordinary-guest@example.com',
      'GuestPassword!2026'
    );
    expect(guestIdToken).toBeTruthy();

    const loginReq = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'ordinary-guest@example.com',
        password: 'GuestPassword!2026',
        firebaseIdToken: guestIdToken,
      }),
    });

    const res = await adminLoginPost(loginReq);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('administrator privileges');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('Scenario 4: Household invitation code verification and HMAC key rotation upgrade in Firestore', async () => {
    const firestore = getFirestoreDb()!;

    // 1. Verify active household code via POST /api/public/verify-code against Firestore Emulator
    const verifyReq = new Request('http://localhost:3000/api/public/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3000',
        Origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.10',
      },
      body: JSON.stringify({ code: 'PERERA-2026' }),
    });
    const verifyRes = await verifyCodePost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.householdSession.householdId).toBe('hh_perera');
    expect(verifyData.householdSession.displayName).toBe('The Perera Family');

    // 2. Test HMAC key rotation fallback and automatic digest upgrade in Firestore
    const previousSecret =
      process.env.INVITATION_HMAC_SECRET_PREVIOUS ||
      'luxury-wedding-hmac-secret-v0-legacy-rotation-key-1a2b3c4d5e6f';
    process.env.INVITATION_HMAC_SECRET_PREVIOUS = previousSecret;

    const legacyCode = 'LEGACY-ROTATION-2025';
    const { digest: legacyDigest } = computeInvitationCodeDigest(
      legacyCode,
      previousSecret
    );

    await firestore
      .collection('households')
      .doc('hh_legacy_rot')
      .set({
        id: 'hh_legacy_rot',
        displayName: 'The Legacy Key Household',
        category: 'couple',
        members: [
          { id: 'mem_leg_1', fullName: 'Lord Julian Vance' },
          { id: 'mem_leg_2', fullName: 'Lady Clara Vance' },
        ],
        maxInvitedMembers: 2,
        additionalGuestAllowance: 0,
        status: 'active',
        codeDigest: legacyDigest,
        codeKeyVersion: 0,
        codeHint: 'LE...25',
        codeLastGeneratedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const rotResult = await verifyHouseholdInvitationCode(legacyCode);
    expect(rotResult.ok).toBe(true);
    expect(rotResult.household?.id).toBe('hh_legacy_rot');

    // Confirm Firestore document was atomically upgraded to keyVersion 1 and new digest
    const upgradedSnap = await firestore
      .collection('households')
      .doc('hh_legacy_rot')
      .get();
    expect(upgradedSnap.data()?.codeKeyVersion).toBe(1);
    expect(upgradedSnap.data()?.codeDigest).not.toBe(legacyDigest);
  });

  it('Scenario 5: Invitation code regeneration, revocation, session invalidation, and collision prevention in Firestore', async () => {
    const initialVerify = await verifyHouseholdInvitationCode('PERERA-2026');
    expect(initialVerify.ok).toBe(true);
    const oldDigestPrefix = initialVerify.household!.codeDigest.slice(0, 24);

    // Regenerate code for hh_perera in Firestore
    const regen = await manageHouseholdInvitationCode({
      householdId: 'hh_perera',
      action: 'regenerate',
      adminUid: 'adm_primary',
    });
    expect(regen.ok).toBe(true);
    expect(regen.generatedPlaintextCode).toBeTruthy();

    // Old code must now fail verification
    const oldAttempt = await verifyHouseholdInvitationCode('PERERA-2026');
    expect(oldAttempt.ok).toBe(false);

    // Prior household session bound to oldDigestPrefix must return null
    const oldSessionView = await getSanitizedHouseholdSessionView(
      'hh_perera',
      oldDigestPrefix
    );
    expect(oldSessionView).toBeNull();

    // Collision against active household code (KENSINGTON-5) must be rejected
    const activeCollision = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'regenerate',
      customPlaintextCode: 'KENSINGTON-5',
      adminUid: 'adm_primary',
    });
    expect(activeCollision.ok).toBe(false);
    expect(activeCollision.error).toContain('collides');

    // Collision against previously revoked code (PERERA-2026, now in revoked_invitations) must also be rejected
    const revokedCollision = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'regenerate',
      customPlaintextCode: 'PERERA-2026',
      adminUid: 'adm_primary',
    });
    expect(revokedCollision.ok).toBe(false);
    expect(revokedCollision.error).toContain('previously revoked');

    // Revoke and re-activate hh_desilva in Firestore
    const revoked = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'revoke',
      adminUid: 'adm_primary',
    });
    expect(revoked.ok).toBe(true);
    expect((await verifyHouseholdInvitationCode('DESILVA-FAM')).ok).toBe(false);

    const reactivated = await manageHouseholdInvitationCode({
      householdId: 'hh_desilva',
      action: 'activate',
      adminUid: 'adm_primary',
    });
    expect(reactivated.ok).toBe(true);
    expect((await verifyHouseholdInvitationCode('DESILVA-FAM')).ok).toBe(true);
  });

  it('Scenario 6: Concurrent household mutations in Firestore serialize atomically without duplicate code digests', async () => {
    // Two concurrent household creations attempting to claim the exact same custom invitation code
    const results = await Promise.allSettled([
      createOrUpdateHousehold({
        displayName: 'Concurrent Household Alpha',
        category: 'couple',
        members: [{ fullName: 'Alpha Guest One' }, { fullName: 'Alpha Guest Two' }],
        additionalGuestAllowance: 0,
        status: 'active',
        customPlaintextCode: 'SHARED-RACE-2026',
      }),
      createOrUpdateHousehold({
        displayName: 'Concurrent Household Beta',
        category: 'couple',
        members: [{ fullName: 'Beta Guest One' }, { fullName: 'Beta Guest Two' }],
        additionalGuestAllowance: 0,
        status: 'active',
        customPlaintextCode: 'SHARED-RACE-2026',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('Scenario 7: RSVP creation and updates in Firestore Emulator', async () => {
    const createRes = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_desilva_1',
          attending: true,
          mealOptionId: 'meal_herb_lamb',
          dietaryNotes: 'No garlic',
        },
        {
          memberId: 'mem_desilva_2',
          attending: true,
          mealOptionId: 'meal_sea_bass',
          dietaryNotes: '',
        },
        {
          memberId: 'mem_desilva_3',
          attending: false,
          mealOptionId: null,
          dietaryNotes: '',
        },
      ],
      additionalGuests: [
        {
          fullName: 'Ishani De Silva',
          mealOptionId: 'meal_wild_mushroom',
          dietaryNotes: 'Vegan',
        },
      ],
      contactEmail: 'desilva@example.com',
      contactPhone: '+94 77 123 4567',
      personalMessage: 'Honored to celebrate with you both!',
      updatedBy: 'guest',
    });

    expect(createRes.ok).toBe(true);
    expect(createRes.rsvp?.version).toBe(1);
    expect(createRes.rsvp?.attendingMembersCount).toBe(2);
    expect(createRes.rsvp?.additionalGuestsCount).toBe(1);
    expect(createRes.rsvp?.totalAttendingCount).toBe(3);

    // Update RSVP with expectedVersion: 1
    const updateRes = await submitOrUpdateHouseholdRsvp({
      householdId: 'hh_desilva',
      overallStatus: 'attending',
      memberResponses: [
        {
          memberId: 'mem_desilva_1',
          attending: true,
          mealOptionId: 'meal_sea_bass',
          dietaryNotes: 'No garlic',
        },
        {
          memberId: 'mem_desilva_2',
          attending: false,
          mealOptionId: null,
          dietaryNotes: '',
        },
        {
          memberId: 'mem_desilva_3',
          attending: false,
          mealOptionId: null,
          dietaryNotes: '',
        },
      ],
      additionalGuests: [],
      contactEmail: 'desilva-updated@example.com',
      contactPhone: '+94 77 123 4567',
      personalMessage: 'Updated attendance roster.',
      expectedVersion: 1,
      updatedBy: 'guest',
    });

    expect(updateRes.ok).toBe(true);
    expect(updateRes.rsvp?.version).toBe(2);
    expect(updateRes.rsvp?.totalAttendingCount).toBe(1);
    expect(updateRes.rsvp?.contactEmail).toBe('desilva-updated@example.com');
  });

  it('Scenario 8: Concurrent RSVP submissions, optimistic concurrency (409), and idempotency in Firestore', async () => {
    // 1. Idempotency deduplication via Firestore idempotency_records
    const idemKey = 'firestore-idem-key-kensington-1';
    const basePayload = {
      householdId: 'hh_kensington',
      overallStatus: 'attending' as const,
      memberResponses: [
        { memberId: 'mem_kens_1', attending: true, mealOptionId: 'meal_herb_lamb' },
        { memberId: 'mem_kens_2', attending: true, mealOptionId: 'meal_sea_bass' },
        { memberId: 'mem_kens_3', attending: false },
        { memberId: 'mem_kens_4', attending: false },
        { memberId: 'mem_kens_5', attending: false },
      ],
      additionalGuests: [],
      idempotencyKey: idemKey,
      updatedBy: 'guest' as const,
    };

    const first = await submitOrUpdateHouseholdRsvp(basePayload);
    expect(first.ok).toBe(true);
    expect(first.rsvp?.version).toBe(1);

    const duplicate = await submitOrUpdateHouseholdRsvp(basePayload);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.fromIdempotencyCache).toBe(true);
    expect(duplicate.rsvp?.version).toBe(1);

    // 2. Concurrent update race: two simultaneous requests both passing expectedVersion: 1
    const [raceA, raceB] = await Promise.all([
      submitOrUpdateHouseholdRsvp({
        ...basePayload,
        idempotencyKey: undefined,
        personalMessage: 'Concurrent Branch A',
        expectedVersion: 1,
      }),
      submitOrUpdateHouseholdRsvp({
        ...basePayload,
        idempotencyKey: undefined,
        personalMessage: 'Concurrent Branch B',
        expectedVersion: 1,
      }),
    ]);

    const successes = [raceA, raceB].filter((r) => r.ok);
    const conflicts = [raceA, raceB].filter((r) => !r.ok && r.statusCode === 409);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(successes[0].rsvp?.version).toBe(2);
  });

  it('Scenario 9: Firestore-backed distributed rate limiting under concurrent requests', async () => {
    const clientIp = '203.0.113.199';
    const config = {
      namespace: 'fs_emulator_concurrent_rl',
      maxRequests: 4,
      windowMs: 60_000,
      blockDurationMs: 60_000,
    };

    // Fire 7 concurrent rate-limit checks against Firestore rate_limits transaction
    const outcomes = await Promise.all(
      Array.from({ length: 7 }, () => checkRateLimitDistributed(clientIp, config))
    );

    const allowedCount = outcomes.filter((o) => o.allowed).length;
    const blockedCount = outcomes.filter((o) => !o.allowed).length;

    expect(allowedCount).toBe(4);
    expect(blockedCount).toBe(3);

    // Confirm rate_limits document exists in Firestore Emulator
    const firestore = getFirestoreDb()!;
    const rlSnap = await firestore.collection('rate_limits').get();
    expect(rlSnap.empty).toBe(false);
  });

  it('Scenario 10: Image and audio uploads to Firebase Storage Emulator and spoofed-file rejection', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    expect(admin).not.toBeNull();
    const token = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    // 1. Valid PNG image upload to Firebase Storage Emulator
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
    ]);
    const pngForm = new FormData();
    pngForm.append(
      'file',
      new File([pngBytes], 'emulator-test.png', { type: 'image/png' })
    );
    pngForm.append('mediaType', 'image');

    const pngUploadRes = await adminUploadPost(
      new Request('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
        body: pngForm,
      })
    );
    expect(pngUploadRes.status).toBe(200);
    const pngData = await pngUploadRes.json();
    expect(pngData.ok).toBe(true);
    expect(pngData.storageDriver).toBe('firebase-storage');
    expect(pngData.url).toContain(
      `http://${EXPECTED_STORAGE_HOST}/v0/b/${EXPECTED_PROJECT_ID}.appspot.com/o/wedding%2Fimages%2F`
    );
    expect(pngData.url).toContain('alt=media&token=');

    // 2. Valid MP3 audio upload (ID3v2 header) to Firebase Storage Emulator
    const mp3Bytes = new Uint8Array([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0xff, 0xfb,
    ]);
    const mp3Form = new FormData();
    mp3Form.append(
      'file',
      new File([mp3Bytes], 'prelude.mp3', { type: 'audio/mpeg' })
    );
    mp3Form.append('mediaType', 'audio');

    const mp3UploadRes = await adminUploadPost(
      new Request('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
        body: mp3Form,
      })
    );
    expect(mp3UploadRes.status).toBe(200);
    const mp3Data = await mp3UploadRes.json();
    expect(mp3Data.ok).toBe(true);
    expect(mp3Data.storageDriver).toBe('firebase-storage');
    expect(mp3Data.url).toContain('wedding%2Faudio%2F');

    // 3. Spoofed file rejection
    const spoofForm = new FormData();
    spoofForm.append(
      'file',
      new File([new Uint8Array(Buffer.from('MZ-spoofed-exe'))], 'bad.png', {
        type: 'image/png',
      })
    );
    spoofForm.append('mediaType', 'image');

    const spoofRes = await adminUploadPost(
      new Request('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
        body: spoofForm,
      })
    );
    expect(spoofRes.status).toBe(400);
  });

  it('Scenario 11: Firebase Storage download URL retrieval and actual media-byte verification', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    expect(admin).not.toBeNull();
    const token = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0xaa, 0xbb, 0xcc, 0xdd,
    ]);
    const pngForm = new FormData();
    pngForm.append(
      'file',
      new File([pngBytes], 'verify-bytes.png', { type: 'image/png' })
    );
    pngForm.append('mediaType', 'image');

    const pngUploadRes = await adminUploadPost(
      new Request('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
        body: pngForm,
      })
    );
    expect(pngUploadRes.status).toBe(200);
    const pngData = await pngUploadRes.json();

    const mp3Bytes = new Uint8Array([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0xff, 0xfb,
      0x11, 0x22, 0x33, 0x44,
    ]);
    const mp3Form = new FormData();
    mp3Form.append(
      'file',
      new File([mp3Bytes], 'verify-bytes.mp3', { type: 'audio/mpeg' })
    );
    mp3Form.append('mediaType', 'audio');

    const mp3UploadRes = await adminUploadPost(
      new Request('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
        body: mp3Form,
      })
    );
    expect(mp3UploadRes.status).toBe(200);
    const mp3Data = await mp3UploadRes.json();

    // Perform live HTTP GET against Firebase Storage Emulator download URLs and verify exact bytes
    const downloadedPngRes = await fetch(pngData.url);
    expect(downloadedPngRes.status).toBe(200);
    expect(downloadedPngRes.headers.get('content-type')).toContain('image/png');
    const downloadedPngBuf = Buffer.from(await downloadedPngRes.arrayBuffer());
    expect(downloadedPngBuf.equals(Buffer.from(pngBytes))).toBe(true);

    const downloadedMp3Res = await fetch(mp3Data.url);
    expect(downloadedMp3Res.status).toBe(200);
    expect(downloadedMp3Res.headers.get('content-type')).toContain('audio/mpeg');
    const downloadedMp3Buf = Buffer.from(await downloadedMp3Res.arrayBuffer());
    expect(downloadedMp3Buf.equals(Buffer.from(mp3Bytes))).toBe(true);
  });

  it('Scenario 12: Password-change session rotation, prior token invalidation, and clean mode switching', async () => {
    const admin = await getAdminUserByUid('adm_primary');
    expect(admin).not.toBeNull();

    const oldToken = createAdminSessionToken(
      admin!.uid,
      admin!.email,
      admin!.role,
      3600,
      admin!.passwordHash
    );

    // Old token works before password change
    const beforeCheck = await requireAuthorizedAdmin(
      new Request('http://localhost:3000/api/admin/overview', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${oldToken}`,
        },
      })
    );
    expect(beforeCheck.ok).toBe(true);

    // Update password via PUT /api/admin/auth/account against Firestore
    const putRes = await adminAccountPut(
      new Request('http://localhost:3000/api/admin/auth/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${oldToken}`,
        },
        body: JSON.stringify({
          displayName: 'Rotated Admin Organizer',
          currentPassword: 'LuxuryWedding!2026',
          newPassword: 'EmulatorNewPassword!2027',
        }),
      })
    );
    expect(putRes.status).toBe(200);

    const setCookieHeader = putRes.headers.get('set-cookie') || '';
    const newCookieMatch = setCookieHeader.match(
      new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`)
    );
    expect(newCookieMatch?.[1]).toBeTruthy();
    const rotatedToken = newCookieMatch![1];

    // Old token is now rejected with 401
    const oldTokenCheck = await requireAuthorizedAdmin(
      new Request('http://localhost:3000/api/admin/overview', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${oldToken}`,
        },
      })
    );
    expect(oldTokenCheck.ok).toBe(false);
    if (!oldTokenCheck.ok) {
      expect(oldTokenCheck.response.status).toBe(401);
    }

    // Rotated token succeeds
    const rotatedTokenCheck = await requireAuthorizedAdmin(
      new Request('http://localhost:3000/api/admin/overview', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Cookie: `${ADMIN_SESSION_COOKIE}=${rotatedToken}`,
        },
      })
    );
    expect(rotatedTokenCheck.ok).toBe(true);
    expect(
      verifySessionToken<AdminSessionPayload>(rotatedToken, 'admin')?.uid
    ).toBe('adm_primary');

    // Verify clean switching between Firebase Emulator mode and Local JSON mode
    const fsStats = await getDashboardOverviewStats();
    expect(fsStats.totalHouseholds).toBe(6);

    process.env.WEDDING_STORAGE_DRIVER = 'local';
    expect(isFirebaseDriverConfigured()).toBe(false);
    resetLocalDatabaseToSeed();
    const localStats = await getDashboardOverviewStats();
    expect(localStats.totalHouseholds).toBe(6);

    // Restore firestore driver mode
    process.env.WEDDING_STORAGE_DRIVER = 'firestore';
    expect(isFirebaseDriverConfigured()).toBe(true);
  });
});
