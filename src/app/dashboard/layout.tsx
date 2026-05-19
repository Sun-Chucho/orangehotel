"use client";

import { useState, useEffect } from 'react';
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { STORAGE_COMPANY_STOCK } from "@/app/lib/company-stock";
import { COMPANY_STOCK_SHEET } from "@/app/lib/company-stock-seed";
import { BARISTA_INVENTORY_SEED } from "@/app/lib/seed-barista-data";
import { DEFAULT_KITCHEN_MENU, mergeKitchenMenuItems } from "@/app/lib/kitchen-menu";
import { InventoryItem, Role } from "@/app/lib/mock-data";
import { ExpenseRecord, STORAGE_EXPENSES } from "@/app/lib/expenses";
import { KitchenPurchaseHistoryEntry, STORAGE_KITCHEN_PURCHASE_HISTORY } from "@/app/lib/kitchen-session-storage";
import { MainStoreItem, STORAGE_MAIN_STORE_ITEMS, getStoreItemLabel, normalizeBaristaProductTarget, normalizeStockName } from "@/app/lib/inventory-transfer";
import { getTotLimit } from "@/app/lib/barista-stock";
import { normalizeRole } from "@/app/lib/auth";
import { hydrateDefaultAppStateFromFirebase } from "@/app/lib/firebase-sync";
import { readJson, readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE, writeJson, writePosState } from "@/app/lib/storage";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, Home, Hotel, Search, User, Clock, Menu, WalletCards, ReceiptText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { readActiveSessionUsername, readLocalLoginProfiles, renameProfileUser, saveLoginProfileToServer, writeActiveSessionUsername } from "@/app/lib/login-profiles";

const VALID_ROLES: Role[] = ['manager', 'director', 'inventory', 'cashier', 'kitchen', 'barista'];
const DIRECTOR_MOBILE_NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Rooms", href: "/dashboard/rooms", icon: Hotel },
  { label: "Payments", href: "/dashboard/payments", icon: WalletCards },
  { label: "Expenses", href: "/dashboard/expenses", icon: ReceiptText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
] as const;
const KITCHEN_TRANSACTIONS_RESET_KEY = "orange-hotel-kitchen-transactions-reset-v3";
const KITCHEN_MENU_PRICE_FIX_KEY = "orange-hotel-kitchen-menu-price-fix-v1";
const DOMPO_STOCK_FIX_KEY = "orange-hotel-dompo-750ml-stock-fix-v1";
const BARISTA_STOCK_FIX_KEY = "orange-hotel-barista-stock-fix-v5";
const BARISTA_FINANCE_PRICE_FIX_KEY = "orange-hotel-barista-finance-price-fix-v3";
const BARISTA_SHARED_STATE_FIX_KEY = "orange-hotel-barista-shared-state-fix-v4";
const BARISTA_INVENTORY_CORRECTION_FIX_KEY = "orange-hotel-barista-inventory-correction-fix-v5";
const COMPANY_STOCK_SHEET_FIX_KEY = "orange-hotel-company-stock-sheet-fix-v1";
const BARISTA_MENU_REMOVAL_FIX_KEY = "orange-hotel-barista-menu-removal-fix-v1";
const JACK_DANIELS_TOTS_PRICE_FIX_KEY = "orange-hotel-jack-daniels-tots-price-fix-v1";
const STAFF_FOOD_DISHES_EXPENSE_REMOVAL_KEY = "orange-hotel-staff-food-dishes-expense-removal-v1";

const BARISTA_STOCK_TARGETS = {
  "Serengeti Lager|330ml": 20,
  "Kilimanjaro Premium Lager|375ml": 13,
  "Safari Lager|330ml": 19,
  "Classic Dompo|750ml": 3,
} as const;

const REMOVED_BARISTA_ITEMS = [
  { name: "Serengeti Lemon", size: "300ml" },
] as const;

function resolveBarInventorySellingPrice(
  inventoryItems: InventoryItem[],
  storeItem: Pick<MainStoreItem, "name" | "size">,
) {
  const storeTargets = [
    normalizeBaristaProductTarget(storeItem.name),
    normalizeBaristaProductTarget(getStoreItemLabel(storeItem)),
  ];

  const inventoryMatch = inventoryItems.find((item) => {
    if (item.category !== "Bar") return false;
    const inventoryTargets = [
      normalizeBaristaProductTarget(item.name),
      normalizeBaristaProductTarget(item.size ? `${item.name} ${item.size}` : item.name),
    ];

    return storeTargets.some((target) => inventoryTargets.includes(target));
  });

  if (typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0) {
    return inventoryMatch.sellingPrice;
  }

  if (typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0) {
    return inventoryMatch.price;
  }

  return 0;
}

function normalizeBaristaMenuTarget(value: string) {
  return normalizeBaristaProductTarget(value);
}

function isJackDaniels700Target(name: string, size?: string) {
  const normalizedName = normalizeStockName(
    name
      .replace(/\s*\(?TOTS?\)?/gi, " ")
      .replace(/\b700\s*ml\b/gi, " ")
      .trim(),
  );
  return normalizedName === "jack daniels" && normalizeStockName(size ?? "700ml") === "700ml";
}

function isStaffFoodDishesExpenseDate(value: number | string) {
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === 2026 &&
    date.getMonth() === 4 &&
    date.getDate() === 18 &&
    date.getHours() === 15 &&
    date.getMinutes() === 22
  );
}

function isStaffFoodDishesText(value: string | undefined) {
  const normalized = normalizeStockName(value ?? "").replace(/&/g, "and");
  return normalized.includes("staff food") && normalized.includes("dishes");
}

function isStaffFoodDishesExpense(expense: ExpenseRecord) {
  return (
    expense.department === "kitchen" &&
    expense.amount === 258000 &&
    isStaffFoodDishesExpenseDate(expense.createdAt) &&
    (isStaffFoodDishesText(expense.title) || isStaffFoodDishesText(expense.notes))
  );
}

function getPurchaseHistoryAmount(entry: KitchenPurchaseHistoryEntry) {
  return entry.lines.reduce((sum, line) => sum + (line.addedQty || 0) * (line.pricePerUnit || 0), 0);
}

function isStaffFoodDishesPurchaseHistory(entry: KitchenPurchaseHistoryEntry) {
  return (
    isStaffFoodDishesExpenseDate(entry.closedAt) &&
    getPurchaseHistoryAmount(entry) === 258000 &&
    entry.lines.some((line) => isStaffFoodDishesText(line.itemName) || isStaffFoodDishesText(line.category))
  );
}

function getBaristaInventoryLabel(item: Pick<InventoryItem, "name" | "size">) {
  const rawName = item.name.trim();
  const isTotItem = /\s*\(?TOTS?\)?$/i.test(rawName);
  const baseName = rawName.replace(/\s*\(?TOTS?\)?$/i, "").trim();
  const size = item.size?.trim() ?? "";

  if (!size) return isTotItem ? `${baseName} (TOTS)` : baseName;
  if (rawName.toLowerCase().includes(size.toLowerCase())) return rawName;
  return isTotItem ? `${baseName} ${size} (TOTS)`.trim() : `${baseName} ${size}`.trim();
}

function syncBaristaMenuItemsWithSharedData(
  menuItems: Array<{ id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>,
  inventoryItems: InventoryItem[],
  storeItems: MainStoreItem[],
) {
  const filteredMenuItems = menuItems.filter((item) => {
    const target = normalizeBaristaMenuTarget(item.name);
    return !REMOVED_BARISTA_ITEMS.some((removedItem) => {
      const directTarget = normalizeBaristaMenuTarget(`${removedItem.name} ${removedItem.size}`);
      const fallbackTarget = normalizeBaristaMenuTarget(removedItem.name);
      return target === directTarget || target === fallbackTarget;
    });
  });

  const inventoryMenuItems = inventoryItems
    .filter((item) => (item.category ?? "").toLowerCase() !== "kitchen")
    .map((item) => ({
      id: item.id,
      name: getBaristaInventoryLabel(item),
      price:
        typeof item.sellingPrice === "number" && item.sellingPrice > 0
          ? item.sellingPrice
          : typeof item.price === "number" && item.price > 0
            ? item.price
            : 0,
      category: item.category,
      prepMinutes: 2,
      barcode: item.barcode || "",
    }));

  const syncedItems = filteredMenuItems.map((item) => {
    const target = normalizeBaristaMenuTarget(item.name);
    const inventoryMatch = inventoryItems.find((entry) => {
      const entryTargets = [
        normalizeBaristaMenuTarget(entry.name),
        normalizeBaristaMenuTarget(getBaristaInventoryLabel(entry)),
      ];
      return entryTargets.includes(target);
    });
    const storeMatch = storeItems.find((entry) => normalizeBaristaMenuTarget(getStoreItemLabel(entry)) === target);

    if (!inventoryMatch && !storeMatch) {
      return item;
    }

    const nextName = storeMatch
      ? getTotLimit(storeMatch) > 0
        ? `${getStoreItemLabel(storeMatch)} (TOTS)`
        : getStoreItemLabel(storeMatch)
      : inventoryMatch
        ? getBaristaInventoryLabel(inventoryMatch)
        : item.name;
    const nextPrice =
      typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0
        ? inventoryMatch.sellingPrice
        : typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0
          ? inventoryMatch.price
          : item.price;
    const nextBarcode = inventoryMatch?.barcode || item.barcode;

    if (nextName === item.name && nextPrice === item.price && nextBarcode === item.barcode) {
      return item;
    }

    return {
      ...item,
      name: nextName,
      price: nextPrice,
      barcode: nextBarcode,
    };
  });

  const existingTargets = new Set(syncedItems.map((item) => normalizeBaristaMenuTarget(item.name)));
  const missingInventoryMenuItems = inventoryMenuItems.filter(
    (item) => !existingTargets.has(normalizeBaristaMenuTarget(item.name)),
  );

  return [...syncedItems, ...missingInventoryMenuItems];
}

type InventorySeedUpdate = {
  name: string;
  size: string;
  buyingPrice?: number;
  stock?: number;
  stockDelta?: number;
};

const BARISTA_PRICE_UPDATES: InventorySeedUpdate[] = [
  { name: "Classic Dompo", size: "750ml", buyingPrice: 11000, stockDelta: 3 },
  { name: "Kilimanjaro Water", size: "1L", buyingPrice: 833 },
  { name: "Kilimanjaro Water", size: "500ml", buyingPrice: 375 },
  { name: "Serengeti Lager", size: "330ml", buyingPrice: 1600 },
  { name: "Castle Lite", size: "330ml", buyingPrice: 1650 },
  { name: "Safari Lager", size: "330ml", buyingPrice: 1650 },
  { name: "Kilimanjaro Premium Lager", size: "375ml", buyingPrice: 1650 },
  { name: "Konyagi", size: "750ml", buyingPrice: 10333, stock: 6 },
  { name: "Apothic Red", size: "750ml", stockDelta: 2 },
  { name: "J & B", size: "200ml", stockDelta: 1 },
  { name: "Brutal Fruit", size: "275ml", stock: 16 },
];

type AdditionalBaristaItem = Partial<InventoryItem> & {
  name: string;
  category: string;
  size: string;
  stock: number;
  buyingPrice: number;
  sellingPrice: number;
  minStock: number;
  unit: string;
};

const BARISTA_ADDITIONAL_ITEMS: AdditionalBaristaItem[] = [
  { barcode: "6200100630063", name: "Bacardi Superior White Rum (TOTS)", category: "Spirit", size: "750ml", stock: 1, totPerBottle: 30, buyingPrice: 45000, sellingPrice: 8000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
  { barcode: "6200100640064", name: "Camino Real Blanco (TOTS)", category: "Spirit", size: "750ml", stock: 1, totPerBottle: 30, buyingPrice: 42000, sellingPrice: 8000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
  { barcode: "6200100650065", name: "Captain Morgan Black Rum (TOTS)", category: "Spirit", size: "750ml", stock: 1, totPerBottle: 30, buyingPrice: 30000, sellingPrice: 5000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
  { barcode: "6200100660066", name: "Buttlers Blue Curacao (TOTS)", category: "Liqueur", size: "750ml", stock: 1, totPerBottle: 30, buyingPrice: 35000, sellingPrice: 5000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
  { barcode: "6200100670067", name: "Hennessy VSOP Box", category: "Cognac", size: "700ml", stock: 1, buyingPrice: 160000, sellingPrice: 250000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
  { barcode: "6200100680068", name: "Jack Daniels", category: "Whisky", size: "700ml", stock: 1, totPerBottle: 30, buyingPrice: 70000, sellingPrice: 10000, minStock: 1, unit: "Bottle", totSold: 0, status: "ACTIVE" },
] as const;

const SODA_MERGE_GROUPS = [
  {
    size: "350ml",
    names: ["Coca Cola Soda", "Fanta Soda"],
    barcode: "6200100540054",
    minStock: 5,
    buyingPrice: 604,
    sellingPrice: 2000,
    unit: "Bottle",
  },
  {
    size: "300ml",
    names: ["Krest Bitter Lemon", "Krest Tonic Water", "Krest Soda Water", "Stoney Soda", "Krest Ginger"],
    barcode: "6200100560056",
    minStock: 5,
    buyingPrice: 604,
    sellingPrice: 2000,
    unit: "Bottle",
  },
] as const;

function applyBusinessCorrections() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(KITCHEN_TRANSACTIONS_RESET_KEY)) {
    const kitchenSnapshot = readPosState<unknown, unknown, unknown>(
      STORAGE_KITCHEN_STATE,
      "orange-hotel-kitchen-tickets",
      "orange-hotel-kitchen-seq",
      "orange-hotel-kitchen-payments",
      "orange-hotel-kitchen-menu",
      300,
    );
    const cleanedKitchenMenu = mergeKitchenMenuItems(kitchenSnapshot.menuItems as Parameters<typeof mergeKitchenMenuItems>[0], {
      stripDefaultMenu: true,
    });
    writePosState(STORAGE_KITCHEN_STATE, [], kitchenSnapshot.ticketSeq, [], cleanedKitchenMenu);
    localStorage.setItem(KITCHEN_TRANSACTIONS_RESET_KEY, "1");
  }

  if (!localStorage.getItem(KITCHEN_MENU_PRICE_FIX_KEY)) {
    const kitchenSnapshot = readPosState<unknown, unknown, unknown>(
      STORAGE_KITCHEN_STATE,
      "orange-hotel-kitchen-tickets",
      "orange-hotel-kitchen-seq",
      "orange-hotel-kitchen-payments",
      "orange-hotel-kitchen-menu",
      300,
    );
    writePosState(
      STORAGE_KITCHEN_STATE,
      kitchenSnapshot.tickets,
      kitchenSnapshot.ticketSeq,
      kitchenSnapshot.payments,
      DEFAULT_KITCHEN_MENU,
    );
    localStorage.setItem(KITCHEN_MENU_PRICE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(DOMPO_STOCK_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const dompoSeed = BARISTA_INVENTORY_SEED.find(
      (item) => item.name === "Classic Dompo" && item.size === "750ml",
    );

    if (inventoryItems.length > 0) {
      const dompoIndex = inventoryItems.findIndex(
        (item) => item.name === "Classic Dompo" && item.size === "750ml",
      );

      const nextInventoryItems = [...inventoryItems];
      if (dompoIndex >= 0) {
        nextInventoryItems[dompoIndex] = {
          ...nextInventoryItems[dompoIndex],
          stock: 3,
          minStock: Math.max(nextInventoryItems[dompoIndex].minStock ?? 0, 1),
          unit: nextInventoryItems[dompoIndex].unit || "Bottle",
        };
      } else if (dompoSeed) {
        nextInventoryItems.push({
          id: `inv-${dompoSeed.barcode || "dompo-750ml"}`,
          barcode: dompoSeed.barcode || "",
          name: dompoSeed.name || "Classic Dompo",
          category: dompoSeed.category || "Wine",
          size: dompoSeed.size || "750ml",
          stock: 3,
          buyingPrice: dompoSeed.buyingPrice || 0,
          sellingPrice: dompoSeed.sellingPrice || 20000,
          status: "ACTIVE",
          minStock: 1,
          unit: dompoSeed.unit || "Bottle",
          totSold: dompoSeed.totSold || 0,
          price: dompoSeed.sellingPrice || 20000,
        });
      }

      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    localStorage.setItem(DOMPO_STOCK_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_STOCK_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];

    if (inventoryItems.length > 0) {
      const seedTargets = BARISTA_INVENTORY_SEED.filter((item) => {
        const key = `${item.name}|${item.size ?? ""}`;
        return key in BARISTA_STOCK_TARGETS;
      });

      const nextInventoryItems = [...inventoryItems];
      seedTargets.forEach((seedItem) => {
        const key = `${seedItem.name}|${seedItem.size ?? ""}` as keyof typeof BARISTA_STOCK_TARGETS;
        const targetStock = BARISTA_STOCK_TARGETS[key];
        const existingIndex = nextInventoryItems.findIndex(
          (item) => normalizeStockName(item.name) === normalizeStockName(seedItem.name ?? "") &&
            normalizeStockName(item.size ?? "") === normalizeStockName(seedItem.size ?? ""),
        );

        if (existingIndex >= 0) {
          nextInventoryItems[existingIndex] = {
            ...nextInventoryItems[existingIndex],
            stock: targetStock,
            sellingPrice:
              typeof seedItem.sellingPrice === "number" && seedItem.sellingPrice > 0
                ? seedItem.sellingPrice
                : nextInventoryItems[existingIndex].sellingPrice,
            price:
              typeof seedItem.sellingPrice === "number" && seedItem.sellingPrice > 0
                ? seedItem.sellingPrice
                : nextInventoryItems[existingIndex].price,
          };
          return;
        }

        nextInventoryItems.push({
          id: `inv-${seedItem.barcode || `${seedItem.name}-${seedItem.size}`}`,
          barcode: seedItem.barcode || "",
          name: seedItem.name || "",
          category: "Bar",
          subCategory: seedItem.category || "Bar",
          size: seedItem.size || "",
          stock: targetStock,
          totSold: seedItem.totSold || 0,
          buyingPrice: seedItem.buyingPrice || 0,
          sellingPrice: seedItem.sellingPrice || 0,
          price: seedItem.sellingPrice || 0,
          status: "ACTIVE",
          minStock: seedItem.minStock || 0,
          unit: seedItem.unit || "Bottle",
        });
      });

      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    if (storeItems.length > 0 || inventoryItems.length > 0) {
      const otherStoreItems = storeItems.filter((item) => item.lane !== "barista");
      const baristaStoreItems = storeItems.filter((item) => item.lane === "barista");
      const seedTargets = BARISTA_INVENTORY_SEED.filter((item) => {
        const key = `${item.name}|${item.size ?? ""}`;
        return key in BARISTA_STOCK_TARGETS;
      });

      const nextBaristaStoreItems = [...baristaStoreItems];
      seedTargets.forEach((seedItem) => {
        const key = `${seedItem.name}|${seedItem.size ?? ""}` as keyof typeof BARISTA_STOCK_TARGETS;
        const targetStock = BARISTA_STOCK_TARGETS[key];
        const existingIndex = nextBaristaStoreItems.findIndex(
          (item) =>
            normalizeStockName(item.name) === normalizeStockName(seedItem.name ?? "") &&
            normalizeStockName(item.size ?? "") === normalizeStockName(seedItem.size ?? ""),
        );

        const nextStoreRecord: MainStoreItem = {
          id: existingIndex >= 0 ? nextBaristaStoreItems[existingIndex].id : `s-fix-${seedItem.barcode || `${seedItem.name}-${seedItem.size}`}`,
          name: seedItem.name || "",
          subCategory: seedItem.category || "Bar",
          size: seedItem.size || "",
          stock: targetStock,
          unit: seedItem.unit || "Bottle",
          minStock: seedItem.minStock || 0,
          lane: "barista",
          buyingPrice: seedItem.buyingPrice || 0,
          sellingPrice: seedItem.sellingPrice || 0,
        };

        if (existingIndex >= 0) {
          nextBaristaStoreItems[existingIndex] = {
            ...nextBaristaStoreItems[existingIndex],
            ...nextStoreRecord,
          };
          return;
        }

        nextBaristaStoreItems.push(nextStoreRecord);
      });

      writeJson(STORAGE_MAIN_STORE_ITEMS, [...otherStoreItems, ...nextBaristaStoreItems]);
    }

    localStorage.setItem(BARISTA_STOCK_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_INVENTORY_CORRECTION_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];

    let inventoryChanged = false;
    let storeChanged = false;

    const nextInventoryItems = [...inventoryItems];
    const nextStoreItems = [...storeItems];

    const removedTargets = REMOVED_BARISTA_ITEMS.map((item) => ({
      name: normalizeStockName(item.name),
      size: normalizeStockName(item.size),
    }));

    const filteredInventoryItems = nextInventoryItems.filter((item) => {
      const normalizedName = normalizeStockName(item.name);
      const normalizedSize = normalizeStockName(item.size ?? "");
      return !removedTargets.some((target) => target.name === normalizedName && target.size === normalizedSize);
    });
    if (filteredInventoryItems.length !== nextInventoryItems.length) {
      nextInventoryItems.splice(0, nextInventoryItems.length, ...filteredInventoryItems);
      inventoryChanged = true;
    }

    const filteredStoreItems = nextStoreItems.filter((item) => {
      const normalizedName = normalizeStockName(item.name);
      const normalizedSize = normalizeStockName(item.size ?? "");
      return !removedTargets.some((target) => target.name === normalizedName && target.size === normalizedSize);
    });
    if (filteredStoreItems.length !== nextStoreItems.length) {
      nextStoreItems.splice(0, nextStoreItems.length, ...filteredStoreItems);
      storeChanged = true;
    }

    for (const update of BARISTA_PRICE_UPDATES) {
      const inventoryIndex = nextInventoryItems.findIndex(
        (item) =>
          normalizeStockName(item.name) === normalizeStockName(update.name) &&
          normalizeStockName(item.size ?? "") === normalizeStockName(update.size),
      );
      if (inventoryIndex >= 0) {
        const current = nextInventoryItems[inventoryIndex];
        nextInventoryItems[inventoryIndex] = {
          ...current,
          buyingPrice: typeof update.buyingPrice === "number" ? update.buyingPrice : current.buyingPrice,
          stock:
            typeof update.stock === "number"
              ? update.stock
              : typeof update.stockDelta === "number"
                ? current.stock + update.stockDelta
                : current.stock,
        };
        inventoryChanged = true;
      }

      const storeIndex = nextStoreItems.findIndex(
        (item) =>
          item.lane === "barista" &&
          normalizeStockName(item.name) === normalizeStockName(update.name) &&
          normalizeStockName(item.size ?? "") === normalizeStockName(update.size),
      );
      if (storeIndex >= 0) {
        const current = nextStoreItems[storeIndex];
        nextStoreItems[storeIndex] = {
          ...current,
          buyingPrice: typeof update.buyingPrice === "number" ? update.buyingPrice : current.buyingPrice,
          stock:
            typeof update.stock === "number"
              ? update.stock
              : typeof update.stockDelta === "number"
                ? current.stock + update.stockDelta
                : current.stock,
        };
        storeChanged = true;
      }
    }

    for (const item of BARISTA_ADDITIONAL_ITEMS) {
      const inventoryIndex = nextInventoryItems.findIndex(
        (entry) =>
          normalizeStockName(entry.name) === normalizeStockName(item.name) &&
          normalizeStockName(entry.size ?? "") === normalizeStockName(item.size ?? ""),
      );

      if (inventoryIndex >= 0) {
        const current = nextInventoryItems[inventoryIndex];
        nextInventoryItems[inventoryIndex] = {
          ...current,
          barcode: item.barcode ?? current.barcode,
          category: item.category,
          subCategory: item.category,
          stock: item.stock,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          price: item.sellingPrice,
          totPerBottle: item.totPerBottle,
          totSold: item.totSold ?? current.totSold ?? 0,
          minStock: item.minStock,
          unit: item.unit,
          status: item.status ?? current.status,
        };
        inventoryChanged = true;
      } else {
        nextInventoryItems.push({
          id: `inv-${item.barcode || `${item.name}-${item.size}`}`,
          barcode: item.barcode || "",
          name: item.name,
          category: item.category,
          subCategory: item.category,
          size: item.size,
          stock: item.stock,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          price: item.sellingPrice,
          totPerBottle: item.totPerBottle,
          totSold: item.totSold ?? 0,
          minStock: item.minStock,
          unit: item.unit,
          status: item.status ?? "ACTIVE",
        });
        inventoryChanged = true;
      }

      const storeIndex = nextStoreItems.findIndex(
        (entry) =>
          entry.lane === "barista" &&
          normalizeStockName(entry.name) === normalizeStockName(item.name) &&
          normalizeStockName(entry.size ?? "") === normalizeStockName(item.size ?? ""),
      );

      if (storeIndex >= 0) {
        nextStoreItems[storeIndex] = {
          ...nextStoreItems[storeIndex],
          name: item.name,
          subCategory: item.category,
          size: item.size,
          stock: item.stock,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          minStock: item.minStock,
          unit: item.unit,
          lane: "barista",
          totLimit: item.totPerBottle,
          totSold: item.totSold ?? nextStoreItems[storeIndex].totSold ?? 0,
        };
        storeChanged = true;
      } else {
        nextStoreItems.push({
          id: `s-${item.barcode || `${item.name}-${item.size}`}`,
          name: item.name,
          subCategory: item.category,
          size: item.size,
          stock: item.stock,
          unit: item.unit,
          minStock: item.minStock,
          lane: "barista",
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          totLimit: item.totPerBottle,
          totSold: item.totSold ?? 0,
        });
        storeChanged = true;
      }
    }

    SODA_MERGE_GROUPS.forEach((group) => {
      const inventoryMatches = nextInventoryItems.filter(
        (item) =>
          normalizeStockName(item.size ?? "") === normalizeStockName(group.size) &&
          (group.names.some((name) => normalizeStockName(item.name) === normalizeStockName(name)) ||
            normalizeStockName(item.name) === "soda"),
      );
      if (inventoryMatches.length > 0) {
        const baseItem = inventoryMatches[0];
        const removeIds = new Set(inventoryMatches.map((item) => item.id));
        const mergedStock = inventoryMatches.reduce((sum, item) => sum + (item.stock || 0), 0);
        const mergedMinStock = Math.max(group.minStock, ...inventoryMatches.map((item) => item.minStock || 0));
        const mergedInventoryItem: InventoryItem = {
          ...baseItem,
          barcode: group.barcode,
          name: "Soda",
          category: "Bar",
          subCategory: "Soda",
          size: group.size,
          stock: mergedStock,
          buyingPrice: group.buyingPrice,
          sellingPrice: group.sellingPrice,
          price: group.sellingPrice,
          minStock: mergedMinStock,
          unit: group.unit,
        };
        const filteredInventoryItems = nextInventoryItems.filter((item) => !removeIds.has(item.id));
        filteredInventoryItems.push(mergedInventoryItem);
        nextInventoryItems.splice(0, nextInventoryItems.length, ...filteredInventoryItems);
        inventoryChanged = true;
      }

      const storeMatches = nextStoreItems.filter(
        (item) =>
          item.lane === "barista" &&
          normalizeStockName(item.size ?? "") === normalizeStockName(group.size) &&
          (group.names.some((name) => normalizeStockName(item.name) === normalizeStockName(name)) ||
            normalizeStockName(item.name) === "soda"),
      );
      if (storeMatches.length > 0) {
        const baseItem = storeMatches[0];
        const removeIds = new Set(storeMatches.map((item) => item.id));
        const mergedStock = storeMatches.reduce((sum, item) => sum + (item.stock || 0), 0);
        const mergedMinStock = Math.max(group.minStock, ...storeMatches.map((item) => item.minStock || 0));
        const mergedStoreItem: MainStoreItem = {
          ...baseItem,
          name: "Soda",
          subCategory: "Soda",
          size: group.size,
          stock: mergedStock,
          buyingPrice: group.buyingPrice,
          sellingPrice: group.sellingPrice,
          minStock: mergedMinStock,
          unit: group.unit,
          lane: "barista",
        };
        const filteredStoreItems = nextStoreItems.filter((item) => !removeIds.has(item.id));
        filteredStoreItems.push(mergedStoreItem);
        nextStoreItems.splice(0, nextStoreItems.length, ...filteredStoreItems);
        storeChanged = true;
      }
    });

    if (inventoryChanged) {
      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    if (storeChanged) {
      writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    }

    localStorage.setItem(BARISTA_INVENTORY_CORRECTION_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_FINANCE_PRICE_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];

    if (inventoryItems.length > 0 && storeItems.length > 0) {
      let hasChanges = false;
      const nextStoreItems = storeItems.map((item) => {
        if (item.lane !== "barista" || (typeof item.sellingPrice === "number" && item.sellingPrice > 0)) {
          return item;
        }

        const sellingPrice = resolveBarInventorySellingPrice(inventoryItems, item);
        if (sellingPrice <= 0) {
          return item;
        }

        hasChanges = true;
        return {
          ...item,
          sellingPrice,
        };
      });

      if (hasChanges) {
        writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
      }
    }

    localStorage.setItem(BARISTA_FINANCE_PRICE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_SHARED_STATE_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = (readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? []).filter((item) => item.lane === "barista");
    const baristaSnapshot = readPosState<{ id: string }, { id: string }, { id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>(
      STORAGE_BARISTA_STATE,
      "orange-hotel-barista-orders",
      "orange-hotel-barista-seq",
      "orange-hotel-barista-payments",
      "orange-hotel-barista-menu",
      490,
    );

    if (inventoryItems.length > 0 && storeItems.length > 0 && baristaSnapshot.menuItems.length > 0) {
      const nextMenuItems = syncBaristaMenuItemsWithSharedData(baristaSnapshot.menuItems, inventoryItems, storeItems);

      if (JSON.stringify(nextMenuItems) !== JSON.stringify(baristaSnapshot.menuItems)) {
        writePosState(STORAGE_BARISTA_STATE, baristaSnapshot.tickets, baristaSnapshot.ticketSeq, baristaSnapshot.payments, nextMenuItems);
      }
    }

    localStorage.setItem(BARISTA_SHARED_STATE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_MENU_REMOVAL_FIX_KEY)) {
    const baristaSnapshot = readPosState<{ id: string }, { id: string }, { id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>(
      STORAGE_BARISTA_STATE,
      "orange-hotel-barista-orders",
      "orange-hotel-barista-seq",
      "orange-hotel-barista-payments",
      "orange-hotel-barista-menu",
      490,
    );

    const nextMenuItems = syncBaristaMenuItemsWithSharedData(
      baristaSnapshot.menuItems,
      readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [],
      (readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? []).filter((item) => item.lane === "barista"),
    );

    if (JSON.stringify(nextMenuItems) !== JSON.stringify(baristaSnapshot.menuItems)) {
      writePosState(
        STORAGE_BARISTA_STATE,
        baristaSnapshot.tickets,
        baristaSnapshot.ticketSeq,
        baristaSnapshot.payments,
        nextMenuItems,
      );
    }

    localStorage.setItem(BARISTA_MENU_REMOVAL_FIX_KEY, "1");
  }

  if (!localStorage.getItem(JACK_DANIELS_TOTS_PRICE_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];
    const baristaSnapshot = readPosState<{ id: string }, { id: string }, { id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>(
      STORAGE_BARISTA_STATE,
      "orange-hotel-barista-orders",
      "orange-hotel-barista-seq",
      "orange-hotel-barista-payments",
      "orange-hotel-barista-menu",
      490,
    );

    const nextInventoryItems = inventoryItems.map((item) => {
      if (!isJackDaniels700Target(item.name, item.size)) return item;
      return {
        ...item,
        name: "Jack Daniels TOTS",
        category: "Bar",
        subCategory: "Whisky",
        size: "700ml",
        buyingPrice: 70000,
        sellingPrice: 10000,
        price: 10000,
        totPerBottle: 30,
        totSold: item.totSold ?? 0,
        unit: item.unit || "Bottle",
        minStock: item.minStock ?? 1,
        status: item.status ?? "ACTIVE",
      };
    });

    const nextStoreItems = storeItems.map((item) => {
      if (item.lane !== "barista" || !isJackDaniels700Target(item.name, item.size)) return item;
      return {
        ...item,
        name: "Jack Daniels",
        subCategory: "Whisky",
        size: "700ml",
        buyingPrice: 70000,
        sellingPrice: 10000,
        totLimit: 30,
        totSold: item.totSold ?? 0,
        unit: item.unit || "Bottle",
        minStock: item.minStock ?? 1,
      };
    });

    const nextMenuItems = baristaSnapshot.menuItems.map((item) => {
      if (!isJackDaniels700Target(item.name, "700ml")) return item;
      return {
        ...item,
        name: "Jack Daniels 700ml (TOTS)",
        price: 10000,
        category: item.category || "Whisky",
        barcode: item.barcode || "6200100270027",
      };
    });

    if (JSON.stringify(nextInventoryItems) !== JSON.stringify(inventoryItems)) {
      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    if (JSON.stringify(nextStoreItems) !== JSON.stringify(storeItems)) {
      writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    }

    if (JSON.stringify(nextMenuItems) !== JSON.stringify(baristaSnapshot.menuItems)) {
      writePosState(
        STORAGE_BARISTA_STATE,
        baristaSnapshot.tickets,
        baristaSnapshot.ticketSeq,
        baristaSnapshot.payments,
        nextMenuItems,
      );
    }

    localStorage.setItem(JACK_DANIELS_TOTS_PRICE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(STAFF_FOOD_DISHES_EXPENSE_REMOVAL_KEY)) {
    const expenses = readJson<ExpenseRecord[]>(STORAGE_EXPENSES) ?? [];
    const kitchenPurchaseHistory = readJson<KitchenPurchaseHistoryEntry[]>(STORAGE_KITCHEN_PURCHASE_HISTORY) ?? [];
    const nextExpenses = expenses.filter((expense) => !isStaffFoodDishesExpense(expense));
    const nextKitchenPurchaseHistory = kitchenPurchaseHistory.filter((entry) => !isStaffFoodDishesPurchaseHistory(entry));

    if (nextExpenses.length !== expenses.length) {
      writeJson(STORAGE_EXPENSES, nextExpenses);
    }

    if (nextKitchenPurchaseHistory.length !== kitchenPurchaseHistory.length) {
      writeJson(STORAGE_KITCHEN_PURCHASE_HISTORY, nextKitchenPurchaseHistory);
    }

    localStorage.setItem(STAFF_FOOD_DISHES_EXPENSE_REMOVAL_KEY, "1");
  }

  if (!localStorage.getItem(COMPANY_STOCK_SHEET_FIX_KEY)) {
    writeJson(STORAGE_COMPANY_STOCK, COMPANY_STOCK_SHEET);
    localStorage.setItem(COMPANY_STOCK_SHEET_FIX_KEY, "1");
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>('manager');
  const [shift, setShift] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeUsername, setActiveUsername] = useState("");
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);

  const allowedByRole: Record<Role, string[]> = {
    manager: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/menu-create', '/dashboard/company-stock', '/dashboard/cashier', '/dashboard/expenses', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/settings', '/dashboard/settings/sync', '/dashboard/settings/password'],
    director: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/company-stock', '/dashboard/cashier', '/dashboard/website-bookings', '/dashboard/live-chat', '/dashboard/expenses', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/analytics', '/dashboard/settings', '/dashboard/settings/sync', '/dashboard/settings/password'],
    inventory: ['/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/company-stock', '/dashboard/settings/password'],
    cashier: ['/dashboard/cashier', '/dashboard/website-bookings', '/dashboard/live-chat', '/dashboard/payments', '/dashboard/rooms', '/dashboard/settings/password'],
    kitchen: ['/dashboard/fnb-pos', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/payments', '/dashboard/settings/password'],
    barista: ['/dashboard/fnb-pos', '/dashboard/barista', '/dashboard/payments', '/dashboard/cancelled', '/dashboard/settings/password'],
  };

  const defaultByRole: Record<Role, string> = {
    manager: '/dashboard',
    director: '/dashboard',
    inventory: '/dashboard/inventory',
    cashier: '/dashboard/cashier',
    kitchen: '/dashboard/kitchen',
    barista: '/dashboard/barista',
  };

  useEffect(() => {
    let cancelled = false;

    async function initializeDashboard() {
      const savedRole = normalizeRole(localStorage.getItem('orange-hotel-role'));
      const savedShift = localStorage.getItem('orange-hotel-shift');
      if (!savedRole || !VALID_ROLES.includes(savedRole)) {
        localStorage.removeItem('orange-hotel-role');
        localStorage.removeItem('orange-hotel-shift');
        router.replace('/');
        return;
      }

      localStorage.setItem("orange-hotel-role", savedRole);
      setActiveUsername(readActiveSessionUsername(savedRole));
      setRole(savedRole);
      if (savedShift) setShift(savedShift);

      if (typeof window !== "undefined") {
        setSidebarOpen(window.innerWidth >= 768);
      }
      setMounted(true);

      try {
        await hydrateDefaultAppStateFromFirebase();
        if (cancelled) return;
        applyBusinessCorrections();
      } catch (error) {
        console.error("Dashboard hydration failed", error);
      }
    }

    void initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    const onSidebarClose = () => setSidebarOpen(false);

    window.addEventListener("resize", onResize);
    window.addEventListener("orange-hotel-sidebar-close", onSidebarClose as EventListener);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orange-hotel-sidebar-close", onSidebarClose as EventListener);
    };
  }, []);

  const saveUsername = async () => {
    const nextUsername = usernameDraft.trim();
    const previousUsername = activeUsername.trim();
    if (!nextUsername || !previousUsername) return;

    setUsernameSaving(true);
    setUsernameFeedback(null);
    try {
      const profiles = readLocalLoginProfiles() ?? {};
      const currentProfile = profiles[role] ?? {
        username: previousUsername,
        updatedAt: Date.now(),
        users: [],
      };
      const nextProfile = renameProfileUser(currentProfile, previousUsername, nextUsername);
      const saved = await saveLoginProfileToServer(role, nextProfile);
      if (!saved) {
        setUsernameFeedback("Username was not saved to the backend. No local change was applied.");
        return;
      }

      writeActiveSessionUsername(nextUsername);
      setActiveUsername(nextUsername);
      setUsernameDialogOpen(false);
    } finally {
      setUsernameSaving(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const allowedRoutes = allowedByRole[role];
    if (!allowedRoutes.includes(pathname)) {
      router.replace(defaultByRole[role]);
    }
  }, [mounted, pathname, role, router]);

  const isDirector = role === "director";
  const directorCurrentLabel =
    DIRECTOR_MOBILE_NAV.find((item) => item.href === pathname)?.label ??
    (pathname.includes("/inventory") ? "Stock" : pathname.includes("/settings") ? "Settings" : "Dashboard");

  if (!mounted) return null;

  return (
    <div className={cn("flex min-h-[100dvh] w-full overflow-x-hidden bg-background", isDirector && "bg-[#f4f7f2] md:bg-background")}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-[100dvh] w-64 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarNav role={role} />
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}
      
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-300", sidebarOpen ? "md:ml-64" : "md:ml-0")}>
        <header
          className={cn(
            "h-16 bg-white border-b sticky top-0 z-30 flex items-center justify-between px-8 shadow-sm",
            isDirector && "h-auto min-h-[calc(68px+env(safe-area-inset-top))] border-0 bg-[#0f1712] px-4 pt-[env(safe-area-inset-top)] text-white shadow-lg shadow-black/10 md:h-16 md:min-h-[4rem] md:border-b md:bg-white md:px-8 md:pt-0 md:text-foreground md:shadow-sm",
          )}
        >
          <div className={cn("flex items-center gap-4 w-full md:w-1/3", isDirector && "w-auto min-w-0")}>
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Toggle sidebar"
              className={cn(
                "h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-muted transition-colors",
                isDirector && "shrink-0 border-white/15 bg-white/10 hover:bg-white/15 md:border-input md:bg-transparent md:hover:bg-muted",
              )}
            >
              <Menu className="w-4 h-4" />
            </button>
            {isDirector && (
              <div className="min-w-0 text-left md:hidden">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/80">Orange MD</p>
                <p className="truncate text-sm font-black uppercase tracking-tight">{directorCurrentLabel}</p>
              </div>
            )}
            <div className={cn("relative w-full max-w-sm", isDirector && "hidden md:block")}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-10 h-9 bg-muted/50 border-none focus-visible:ring-primary text-sm" 
              />
            </div>
          </div>

          <div className={cn("flex items-center gap-6", isDirector && "gap-2 md:gap-6")}>
            {shift && (
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary text-primary px-2">
                <Clock className="w-3 h-3 mr-1" /> {shift}
              </Badge>
            )}
            
            <div className={cn("flex items-center gap-4 text-muted-foreground", isDirector && "hidden md:flex")}>
              <SyncStatusIndicator />
              <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-white" />
              </button>
            </div>
            
            <div className={cn("flex items-center gap-3 border-l pl-6", isDirector && "border-l-0 pl-0 md:border-l md:pl-6")}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">{activeUsername || role}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Username</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black leading-none uppercase tracking-tight">{role}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Active Session</p>
              </div>
              <div className={cn("w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg", isDirector && "rounded-lg bg-white/10 ring-1 ring-white/15 md:bg-secondary md:ring-0")}>
                <User className="w-5 h-5" />
              </div>
              <Button
                type="button"
                variant="outline"
                className={cn("h-9 text-[10px] font-black uppercase tracking-widest", isDirector && "hidden md:inline-flex")}
                onClick={() => {
                  setUsernameDraft(activeUsername || role);
                  setUsernameDialogOpen(true);
                }}
              >
                Change Username
              </Button>
            </div>
          </div>
        </header>

        <main className={cn("min-w-0 flex-1 p-8", isDirector && "px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4 md:p-8")}>
          {children}
        </main>
      </div>

      {isDirector && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0f1712]/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-12px_30px_rgba(0,0,0,0.18)] backdrop-blur md:hidden">
          <div className="grid grid-cols-5 gap-1">
            {DIRECTOR_MOBILE_NAV.map((item) => {
              const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-black uppercase tracking-tight text-white/55 transition-colors",
                    active && "bg-white text-[#0f1712]",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Change Username</DialogTitle>
            <DialogDescription>Update the username for the current logged-in account.</DialogDescription>
          </DialogHeader>
          <Input
            value={usernameDraft}
            onChange={(event) => setUsernameDraft(event.target.value)}
            placeholder="Enter new username"
            className="h-11"
          />
          {usernameFeedback && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-700">
              {usernameFeedback}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsernameDialogOpen(false)} disabled={usernameSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveUsername()} disabled={!usernameDraft.trim() || usernameSaving}>
              {usernameSaving ? "Saving..." : "Update Username"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
