import { get, ref, remove, set } from "firebase/database";
import { firebaseDatabase } from "@/app/lib/firebase";

const FIREBASE_STORAGE_ROOT = "orangeHotel/storage";

export const FIREBASE_SYNC_KEYS = [
  "orange-hotel-cashier-state",
  "orange-hotel-kitchen-state",
  "orange-hotel-barista-state",
  "orange-hotel-company-stock",
  "orange-hotel-inventory-items",
  "orange-hotel-main-store-items",
  "orange-hotel-store-movements",
  "orange-hotel-store-usage",
  "orange-hotel-cancelled-tickets",
  "orange-hotel-fnb-beverage-cost",
  "orange-hotel-fnb-recipe-cost",
  "orange-hotel-fnb-stock-sales",
  "orange-hotel-settings",
  "orange-hotel-hardware-settings",
] as const;

export const LEGACY_DEMO_KEYS = [
  "orange-hotel-demo-seed-version",
  "orange-hotel-cashier-transactions",
  "orange-hotel-cashier-seq",
  "orange-hotel-kitchen-tickets",
  "orange-hotel-kitchen-seq",
  "orange-hotel-kitchen-payments",
  "orange-hotel-kitchen-menu",
  "orange-hotel-barista-orders",
  "orange-hotel-barista-seq",
  "orange-hotel-barista-payments",
  "orange-hotel-barista-menu",
  "orange-hotel-kitchen-cancelled-tickets",
] as const;

function toStoragePath(key: string) {
  return `${FIREBASE_STORAGE_ROOT}/${key.replace(/[.#$[\]/]/g, "-")}`;
}

export function syncStorageValueToFirebase<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  void set(ref(firebaseDatabase, toStoragePath(key)), value).catch((error) => {
    console.error(`Firebase sync failed for ${key}`, error);
  });
}

export async function hydrateStorageKeyFromFirebase(key: string) {
  if (typeof window === "undefined") return;

  try {
    const snapshot = await get(ref(firebaseDatabase, toStoragePath(key)));
    if (!snapshot.exists()) return;
    localStorage.setItem(key, JSON.stringify(snapshot.val()));
  } catch (error) {
    console.error(`Firebase hydrate failed for ${key}`, error);
  }
}

export async function hydrateDefaultAppStateFromFirebase() {
  await Promise.all(FIREBASE_SYNC_KEYS.map((key) => hydrateStorageKeyFromFirebase(key)));
}

export function removeStorageValueFromFirebase(key: string) {
  if (typeof window === "undefined") return;
  void remove(ref(firebaseDatabase, toStoragePath(key))).catch((error) => {
    console.error(`Firebase remove failed for ${key}`, error);
  });
}

export function clearLocalBusinessState() {
  if (typeof window === "undefined") return;

  [...FIREBASE_SYNC_KEYS, ...LEGACY_DEMO_KEYS].forEach((key) => {
    localStorage.removeItem(key);
  });
}

export async function clearFirebaseBusinessState() {
  await Promise.all([...FIREBASE_SYNC_KEYS, ...LEGACY_DEMO_KEYS].map((key) => remove(ref(firebaseDatabase, toStoragePath(key))).catch(() => null)));
}

export async function runOneTimeBusinessDataReset(resetVersion: string) {
  if (typeof window === "undefined") return;

  const markerKey = "orange-hotel-business-reset-version";
  if (localStorage.getItem(markerKey) === resetVersion) return;

  clearLocalBusinessState();
  await clearFirebaseBusinessState();
  localStorage.setItem(markerKey, resetVersion);
}
