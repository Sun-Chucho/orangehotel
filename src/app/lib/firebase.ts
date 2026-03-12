import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInAnonymously } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAPndMWlbNFyEMU6Rl9SS9d-gLCNzGyUYs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "the-orange-hotel-database.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://the-orange-hotel-database-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "the-orange-hotel-database",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "the-orange-hotel-database.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "380844013172",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:380844013172:web:889eccb82e19c88e8b8321",
};

const measurementId =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-59LNQFWG4V";

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDatabase = getDatabase(firebaseApp);

let authReadyPromise: Promise<void> | null = null;

export function ensureFirebaseAuthReady() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch {
        // Fall back to the default auth persistence if the environment blocks local persistence.
      }

      if (firebaseAuth.currentUser) {
        return;
      }

      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(
          firebaseAuth,
          (user) => {
            if (!user) return;
            unsubscribe();
            resolve();
          },
          () => undefined,
        );

        signInAnonymously(firebaseAuth).catch((error) => {
          console.warn("Firebase anonymous auth unavailable, continuing without client auth.", error);
          unsubscribe();
          resolve();
        });
      });
    })().catch((error) => {
      authReadyPromise = null;
      throw error;
    });
  }

  return authReadyPromise;
}

// Enable offline persistence: an active onValue listener on the storage root
// ensures the SDK eagerly caches all data locally. Writes made while offline
// are automatically queued by the Firebase SDK and replayed when the
// connection is restored.
if (typeof window !== "undefined") {
  void ensureFirebaseAuthReady()
    .then(() => {
      onValue(ref(firebaseDatabase, "orangeHotel/storage"), () => {}, { onlyOnce: false });
    })
    .catch((error) => {
      console.error("Firebase authentication bootstrap failed", error);
    });
}

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (typeof window === "undefined" || !measurementId) {
    return Promise.resolve<Analytics | null>(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }

  return analyticsPromise;
}

export { firebaseConfig, measurementId };
