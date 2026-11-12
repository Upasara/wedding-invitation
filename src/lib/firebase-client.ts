import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  Auth,
} from 'firebase/auth';

// ==============================================================================
// Client-Side Firebase Authentication Integration (Emulator & Cloud Ready)
// Remains inactive in local offline mode unless NEXT_PUBLIC_FIREBASE_API_KEY
// or NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST is configured.
// ==============================================================================

let authInstance: Auth | null = null;
let emulatorConnected = false;

export function isClientFirebaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
  );
}

export function getClientFirebaseAuth(): Auth | null {
  if (!isClientFirebaseAuthConfigured()) {
    return null;
  }

  if (authInstance) {
    return authInstance;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      'demo-luxury-wedding.firebaseapp.com',
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-luxury-wedding',
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      'demo-luxury-wedding.appspot.com',
  };

  const app: FirebaseApp =
    getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);

  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost && !emulatorConnected) {
    const url = emulatorHost.startsWith('http')
      ? emulatorHost
      : `http://${emulatorHost}`;
    connectAuthEmulator(authInstance, url, { disableWarnings: true });
    emulatorConnected = true;
  }

  return authInstance;
}

export async function signInAdminWithFirebaseClient(
  email: string,
  password: string
): Promise<string | null> {
  const auth = getClientFirebaseAuth();
  if (!auth) return null;

  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken(true);
}

export async function sendAdminPasswordResetClient(
  email: string
): Promise<boolean> {
  const auth = getClientFirebaseAuth();
  if (!auth) return false;
  await sendPasswordResetEmail(auth, email);
  return true;
}

