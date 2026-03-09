import { get, onValue, ref, remove, set } from "firebase/database";
import { firebaseDatabase } from "@/app/lib/firebase";

const FIREBASE_STORAGE_ROOT = "orangeHotel/storage";

export const FIREBASE_SYNC_KEYS = [
  "orange-hotel-cashier-state",
  "orange-hotel-kitchen-state",
  "orange-hotel-barista-state",
  "orange-hotel-company-stock",
  "orange-hotel-inventory-items",
  "orange-hotel-main-store-items",
  "orange-hotel-stock-logic",
  "orange-hotel-store-movements",
  "orange-hotel-store-usage",
  "orange-hotel-cancelled-tickets",
  "orange-hotel-rooms-state",
  "orange-hotel-fnb-beverage-cost",
  "orange-hotel-fnb-recipe-cost",
  "orange-hotel-fnb-stock-sales",
  "orange-hotel-settings",
  "orange-hotel-hardware-settings",
  "orange-hotel-website-bookings",
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

function readParsedLocalValue<T>(key: string) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getLocalFallbackForSync(key: string) {
  if (typeof window === "undefined") return null;

  const directValue = readParsedLocalValue(key);
  if (directValue !== null) {
    return directValue;
  }

  if (key === "orange-hotel-cashier-state") {
    const transactions = readParsedLocalValue<unknown[]>("orange-hotel-cashier-transactions") ?? [];
    const receiptSeq = Number(localStorage.getItem("orange-hotel-cashier-seq"));
    if (transactions.length === 0 && !Number.isFinite(receiptSeq)) return null;
    return {
      transactions,
      receiptSeq: Number.isFinite(receiptSeq) && receiptSeq > 0 ? receiptSeq : 84920,
    };
  }

  if (key === "orange-hotel-kitchen-state") {
    const tickets = readParsedLocalValue<unknown[]>("orange-hotel-kitchen-tickets") ?? [];
    const payments = readParsedLocalValue<unknown[]>("orange-hotel-kitchen-payments") ?? [];
    const menuItems = readParsedLocalValue<unknown[]>("orange-hotel-kitchen-menu") ?? [];
    const ticketSeq = Number(localStorage.getItem("orange-hotel-kitchen-seq"));
    if (tickets.length === 0 && payments.length === 0 && menuItems.length === 0 && !Number.isFinite(ticketSeq)) {
      return null;
    }
    return {
      tickets,
      ticketSeq: Number.isFinite(ticketSeq) && ticketSeq > 0 ? ticketSeq : 300,
      payments,
      menuItems,
    };
  }

  if (key === "orange-hotel-barista-state") {
    const tickets = readParsedLocalValue<unknown[]>("orange-hotel-barista-orders") ?? [];
    const payments = readParsedLocalValue<unknown[]>("orange-hotel-barista-payments") ?? [];
    const menuItems = readParsedLocalValue<unknown[]>("orange-hotel-barista-menu") ?? [];
    const ticketSeq = Number(localStorage.getItem("orange-hotel-barista-seq"));
    if (tickets.length === 0 && payments.length === 0 && menuItems.length === 0 && !Number.isFinite(ticketSeq)) {
      return null;
    }
    return {
      tickets,
      ticketSeq: Number.isFinite(ticketSeq) && ticketSeq > 0 ? ticketSeq : 490,
      payments,
      menuItems,
    };
  }

  return null;
}

function readSnapshotValue<T>(key: string, rawValue: T | null, onChange: (value: T | null) => void) {
  if (typeof window === "undefined") return;
  if (rawValue === null) {
    localStorage.removeItem(key);
    onChange(null);
    return;
  }

  localStorage.setItem(key, JSON.stringify(rawValue));
  onChange(rawValue);
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
    if (snapshot.exists()) {
      localStorage.setItem(key, JSON.stringify(snapshot.val()));
      return;
    }

    const fallbackValue = getLocalFallbackForSync(key);
    if (fallbackValue === null) return;

    localStorage.setItem(key, JSON.stringify(fallbackValue));
    await set(ref(firebaseDatabase, toStoragePath(key)), fallbackValue);
  } catch (error) {
    console.error(`Firebase hydrate failed for ${key}`, error);
  }
}

export async function hydrateDefaultAppStateFromFirebase() {
  await Promise.all(FIREBASE_SYNC_KEYS.map((key) => hydrateStorageKeyFromFirebase(key)));
}

export function subscribeToSyncedStorageKey<T>(key: string, onChange: (value: T | null) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const emitLocalValue = () => {
    const raw = localStorage.getItem(key);
    if (!raw) {
      onChange(null);
      return;
    }

    try {
      onChange(JSON.parse(raw) as T);
    } catch {
      onChange(null);
    }
  };

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string }>).detail;
    if (detail?.key === key) emitLocalValue();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === key) emitLocalValue();
  };

  window.addEventListener("orange-hotel-storage-updated", handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  const unsubscribe = onValue(
    ref(firebaseDatabase, toStoragePath(key)),
    (snapshot) => {
      if (!snapshot.exists()) {
        readSnapshotValue<T>(key, null, onChange);
        return;
      }
      readSnapshotValue<T>(key, snapshot.val() as T, onChange);
    },
    (error) => {
      console.error(`Firebase subscription failed for ${key}`, error);
    },
  );

  return () => {
    window.removeEventListener("orange-hotel-storage-updated", handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
    unsubscribe();
  };
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
