const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAPndMWlbNFyEMU6Rl9SS9d-gLCNzGyUYs";
const FIREBASE_DATABASE_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
  "https://the-orange-hotel-database-default-rtdb.firebaseio.com";
const FIREBASE_STORAGE_ROOT = "orangeHotel/storage";

type FirebaseAnonSession = {
  idToken: string;
  expiresAt: number;
};

let anonSessionPromise: Promise<FirebaseAnonSession> | null = null;

function toStoragePath(key: string) {
  return `${FIREBASE_STORAGE_ROOT}/${key.replace(/[.#$[\]/]/g, "-")}`;
}

async function getAnonymousSession() {
  if (!anonSessionPromise) {
    anonSessionPromise = fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
        cache: "no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Anonymous Firebase auth failed (${response.status})`);
        }

        const payload = (await response.json()) as { idToken?: string; expiresIn?: string };
        if (!payload.idToken) {
          throw new Error("Anonymous Firebase auth did not return an ID token.");
        }

        const expiresInMs = Math.max(60, Number(payload.expiresIn ?? "3600")) * 1000;
        return {
          idToken: payload.idToken,
          expiresAt: Date.now() + expiresInMs - 60000,
        };
      })
      .catch((error) => {
        anonSessionPromise = null;
        throw error;
      });
  }

  const session = await anonSessionPromise;
  if (Date.now() >= session.expiresAt) {
    anonSessionPromise = null;
    return getAnonymousSession();
  }

  return session;
}

async function requestDatabase<T>(key: string, init?: RequestInit) {
  const { idToken } = await getAnonymousSession();
  const path = `${FIREBASE_DATABASE_URL}/${toStoragePath(key)}.json?auth=${encodeURIComponent(idToken)}`;
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Realtime Database request failed (${response.status})`);
  }

  return response;
}

export async function readServerSyncedStorageValue<T>(key: string) {
  const response = await requestDatabase<T>(key, { method: "GET" });
  return (await response.json()) as T | null;
}

export async function writeServerSyncedStorageValue<T>(key: string, value: T) {
  await requestDatabase(key, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

export async function appendServerSyncedStorageItem<T>(key: string, item: T) {
  const current = await readServerSyncedStorageValue<T[]>(key);
  const next = Array.isArray(current) ? [item, ...current] : [item];
  await writeServerSyncedStorageValue(key, next);
}
