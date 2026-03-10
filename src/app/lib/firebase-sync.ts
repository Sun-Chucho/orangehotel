import { get, onValue, ref, remove, set } from "firebase/database";
import { firebaseDatabase } from "@/app/lib/firebase";
import { getStoreItemLabel, type MainStoreItem } from "@/app/lib/inventory-transfer";
import { ROOMS, type InventoryItem } from "@/app/lib/mock-data";
import { DEFAULT_HARDWARE_SETTINGS } from "@/app/lib/hardware-settings";
import { sanitizeForStorage } from "@/app/lib/storage-sanitize";

// ── Connectivity monitoring ─────────────────────────────────────────────────
let _isConnected = false;
const _connectionListeners = new Set<(connected: boolean) => void>();
const _lastSyncedAt: Record<string, number> = {};

if (typeof window !== "undefined") {
  onValue(ref(firebaseDatabase, ".info/connected"), (snapshot) => {
    _isConnected = snapshot.val() === true;
    _connectionListeners.forEach((fn) => fn(_isConnected));
  });
}

export function isFirebaseConnected() {
  return _isConnected;
}

export function subscribeToConnectionStatus(onChange: (connected: boolean) => void) {
  _connectionListeners.add(onChange);
  onChange(_isConnected);
  return () => {
    _connectionListeners.delete(onChange);
  };
}

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
  "orange-hotel-login-profiles",
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

function mirrorCanonicalStateToLegacyLocal(key: string, value: unknown) {
  if (typeof window === "undefined" || value === null || value === undefined) return;

  if (key === "orange-hotel-cashier-state") {
    const snapshot = value as { transactions?: unknown[]; receiptSeq?: number };
    localStorage.setItem("orange-hotel-cashier-transactions", JSON.stringify(Array.isArray(snapshot.transactions) ? snapshot.transactions : []));
    localStorage.setItem("orange-hotel-cashier-seq", String(Number.isFinite(snapshot.receiptSeq) ? snapshot.receiptSeq : 84920));
    localStorage.removeItem("orange-hotel-demo-seed-version");
    return;
  }

  if (key === "orange-hotel-kitchen-state") {
    const snapshot = value as { tickets?: unknown[]; ticketSeq?: number; payments?: unknown[]; menuItems?: unknown[] };
    localStorage.setItem("orange-hotel-kitchen-tickets", JSON.stringify(Array.isArray(snapshot.tickets) ? snapshot.tickets : []));
    localStorage.setItem("orange-hotel-kitchen-seq", String(Number.isFinite(snapshot.ticketSeq) ? snapshot.ticketSeq : 300));
    localStorage.setItem("orange-hotel-kitchen-payments", JSON.stringify(Array.isArray(snapshot.payments) ? snapshot.payments : []));
    localStorage.setItem("orange-hotel-kitchen-menu", JSON.stringify(Array.isArray(snapshot.menuItems) ? snapshot.menuItems : []));
    localStorage.removeItem("orange-hotel-demo-seed-version");
    return;
  }

  if (key === "orange-hotel-barista-state") {
    const snapshot = value as { tickets?: unknown[]; ticketSeq?: number; payments?: unknown[]; menuItems?: unknown[] };
    localStorage.setItem("orange-hotel-barista-orders", JSON.stringify(Array.isArray(snapshot.tickets) ? snapshot.tickets : []));
    localStorage.setItem("orange-hotel-barista-seq", String(Number.isFinite(snapshot.ticketSeq) ? snapshot.ticketSeq : 490));
    localStorage.setItem("orange-hotel-barista-payments", JSON.stringify(Array.isArray(snapshot.payments) ? snapshot.payments : []));
    localStorage.setItem("orange-hotel-barista-menu", JSON.stringify(Array.isArray(snapshot.menuItems) ? snapshot.menuItems : []));
    localStorage.removeItem("orange-hotel-demo-seed-version");
  }
}

function buildInventoryItemsFromStoreItems(storeItems: MainStoreItem[]) {
  const normalizedItems = new Map<string, InventoryItem>();

  for (const item of storeItems) {
    const category = item.lane === "barista" ? "Bar" : "Kitchen";
    const name = getStoreItemLabel(item);
    const mapKey = `${category}:${name.toLowerCase()}`;
    const existing = normalizedItems.get(mapKey);

    if (existing) {
      existing.stock += item.stock;
      existing.minStock = Math.max(existing.minStock, item.minStock);
      if ((!existing.price || existing.price <= 0) && typeof item.buyingPrice === "number" && item.buyingPrice > 0) {
        existing.price = typeof item.sellingPrice === "number" && item.sellingPrice > 0
          ? item.sellingPrice
          : item.buyingPrice;
      }
      if ((!existing.sellingPrice || existing.sellingPrice <= 0) && typeof item.sellingPrice === "number" && item.sellingPrice > 0) {
        existing.sellingPrice = item.sellingPrice;
      }
      continue;
    }

    normalizedItems.set(mapKey, {
      id: `inv-${item.id}`,
      barcode: "", // Default to empty if not in store item
      name,
      category,
      size: item.size || "",
      stock: item.stock,
      totSold: 0,
      buyingPrice: typeof item.buyingPrice === "number" ? item.buyingPrice : 0,
      sellingPrice: typeof item.sellingPrice === "number" ? item.sellingPrice : 0,
      status: "ACTIVE" as const,
      minStock: item.minStock,
      unit: item.unit,
      price:
        typeof item.sellingPrice === "number" && item.sellingPrice > 0
          ? item.sellingPrice
          : typeof item.buyingPrice === "number"
            ? item.buyingPrice
            : 0,
    });
  }

  return Array.from(normalizedItems.values());
}

function getSnapshotScore(key: string, value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (key === "orange-hotel-cashier-state") {
    const snapshot = value as { transactions?: unknown[]; receiptSeq?: number };
    return (Array.isArray(snapshot.transactions) ? snapshot.transactions.length * 1000 : 0) + (Number.isFinite(snapshot.receiptSeq) ? 1 : 0);
  }

  if (key === "orange-hotel-kitchen-state" || key === "orange-hotel-barista-state") {
    const snapshot = value as { tickets?: unknown[]; payments?: unknown[]; menuItems?: unknown[]; ticketSeq?: number };
    return (
      (Array.isArray(snapshot.menuItems) ? snapshot.menuItems.length * 1000 : 0) +
      (Array.isArray(snapshot.tickets) ? snapshot.tickets.length * 100 : 0) +
      (Array.isArray(snapshot.payments) ? snapshot.payments.length * 100 : 0) +
      (Number.isFinite(snapshot.ticketSeq) ? 1 : 0)
    );
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length;
  }

  return 1;
}

function areSnapshotsEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getCanonicalDefaultValue(key: string) {
  switch (key) {
    case "orange-hotel-cashier-state":
      return { transactions: [], receiptSeq: 1 };
    case "orange-hotel-kitchen-state":
      return { tickets: [], ticketSeq: 1, payments: [], menuItems: [] };
    case "orange-hotel-barista-state":
      return { tickets: [], ticketSeq: 1, payments: [], menuItems: [] };
    case "orange-hotel-company-stock":
    case "orange-hotel-inventory-items":
    case "orange-hotel-main-store-items":
    case "orange-hotel-stock-logic":
    case "orange-hotel-store-movements":
    case "orange-hotel-store-usage":
    case "orange-hotel-cancelled-tickets":
    case "orange-hotel-fnb-beverage-cost":
    case "orange-hotel-fnb-recipe-cost":
    case "orange-hotel-fnb-stock-sales":
    case "orange-hotel-website-bookings":
      return [];
    case "orange-hotel-rooms-state":
      return ROOMS;
    case "orange-hotel-settings":
      return {
        fullName: "Alex Rivera",
        email: "alex.rivera@orange.hotel",
        department: "Operations Management",
        notificationsRealtime: true,
        notificationsEmailDigest: true,
        analyticsAdvanced: false,
        requirePinForCheckout: true,
        autoLockMinutes: 15,
        currency: "TSh",
        timezone: "Africa/Dar_es_Salaam",
      };
    case "orange-hotel-hardware-settings":
      return DEFAULT_HARDWARE_SETTINGS;
    case "orange-hotel-login-profiles":
      return {};
    default:
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

  if (key === "orange-hotel-inventory-items") {
    const storeItems = readParsedLocalValue<MainStoreItem[]>("orange-hotel-main-store-items") ?? [];
    if (storeItems.length === 0) return null;
    return buildInventoryItemsFromStoreItems(storeItems);
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
  const sanitizedValue = sanitizeForStorage(value);
  void set(ref(firebaseDatabase, toStoragePath(key)), sanitizedValue)
    .then(() => {
      _lastSyncedAt[key] = Date.now();
    })
    .catch((error) => {
      console.error(`Firebase sync failed for ${key}`, error);
    });
}

export async function hydrateStorageKeyFromFirebase(key: string) {
  if (typeof window === "undefined") return;

  try {
    const snapshot = await get(ref(firebaseDatabase, toStoragePath(key)));
    const remoteValue = snapshot.exists() ? sanitizeForStorage(snapshot.val()) : null;
    const fallbackValue = getLocalFallbackForSync(key);
    const localValue = sanitizeForStorage(fallbackValue ?? readParsedLocalValue(key) ?? null);

    const canonicalValue = sanitizeForStorage(getCanonicalDefaultValue(key));
    if (remoteValue === null && localValue === null && canonicalValue === null) return;

    const remoteScore = getSnapshotScore(key, remoteValue);
    const localScore = getSnapshotScore(key, localValue);
    const canonicalScore = getSnapshotScore(key, canonicalValue);

    let preferredValue = canonicalValue;
    if (remoteScore >= localScore && remoteScore >= canonicalScore) {
      preferredValue = remoteValue;
    } else if (localScore >= remoteScore && localScore >= canonicalScore) {
      preferredValue = localValue;
    }

    if (preferredValue === null) return;

    const sanitizedPreferredValue = sanitizeForStorage(preferredValue);
    localStorage.setItem(key, JSON.stringify(sanitizedPreferredValue));
    mirrorCanonicalStateToLegacyLocal(key, sanitizedPreferredValue);

    if (!areSnapshotsEqual(remoteValue, sanitizedPreferredValue)) {
      await set(ref(firebaseDatabase, toStoragePath(key)), sanitizedPreferredValue);
    }

    _lastSyncedAt[key] = Date.now();
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
        const fallbackValue = sanitizeForStorage((getLocalFallbackForSync(key) ?? getCanonicalDefaultValue(key)) as T | null);
        if (fallbackValue !== null) {
          localStorage.setItem(key, JSON.stringify(fallbackValue));
          mirrorCanonicalStateToLegacyLocal(key, fallbackValue);
          void set(ref(firebaseDatabase, toStoragePath(key)), fallbackValue).catch(() => undefined);
          onChange(fallbackValue);
          return;
        }
        readSnapshotValue<T>(key, null, onChange);
        return;
      }
      const nextValue = sanitizeForStorage(snapshot.val() as T);
      mirrorCanonicalStateToLegacyLocal(key, nextValue);
      readSnapshotValue<T>(key, nextValue, onChange);
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

// ── Sync diagnostics ────────────────────────────────────────────────────────

export interface SyncKeyDiagnostic {
  key: string;
  localRecordCount: number;
  lastSyncedAt: number | null;
}

export interface SyncDiagnostics {
  connected: boolean;
  keys: SyncKeyDiagnostic[];
}

function countRecords(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
  return 1;
}

export function getSyncDiagnostics(): SyncDiagnostics {
  const keys: SyncKeyDiagnostic[] = FIREBASE_SYNC_KEYS.map((key) => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    let localRecordCount = 0;
    if (raw) {
      try {
        localRecordCount = countRecords(JSON.parse(raw));
      } catch {
        localRecordCount = 0;
      }
    }
    return {
      key,
      localRecordCount,
      lastSyncedAt: _lastSyncedAt[key] ?? null,
    };
  });

  return {
    connected: _isConnected,
    keys,
  };
}

export async function getRemoteRecordCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await Promise.all(
    FIREBASE_SYNC_KEYS.map(async (key) => {
      try {
        const snapshot = await get(ref(firebaseDatabase, toStoragePath(key)));
        counts[key] = snapshot.exists() ? countRecords(snapshot.val()) : 0;
      } catch {
        counts[key] = -1;
      }
    }),
  );
  return counts;
}

export async function wipeStorageCategory(key: string) {
  if (typeof window === "undefined") return;

  const defaultValue = sanitizeForStorage(getCanonicalDefaultValue(key));
  
  // Wipe locally
  localStorage.setItem(key, JSON.stringify(defaultValue));
  
  // Wipe on Firebase
  await set(ref(firebaseDatabase, toStoragePath(key)), defaultValue);
  
  // Update last synced
  _lastSyncedAt[key] = Date.now();
  
  // Trigger local state updates
  window.dispatchEvent(new CustomEvent("orange-hotel-storage-updated", { detail: { key } }));
}
