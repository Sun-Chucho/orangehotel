import {
  STORAGE_BEVERAGE_COST,
  STORAGE_RECIPE_COST,
  STORAGE_STOCK_SALES,
} from "@/app/lib/fnb-control";
import { STORAGE_COMPANY_STOCK } from "@/app/lib/company-stock";
import {
  STORAGE_INVENTORY_ITEMS,
  STORAGE_MAIN_STORE_ITEMS,
  STORAGE_STORE_MOVEMENTS,
  STORAGE_STORE_USAGE,
} from "@/app/lib/inventory-transfer";
import { DEFAULT_KITCHEN_MENU } from "@/app/lib/kitchen-menu";
import { STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE, writePosState } from "@/app/lib/storage";

const STORAGE_CASHIER_TX = "orange-hotel-cashier-transactions";
const STORAGE_CASHIER_SEQ = "orange-hotel-cashier-seq";
const STORAGE_KITCHEN_TICKETS = "orange-hotel-kitchen-tickets";
const STORAGE_KITCHEN_SEQ = "orange-hotel-kitchen-seq";
const STORAGE_KITCHEN_MENU = "orange-hotel-kitchen-menu";
const STORAGE_KITCHEN_PAYMENTS = "orange-hotel-kitchen-payments";
const STORAGE_BARISTA_TICKETS = "orange-hotel-barista-orders";
const STORAGE_BARISTA_SEQ = "orange-hotel-barista-seq";
const STORAGE_BARISTA_MENU = "orange-hotel-barista-menu";
const STORAGE_BARISTA_PAYMENTS = "orange-hotel-barista-payments";
const STORAGE_CANCELLED = "orange-hotel-cancelled-tickets";
const STORAGE_DEMO_VERSION = "orange-hotel-demo-seed-version";
const STORAGE_KITCHEN_SALES_CLEANUP = "orange-hotel-kitchen-sales-cleanup-v1";
const STORAGE_BARISTA_SALES_CLEANUP = "orange-hotel-barista-sales-cleanup-v1";
const DEMO_VERSION = "1";

function shouldSeedArray(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length === 0;
  } catch {
    return true;
  }
}

function shouldSeedValue(raw: string | null): boolean {
  return !raw || raw.trim().length === 0;
}

function setArrayIfEmpty(key: string, value: unknown[]) {
  if (shouldSeedArray(localStorage.getItem(key))) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function setValueIfMissing(key: string, value: string) {
  if (shouldSeedValue(localStorage.getItem(key))) {
    localStorage.setItem(key, value);
  }
}

export function seedDemoDataIfNeeded() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const hoursAgo = (h: number) => now - h * 60 * 60 * 1000;
  setArrayIfEmpty(STORAGE_CASHIER_TX, [
    {
      id: "tx-demo-1",
      receiptNo: "#84921",
      createdAt: hoursAgo(7),
      guestName: "John Mallya",
      phone: "+255712000111",
      roomType: "platinum",
      roomNumber: "3004",
      payment: "card",
      checkInDate: "2026-03-06",
      checkInTime: "14:00",
      checkOutDate: "2026-03-08",
      checkOutTime: "12:00",
      nights: 2,
      total: 200000,
      status: "completed",
    },
    {
      id: "tx-demo-2",
      receiptNo: "#84922",
      createdAt: hoursAgo(2),
      guestName: "Aisha Kweka",
      phone: "+255754220998",
      roomType: "standard",
      roomNumber: "2001",
      payment: "cash",
      checkInDate: "2026-03-07",
      checkInTime: "15:30",
      checkOutDate: "2026-03-09",
      checkOutTime: "11:30",
      nights: 2,
      total: 140000,
      status: "credit",
    },
  ]);
  setValueIfMissing(STORAGE_CASHIER_SEQ, "84922");

  if (!localStorage.getItem(STORAGE_KITCHEN_SALES_CLEANUP)) {
    const rawKitchenState = localStorage.getItem(STORAGE_KITCHEN_STATE);
    let ticketSeq = 301;
    let menuItems = DEFAULT_KITCHEN_MENU;

    if (rawKitchenState) {
      try {
        const parsed = JSON.parse(rawKitchenState) as { ticketSeq?: number; menuItems?: unknown[] };
        ticketSeq = Number.isFinite(parsed.ticketSeq) ? Number(parsed.ticketSeq) : 301;
        menuItems = Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0 ? parsed.menuItems as typeof DEFAULT_KITCHEN_MENU : DEFAULT_KITCHEN_MENU;
      } catch {
        ticketSeq = 301;
        menuItems = DEFAULT_KITCHEN_MENU;
      }
    }

    localStorage.setItem(STORAGE_KITCHEN_TICKETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KITCHEN_PAYMENTS, JSON.stringify([]));
    writePosState(STORAGE_KITCHEN_STATE, [], ticketSeq, [], menuItems as typeof DEFAULT_KITCHEN_MENU);
    localStorage.setItem(STORAGE_KITCHEN_SALES_CLEANUP, "1");
  }

  if (!localStorage.getItem(STORAGE_BARISTA_SALES_CLEANUP)) {
    const rawBaristaState = localStorage.getItem(STORAGE_BARISTA_STATE);
    let ticketSeq = 490;
    let menuItems: unknown[] = [];

    if (rawBaristaState) {
      try {
        const parsed = JSON.parse(rawBaristaState) as { ticketSeq?: number; menuItems?: unknown[] };
        ticketSeq = Number.isFinite(parsed.ticketSeq) ? Number(parsed.ticketSeq) : 490;
        menuItems = Array.isArray(parsed.menuItems) ? parsed.menuItems : [];
      } catch {
        ticketSeq = 490;
        menuItems = [];
      }
    }

    localStorage.setItem(STORAGE_BARISTA_TICKETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_BARISTA_PAYMENTS, JSON.stringify([]));
    writePosState(STORAGE_BARISTA_STATE, [], ticketSeq, [], menuItems);
    localStorage.setItem(STORAGE_BARISTA_SALES_CLEANUP, "1");
  }

  setArrayIfEmpty(STORAGE_KITCHEN_MENU, DEFAULT_KITCHEN_MENU);
  setArrayIfEmpty(STORAGE_KITCHEN_TICKETS, []);
  setArrayIfEmpty(STORAGE_KITCHEN_PAYMENTS, []);
  setValueIfMissing(STORAGE_KITCHEN_SEQ, "301");

  setArrayIfEmpty(STORAGE_BARISTA_MENU, [
    { id: "bm-1", name: "Espresso Single", price: 7000, category: "espresso", prepMinutes: 4 },
    { id: "bm-2", name: "Cappuccino", price: 9000, category: "coffee", prepMinutes: 6 },
    { id: "bm-3", name: "Iced Latte", price: 11000, category: "cold", prepMinutes: 7 },
    { id: "bm-4", name: "Masala Tea", price: 5000, category: "tea", prepMinutes: 5 },
    { id: "bm-5", name: "Blueberry Muffin", price: 8000, category: "snacks", prepMinutes: 2 },
    { id: "bm-6", name: "Mocha", price: 10000, category: "coffee", prepMinutes: 7 },
  ]);
  setArrayIfEmpty(STORAGE_BARISTA_TICKETS, []);
  setArrayIfEmpty(STORAGE_BARISTA_PAYMENTS, []);
  setValueIfMissing(STORAGE_BARISTA_SEQ, "491");

  setArrayIfEmpty(STORAGE_INVENTORY_ITEMS, [
    { id: "inv-seed-4", name: "Rice", category: "Kitchen", stock: 58, minStock: 25, unit: "kg", price: 3200 },
    { id: "inv-seed-5", name: "Chicken", category: "Kitchen", stock: 30, minStock: 20, unit: "kg", price: 11500 },
    { id: "inv-seed-6", name: "Cooking Oil", category: "Kitchen", stock: 14, minStock: 15, unit: "L", price: 8000 },
  ]);

  setArrayIfEmpty(STORAGE_MAIN_STORE_ITEMS, [
    { id: "store-1", name: "Coffee Beans Sack", stock: 12, unit: "sack", minStock: 3, lane: "barista" },
    { id: "store-2", name: "Milk Crates", stock: 20, unit: "crate", minStock: 5, lane: "barista" },
    { id: "store-3", name: "Chicken Cartons", stock: 16, unit: "carton", minStock: 4, lane: "kitchen" },
    { id: "store-4", name: "Rice Bags", stock: 24, unit: "bag", minStock: 6, lane: "kitchen" },
  ]);

  setArrayIfEmpty(STORAGE_STORE_MOVEMENTS, [
    {
      id: "mv-seed-2",
      itemId: "store-3",
      itemName: "Chicken Cartons",
      source: "store",
      destination: "kitchen",
      storeQtyMoved: 3,
      storeUnit: "carton",
      conversionValue: 6,
      convertedQty: 18,
      movedAt: hoursAgo(10),
    },
  ]);

  setArrayIfEmpty(STORAGE_STORE_USAGE, [
    { id: "su-seed-2", movementId: "mv-seed-2", destination: "kitchen", quantityUsed: 9, usedAt: hoursAgo(4) },
  ]);

  setArrayIfEmpty(STORAGE_COMPANY_STOCK, []);

  setArrayIfEmpty(STORAGE_BEVERAGE_COST, [
    {
      id: "bev-seed-1",
      itemName: "Coffee Beans",
      openingStock: 25,
      purchasedStock: 15,
      purchaseCostTotal: 570000,
      closingStock: 14,
      salesRevenue: 1320000,
      createdAt: hoursAgo(24),
    },
    {
      id: "bev-seed-2",
      itemName: "Milk",
      openingStock: 48,
      purchasedStock: 20,
      purchaseCostTotal: 84000,
      closingStock: 27,
      salesRevenue: 420000,
      createdAt: hoursAgo(24),
    },
  ]);

  setArrayIfEmpty(STORAGE_RECIPE_COST, [
    {
      id: "rcp-seed-1",
      recipeName: "Cappuccino",
      recipeType: "cocktail",
      yieldPortions: 20,
      batchCost: 96000,
      sellingPricePerPortion: 9000,
      createdAt: hoursAgo(30),
    },
    {
      id: "rcp-seed-2",
      recipeName: "Chicken Pilau",
      recipeType: "kitchen",
      yieldPortions: 12,
      batchCost: 180000,
      sellingPricePerPortion: 24000,
      createdAt: hoursAgo(30),
    },
  ]);

  setArrayIfEmpty(STORAGE_STOCK_SALES, [
    {
      id: "ss-seed-1",
      itemName: "Coffee Beans",
      department: "barista",
      openingStock: 25,
      stockIn: 15,
      stockOut: 26,
      salesUnits: 25,
      createdAt: hoursAgo(22),
    },
    {
      id: "ss-seed-2",
      itemName: "Chicken",
      department: "kitchen",
      openingStock: 30,
      stockIn: 12,
      stockOut: 18,
      salesUnits: 18,
      createdAt: hoursAgo(22),
    },
  ]);

  setArrayIfEmpty(STORAGE_CANCELLED, []);
  localStorage.setItem(STORAGE_DEMO_VERSION, DEMO_VERSION);
}

export function clearDemoData() {
  if (typeof window === "undefined") return;

  [
    STORAGE_CASHIER_TX,
    STORAGE_CASHIER_SEQ,
    STORAGE_KITCHEN_TICKETS,
    STORAGE_KITCHEN_SEQ,
    STORAGE_KITCHEN_MENU,
    STORAGE_KITCHEN_PAYMENTS,
    STORAGE_BARISTA_TICKETS,
    STORAGE_BARISTA_SEQ,
    STORAGE_BARISTA_MENU,
    STORAGE_BARISTA_PAYMENTS,
    STORAGE_CANCELLED,
    STORAGE_INVENTORY_ITEMS,
    STORAGE_MAIN_STORE_ITEMS,
    STORAGE_STORE_MOVEMENTS,
    STORAGE_STORE_USAGE,
    STORAGE_COMPANY_STOCK,
    STORAGE_BEVERAGE_COST,
    STORAGE_RECIPE_COST,
    STORAGE_STOCK_SALES,
    STORAGE_DEMO_VERSION,
    STORAGE_KITCHEN_SALES_CLEANUP,
    STORAGE_BARISTA_SALES_CLEANUP,
  ].forEach((key) => localStorage.removeItem(key));
}
