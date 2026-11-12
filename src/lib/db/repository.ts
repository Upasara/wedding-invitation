import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AdditionalGuestResponse,
  AdminUserRecord,
  DashboardOverviewStats,
  FaqEntry,
  GalleryImage,
  HouseholdRecord,
  IdempotencyRecord,
  MemberRsvpResponse,
  PublicHouseholdSessionView,
  PublicInvitationPayload,
  RevokedInvitationRecord,
  RsvpRecord,
  StoryEntry,
  WeddingContent,
  WeddingEvent,
  WeddingPartyMember,
  WeddingSettings,
} from '@/lib/types/domain';
import {
  createInitialSeedDatabase,
  FullDatabaseCollections,
  SAMPLE_DEVELOPMENT_INVITATION_CODES,
} from '@/lib/db/seed-data';
import { getFirestoreDb, isFirebaseDriverConfigured } from '@/lib/db/firebase-admin';
import {
  computeInvitationCodeDigest,
  generateSecureInvitationCode,
  verifyInvitationCodeAgainstDigest,
} from '@/lib/security/hmac';
import { hashAdminPassword, verifyAdminPassword } from '@/lib/security/session';

// ==============================================================================
// Unified Transactional Repository Layer
// - Native Firestore Document Queries & `firestore.runTransaction()` when Firebase is active
// - Single-Process Local Persistent Store (.data/wedding-db.json) for offline dev
// ==============================================================================

const LOCAL_DB_DIR = path.join(process.cwd(), '.data');
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, 'wedding-db.json');

// Mutex queue for atomic transactions in local single-process mode
let transactionChain: Promise<unknown> = Promise.resolve();

function runAtomicLocalTransaction<T>(
  fn: (db: FullDatabaseCollections) => T | Promise<T>
): Promise<T> {
  const next = transactionChain.then(async () => {
    const db = loadLocalDatabaseSync();
    const snapshot = JSON.parse(JSON.stringify(db)) as FullDatabaseCollections;
    const result = await fn(snapshot);
    saveLocalDatabaseSync(snapshot);
    return result;
  });
  transactionChain = next.catch(() => undefined);
  return next;
}

function loadLocalDatabaseSync(): FullDatabaseCollections {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    const initial = createInitialSeedDatabase();
    saveLocalDatabaseSync(initial);
    return initial;
  }

  const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
  let parsed: FullDatabaseCollections;
  try {
    parsed = JSON.parse(raw) as FullDatabaseCollections;
  } catch (err) {
    // Never silently overwrite an existing database file on parse error;
    // preserve a backup copy and surface the corruption error explicitly.
    const backupPath = `${LOCAL_DB_FILE}.corrupt.${Date.now()}.bak`;
    try {
      fs.copyFileSync(LOCAL_DB_FILE, backupPath);
    } catch {
      // Ignore copy error
    }
    throw new Error(
      `Local database file appears corrupted and was backed up to ${path.basename(
        backupPath
      )}: ${err instanceof Error ? err.message : 'JSON parse error'}`
    );
  }

  if (!parsed.wedding_settings?.global || !parsed.wedding_content?.main) {
    const backupPath = `${LOCAL_DB_FILE}.invalid.${Date.now()}.bak`;
    try {
      fs.copyFileSync(LOCAL_DB_FILE, backupPath);
    } catch {
      // Ignore copy error
    }
    throw new Error(
      `Local database file is missing core settings/content collections; backed up to ${path.basename(
        backupPath
      )}.`
    );
  }

  return parsed;
}

function saveLocalDatabaseSync(db: FullDatabaseCollections): void {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  const serialized = JSON.stringify(db, null, 2);
  const tempFile = `${LOCAL_DB_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  try {
    fs.writeFileSync(tempFile, serialized, 'utf8');
    fs.renameSync(tempFile, LOCAL_DB_FILE);
  } catch {
    fs.writeFileSync(LOCAL_DB_FILE, serialized, 'utf8');
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup error
      }
    }
  }
}

export function resetLocalDatabaseToSeed(): FullDatabaseCollections {
  const seed = createInitialSeedDatabase();
  saveLocalDatabaseSync(seed);
  return seed;
}

let firestoreSeedChecked = false;

/**
 * Test-only helper to reset the in-process Firestore seed flag between integration test runs.
 * Strictly guarded so it cannot be invoked in production or outside the local Firestore Emulator.
 */
export function resetFirestoreSeedStateForTesting(): void {
  if (
    process.env.NODE_ENV !== 'test' ||
    !process.env.FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'SECURITY VIOLATION: resetFirestoreSeedStateForTesting() is strictly restricted to NODE_ENV="test" with FIRESTORE_EMULATOR_HOST active.'
    );
  }
  firestoreSeedChecked = false;
}

/**
 * Seeds an empty Firestore Emulator / database once on initial startup if `wedding_settings/global` does not exist.
 */
export async function ensureFirestoreSeededOnce(): Promise<void> {
  if (firestoreSeedChecked) return;
  const firestore = getFirestoreDb();
  if (!firestore) return;

  await firestore.runTransaction(async (tx) => {
    const settingsRef = firestore.collection('wedding_settings').doc('global');
    const snap = await tx.get(settingsRef);
    if (snap.exists) {
      return;
    }

    const seed = createInitialSeedDatabase();
    tx.set(settingsRef, seed.wedding_settings.global);
    tx.set(
      firestore.collection('wedding_content').doc('main'),
      seed.wedding_content.main
    );

    for (const [id, doc] of Object.entries(seed.events)) {
      tx.set(firestore.collection('events').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.story_entries)) {
      tx.set(firestore.collection('story_entries').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.gallery_images)) {
      tx.set(firestore.collection('gallery_images').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.wedding_party)) {
      tx.set(firestore.collection('wedding_party').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.faqs)) {
      tx.set(firestore.collection('faqs').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.households)) {
      tx.set(firestore.collection('households').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.rsvps)) {
      tx.set(firestore.collection('rsvps').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.admin_users)) {
      tx.set(firestore.collection('admin_users').doc(id), doc);
    }
    for (const [id, doc] of Object.entries(seed.revoked_invitations)) {
      tx.set(firestore.collection('revoked_invitations').doc(id), doc);
    }
  });

  firestoreSeedChecked = true;
}

// ==============================================================================
// 1. Targeted Public Invitation & Household Session Projections
// ==============================================================================

export async function getSanitizedHouseholdSessionView(
  householdId: string,
  expectedCodeDigestPrefix?: string
): Promise<PublicHouseholdSessionView | null> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const [hhSnap, settingsSnap, rsvpSnap] = await Promise.all([
        firestore.collection('households').doc(householdId).get(),
        firestore.collection('wedding_settings').doc('global').get(),
        firestore.collection('rsvps').doc(`rsvp_${householdId}`).get(),
      ]);

      if (!hhSnap.exists || !settingsSnap.exists) return null;
      const household = hhSnap.data() as HouseholdRecord;
      if (household.status !== 'active') return null;

      if (
        expectedCodeDigestPrefix &&
        !household.codeDigest.startsWith(expectedCodeDigestPrefix)
      ) {
        return null;
      }

      const revokedSnap = await firestore
        .collection('revoked_invitations')
        .where('codeDigest', '==', household.codeDigest)
        .limit(1)
        .get();
      if (!revokedSnap.empty) return null;

      const settings = settingsSnap.data() as WeddingSettings;
      const rsvp = rsvpSnap.exists ? (rsvpSnap.data() as RsvpRecord) : null;

      return {
        householdId: household.id,
        displayName: household.displayName,
        members: household.members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          title: m.title,
        })),
        maxInvitedMembers: household.maxInvitedMembers,
        additionalGuestAllowance: household.additionalGuestAllowance,
        effectiveAdditionalGuestAllowance: settings.allowAdditionalGuestsGlobal
          ? household.additionalGuestAllowance
          : 0,
        existingRsvp: rsvp
          ? {
              overallStatus: rsvp.overallStatus,
              memberResponses: rsvp.memberResponses,
              additionalGuests: rsvp.additionalGuests,
              contactEmail: rsvp.contactEmail,
              contactPhone: rsvp.contactPhone,
              personalMessage: rsvp.personalMessage,
              version: rsvp.version,
              submittedAt: rsvp.submittedAt,
              updatedAt: rsvp.updatedAt,
            }
          : null,
      };
    }
  }

  const db = loadLocalDatabaseSync();
  const household = db.households[householdId];
  if (!household || household.status !== 'active') return null;

  const isRevoked = Object.values(db.revoked_invitations).some(
    (rev) => rev.codeDigest === household.codeDigest
  );
  if (isRevoked) return null;

  if (
    expectedCodeDigestPrefix &&
    !household.codeDigest.startsWith(expectedCodeDigestPrefix)
  ) {
    return null;
  }

  const settings = db.wedding_settings.global;
  const effectiveAdditionalGuestAllowance = settings.allowAdditionalGuestsGlobal
    ? household.additionalGuestAllowance
    : 0;

  const rsvp = db.rsvps[`rsvp_${household.id}`] || null;

  return {
    householdId: household.id,
    displayName: household.displayName,
    members: household.members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      title: m.title,
    })),
    maxInvitedMembers: household.maxInvitedMembers,
    additionalGuestAllowance: household.additionalGuestAllowance,
    effectiveAdditionalGuestAllowance,
    existingRsvp: rsvp
      ? {
          overallStatus: rsvp.overallStatus,
          memberResponses: rsvp.memberResponses,
          additionalGuests: rsvp.additionalGuests,
          contactEmail: rsvp.contactEmail,
          contactPhone: rsvp.contactPhone,
          personalMessage: rsvp.personalMessage,
          version: rsvp.version,
          submittedAt: rsvp.submittedAt,
          updatedAt: rsvp.updatedAt,
        }
      : null,
  };
}

export async function getPublicInvitationPayload(
  householdSession?: { householdId: string; codeDigestPrefix: string } | null
): Promise<PublicInvitationPayload> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      // Targeted read of ONLY public collections (never reads households, rsvps, or admin_users)
      const [
        contentSnap,
        settingsSnap,
        eventsSnap,
        storySnap,
        gallerySnap,
        partySnap,
        faqsSnap,
        sessionView,
      ] = await Promise.all([
        firestore.collection('wedding_content').doc('main').get(),
        firestore.collection('wedding_settings').doc('global').get(),
        firestore.collection('events').where('active', '==', true).get(),
        firestore.collection('story_entries').where('active', '==', true).get(),
        firestore.collection('gallery_images').where('active', '==', true).get(),
        firestore.collection('wedding_party').where('active', '==', true).get(),
        firestore.collection('faqs').where('active', '==', true).get(),
        householdSession
          ? getSanitizedHouseholdSessionView(
              householdSession.householdId,
              householdSession.codeDigestPrefix
            )
          : Promise.resolve(null),
      ]);

      const content = contentSnap.data() as WeddingContent;
      const settings = settingsSnap.data() as WeddingSettings;

      const sortOrder = <T extends { order: number }>(
        snap: FirebaseFirestore.QuerySnapshot
      ): T[] =>
        snap.docs
          .map((d) => d.data() as T)
          .sort((a, b) => a.order - b.order);

      return {
        content,
        settings: {
          rsvpEnabled: settings.rsvpEnabled,
          rsvpDeadline: settings.rsvpDeadline,
          rsvpInstructions: settings.rsvpInstructions,
          allowAdditionalGuestsGlobal: settings.allowAdditionalGuestsGlobal,
          enableMealPreferencesGlobal: settings.enableMealPreferencesGlobal,
          mealOptions: settings.mealOptions.filter((m) => m.active),
          requireInvitationCode: settings.requireInvitationCode,
          invitationAccessOpen: settings.invitationAccessOpen,
          turnstileEnabled: settings.turnstileEnabled,
          sectionVisibility: settings.sectionVisibility,
        },
        events: sortOrder<WeddingEvent>(eventsSnap),
        storyEntries: sortOrder<StoryEntry>(storySnap),
        galleryImages: sortOrder<GalleryImage>(gallerySnap),
        weddingParty: sortOrder<WeddingPartyMember>(partySnap),
        faqs: sortOrder<FaqEntry>(faqsSnap),
        householdSession: sessionView,
      };
    }
  }

  const db = loadLocalDatabaseSync();
  const content = db.wedding_content.main;
  const settings = db.wedding_settings.global;

  const events = Object.values(db.events)
    .filter((e) => e.active)
    .sort((a, b) => a.order - b.order);

  const storyEntries = Object.values(db.story_entries)
    .filter((s) => s.active)
    .sort((a, b) => a.order - b.order);

  const galleryImages = Object.values(db.gallery_images)
    .filter((g) => g.active)
    .sort((a, b) => a.order - b.order);

  const weddingParty = Object.values(db.wedding_party)
    .filter((p) => p.active)
    .sort((a, b) => a.order - b.order);

  const faqs = Object.values(db.faqs)
    .filter((f) => f.active)
    .sort((a, b) => a.order - b.order);

  let sessionView: PublicHouseholdSessionView | null = null;
  if (householdSession) {
    sessionView = await getSanitizedHouseholdSessionView(
      householdSession.householdId,
      householdSession.codeDigestPrefix
    );
  }

  return {
    content,
    settings: {
      rsvpEnabled: settings.rsvpEnabled,
      rsvpDeadline: settings.rsvpDeadline,
      rsvpInstructions: settings.rsvpInstructions,
      allowAdditionalGuestsGlobal: settings.allowAdditionalGuestsGlobal,
      enableMealPreferencesGlobal: settings.enableMealPreferencesGlobal,
      mealOptions: settings.mealOptions.filter((m) => m.active),
      requireInvitationCode: settings.requireInvitationCode,
      invitationAccessOpen: settings.invitationAccessOpen,
      turnstileEnabled: settings.turnstileEnabled,
      sectionVisibility: settings.sectionVisibility,
    },
    events,
    storyEntries,
    galleryImages,
    weddingParty,
    faqs,
    householdSession: sessionView,
  };
}

// ==============================================================================
// 2. Household Invitation Code Verification (HMAC-SHA256 + Constant-Time Check)
// ==============================================================================

export interface VerifyInvitationCodeResult {
  ok: boolean;
  household?: HouseholdRecord;
  sessionView?: PublicHouseholdSessionView;
  error?: string;
}

const GENERIC_INVALID_CODE_MSG =
  'We could not verify that invitation code. Please check your invitation card and try again.';

export async function verifyHouseholdInvitationCode(
  candidatePlaintextCode: string
): Promise<VerifyInvitationCodeResult> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const settingsRef = firestore.collection('wedding_settings').doc('global');
        const settingsSnap = await tx.get(settingsRef);
        const settings = settingsSnap.data() as WeddingSettings;

        if (!settings.invitationAccessOpen) {
          return {
            ok: false,
            error: 'Invitation access is currently closed.',
          };
        }

        const currentAttempt = computeInvitationCodeDigest(candidatePlaintextCode);
        const currentSnap = await tx.get(
          firestore
            .collection('households')
            .where('codeDigest', '==', currentAttempt.digest)
            .limit(1)
        );

        let matchedHousehold: HouseholdRecord | null = null;
        let needsUpgrade = false;

        if (!currentSnap.empty) {
          const hh = currentSnap.docs[0].data() as HouseholdRecord;
          const check = verifyInvitationCodeAgainstDigest(
            candidatePlaintextCode,
            hh.codeDigest
          );
          if (check.matched) {
            matchedHousehold = hh;
            needsUpgrade = false;
          }
        } else {
          const prevSecret = (
            process.env.INVITATION_HMAC_SECRET_PREVIOUS || ''
          ).trim();
          if (prevSecret.length >= 16) {
            const prevAttempt = computeInvitationCodeDigest(
              candidatePlaintextCode,
              prevSecret
            );
            const prevSnap = await tx.get(
              firestore
                .collection('households')
                .where('codeDigest', '==', prevAttempt.digest)
                .limit(1)
            );
            if (!prevSnap.empty) {
              const hh = prevSnap.docs[0].data() as HouseholdRecord;
              const check = verifyInvitationCodeAgainstDigest(
                candidatePlaintextCode,
                hh.codeDigest
              );
              if (check.matched) {
                matchedHousehold = hh;
                needsUpgrade = true;
              }
            }
          }
        }

        if (!matchedHousehold || matchedHousehold.status !== 'active') {
          return { ok: false, error: GENERIC_INVALID_CODE_MSG };
        }

        const matched = matchedHousehold;
        const revokedSnap = await tx.get(
          firestore
            .collection('revoked_invitations')
            .where('codeDigest', '==', matched.codeDigest)
            .limit(1)
        );
        if (!revokedSnap.empty) {
          return { ok: false, error: GENERIC_INVALID_CODE_MSG };
        }

        const rsvpSnap = await tx.get(
          firestore.collection('rsvps').doc(`rsvp_${matched.id}`)
        );
        const rsvp = rsvpSnap.exists ? (rsvpSnap.data() as RsvpRecord) : null;

        if (needsUpgrade) {
          const upgraded = computeInvitationCodeDigest(candidatePlaintextCode);
          matched.codeDigest = upgraded.digest;
          matched.codeKeyVersion = upgraded.keyVersion;
          matched.updatedAt = new Date().toISOString();
          tx.set(firestore.collection('households').doc(matched.id), matched);
        }

        const sessionView: PublicHouseholdSessionView = {
          householdId: matched.id,
          displayName: matched.displayName,
          members: matched.members.map((m) => ({
            id: m.id,
            fullName: m.fullName,
            title: m.title,
          })),
          maxInvitedMembers: matched.maxInvitedMembers,
          additionalGuestAllowance: matched.additionalGuestAllowance,
          effectiveAdditionalGuestAllowance: settings.allowAdditionalGuestsGlobal
            ? matched.additionalGuestAllowance
            : 0,
          existingRsvp: rsvp
            ? {
                overallStatus: rsvp.overallStatus,
                memberResponses: rsvp.memberResponses,
                additionalGuests: rsvp.additionalGuests,
                contactEmail: rsvp.contactEmail,
                contactPhone: rsvp.contactPhone,
                personalMessage: rsvp.personalMessage,
                version: rsvp.version,
                submittedAt: rsvp.submittedAt,
                updatedAt: rsvp.updatedAt,
              }
            : null,
        };

        return { ok: true, household: matched, sessionView };
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const settings = db.wedding_settings.global;
    if (!settings.invitationAccessOpen) {
      return {
        ok: false,
        error: 'Invitation access is currently closed.',
      };
    }

    const allHouseholds = Object.values(db.households);
    let matchedHousehold: HouseholdRecord | null = null;
    let needsUpgrade = false;

    for (const hh of allHouseholds) {
      const check = verifyInvitationCodeAgainstDigest(
        candidatePlaintextCode,
        hh.codeDigest
      );
      if (check.matched) {
        matchedHousehold = hh;
        needsUpgrade = check.needsKeyRotationUpgrade;
      }
    }

    if (!matchedHousehold || matchedHousehold.status !== 'active') {
      return { ok: false, error: GENERIC_INVALID_CODE_MSG };
    }

    const isRevoked = Object.values(db.revoked_invitations).some(
      (rev) => rev.codeDigest === matchedHousehold!.codeDigest
    );
    if (isRevoked) {
      return { ok: false, error: GENERIC_INVALID_CODE_MSG };
    }

    if (needsUpgrade) {
      const upgraded = computeInvitationCodeDigest(candidatePlaintextCode);
      matchedHousehold.codeDigest = upgraded.digest;
      matchedHousehold.codeKeyVersion = upgraded.keyVersion;
      matchedHousehold.updatedAt = new Date().toISOString();
    }

    const effectiveAdditionalGuestAllowance = settings.allowAdditionalGuestsGlobal
      ? matchedHousehold.additionalGuestAllowance
      : 0;
    const rsvp = db.rsvps[`rsvp_${matchedHousehold.id}`] || null;

    const sessionView: PublicHouseholdSessionView = {
      householdId: matchedHousehold.id,
      displayName: matchedHousehold.displayName,
      members: matchedHousehold.members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        title: m.title,
      })),
      maxInvitedMembers: matchedHousehold.maxInvitedMembers,
      additionalGuestAllowance: matchedHousehold.additionalGuestAllowance,
      effectiveAdditionalGuestAllowance,
      existingRsvp: rsvp
        ? {
            overallStatus: rsvp.overallStatus,
            memberResponses: rsvp.memberResponses,
            additionalGuests: rsvp.additionalGuests,
            contactEmail: rsvp.contactEmail,
            contactPhone: rsvp.contactPhone,
            personalMessage: rsvp.personalMessage,
            version: rsvp.version,
            submittedAt: rsvp.submittedAt,
            updatedAt: rsvp.updatedAt,
          }
        : null,
    };

    return {
      ok: true,
      household: matchedHousehold,
      sessionView,
    };
  });
}

// ==============================================================================
// 3. Strict Server-Side RSVP Submission & Editing (All 11 Rules Enforced)
// ==============================================================================

export interface SubmitRsvpInput {
  householdId: string;
  overallStatus: 'attending' | 'declined';
  memberResponses: Array<{
    memberId: string;
    attending: boolean;
    mealOptionId?: string | null;
    dietaryNotes?: string;
  }>;
  additionalGuests: Array<{
    id?: string;
    fullName: string;
    mealOptionId?: string | null;
    dietaryNotes?: string;
  }>;
  contactEmail?: string;
  contactPhone?: string;
  personalMessage?: string;
  expectedVersion?: number;
  idempotencyKey?: string;
  updatedBy: 'guest' | 'admin';
}

export interface SubmitRsvpResult {
  ok: boolean;
  statusCode: number;
  rsvp?: RsvpRecord;
  error?: string;
  fromIdempotencyCache?: boolean;
}

function validateAndBuildRsvpMutation(params: {
  input: SubmitRsvpInput;
  settings: WeddingSettings;
  household: HouseholdRecord | undefined;
  existingRsvp: RsvpRecord | undefined;
  existingIdem: IdempotencyRecord | undefined;
}): {
  result: SubmitRsvpResult;
  newRsvpToSave?: RsvpRecord;
  newIdemToSave?: IdempotencyRecord;
} {
  const { input, settings, household, existingRsvp, existingIdem } = params;

  if (!household) {
    return {
      result: {
        ok: false,
        statusCode: 404,
        error: 'Household invitation record not found.',
      },
    };
  }

  if (input.updatedBy === 'guest') {
    if (household.status !== 'active') {
      return {
        result: {
          ok: false,
          statusCode: 403,
          error: 'This invitation is no longer active.',
        },
      };
    }
    if (!settings.rsvpEnabled) {
      return {
        result: {
          ok: false,
          statusCode: 403,
          error: 'RSVP submissions are currently closed.',
        },
      };
    }
    if (settings.rsvpDeadline) {
      const deadlineMs = Date.parse(settings.rsvpDeadline);
      if (!Number.isNaN(deadlineMs) && Date.now() > deadlineMs) {
        return {
          result: {
            ok: false,
            statusCode: 403,
            error:
              'The RSVP deadline has passed. Please contact the wedding organizers directly.',
          },
        };
      }
    }
  }

  // Rule 8: Idempotency check for duplicate submissions
  const payloadHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        householdId: input.householdId,
        overallStatus: input.overallStatus,
        memberResponses: input.memberResponses,
        additionalGuests: input.additionalGuests,
        contactEmail: input.contactEmail || '',
        contactPhone: input.contactPhone || '',
        personalMessage: input.personalMessage || '',
      })
    )
    .digest('hex');

  if (input.idempotencyKey && existingIdem && Date.parse(existingIdem.expiresAt) > Date.now()) {
    if (existingIdem.requestHash !== payloadHash) {
      return {
        result: {
          ok: false,
          statusCode: 409,
          error: 'Idempotency key was already used with a different RSVP payload.',
        },
      };
    }
    return {
      result: {
        ok: true,
        statusCode: existingIdem.statusCode,
        rsvp: existingIdem.responseBody as RsvpRecord,
        fromIdempotencyCache: true,
      },
    };
  }

  // Rule 9: Strict optimistic concurrency check (including concurrent first-write race protection)
  if (input.updatedBy === 'guest') {
    const clientExpectedVersion = input.expectedVersion ?? 0;
    const actualCurrentVersion = existingRsvp ? existingRsvp.version : 0;
    if (clientExpectedVersion !== actualCurrentVersion) {
      return {
        result: {
          ok: false,
          statusCode: 409,
          error:
            'This RSVP was recently submitted or updated in another session. Please refresh to view the latest response before saving.',
        },
      };
    }
  } else if (
    existingRsvp &&
    input.expectedVersion !== undefined &&
    input.expectedVersion !== existingRsvp.version
  ) {
    return {
      result: {
        ok: false,
        statusCode: 409,
        error:
          'This RSVP was recently updated in another session. Please refresh before saving.',
      },
    };
  }

  // Rule 1 & Rule 2: Every member ID must belong to the authenticated household
  const allowedMemberMap = new Map(household.members.map((m) => [m.id, m]));
  const seenMemberIds = new Set<string>();

  for (const mr of input.memberResponses) {
    if (!allowedMemberMap.has(mr.memberId)) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: `Member ID "${mr.memberId}" does not belong to this household invitation.`,
        },
      };
    }
    if (seenMemberIds.has(mr.memberId)) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: `Duplicate attendance entry for member "${mr.memberId}".`,
        },
      };
    }
    seenMemberIds.add(mr.memberId);
  }

  if (seenMemberIds.size !== household.members.length) {
    return {
      result: {
        ok: false,
        statusCode: 400,
        error:
          'Please provide an attendance response for every invited member of your household.',
      },
    };
  }

  const activeMealIds = new Set(
    settings.mealOptions.filter((m) => m.active).map((m) => m.id)
  );

  const attendingMembers = input.memberResponses.filter((m) => m.attending);

  // Rule 4: Declined households must not contain attending members, additional guests, or meal preferences.
  if (input.overallStatus === 'declined') {
    if (attendingMembers.length > 0) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error:
            'A declined household response cannot include attending household members.',
        },
      };
    }
    if (input.additionalGuests.length > 0) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error:
            'Additional guests cannot be added when declining the invitation.',
        },
      };
    }
    const hasAnyMeal = input.memberResponses.some(
      (m) =>
        m.mealOptionId !== undefined &&
        m.mealOptionId !== null &&
        m.mealOptionId !== ''
    );
    if (hasAnyMeal) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error:
            'Meal preferences cannot be submitted when declining the invitation.',
        },
      };
    }
  } else {
    if (attendingMembers.length === 0) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error:
            'At least one invited household member must be marked as attending, or select "Unable to Attend" for the household.',
        },
      };
    }
  }

  // Rule 3 & Rule 10: Additional guests must respect global and household-specific limits.
  if (input.additionalGuests.length > 0) {
    if (!settings.allowAdditionalGuestsGlobal) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: 'Additional guests (+1s) are not enabled for this wedding.',
        },
      };
    }
    if (input.additionalGuests.length > household.additionalGuestAllowance) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: `Your household invitation allows a maximum of ${household.additionalGuestAllowance} additional guest(s).`,
        },
      };
    }
  }

  // Rule 5 & Rule 6: Validate meal preferences for invited members and additional guests
  const validatedMembers: MemberRsvpResponse[] = [];
  for (const mr of input.memberResponses) {
    const memberInfo = allowedMemberMap.get(mr.memberId)!;
    const rawMeal = mr.mealOptionId ? mr.mealOptionId.trim() : null;

    if (!settings.enableMealPreferencesGlobal && rawMeal) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: 'Meal preferences are currently disabled.',
        },
      };
    }

    if (!mr.attending && rawMeal) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: `Meal selection is not permitted for ${memberInfo.fullName} because they are marked as not attending.`,
        },
      };
    }

    if (
      mr.attending &&
      settings.enableMealPreferencesGlobal &&
      activeMealIds.size > 0
    ) {
      if (!rawMeal || !activeMealIds.has(rawMeal)) {
        return {
          result: {
            ok: false,
            statusCode: 400,
            error: `Please select a valid entrée option for ${memberInfo.fullName}.`,
          },
        };
      }
    }

    validatedMembers.push({
      memberId: memberInfo.id,
      memberName: memberInfo.fullName,
      attending: mr.attending,
      mealOptionId:
        mr.attending && settings.enableMealPreferencesGlobal ? rawMeal : null,
      dietaryNotes: mr.attending ? (mr.dietaryNotes || '').trim() : '',
    });
  }

  const validatedAdditionalGuests: AdditionalGuestResponse[] = [];
  for (let idx = 0; idx < input.additionalGuests.length; idx++) {
    const ag = input.additionalGuests[idx];
    const rawMeal = ag.mealOptionId ? ag.mealOptionId.trim() : null;

    if (!settings.enableMealPreferencesGlobal && rawMeal) {
      return {
        result: {
          ok: false,
          statusCode: 400,
          error: 'Meal preferences are currently disabled.',
        },
      };
    }

    if (settings.enableMealPreferencesGlobal && activeMealIds.size > 0) {
      if (!rawMeal || !activeMealIds.has(rawMeal)) {
        return {
          result: {
            ok: false,
            statusCode: 400,
            error: `Please select a valid entrée option for additional guest "${ag.fullName}".`,
          },
        };
      }
    }

    validatedAdditionalGuests.push({
      id: ag.id || `plus_${household.id}_${idx + 1}`,
      fullName: ag.fullName.trim(),
      mealOptionId: settings.enableMealPreferencesGlobal ? rawMeal : null,
      dietaryNotes: (ag.dietaryNotes || '').trim(),
    });
  }

  const nowIso = new Date().toISOString();
  const nextVersion = existingRsvp ? existingRsvp.version + 1 : 1;
  const attendingMembersCount = validatedMembers.filter((m) => m.attending).length;
  const additionalGuestsCount = validatedAdditionalGuests.length;
  const rsvpDocId = `rsvp_${household.id}`;

  const record: RsvpRecord = {
    id: rsvpDocId,
    householdId: household.id,
    householdDisplayName: household.displayName,
    overallStatus: input.overallStatus,
    memberResponses: validatedMembers,
    additionalGuests: validatedAdditionalGuests,
    contactEmail: (input.contactEmail || '').trim(),
    contactPhone: (input.contactPhone || '').trim(),
    personalMessage: (input.personalMessage || '').trim(),
    attendingMembersCount,
    additionalGuestsCount,
    totalAttendingCount: attendingMembersCount + additionalGuestsCount,
    version: nextVersion,
    submittedAt: existingRsvp ? existingRsvp.submittedAt : nowIso,
    updatedAt: nowIso,
    updatedBy: input.updatedBy,
  };

  let newIdemToSave: IdempotencyRecord | undefined;
  if (input.idempotencyKey) {
    const idemId = `idem_${input.householdId}_${crypto
      .createHash('sha256')
      .update(input.idempotencyKey)
      .digest('hex')
      .slice(0, 24)}`;
    newIdemToSave = {
      id: idemId,
      householdId: input.householdId,
      requestHash: payloadHash,
      statusCode: 200,
      responseBody: record,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };
  }

  return {
    result: {
      ok: true,
      statusCode: 200,
      rsvp: record,
    },
    newRsvpToSave: record,
    newIdemToSave,
  };
}

export async function submitOrUpdateHouseholdRsvp(
  input: SubmitRsvpInput
): Promise<SubmitRsvpResult> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const settingsRef = firestore.collection('wedding_settings').doc('global');
        const hhRef = firestore.collection('households').doc(input.householdId);
        const rsvpRef = firestore
          .collection('rsvps')
          .doc(`rsvp_${input.householdId}`);

        const idemId = input.idempotencyKey
          ? `idem_${input.householdId}_${crypto
              .createHash('sha256')
              .update(input.idempotencyKey)
              .digest('hex')
              .slice(0, 24)}`
          : null;
        const idemRef = idemId
          ? firestore.collection('idempotency_records').doc(idemId)
          : null;

        const [settingsSnap, hhSnap, rsvpSnap, idemSnap] = await Promise.all([
          tx.get(settingsRef),
          tx.get(hhRef),
          tx.get(rsvpRef),
          idemRef ? tx.get(idemRef) : Promise.resolve(null),
        ]);

        const outcome = validateAndBuildRsvpMutation({
          input,
          settings: settingsSnap.data() as WeddingSettings,
          household: hhSnap.exists
            ? (hhSnap.data() as HouseholdRecord)
            : undefined,
          existingRsvp: rsvpSnap.exists
            ? (rsvpSnap.data() as RsvpRecord)
            : undefined,
          existingIdem:
            idemSnap && idemSnap.exists
              ? (idemSnap.data() as IdempotencyRecord)
              : undefined,
        });

        if (outcome.newRsvpToSave) {
          tx.set(rsvpRef, outcome.newRsvpToSave);
        }
        if (outcome.newIdemToSave && idemRef) {
          tx.set(idemRef, outcome.newIdemToSave);
        }

        return outcome.result;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const idemId = input.idempotencyKey
      ? `idem_${input.householdId}_${crypto
          .createHash('sha256')
          .update(input.idempotencyKey)
          .digest('hex')
          .slice(0, 24)}`
      : null;

    const outcome = validateAndBuildRsvpMutation({
      input,
      settings: db.wedding_settings.global,
      household: db.households[input.householdId],
      existingRsvp: db.rsvps[`rsvp_${input.householdId}`],
      existingIdem: idemId ? db.idempotency_records[idemId] : undefined,
    });

    if (outcome.newRsvpToSave) {
      db.rsvps[outcome.newRsvpToSave.id] = outcome.newRsvpToSave;
    }
    if (outcome.newIdemToSave) {
      db.idempotency_records[outcome.newIdemToSave.id] = outcome.newIdemToSave;
    }

    return outcome.result;
  });
}

// ==============================================================================
// 4. Administrator Authentication & Account Management
// ==============================================================================

export async function authenticateAdminCredentials(
  email: string,
  password: string
): Promise<{ ok: true; admin: AdminUserRecord } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore
        .collection('admin_users')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

      if (snap.empty) {
        verifyAdminPassword(
          password,
          '00112233445566778899aabbccddeeff',
          '0'.repeat(128)
        );
        return {
          ok: false,
          error: 'Invalid administrator email or password.',
        };
      }

      const adminDoc = snap.docs[0];
      const adminUser = adminDoc.data() as AdminUserRecord;
      if (!adminUser.active) {
        return {
          ok: false,
          error: 'Invalid administrator email or password.',
        };
      }

      const valid = verifyAdminPassword(
        password,
        adminUser.passwordSalt,
        adminUser.passwordHash
      );
      if (!valid) {
        return {
          ok: false,
          error: 'Invalid administrator email or password.',
        };
      }

      const nowIso = new Date().toISOString();
      adminUser.lastLoginAt = nowIso;
      await adminDoc.ref.update({ lastLoginAt: nowIso });
      return { ok: true, admin: adminUser };
    }
  }

  return runAtomicLocalTransaction((db) => {
    const adminUser = Object.values(db.admin_users).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!adminUser || !adminUser.active) {
      verifyAdminPassword(
        password,
        '00112233445566778899aabbccddeeff',
        '0'.repeat(128)
      );
      return {
        ok: false,
        error: 'Invalid administrator email or password.',
      };
    }

    const valid = verifyAdminPassword(
      password,
      adminUser.passwordSalt,
      adminUser.passwordHash
    );
    if (!valid) {
      return {
        ok: false,
        error: 'Invalid administrator email or password.',
      };
    }

    adminUser.lastLoginAt = new Date().toISOString();
    return { ok: true, admin: adminUser };
  });
}

export async function resolveOrProvisionFirebaseAdminUser(params: {
  uid: string;
  email?: string;
  displayName?: string;
  claimRole?: string;
}): Promise<AdminUserRecord | null> {
  const normalizedEmail = (params.email || '').trim().toLowerCase();
  const isClaimAdmin =
    params.claimRole === 'admin' || params.claimRole === 'super_admin';

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const directRef = firestore.collection('admin_users').doc(params.uid);
        const directSnap = await tx.get(directRef);
        const nowIso = new Date().toISOString();

        if (directSnap.exists) {
          const existing = directSnap.data() as AdminUserRecord;
          if (
            !existing.active ||
            (existing.role !== 'admin' && existing.role !== 'super_admin')
          ) {
            return null;
          }
          existing.lastLoginAt = nowIso;
          tx.update(directRef, { lastLoginAt: nowIso });
          return existing;
        }

        if (normalizedEmail) {
          const byEmailSnap = await tx.get(
            firestore
              .collection('admin_users')
              .where('email', '==', normalizedEmail)
              .limit(1)
          );
          if (!byEmailSnap.empty) {
            const matchedDoc = byEmailSnap.docs[0];
            const matchedUser = matchedDoc.data() as AdminUserRecord;
            if (
              !matchedUser.active ||
              (matchedUser.role !== 'admin' && matchedUser.role !== 'super_admin')
            ) {
              return null;
            }
            matchedUser.lastLoginAt = nowIso;
            tx.update(matchedDoc.ref, { lastLoginAt: nowIso });
            return matchedUser;
          }
        }

        if (!isClaimAdmin) {
          return null;
        }

        const provisioned: AdminUserRecord = {
          uid: params.uid,
          email: normalizedEmail || `${params.uid}@firebase.admin`,
          displayName: params.displayName || 'Wedding Administrator',
          role: params.claimRole === 'super_admin' ? 'super_admin' : 'admin',
          passwordHash: '',
          passwordSalt: '',
          active: true,
          lastLoginAt: nowIso,
          updatedAt: nowIso,
        };
        tx.set(directRef, provisioned);
        return provisioned;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const nowIso = new Date().toISOString();
    const direct = db.admin_users[params.uid];
    if (direct) {
      if (
        !direct.active ||
        (direct.role !== 'admin' && direct.role !== 'super_admin')
      ) {
        return null;
      }
      direct.lastLoginAt = nowIso;
      return direct;
    }

    if (normalizedEmail) {
      const byEmail = Object.values(db.admin_users).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (byEmail) {
        if (
          !byEmail.active ||
          (byEmail.role !== 'admin' && byEmail.role !== 'super_admin')
        ) {
          return null;
        }
        byEmail.lastLoginAt = nowIso;
        return byEmail;
      }
    }

    if (!isClaimAdmin) {
      return null;
    }

    const provisioned: AdminUserRecord = {
      uid: params.uid,
      email: normalizedEmail || `${params.uid}@firebase.admin`,
      displayName: params.displayName || 'Wedding Administrator',
      role: params.claimRole === 'super_admin' ? 'super_admin' : 'admin',
      passwordHash: '',
      passwordSalt: '',
      active: true,
      lastLoginAt: nowIso,
      updatedAt: nowIso,
    };
    db.admin_users[params.uid] = provisioned;
    return provisioned;
  });
}

export async function getAdminUserByUid(
  uid: string
): Promise<AdminUserRecord | null> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('admin_users').doc(uid).get();
      if (!snap.exists) return null;
      const user = snap.data() as AdminUserRecord;
      return user.active ? user : null;
    }
  }

  const db = loadLocalDatabaseSync();
  const user = db.admin_users[uid];
  if (!user || !user.active) return null;
  return user;
}

export async function updateAdminUserAccount(
  uid: string,
  updates: {
    displayName?: string;
    photoUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }
): Promise<{ ok: boolean; admin?: AdminUserRecord; error?: string }> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('admin_users').doc(uid);
        const snap = await tx.get(ref);
        if (!snap.exists) {
          return { ok: false, error: 'Administrator account not found.' };
        }
        const admin = snap.data() as AdminUserRecord;
        if (!admin.active) {
          return { ok: false, error: 'Administrator account not found.' };
        }

        if (updates.newPassword) {
          if (!updates.currentPassword) {
            return {
              ok: false,
              error: 'Current password is required to set a new password.',
            };
          }
          const validCurrent = verifyAdminPassword(
            updates.currentPassword,
            admin.passwordSalt,
            admin.passwordHash
          );
          if (!validCurrent) {
            return { ok: false, error: 'Current password is incorrect.' };
          }
          const nextHash = hashAdminPassword(updates.newPassword);
          admin.passwordSalt = nextHash.salt;
          admin.passwordHash = nextHash.hash;
        }

        if (updates.displayName !== undefined) {
          admin.displayName = updates.displayName.trim();
        }
        if (updates.photoUrl !== undefined) {
          admin.photoUrl = updates.photoUrl.trim();
        }
        admin.updatedAt = new Date().toISOString();
        tx.set(ref, admin);
        return { ok: true, admin };
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const admin = db.admin_users[uid];
    if (!admin || !admin.active) {
      return { ok: false, error: 'Administrator account not found.' };
    }

    if (updates.newPassword) {
      if (!updates.currentPassword) {
        return {
          ok: false,
          error: 'Current password is required to set a new password.',
        };
      }
      const validCurrent = verifyAdminPassword(
        updates.currentPassword,
        admin.passwordSalt,
        admin.passwordHash
      );
      if (!validCurrent) {
        return {
          ok: false,
          error: 'Current password is incorrect.',
        };
      }
      const nextHash = hashAdminPassword(updates.newPassword);
      admin.passwordSalt = nextHash.salt;
      admin.passwordHash = nextHash.hash;
    }

    if (updates.displayName !== undefined) {
      admin.displayName = updates.displayName.trim();
    }
    if (updates.photoUrl !== undefined) {
      admin.photoUrl = updates.photoUrl.trim();
    }
    admin.updatedAt = new Date().toISOString();

    return { ok: true, admin };
  });
}

// ==============================================================================
// 5. Admin Dashboard Overview Aggregation
// ==============================================================================

export async function getDashboardOverviewStats(): Promise<DashboardOverviewStats> {
  let households: HouseholdRecord[];
  let rsvps: Record<string, RsvpRecord>;
  let settings: WeddingSettings;

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const [hhSnap, rsvpsSnap, settingsSnap] = await Promise.all([
        firestore.collection('households').get(),
        firestore.collection('rsvps').get(),
        firestore.collection('wedding_settings').doc('global').get(),
      ]);
      households = hhSnap.docs.map((d) => d.data() as HouseholdRecord);
      rsvps = {};
      rsvpsSnap.forEach((d) => {
        rsvps[d.id] = d.data() as RsvpRecord;
      });
      settings = settingsSnap.data() as WeddingSettings;
    } else {
      const db = loadLocalDatabaseSync();
      households = Object.values(db.households);
      rsvps = db.rsvps;
      settings = db.wedding_settings.global;
    }
  } else {
    const db = loadLocalDatabaseSync();
    households = Object.values(db.households);
    rsvps = db.rsvps;
    settings = db.wedding_settings.global;
  }

  let activeHouseholds = 0;
  let respondedHouseholds = 0;
  let pendingHouseholds = 0;
  let totalInvitedMembers = 0;
  let attendingInvitedMembers = 0;
  let declinedInvitedMembers = 0;
  let pendingInvitedMembers = 0;
  let totalAdditionalGuests = 0;

  const mealCounts = new Map<string, number>();
  for (const meal of settings.mealOptions) {
    mealCounts.set(meal.id, 0);
  }

  for (const hh of households) {
    if (hh.status === 'revoked') continue;
    if (hh.status === 'active') activeHouseholds++;

    const memberCount = hh.members.length;
    totalInvitedMembers += memberCount;

    const rsvp = rsvps[`rsvp_${hh.id}`];
    if (!rsvp) {
      pendingHouseholds++;
      pendingInvitedMembers += memberCount;
    } else {
      respondedHouseholds++;
      for (const mr of rsvp.memberResponses) {
        if (mr.attending) {
          attendingInvitedMembers++;
          if (mr.mealOptionId) {
            mealCounts.set(
              mr.mealOptionId,
              (mealCounts.get(mr.mealOptionId) || 0) + 1
            );
          }
        } else {
          declinedInvitedMembers++;
        }
      }
      for (const ag of rsvp.additionalGuests) {
        totalAdditionalGuests++;
        if (ag.mealOptionId) {
          mealCounts.set(
            ag.mealOptionId,
            (mealCounts.get(ag.mealOptionId) || 0) + 1
          );
        }
      }
    }
  }

  const mealBreakdown = settings.mealOptions.map((opt) => ({
    optionId: opt.id,
    label: opt.label,
    count: mealCounts.get(opt.id) || 0,
  }));

  const recentRsvps = Object.values(rsvps)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8)
    .map((r) => ({
      householdId: r.householdId,
      householdDisplayName: r.householdDisplayName,
      overallStatus: r.overallStatus,
      totalAttendingCount: r.totalAttendingCount,
      personalMessage: r.personalMessage,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }));

  return {
    totalHouseholds: households.filter((h) => h.status !== 'revoked').length,
    activeHouseholds,
    respondedHouseholds,
    pendingHouseholds,
    totalInvitedMembers,
    attendingInvitedMembers,
    declinedInvitedMembers,
    pendingInvitedMembers,
    totalAdditionalGuests,
    totalExpectedAttendees: attendingInvitedMembers + totalAdditionalGuests,
    mealBreakdown,
    recentRsvps,
  };
}

// ==============================================================================
// 6. Admin CRUD Operations (Content, Settings, Events, Story, Gallery, Party, FAQs)
// ==============================================================================

export async function getAdminFullContentAndSettings(): Promise<{
  content: WeddingContent;
  settings: WeddingSettings;
}> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const [contentSnap, settingsSnap] = await Promise.all([
        firestore.collection('wedding_content').doc('main').get(),
        firestore.collection('wedding_settings').doc('global').get(),
      ]);
      return {
        content: contentSnap.data() as WeddingContent,
        settings: settingsSnap.data() as WeddingSettings,
      };
    }
  }

  const db = loadLocalDatabaseSync();
  return {
    content: db.wedding_content.main,
    settings: db.wedding_settings.global,
  };
}

export async function updateWeddingContent(
  updates: Partial<Omit<WeddingContent, 'id' | 'updatedAt'>>
): Promise<WeddingContent> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('wedding_content').doc('main');
        const snap = await tx.get(ref);
        const current = snap.data() as WeddingContent;
        const updated: WeddingContent = {
          ...current,
          ...updates,
          coupleNames: updates.coupleNames
            ? { ...current.coupleNames, ...updates.coupleNames }
            : current.coupleNames,
          id: 'main',
          updatedAt: new Date().toISOString(),
        };
        tx.set(ref, updated);
        return updated;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const current = db.wedding_content.main;
    const updated: WeddingContent = {
      ...current,
      ...updates,
      coupleNames: updates.coupleNames
        ? { ...current.coupleNames, ...updates.coupleNames }
        : current.coupleNames,
      id: 'main',
      updatedAt: new Date().toISOString(),
    };
    db.wedding_content.main = updated;
    return updated;
  });
}

export async function updateWeddingSettings(
  updates: Partial<Omit<WeddingSettings, 'id' | 'updatedAt'>>
): Promise<WeddingSettings> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('wedding_settings').doc('global');
        const snap = await tx.get(ref);
        const current = snap.data() as WeddingSettings;
        const updated: WeddingSettings = {
          ...current,
          ...updates,
          sectionVisibility: updates.sectionVisibility
            ? { ...current.sectionVisibility, ...updates.sectionVisibility }
            : current.sectionVisibility,
          id: 'global',
          updatedAt: new Date().toISOString(),
        };
        tx.set(ref, updated);
        return updated;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const current = db.wedding_settings.global;
    const updated: WeddingSettings = {
      ...current,
      ...updates,
      sectionVisibility: updates.sectionVisibility
        ? { ...current.sectionVisibility, ...updates.sectionVisibility }
        : current.sectionVisibility,
      id: 'global',
      updatedAt: new Date().toISOString(),
    };
    db.wedding_settings.global = updated;
    return updated;
  });
}

export async function listAdminEvents(): Promise<WeddingEvent[]> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('events').get();
      return snap.docs
        .map((d) => d.data() as WeddingEvent)
        .sort((a, b) => a.order - b.order);
    }
  }
  const db = loadLocalDatabaseSync();
  return Object.values(db.events).sort((a, b) => a.order - b.order);
}

export async function upsertAdminEvent(
  input: Omit<WeddingEvent, 'id' | 'updatedAt'> & { id?: string }
): Promise<WeddingEvent> {
  const id = input.id || `evt_${crypto.randomBytes(6).toString('hex')}`;
  const record: WeddingEvent = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      await firestore.collection('events').doc(id).set(record);
      return record;
    }
  }

  return runAtomicLocalTransaction((db) => {
    db.events[id] = record;
    return record;
  });
}

export async function deleteAdminEvent(id: string): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('events').doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        tx.delete(ref);
        return true;
      });
    }
  }
  return runAtomicLocalTransaction((db) => {
    if (!db.events[id]) return false;
    delete db.events[id];
    return true;
  });
}

export async function listAdminStoryEntries(): Promise<StoryEntry[]> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('story_entries').get();
      return snap.docs
        .map((d) => d.data() as StoryEntry)
        .sort((a, b) => a.order - b.order);
    }
  }
  const db = loadLocalDatabaseSync();
  return Object.values(db.story_entries).sort((a, b) => a.order - b.order);
}

export async function upsertAdminStoryEntry(
  input: Omit<StoryEntry, 'id' | 'updatedAt'> & { id?: string }
): Promise<StoryEntry> {
  const id = input.id || `sty_${crypto.randomBytes(6).toString('hex')}`;
  const record: StoryEntry = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      await firestore.collection('story_entries').doc(id).set(record);
      return record;
    }
  }

  return runAtomicLocalTransaction((db) => {
    db.story_entries[id] = record;
    return record;
  });
}

export async function deleteAdminStoryEntry(id: string): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('story_entries').doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        tx.delete(ref);
        return true;
      });
    }
  }
  return runAtomicLocalTransaction((db) => {
    if (!db.story_entries[id]) return false;
    delete db.story_entries[id];
    return true;
  });
}

export async function listAdminGalleryImages(): Promise<GalleryImage[]> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('gallery_images').get();
      return snap.docs
        .map((d) => d.data() as GalleryImage)
        .sort((a, b) => a.order - b.order);
    }
  }
  const db = loadLocalDatabaseSync();
  return Object.values(db.gallery_images).sort((a, b) => a.order - b.order);
}

export async function upsertAdminGalleryImage(
  input: Omit<GalleryImage, 'id' | 'uploadedAt'> & { id?: string }
): Promise<GalleryImage> {
  const id = input.id || `gal_${crypto.randomBytes(6).toString('hex')}`;

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('gallery_images').doc(id);
        const existingSnap = await tx.get(ref);
        const existing = existingSnap.exists
          ? (existingSnap.data() as GalleryImage)
          : null;
        const record: GalleryImage = {
          ...input,
          id,
          uploadedAt: existing ? existing.uploadedAt : new Date().toISOString(),
        };
        tx.set(ref, record);
        return record;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const existing = db.gallery_images[id];
    const record: GalleryImage = {
      ...input,
      id,
      uploadedAt: existing ? existing.uploadedAt : new Date().toISOString(),
    };
    db.gallery_images[id] = record;
    return record;
  });
}

export async function deleteAdminGalleryImage(id: string): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('gallery_images').doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        tx.delete(ref);
        return true;
      });
    }
  }
  return runAtomicLocalTransaction((db) => {
    if (!db.gallery_images[id]) return false;
    delete db.gallery_images[id];
    return true;
  });
}

export async function listAdminWeddingParty(): Promise<WeddingPartyMember[]> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('wedding_party').get();
      return snap.docs
        .map((d) => d.data() as WeddingPartyMember)
        .sort((a, b) => a.order - b.order);
    }
  }
  const db = loadLocalDatabaseSync();
  return Object.values(db.wedding_party).sort((a, b) => a.order - b.order);
}

export async function upsertAdminWeddingPartyMember(
  input: Omit<WeddingPartyMember, 'id' | 'updatedAt'> & { id?: string }
): Promise<WeddingPartyMember> {
  const id = input.id || `pty_${crypto.randomBytes(6).toString('hex')}`;
  const record: WeddingPartyMember = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      await firestore.collection('wedding_party').doc(id).set(record);
      return record;
    }
  }

  return runAtomicLocalTransaction((db) => {
    db.wedding_party[id] = record;
    return record;
  });
}

export async function deleteAdminWeddingPartyMember(
  id: string
): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('wedding_party').doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        tx.delete(ref);
        return true;
      });
    }
  }
  return runAtomicLocalTransaction((db) => {
    if (!db.wedding_party[id]) return false;
    delete db.wedding_party[id];
    return true;
  });
}

export async function listAdminFaqs(): Promise<FaqEntry[]> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const snap = await firestore.collection('faqs').get();
      return snap.docs
        .map((d) => d.data() as FaqEntry)
        .sort((a, b) => a.order - b.order);
    }
  }
  const db = loadLocalDatabaseSync();
  return Object.values(db.faqs).sort((a, b) => a.order - b.order);
}

export async function upsertAdminFaq(
  input: Omit<FaqEntry, 'id' | 'updatedAt'> & { id?: string }
): Promise<FaqEntry> {
  const id = input.id || `faq_${crypto.randomBytes(6).toString('hex')}`;
  const record: FaqEntry = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      await firestore.collection('faqs').doc(id).set(record);
      return record;
    }
  }

  return runAtomicLocalTransaction((db) => {
    db.faqs[id] = record;
    return record;
  });
}

export async function deleteAdminFaq(id: string): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection('faqs').doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        tx.delete(ref);
        return true;
      });
    }
  }
  return runAtomicLocalTransaction((db) => {
    if (!db.faqs[id]) return false;
    delete db.faqs[id];
    return true;
  });
}

// ==============================================================================
// 7. Household & Invitation Code Management (Admin)
// ==============================================================================

export interface AdminHouseholdWithRsvpView {
  id: string;
  displayName: string;
  category: 'individual' | 'couple' | 'family' | 'group';
  members: Array<{ id: string; fullName: string; title?: string }>;
  maxInvitedMembers: number;
  additionalGuestAllowance: number;
  status: 'active' | 'inactive' | 'revoked';
  codeHint: string;
  codeKeyVersion: number;
  codeLastGeneratedAt: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  rsvp: RsvpRecord | null;
  devSampleCode?: string;
}

export async function listAdminHouseholdsWithRsvps(): Promise<
  AdminHouseholdWithRsvpView[]
> {
  let households: HouseholdRecord[];
  let rsvps: Record<string, RsvpRecord>;

  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      const [hhSnap, rsvpsSnap] = await Promise.all([
        firestore.collection('households').get(),
        firestore.collection('rsvps').get(),
      ]);
      households = hhSnap.docs.map((d) => d.data() as HouseholdRecord);
      rsvps = {};
      rsvpsSnap.forEach((d) => {
        rsvps[d.id] = d.data() as RsvpRecord;
      });
    } else {
      const db = loadLocalDatabaseSync();
      households = Object.values(db.households);
      rsvps = db.rsvps;
    }
  } else {
    const db = loadLocalDatabaseSync();
    households = Object.values(db.households);
    rsvps = db.rsvps;
  }

  return households
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((hh) => {
      const rsvp = rsvps[`rsvp_${hh.id}`] || null;
      const sample = SAMPLE_DEVELOPMENT_INVITATION_CODES[hh.id];
      let devSampleCode: string | undefined;
      if (sample && process.env.NODE_ENV !== 'production') {
        const check = verifyInvitationCodeAgainstDigest(
          sample.code,
          hh.codeDigest
        );
        if (check.matched) {
          devSampleCode = sample.code;
        }
      }
      return {
        id: hh.id,
        displayName: hh.displayName,
        category: hh.category,
        members: hh.members,
        maxInvitedMembers: hh.maxInvitedMembers,
        additionalGuestAllowance: hh.additionalGuestAllowance,
        status: hh.status,
        codeHint: hh.codeHint,
        codeKeyVersion: hh.codeKeyVersion,
        codeLastGeneratedAt: hh.codeLastGeneratedAt,
        adminNotes: hh.adminNotes,
        createdAt: hh.createdAt,
        updatedAt: hh.updatedAt,
        rsvp,
        devSampleCode,
      };
    });
}

export async function createOrUpdateHousehold(input: {
  id?: string;
  displayName: string;
  category: 'individual' | 'couple' | 'family' | 'group';
  members: Array<{ id?: string; fullName: string; title?: string }>;
  additionalGuestAllowance: number;
  status: 'active' | 'inactive' | 'revoked';
  adminNotes?: string;
  customPlaintextCode?: string;
}): Promise<{
  household: AdminHouseholdWithRsvpView;
  generatedPlaintextCode?: string;
}> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const nowIso = new Date().toISOString();
        const id = input.id || `hh_${crypto.randomBytes(6).toString('hex')}`;
        const hhRef = firestore.collection('households').doc(id);
        const rsvpRef = firestore.collection('rsvps').doc(`rsvp_${id}`);

        const [existingSnap, rsvpSnap] = await Promise.all([
          tx.get(hhRef),
          tx.get(rsvpRef),
        ]);

        const existing = existingSnap.exists
          ? (existingSnap.data() as HouseholdRecord)
          : undefined;

        const normalizedMembers = input.members.map((m, idx) => ({
          id:
            m.id ||
            `mem_${id}_${idx + 1}_${crypto.randomBytes(3).toString('hex')}`,
          fullName: m.fullName.trim(),
          ...(m.title?.trim() ? { title: m.title.trim() } : {}),
        }));

        let generatedPlaintextCode: string | undefined;
        let codeDigest = existing?.codeDigest || '';
        let codeKeyVersion = existing?.codeKeyVersion || 1;
        let codeHint = existing?.codeHint || '';
        let codeLastGeneratedAt = existing?.codeLastGeneratedAt || nowIso;

        if (!existing || input.customPlaintextCode) {
          const prefix = input.displayName
            .replace(/^(The|Mr\.|Mrs\.|Dr\.|Lord|Lady)\s+/i, '')
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase()
            .slice(0, 6);
          generatedPlaintextCode =
            input.customPlaintextCode?.trim().toUpperCase() ||
            generateSecureInvitationCode(prefix || 'INV');

          const computed = computeInvitationCodeDigest(generatedPlaintextCode);
          const [digestHouseholdSnap, digestRevokedSnap] = await Promise.all([
            tx.get(
              firestore
                .collection('households')
                .where('codeDigest', '==', computed.digest)
                .limit(2)
            ),
            tx.get(
              firestore
                .collection('revoked_invitations')
                .where('codeDigest', '==', computed.digest)
                .limit(1)
            ),
          ]);
          const collision =
            digestHouseholdSnap.docs.some((d) => d.id !== id) ||
            !digestRevokedSnap.empty;
          if (collision) {
            throw new Error(
              'Generated or custom invitation code collides with an existing or previously revoked household code. Please try again.'
            );
          }
          codeDigest = computed.digest;
          codeKeyVersion = computed.keyVersion;
          codeHint = computed.codeHint;
          codeLastGeneratedAt = nowIso;
        }

        const record: HouseholdRecord = {
          id,
          displayName: input.displayName.trim(),
          category: input.category,
          members: normalizedMembers,
          maxInvitedMembers: normalizedMembers.length,
          additionalGuestAllowance: input.additionalGuestAllowance,
          status: input.status,
          codeDigest,
          codeKeyVersion,
          codeHint,
          codeLastGeneratedAt,
          adminNotes: input.adminNotes?.trim() || '',
          createdAt: existing ? existing.createdAt : nowIso,
          updatedAt: nowIso,
        };

        tx.set(hhRef, record);

        let updatedRsvp = rsvpSnap.exists
          ? (rsvpSnap.data() as RsvpRecord)
          : null;
        if (updatedRsvp) {
          updatedRsvp.householdDisplayName = record.displayName;
          const updatedMemberResponses: MemberRsvpResponse[] = record.members.map(
            (m) => {
              const prev = updatedRsvp!.memberResponses.find(
                (r) => r.memberId === m.id
              );
              return prev
                ? { ...prev, memberName: m.fullName }
                : {
                    memberId: m.id,
                    memberName: m.fullName,
                    attending: false,
                    mealOptionId: null,
                    dietaryNotes: '',
                  };
            }
          );
          updatedRsvp.memberResponses = updatedMemberResponses;
          updatedRsvp.attendingMembersCount = updatedMemberResponses.filter(
            (m) => m.attending
          ).length;
          if (updatedRsvp.attendingMembersCount === 0) {
            updatedRsvp.overallStatus = 'declined';
            updatedRsvp.additionalGuests = [];
            updatedRsvp.additionalGuestsCount = 0;
          }
          updatedRsvp.totalAttendingCount =
            updatedRsvp.attendingMembersCount +
            updatedRsvp.additionalGuestsCount;
          tx.set(rsvpRef, updatedRsvp);
        }

        return {
          household: {
            ...record,
            rsvp: updatedRsvp,
          },
          generatedPlaintextCode,
        };
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const nowIso = new Date().toISOString();
    const isExisting = Boolean(input.id && db.households[input.id]);
    const id = input.id || `hh_${crypto.randomBytes(6).toString('hex')}`;
    const existing = db.households[id];

    const normalizedMembers = input.members.map((m, idx) => ({
      id:
        m.id ||
        `mem_${id}_${idx + 1}_${crypto.randomBytes(3).toString('hex')}`,
      fullName: m.fullName.trim(),
      title: m.title?.trim(),
    }));

    let generatedPlaintextCode: string | undefined;
    let codeDigest = existing?.codeDigest || '';
    let codeKeyVersion = existing?.codeKeyVersion || 1;
    let codeHint = existing?.codeHint || '';
    let codeLastGeneratedAt = existing?.codeLastGeneratedAt || nowIso;

    if (!isExisting || input.customPlaintextCode) {
      const prefix = input.displayName
        .replace(/^(The|Mr\.|Mrs\.|Dr\.|Lord|Lady)\s+/i, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6);
      generatedPlaintextCode =
        input.customPlaintextCode?.trim().toUpperCase() ||
        generateSecureInvitationCode(prefix || 'INV');

      const computed = computeInvitationCodeDigest(generatedPlaintextCode);
      const collision =
        Object.values(db.households).some(
          (other) => other.id !== id && other.codeDigest === computed.digest
        ) ||
        Object.values(db.revoked_invitations).some(
          (rev) => rev.codeDigest === computed.digest
        );
      if (collision) {
        throw new Error(
          'Generated or custom invitation code collides with an existing or previously revoked household code. Please try again.'
        );
      }
      codeDigest = computed.digest;
      codeKeyVersion = computed.keyVersion;
      codeHint = computed.codeHint;
      codeLastGeneratedAt = nowIso;
    }

    const record: HouseholdRecord = {
      id,
      displayName: input.displayName.trim(),
      category: input.category,
      members: normalizedMembers,
      maxInvitedMembers: normalizedMembers.length,
      additionalGuestAllowance: input.additionalGuestAllowance,
      status: input.status,
      codeDigest,
      codeKeyVersion,
      codeHint,
      codeLastGeneratedAt,
      adminNotes: input.adminNotes?.trim() || '',
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
    };

    db.households[id] = record;

    const existingRsvp = db.rsvps[`rsvp_${id}`];
    if (existingRsvp) {
      existingRsvp.householdDisplayName = record.displayName;
      const updatedMemberResponses: MemberRsvpResponse[] = record.members.map(
        (m) => {
          const prev = existingRsvp.memberResponses.find(
            (r) => r.memberId === m.id
          );
          return prev
            ? { ...prev, memberName: m.fullName }
            : {
                memberId: m.id,
                memberName: m.fullName,
                attending: false,
                mealOptionId: null,
                dietaryNotes: '',
              };
        }
      );
      existingRsvp.memberResponses = updatedMemberResponses;
      existingRsvp.attendingMembersCount = updatedMemberResponses.filter(
        (m) => m.attending
      ).length;
      if (existingRsvp.attendingMembersCount === 0) {
        existingRsvp.overallStatus = 'declined';
        existingRsvp.additionalGuests = [];
        existingRsvp.additionalGuestsCount = 0;
      }
      existingRsvp.totalAttendingCount =
        existingRsvp.attendingMembersCount + existingRsvp.additionalGuestsCount;
    }

    return {
      household: {
        id: record.id,
        displayName: record.displayName,
        category: record.category,
        members: record.members,
        maxInvitedMembers: record.maxInvitedMembers,
        additionalGuestAllowance: record.additionalGuestAllowance,
        status: record.status,
        codeHint: record.codeHint,
        codeKeyVersion: record.codeKeyVersion,
        codeLastGeneratedAt: record.codeLastGeneratedAt,
        adminNotes: record.adminNotes,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        rsvp: db.rsvps[`rsvp_${record.id}`] || null,
      },
      generatedPlaintextCode,
    };
  });
}

export async function deleteAdminHousehold(
  householdId: string
): Promise<boolean> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const hhRef = firestore.collection('households').doc(householdId);
        const snap = await tx.get(hhRef);
        if (!snap.exists) return false;
        const existing = snap.data() as HouseholdRecord;
        const revId = `rev_${crypto.randomBytes(6).toString('hex')}`;
        tx.set(firestore.collection('revoked_invitations').doc(revId), {
          id: revId,
          householdId,
          codeDigest: existing.codeDigest,
          revokedAt: new Date().toISOString(),
          revokedBy: 'admin',
          reason: 'Household deleted by administrator',
        });
        tx.delete(hhRef);
        tx.delete(firestore.collection('rsvps').doc(`rsvp_${householdId}`));
        return true;
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const existing = db.households[householdId];
    if (!existing) return false;
    const revId = `rev_${crypto.randomBytes(6).toString('hex')}`;
    db.revoked_invitations[revId] = {
      id: revId,
      householdId,
      codeDigest: existing.codeDigest,
      revokedAt: new Date().toISOString(),
      revokedBy: 'admin',
      reason: 'Household deleted by administrator',
    };
    delete db.households[householdId];
    delete db.rsvps[`rsvp_${householdId}`];
    return true;
  });
}

export async function manageHouseholdInvitationCode(input: {
  householdId: string;
  action: 'regenerate' | 'revoke' | 'activate';
  adminUid: string;
  reason?: string;
  customPlaintextCode?: string;
}): Promise<{
  ok: boolean;
  household?: HouseholdRecord;
  generatedPlaintextCode?: string;
  error?: string;
}> {
  if (isFirebaseDriverConfigured()) {
    const firestore = getFirestoreDb();
    if (firestore) {
      await ensureFirestoreSeededOnce();
      return firestore.runTransaction(async (tx) => {
        const hhRef = firestore.collection('households').doc(input.householdId);
        const hhSnap = await tx.get(hhRef);

        if (!hhSnap.exists) {
          return { ok: false, error: 'Household not found.' };
        }
        const hh = hhSnap.data() as HouseholdRecord;
        const nowIso = new Date().toISOString();

        if (input.action === 'revoke') {
          const revId = `rev_${crypto.randomBytes(6).toString('hex')}`;
          tx.set(firestore.collection('revoked_invitations').doc(revId), {
            id: revId,
            householdId: hh.id,
            codeDigest: hh.codeDigest,
            revokedAt: nowIso,
            revokedBy: input.adminUid,
            reason: input.reason || 'Revoked by administrator',
          });
          hh.status = 'revoked';
          hh.updatedAt = nowIso;
          tx.set(hhRef, hh);
          return { ok: true, household: hh };
        }

        if (input.action === 'activate') {
          const revQuery = await tx.get(
            firestore
              .collection('revoked_invitations')
              .where('householdId', '==', hh.id)
              .where('codeDigest', '==', hh.codeDigest)
          );
          revQuery.forEach((doc) => tx.delete(doc.ref));
          hh.status = 'active';
          hh.updatedAt = nowIso;
          tx.set(hhRef, hh);
          return { ok: true, household: hh };
        }

        const prefix = hh.displayName
          .replace(/^(The|Mr\.|Mrs\.|Dr\.|Lord|Lady)\s+/i, '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase()
          .slice(0, 6);

        const newPlaintextCode =
          input.customPlaintextCode?.trim().toUpperCase() ||
          generateSecureInvitationCode(prefix || 'INV');

        const computed = computeInvitationCodeDigest(newPlaintextCode);
        const [digestHouseholdSnap, digestRevokedSnap] = await Promise.all([
          tx.get(
            firestore
              .collection('households')
              .where('codeDigest', '==', computed.digest)
              .limit(2)
          ),
          tx.get(
            firestore
              .collection('revoked_invitations')
              .where('codeDigest', '==', computed.digest)
              .limit(1)
          ),
        ]);
        const collision =
          digestHouseholdSnap.docs.some((d) => d.id !== hh.id) ||
          !digestRevokedSnap.empty;
        if (collision) {
          return {
            ok: false,
            error:
              'Generated or custom invitation code collides with an existing or previously revoked household code. Please choose a different code.',
          };
        }

        const oldRevId = `rev_${crypto.randomBytes(6).toString('hex')}`;
        tx.set(firestore.collection('revoked_invitations').doc(oldRevId), {
          id: oldRevId,
          householdId: hh.id,
          codeDigest: hh.codeDigest,
          revokedAt: nowIso,
          revokedBy: input.adminUid,
          reason: input.reason || 'Regenerated invitation code',
        });

        hh.codeDigest = computed.digest;
        hh.codeKeyVersion = computed.keyVersion;
        hh.codeHint = computed.codeHint;
        hh.codeLastGeneratedAt = nowIso;
        hh.status = 'active';
        hh.updatedAt = nowIso;
        tx.set(hhRef, hh);

        return {
          ok: true,
          household: hh,
          generatedPlaintextCode: newPlaintextCode,
        };
      });
    }
  }

  return runAtomicLocalTransaction((db) => {
    const hh = db.households[input.householdId];
    if (!hh) {
      return { ok: false, error: 'Household not found.' };
    }

    const nowIso = new Date().toISOString();

    if (input.action === 'revoke') {
      const revId = `rev_${crypto.randomBytes(6).toString('hex')}`;
      db.revoked_invitations[revId] = {
        id: revId,
        householdId: hh.id,
        codeDigest: hh.codeDigest,
        revokedAt: nowIso,
        revokedBy: input.adminUid,
        reason: input.reason || 'Revoked by administrator',
      };
      hh.status = 'revoked';
      hh.updatedAt = nowIso;
      return { ok: true, household: hh };
    }

    if (input.action === 'activate') {
      for (const [revKey, rev] of Object.entries(db.revoked_invitations)) {
        if (rev.householdId === hh.id && rev.codeDigest === hh.codeDigest) {
          delete db.revoked_invitations[revKey];
        }
      }
      hh.status = 'active';
      hh.updatedAt = nowIso;
      return { ok: true, household: hh };
    }

    const prefix = hh.displayName
      .replace(/^(The|Mr\.|Mrs\.|Dr\.|Lord|Lady)\s+/i, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);

    const newPlaintextCode =
      input.customPlaintextCode?.trim().toUpperCase() ||
      generateSecureInvitationCode(prefix || 'INV');

    const computed = computeInvitationCodeDigest(newPlaintextCode);
    const collision =
      Object.values(db.households).some(
        (other) => other.id !== hh.id && other.codeDigest === computed.digest
      ) ||
      Object.values(db.revoked_invitations).some(
        (rev) => rev.codeDigest === computed.digest
      );
    if (collision) {
      return {
        ok: false,
        error:
          'Generated or custom invitation code collides with an existing or previously revoked household code. Please choose a different code.',
      };
    }

    const oldRevId = `rev_${crypto.randomBytes(6).toString('hex')}`;
    db.revoked_invitations[oldRevId] = {
      id: oldRevId,
      householdId: hh.id,
      codeDigest: hh.codeDigest,
      revokedAt: nowIso,
      revokedBy: input.adminUid,
      reason: input.reason || 'Regenerated invitation code',
    };

    hh.codeDigest = computed.digest;
    hh.codeKeyVersion = computed.keyVersion;
    hh.codeHint = computed.codeHint;
    hh.codeLastGeneratedAt = nowIso;
    hh.status = 'active';
    hh.updatedAt = nowIso;

    return {
      ok: true,
      household: hh,
      generatedPlaintextCode: newPlaintextCode,
    };
  });
}
