import admin from 'firebase-admin';

// ==============================================================================
// Firebase Admin SDK Initialization (Emulator & Cloud Aware)
// Never connects to live cloud resources unless explicitly configured.
// ==============================================================================

export function isFirebaseDriverConfigured(): boolean {
  const driverMode = (process.env.WEDDING_STORAGE_DRIVER || 'auto').toLowerCase();
  if (driverMode === 'local') {
    return false;
  }
  const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const hasCloudCredentials = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
  if (driverMode === 'firestore') {
    if (!hasEmulator && !hasCloudCredentials) {
      throw new Error(
        'CRITICAL: WEDDING_STORAGE_DRIVER is set to "firestore", but neither FIRESTORE_EMULATOR_HOST nor Firebase Admin credentials are configured. Refusing to silently fall back to Local JSON mode.'
      );
    }
    return true;
  }
  return hasEmulator || hasCloudCredentials;
}

export function getFirebaseAdminApp(): admin.app.App | null {
  if (!isFirebaseDriverConfigured()) {
    return null;
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'demo-luxury-wedding';

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return admin.initializeApp({
      projectId,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  });
}

let firestoreSettingsApplied = false;

export function getFirestoreDb(): admin.firestore.Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  const db = admin.firestore(app);
  if (!firestoreSettingsApplied) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Settings already locked on this Firestore instance
    }
    firestoreSettingsApplied = true;
  }
  return db;
}

export function getFirebaseAdminAuth(): admin.auth.Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return admin.auth(app);
}

export function getFirebaseAdminStorage(): admin.storage.Storage | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return admin.storage(app);
}
