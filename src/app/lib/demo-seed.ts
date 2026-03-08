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

  setArrayIfEmpty(STORAGE_KITCHEN_MENU, [
    { id: "km-1", name: "Grilled Chicken", price: 28000, category: "lunch", prepMinutes: 20 },
    { id: "km-2", name: "Beef Pilau", price: 24000, category: "lunch", prepMinutes: 18 },
    { id: "km-3", name: "Club Sandwich", price: 18000, category: "breakfast", prepMinutes: 12 },
    { id: "km-4", name: "Vegetable Pasta", price: 21000, category: "dinner", prepMinutes: 16 },
    { id: "km-5", name: "Fruit Plate", price: 12000, category: "breakfast", prepMinutes: 8 },
    { id: "km-6", name: "Fish Curry", price: 30000, category: "dinner", prepMinutes: 25 },
  ]);
  setArrayIfEmpty(STORAGE_KITCHEN_TICKETS, [
    {
      id: "kt-demo-1",
      code: "K-301",
      createdAt: hoursAgo(1),
      mode: "room-service",
      destination: "Room 2003",
      lines: [{ name: "Grilled Chicken", qty: 1 }, { name: "Fruit Plate", qty: 1 }],
      total: 40000,
    },
  ]);
  setArrayIfEmpty(STORAGE_KITCHEN_PAYMENTS, [
    {
      id: "kp-demo-1",
      ticketId: "kt-demo-paid-1",
      code: "K-299",
      createdAt: hoursAgo(9),
      mode: "restaurant",
      destination: "Table 5",
      total: 52000,
      status: "completed",
      method: "cash",
    },
    {
      id: "kp-demo-2",
      ticketId: "kt-demo-paid-2",
      code: "K-300",
      createdAt: hoursAgo(3),
      mode: "room-service",
      destination: "Room 1008",
      total: 28000,
      status: "credit",
      method: "credit",
    },
  ]);
  setValueIfMissing(STORAGE_KITCHEN_SEQ, "301");

  setArrayIfEmpty(STORAGE_BARISTA_MENU, [
    { id: "bm-1", name: "Espresso Single", price: 7000, category: "espresso", prepMinutes: 4 },
    { id: "bm-2", name: "Cappuccino", price: 9000, category: "coffee", prepMinutes: 6 },
    { id: "bm-3", name: "Iced Latte", price: 11000, category: "cold", prepMinutes: 7 },
    { id: "bm-4", name: "Masala Tea", price: 5000, category: "tea", prepMinutes: 5 },
    { id: "bm-5", name: "Blueberry Muffin", price: 8000, category: "snacks", prepMinutes: 2 },
    { id: "bm-6", name: "Mocha", price: 10000, category: "coffee", prepMinutes: 7 },
  ]);
  setArrayIfEmpty(STORAGE_BARISTA_TICKETS, [
    {
      id: "bt-demo-1",
      code: "B-491",
      createdAt: hoursAgo(1),
      mode: "restaurant",
      destination: "Table 2",
      lines: [{ name: "Cappuccino", qty: 2 }, { name: "Blueberry Muffin", qty: 1 }],
      total: 26000,
    },
  ]);
  setArrayIfEmpty(STORAGE_BARISTA_PAYMENTS, [
    {
      id: "bp-demo-1",
      ticketId: "bt-demo-paid-1",
      code: "B-489",
      createdAt: hoursAgo(8),
      mode: "room-service",
      destination: "Room 3003",
      total: 19000,
      status: "completed",
      method: "mobile",
    },
    {
      id: "bp-demo-2",
      ticketId: "bt-demo-paid-2",
      code: "B-490",
      createdAt: hoursAgo(2),
      mode: "restaurant",
      destination: "Table 8",
      total: 15000,
      status: "credit",
      method: "credit",
    },
  ]);
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

  setArrayIfEmpty(STORAGE_COMPANY_STOCK, [
    {
      id: "cs-seed-1",
      name: "POS Terminal",
      description: "Front desk payment terminal",
      quantity: 2,
      category: "technology",
      createdAt: hoursAgo(72),
    },
    {
      id: "cs-seed-2",
      name: "Kitchen Freezer",
      description: "Large cold storage unit",
      quantity: 1,
      category: "kitchen-equipment",
      createdAt: hoursAgo(120),
    },
    {
      id: "cs-seed-3",
      name: "Lobby Sofa Set",
      description: "Reception waiting lounge set",
      quantity: 1,
      category: "furniture",
      createdAt: hoursAgo(240),
    },
  ]);

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
  ].forEach((key) => localStorage.removeItem(key));
}
