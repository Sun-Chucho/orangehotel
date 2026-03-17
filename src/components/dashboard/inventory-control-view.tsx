"use client";

import { useEffect, useMemo, useState } from "react";
import { readStoredRole } from "@/app/lib/auth";
import { InventoryItem } from "@/app/lib/mock-data";
import {
  getStoreItemLabel,
  MainStoreItem,
  normalizeBaristaProductTarget,
  normalizeStockName,
  STORAGE_INVENTORY_ITEMS,
  STORAGE_MAIN_STORE_ITEMS,
  STORAGE_STOCK_LOGIC,
  STORAGE_STORE_MOVEMENTS,
  STORAGE_STORE_USAGE,
  StockLogicRule,
  StoreLane,
  StoreMovementLog,
  StoreUsageLog,
  TransferDestination,
} from "@/app/lib/inventory-transfer";
import { readJson, STORAGE_BARISTA_STATE, writeJson } from "@/app/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

export type InventoryTab =
  | "kitchen-stock"
  | "barista-stock";

type ItemCategory = "Kitchen" | "Bar";

interface PosPaymentRecord {
  total: number;
  lines?: Array<{ name: string; qty: number }>;
}

interface PosStateSnapshot {
  payments?: PosPaymentRecord[];
  menuItems?: Array<{ name: string; price: number }>;
}

const KITCHEN_CATEGORY_OPTIONS = [
  "Fruits",
  "Vegetables",
  "Herbs",
  "Frozen - Meat",
  "Frozen - Fish",
  "Butter & Cheese",
  "Dry Goods",
  "Juices & Drinks",
  "Cleaning / Household",
] as const;

const BARISTA_CATEGORY_OPTIONS = [
  "Coffee",
  "Tea",
  "Soda",
  "Soft Drink",
  "Beer",
  "Wine",
  "Whisky",
  "Gin",
  "Spirit",
  "Cider",
  "Water",
  "Energy Drink",
  "Snacks",
] as const;

const BARISTA_CATEGORY_KEYS = new Set(BARISTA_CATEGORY_OPTIONS.map((value) => normalizeStockName(value)));

function getStockLabel(stock: number, minStock: number) {
  if (stock <= 0) return "Out";
  if (stock < minStock) return "Low";
  return "In Stock";
}

function getLogicLabel(rule: StockLogicRule | undefined) {
  if (!rule) return "No Logic";
  return `1 ${rule.storeUnit} -> ${rule.unitToMenu} ${rule.departmentUnit}`;
}

function normalizeBaristaFinanceTarget(value: string) {
  return normalizeBaristaProductTarget(value);
}

function inventoryMatchesStoreItem(entry: InventoryItem, lane: StoreLane, item: Pick<MainStoreItem, "name" | "size" | "subCategory">) {
  const nameMatches =
    normalizeStockName(entry.name) === normalizeStockName(item.name) &&
    normalizeStockName(entry.size ?? "") === normalizeStockName(item.size ?? "");

  if (!nameMatches) return false;

  if (lane === "kitchen") {
    return normalizeStockName(entry.category) === "kitchen";
  }

  const entryCategory = normalizeStockName(entry.category);
  const entrySubCategory = normalizeStockName(entry.subCategory ?? "");
  const targetSubCategory = normalizeStockName(item.subCategory ?? "");

  return (
    entryCategory === "bar" ||
    entrySubCategory === "bar" ||
    BARISTA_CATEGORY_KEYS.has(entryCategory) ||
    BARISTA_CATEGORY_KEYS.has(entrySubCategory) ||
    (!!targetSubCategory && (entryCategory === targetSubCategory || entrySubCategory === targetSubCategory))
  );
}

export function InventoryControlView({
  initialTab,
  visibleTabs = ["kitchen-stock", "barista-stock"],
}: {
  initialTab: InventoryTab;
  visibleTabs?: InventoryTab[];
}) {
  const isDirector = useIsDirector();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [baristaPayments, setBaristaPayments] = useState<PosPaymentRecord[]>([]);
  const [baristaMenuItems, setBaristaMenuItems] = useState<Array<{ name: string; price: number }>>([]);

  const [kitchenName, setKitchenName] = useState("");
  const [kitchenSubCategory, setKitchenSubCategory] = useState("");
  const [kitchenSize, setKitchenSize] = useState("");
  const [kitchenQty, setKitchenQty] = useState("0");
  const [kitchenUnit, setKitchenUnit] = useState("kg");
  const [kitchenThreshold, setKitchenThreshold] = useState("1");
  const [kitchenDamages, setKitchenDamages] = useState("0");
  const [kitchenReceivedStock, setKitchenReceivedStock] = useState("0");
  const [editingKitchenItemId, setEditingKitchenItemId] = useState("");

  const [baristaName, setBaristaName] = useState("");
  const [baristaSubCategory, setBaristaSubCategory] = useState("");
  const [baristaSize, setBaristaSize] = useState("");
  const [baristaQty, setBaristaQty] = useState("0");
  const [baristaUnit, setBaristaUnit] = useState("kg");
  const [baristaThreshold, setBaristaThreshold] = useState("1");
  const [baristaBuyingPrice, setBaristaBuyingPrice] = useState("");
  const [baristaSellingPrice, setBaristaSellingPrice] = useState("");
  const [sellingPriceDrafts, setSellingPriceDrafts] = useState<Record<string, string>>({});
  const [editModal, setEditModal] = useState<{
    lane: StoreLane;
    itemId: string;
    name: string;
    category: string;
    size: string;
    qty: string;
    buyingPrice: string;
    sellingPrice: string;
    damages: string;
    receivedStock: string;
    lowThreshold: string;
    status: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const canViewBuyingPrice = role === "inventory";
  const isInventoryRole = role === "inventory";
  const effectiveVisibleTabs = useMemo(
    () => (isInventoryRole ? visibleTabs.filter((tab) => tab !== "barista-stock") : visibleTabs),
    [isInventoryRole, visibleTabs],
  );

  useEffect(() => {
    setRole(readStoredRole());
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!effectiveVisibleTabs.includes(activeTab)) {
      setActiveTab(effectiveVisibleTabs[0] ?? "kitchen-stock");
    }
  }, [activeTab, effectiveVisibleTabs]);

  useEffect(() => {
    const applyInventorySnapshot = () => {
      const inv = readJson<InventoryItem[]>(STORAGE_INVENTORY_ITEMS) ?? [];
      const store = readJson<Array<MainStoreItem & { lane?: StoreLane }>>(STORAGE_MAIN_STORE_ITEMS) ?? [];
      const baristaState = readJson<PosStateSnapshot>(STORAGE_BARISTA_STATE);
      const normalizedStore: MainStoreItem[] = store.map((item) => ({
        ...item,
        lane: item.lane === "barista" ? "barista" : "kitchen",
      }));
      setItems(inv);
      setStoreItems(normalizedStore);
      setBaristaPayments(Array.isArray(baristaState?.payments) ? baristaState.payments : []);
      setBaristaMenuItems(Array.isArray(baristaState?.menuItems) ? baristaState.menuItems : []);
    };

    applyInventorySnapshot();
    const unsubscribeInventory = subscribeToSyncedStorageKey(STORAGE_INVENTORY_ITEMS, applyInventorySnapshot);
    const unsubscribeStore = subscribeToSyncedStorageKey(STORAGE_MAIN_STORE_ITEMS, applyInventorySnapshot);
    const unsubscribeBarista = subscribeToSyncedStorageKey(STORAGE_BARISTA_STATE, applyInventorySnapshot);

    return () => {
      unsubscribeInventory();
      unsubscribeStore();
      unsubscribeBarista();
    };
  }, []);

  const kitchenStore = useMemo(() => storeItems.filter((item) => item.lane === "kitchen"), [storeItems]);
  const baristaStore = useMemo(() => storeItems.filter((item) => item.lane === "barista"), [storeItems]);
  const kitchenInventoryItems = useMemo(() => items.filter((item) => item.category === "Kitchen"), [items]);
  const baristaInventoryItems = useMemo(() => items.filter((item) => item.category === "Bar"), [items]);
  const canViewBaristaFinance = role === "manager" || role === "director";

  const resolveBaristaInventoryMatch = (item: MainStoreItem) =>
    items.find((entry) => {
      if (entry.category !== "Bar") return false;

      const storeTargets = [
        item.name,
        getStoreItemLabel(item),
      ].map(normalizeBaristaFinanceTarget);

      const inventoryTargets = [
        entry.name,
        entry.size ? `${entry.name} ${entry.size}` : entry.name,
      ].map(normalizeBaristaFinanceTarget);

      return storeTargets.some((target) => inventoryTargets.includes(target));
    });

  const baristaSalesByItem = useMemo(() => {
    const salesMap = new Map<string, number>();

    baristaPayments.forEach((payment) => {
      if (!Array.isArray(payment.lines)) return;

      payment.lines.forEach((line) => {
        const key = normalizeBaristaFinanceTarget(line.name);
        salesMap.set(key, (salesMap.get(key) ?? 0) + line.qty);
      });
    });

    return salesMap;
  }, [baristaPayments]);

  const baristaMenuPriceByItem = useMemo(() => {
    const priceMap = new Map<string, number>();

    baristaMenuItems.forEach((item) => {
      const key = normalizeBaristaFinanceTarget(item.name);
      if (typeof item.price === "number" && item.price > 0) {
        priceMap.set(key, item.price);
      }
    });

    return priceMap;
  }, [baristaMenuItems]);

  const baristaFinanceRows = useMemo(
    () =>
      baristaStore.map((item) => {
        const inventoryMatch = resolveBaristaInventoryMatch(item);
        const buyingPrice =
          typeof item.buyingPrice === "number" && item.buyingPrice > 0
            ? item.buyingPrice
            : typeof inventoryMatch?.buyingPrice === "number" && inventoryMatch.buyingPrice > 0
              ? inventoryMatch.buyingPrice
              : 0;
        const sellingPrice =
          typeof baristaMenuPriceByItem.get(normalizeBaristaFinanceTarget(getStoreItemLabel(item))) === "number" &&
          (baristaMenuPriceByItem.get(normalizeBaristaFinanceTarget(getStoreItemLabel(item))) ?? 0) > 0
            ? (baristaMenuPriceByItem.get(normalizeBaristaFinanceTarget(getStoreItemLabel(item))) ?? 0)
            : typeof item.sellingPrice === "number" && item.sellingPrice > 0
            ? item.sellingPrice
            : typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0
              ? inventoryMatch.sellingPrice
              : typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0
                ? inventoryMatch.price
                : 0;
        const quantitySold = baristaSalesByItem.get(normalizeBaristaFinanceTarget(getStoreItemLabel(item))) ?? 0;
        const capital = item.stock * buyingPrice;
        const revenue = quantitySold * sellingPrice;
        const profitLoss = revenue - capital;

        return {
          ...item,
          displayName: getStoreItemLabel(item),
          buyingPrice,
          sellingPrice,
          quantitySold,
          capital,
          revenue,
          profitLoss,
        };
      }),
    [baristaMenuPriceByItem, baristaSalesByItem, baristaStore, items],
  );

  const baristaCapitalTotal = useMemo(
    () => baristaFinanceRows.reduce((sum, item) => sum + item.capital, 0),
    [baristaFinanceRows],
  );
  const baristaRevenueTotal = useMemo(
    () => {
      const itemizedRevenue = baristaFinanceRows.reduce((sum, item) => sum + item.revenue, 0);
      const fallbackRevenue = baristaPayments
        .filter((payment) => !Array.isArray(payment.lines) || payment.lines.length === 0)
        .reduce((sum, payment) => sum + (payment.total || 0), 0);
      return itemizedRevenue + fallbackRevenue;
    },
    [baristaFinanceRows, baristaPayments],
  );
  const baristaProfitLossTotal = useMemo(
    () => baristaRevenueTotal - baristaCapitalTotal,
    [baristaCapitalTotal, baristaRevenueTotal],
  );

  const resetStoreForm = (lane: StoreLane) => {
    if (lane === "kitchen") {
      setEditingKitchenItemId("");
      setKitchenName("");
      setKitchenSubCategory("");
      setKitchenSize("");
      setKitchenQty("0");
      setKitchenUnit("kg");
      setKitchenThreshold("1");
      setKitchenDamages("0");
      setKitchenReceivedStock("0");
      return;
    }

    setBaristaName("");
    setBaristaSubCategory("");
    setBaristaSize("");
    setBaristaQty("0");
    setBaristaUnit("kg");
    setBaristaThreshold("1");
    setBaristaBuyingPrice("");
    setBaristaSellingPrice("");
  };

  const saveInlineSellingPrice = (lane: StoreLane, itemId: string, rawValue: string) => {
    if (isDirector) return;

    const sellingPrice = Number(rawValue);
    if (Number.isNaN(sellingPrice) || sellingPrice < 0) return;

    const matchingStore = storeItems.find((entry) => entry.id === itemId && entry.lane === lane);
    if (!matchingStore) return;

    const nextStoreItems = storeItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            sellingPrice,
          }
        : item,
    );
    const nextInventoryItems = items.map((item) => {
      if (inventoryMatchesStoreItem(item, lane, matchingStore)) {
        return {
          ...item,
          sellingPrice,
          price: sellingPrice,
        };
      }
      return item;
    });

    setStoreItems(nextStoreItems);
    setItems(nextInventoryItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventoryItems);
  };

  const openEditModal = (lane: StoreLane, item: MainStoreItem) => {
    const inventoryItem = items.find((entry) => inventoryMatchesStoreItem(entry, lane, item));
    const resolvedSellingPrice =
      typeof item.sellingPrice === "number" && item.sellingPrice > 0
        ? item.sellingPrice
        : typeof inventoryItem?.sellingPrice === "number" && inventoryItem.sellingPrice > 0
          ? inventoryItem.sellingPrice
          : typeof inventoryItem?.price === "number" && inventoryItem.price > 0
            ? inventoryItem.price
            : 0;

    setEditModal({
      lane,
      itemId: item.id,
      name: item.name,
      category: item.subCategory ?? "",
      size: item.size ?? "",
      qty: String(item.stock),
      buyingPrice: String(item.buyingPrice ?? 0),
      sellingPrice: String(resolvedSellingPrice),
      damages: String(item.damages ?? 0),
      receivedStock: String(item.receivedStock ?? 0),
      lowThreshold: String(item.minStock),
      status: inventoryItem?.status ?? "ACTIVE",
    });
  };

  const addStoreItem = async (lane: StoreLane) => {
    if (isDirector) return;

    const name = lane === "kitchen" ? kitchenName : baristaName;
    const subCategory = (lane === "kitchen" ? kitchenSubCategory : baristaSubCategory).trim();
    const size = (lane === "kitchen" ? kitchenSize : baristaSize).trim();
    const qtyRaw = lane === "kitchen" ? kitchenQty : baristaQty;
    const unit = lane === "kitchen" ? kitchenUnit : baristaUnit;
    const thresholdRaw = lane === "kitchen" ? kitchenThreshold : baristaThreshold;
    const buyingRaw = lane === "kitchen" ? "" : baristaBuyingPrice;
    const sellingRaw = lane === "kitchen" ? "" : baristaSellingPrice;
    const damagesRaw = lane === "kitchen" ? kitchenDamages : "0";
    const receivedStockRaw = lane === "kitchen" ? kitchenReceivedStock : "0";
    
    const qty = Number(qtyRaw);
    const threshold = Number(thresholdRaw);
    const buyingPrice = Number(buyingRaw) || 0;
    const sellingPrice = Number(sellingRaw) || 0;
    const damages = Number(damagesRaw) || 0;
    const receivedStock = Number(receivedStockRaw) || 0;

    if (
      !name.trim() ||
      Number.isNaN(qty) ||
      qty < 0 ||
      !unit.trim() ||
      Number.isNaN(threshold) ||
      threshold < 0 ||
      Number.isNaN(damages) ||
      damages < 0 ||
      Number.isNaN(receivedStock) ||
      receivedStock < 0
    ) {
      return;
    }
    if (lane === "barista" && sellingPrice <= 0) return;

    const approved = await confirm({
      title: "Add Stock Item",
      description: `Are you sure you want to add ${name.trim()} to ${lane} stock?`,
      actionLabel: "Add Item",
    });
    if (!approved) return;

    const nextStoreRecord: MainStoreItem = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      subCategory,
      size,
      stock: qty,
      unit: unit.trim(),
      minStock: threshold,
      lane,
      buyingPrice: canViewBuyingPrice ? buyingPrice : 0,
      sellingPrice,
      damages,
      receivedStock,
    };

    const nextStoreItems = [nextStoreRecord, ...storeItems];

    setStoreItems(nextStoreItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);

    const nextInventoryItems = [...items];
    const category = lane === "kitchen" ? "Kitchen" : "Bar";
    nextInventoryItems.unshift({
      id: `inv-${Date.now()}`,
      barcode: "",
      name: name.trim(),
      category,
      subCategory,
      size,
      stock: qty,
      totSold: 0,
      buyingPrice: canViewBuyingPrice ? buyingPrice : 0,
      sellingPrice,
      price: sellingPrice,
      status: "ACTIVE",
      minStock: threshold,
      unit: unit.trim(),
      damages,
      receivedStock,
    });
    setItems(nextInventoryItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventoryItems);
    resetStoreForm(lane);
  };

  const saveEditedItem = async () => {
    if (isDirector) return;
    if (!editModal) return;

    const qty = Number(editModal.qty);
    const buyingPrice = Number(editModal.buyingPrice);
    const sellingPrice = Number(editModal.sellingPrice);
    const damages = Number(editModal.damages);
    const receivedStock = Number(editModal.receivedStock);
    const minStock = Number(editModal.lowThreshold);

    if (
      !editModal.name.trim() ||
      Number.isNaN(qty) ||
      qty < 0 ||
      Number.isNaN(damages) ||
      damages < 0 ||
      Number.isNaN(receivedStock) ||
      receivedStock < 0 ||
      (editModal.lane !== "kitchen" && Number.isNaN(buyingPrice)) ||
      (editModal.lane !== "kitchen" && buyingPrice < 0) ||
      (editModal.lane !== "kitchen" && Number.isNaN(sellingPrice)) ||
      (editModal.lane !== "kitchen" && sellingPrice < 0) ||
      Number.isNaN(minStock) ||
      minStock < 0
    ) return;

    const approved = await confirm({
      title: "Update Stock Item",
      description: `Are you sure you want to update ${editModal.name.trim()}?`,
      actionLabel: "Update Item",
    });
    if (!approved) return;

    const nextStoreItems = storeItems.map((item) =>
      item.id === editModal.itemId
        ? {
            ...item,
            name: editModal.name.trim(),
            subCategory: editModal.category.trim(),
            size: editModal.size.trim(),
            stock: qty,
            minStock: minStock,
            buyingPrice: editModal.lane === "kitchen" ? 0 : buyingPrice,
            sellingPrice: editModal.lane === "kitchen" ? 0 : sellingPrice,
            damages,
            receivedStock,
          }
        : item,
    );
    const nextInventoryItems = items.map((item) => {
      const matchingStore = storeItems.find((entry) => entry.id === editModal.itemId);
      if (matchingStore && inventoryMatchesStoreItem(item, editModal.lane, matchingStore)) {
        return {
          ...item,
          name: editModal.name.trim(),
          subCategory: editModal.category.trim(),
          size: editModal.size.trim(),
          stock: qty,
          buyingPrice: editModal.lane === "kitchen" ? 0 : buyingPrice,
          sellingPrice: editModal.lane === "kitchen" ? 0 : sellingPrice,
          price: editModal.lane === "kitchen" ? 0 : sellingPrice,
          minStock,
          damages,
          receivedStock,
          status: editModal.status,
        };
      }
      return item;
    });

    setStoreItems(nextStoreItems);
    setItems(nextInventoryItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventoryItems);
    setEditModal(null);
  };

  const clearDepartmentInventory = async (lane: StoreLane) => {
    if (isDirector) return;

    const label = lane === "kitchen" ? "Kitchen" : "Bar";
    const destinationCategory: ItemCategory = lane === "kitchen" ? "Kitchen" : "Bar";

    const approved = await confirm({
      title: `Clear ${label} Inventory`,
      description: `Are you sure you want to clear all ${label.toLowerCase()} stock?`,
      actionLabel: `Clear ${label}`,
    });
    if (!approved) return;

    const nextItems = items.filter((item) => item.category !== destinationCategory);
    const nextStoreItems = storeItems.filter((item) => item.lane !== lane);

    setItems(nextItems);
    setStoreItems(nextStoreItems);

    writeJson(STORAGE_INVENTORY_ITEMS, nextItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);

    if (lane === "kitchen") {
      resetStoreForm("kitchen");
      return;
    }

    resetStoreForm("barista");
  };

  const renderStoreCard = (lane: StoreLane, title: string, list: MainStoreItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
        <CardDescription>
          {lane === "kitchen" && isInventoryRole
            ? "Inventory manager can adjust existing kitchen stock and record damages."
            : "Add or edit stock with the same core fields shown in the table."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {!(lane === "kitchen" && isInventoryRole) && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2">
          <Input
            value={lane === "kitchen" ? kitchenName : baristaName}
            onChange={(event) => (lane === "kitchen" ? setKitchenName(event.target.value) : setBaristaName(event.target.value))}
            placeholder="Item name"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={lane === "kitchen" ? kitchenSubCategory : baristaSubCategory}
            onChange={(event) => (lane === "kitchen" ? setKitchenSubCategory(event.target.value) : setBaristaSubCategory(event.target.value))}
          >
            <option value="">Select category</option>
            {(lane === "kitchen" ? KITCHEN_CATEGORY_OPTIONS : BARISTA_CATEGORY_OPTIONS).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <Input
            value={lane === "kitchen" ? kitchenSize : baristaSize}
            onChange={(event) => (lane === "kitchen" ? setKitchenSize(event.target.value) : setBaristaSize(event.target.value))}
            placeholder="Size"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenQty : baristaQty}
            onChange={(event) => (lane === "kitchen" ? setKitchenQty(event.target.value) : setBaristaQty(event.target.value))}
            placeholder="Quantity"
          />
          <Input
            value={lane === "kitchen" ? kitchenUnit : baristaUnit}
            onChange={(event) => (lane === "kitchen" ? setKitchenUnit(event.target.value) : setBaristaUnit(event.target.value))}
            placeholder="Unit"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenThreshold : baristaThreshold}
            onChange={(event) => (lane === "kitchen" ? setKitchenThreshold(event.target.value) : setBaristaThreshold(event.target.value))}
            placeholder="Low threshold"
          />
          {lane === "kitchen" && (
            <Input
              type="number"
              min="0"
              value={kitchenDamages}
              onChange={(event) => setKitchenDamages(event.target.value)}
              placeholder="Damages"
            />
          )}
          {lane === "kitchen" ? (
            <Input
              type="number"
              min="0"
              value={kitchenReceivedStock}
              onChange={(event) => setKitchenReceivedStock(event.target.value)}
              placeholder="Received stock"
            />
          ) : (
            <>
              {canViewBuyingPrice && (
                <Input
                  type="number"
                  min="0"
                  value={baristaBuyingPrice}
                  onChange={(event) => setBaristaBuyingPrice(event.target.value)}
                  placeholder="BP (Optional)"
                />
              )}
              <Input
                type="number"
                min="0"
                value={baristaSellingPrice}
                onChange={(event) => setBaristaSellingPrice(event.target.value)}
                placeholder="Selling Price"
              />
            </>
          )}
          <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => addStoreItem(lane)} disabled={isDirector}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
          <Button
            variant="outline"
            className="h-10 font-black uppercase text-[10px] tracking-widest"
            onClick={() => clearDepartmentInventory(lane)}
            disabled={isDirector}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Size</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
              {lane === "kitchen" ? (
                <>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Damages</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Received Stock</TableHead>
                </>
              ) : (
                <>
                  {canViewBuyingPrice && <TableHead className="font-black uppercase text-[10px] tracking-widest">Buying Price</TableHead>}
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Selling Price</TableHead>
                </>
              )}
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Low Threshold</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item: any) => {
              const inventoryMatch = items.find((entry) => inventoryMatchesStoreItem(entry, lane, item));
              const displaySellingPrice =
                typeof item.sellingPrice === "number" && item.sellingPrice > 0
                  ? item.sellingPrice
                  : typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0
                    ? inventoryMatch.sellingPrice
                    : typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0
                      ? inventoryMatch.price
                      : null;

              return (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.subCategory ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.size ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                {lane === "kitchen" ? (
                  <>
                    <TableCell className="font-bold">{item.damages ?? 0}</TableCell>
                    <TableCell className="font-bold">{item.receivedStock ?? 0}</TableCell>
                  </>
                ) : (
                  <>
                    {canViewBuyingPrice && (
                      <TableCell className="font-bold">
                        {typeof item.buyingPrice === "number" && item.buyingPrice > 0 ? `TSh ${item.buyingPrice.toLocaleString()}` : "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-bold">
                      {isDirector ? (
                        typeof displaySellingPrice === "number" && displaySellingPrice > 0 ? `TSh ${displaySellingPrice.toLocaleString()}` : "-"
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          value={sellingPriceDrafts[item.id] ?? (typeof displaySellingPrice === "number" && displaySellingPrice > 0 ? String(displaySellingPrice) : "")}
                          onChange={(event) =>
                            setSellingPriceDrafts((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          onBlur={(event) => {
                            saveInlineSellingPrice(lane, item.id, event.target.value);
                            setSellingPriceDrafts((current) => {
                              const next = { ...current };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          placeholder="Selling price"
                          className="h-9 min-w-[120px]"
                        />
                      )}
                    </TableCell>
                  </>
                )}
                <TableCell className="font-bold">{item.minStock}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(lane, item)} disabled={isDirector}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={lane === "kitchen" ? 9 : canViewBuyingPrice ? 9 : 8} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                  No stock recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderInventoryTable = (title: string, inventoryItems: InventoryItem[], lane: StoreLane) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
              {lane === "kitchen" ? (
                <>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Damages</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Received Stock</TableHead>
                </>
              ) : (
                <>
                  {canViewBuyingPrice && <TableHead className="font-black uppercase text-[10px] tracking-widest">Buying Price</TableHead>}
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Selling Price</TableHead>
                </>
              )}
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Threshold</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.subCategory ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                {lane === "kitchen" ? (
                  <>
                    <TableCell className="font-bold">{item.damages ?? 0}</TableCell>
                    <TableCell className="font-bold">{item.receivedStock ?? 0}</TableCell>
                  </>
                ) : (
                  <>
                    {canViewBuyingPrice && (
                      <TableCell className="font-bold">
                        {typeof item.buyingPrice === "number" && item.buyingPrice > 0 ? `TSh ${item.buyingPrice.toLocaleString()}` : "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-bold">
                      {typeof item.sellingPrice === "number" && item.sellingPrice > 0 ? `TSh ${item.sellingPrice.toLocaleString()}` : (typeof item.price === "number" && item.price > 0 ? `TSh ${item.price.toLocaleString()}` : "-")}
                    </TableCell>
                  </>
                )}
                <TableCell className="font-bold">{item.minStock}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
              </TableRow>
            ))}
            {inventoryItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={lane === "kitchen" ? 7 : canViewBuyingPrice ? 7 : 6} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                  No stock entries found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderBaristaFinance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barista Orange Capital</p>
            <p className="mt-2 text-2xl font-black">TSh {baristaCapitalTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barista Orange Revenue</p>
            <p className="mt-2 text-2xl font-black">TSh {baristaRevenueTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profit And Loss</p>
            <p className={`mt-2 text-2xl font-black ${baristaProfitLossTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              TSh {baristaProfitLossTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">Barista Stock Finance</CardTitle>
          <CardDescription>
            Capital = quantity in stock x buying price. Revenue = quantity sold x selling price. Profit/Loss = revenue - capital.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock Qty</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty Sold</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Buying Price</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Capital</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Selling Price</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Revenue</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baristaFinanceRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold">{item.displayName}</TableCell>
                  <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                  <TableCell className="font-bold">{item.quantitySold}</TableCell>
                  <TableCell className="font-bold">{item.buyingPrice > 0 ? `TSh ${item.buyingPrice.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="font-bold">TSh {item.capital.toLocaleString()}</TableCell>
                  <TableCell className="font-bold">{item.sellingPrice > 0 ? `TSh ${item.sellingPrice.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="font-bold">TSh {item.revenue.toLocaleString()}</TableCell>
                  <TableCell className={`font-bold ${item.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    TSh {item.profitLoss.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {baristaFinanceRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    No barista finance records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {dialog}
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Control</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Stock inventory for kitchen and barista
        </p>
      </header>

      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Stock visibility only
          </CardContent>
        </Card>
      )}

      {effectiveVisibleTabs.length > 1 && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)}>
          <TabsList className="h-11">
            {effectiveVisibleTabs.includes("kitchen-stock") && (
              <TabsTrigger value="kitchen-stock" className="font-black uppercase text-[10px] tracking-widest">Kitchen Stock</TabsTrigger>
            )}
            {effectiveVisibleTabs.includes("barista-stock") && (
              <TabsTrigger value="barista-stock" className="font-black uppercase text-[10px] tracking-widest">Barista Stock</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {activeTab === "kitchen-stock" && (
        <div className="space-y-6">
          {renderStoreCard("kitchen", "Kitchen Stock", kitchenStore)}
          {renderInventoryTable("Kitchen Inventory Records", kitchenInventoryItems, "kitchen")}
        </div>
      )}

      {activeTab === "barista-stock" && (
        <div className="space-y-6">
          {renderStoreCard("barista", "Barista Stock", baristaStore)}
          {renderInventoryTable("Barista Inventory Records", baristaInventoryItems, "barista")}
          {canViewBaristaFinance && renderBaristaFinance()}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Edit Stock Item</CardTitle>
                <CardDescription>Update the stock record details below.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditModal(null)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item Name</p>
                <Input
                  value={editModal.name}
                  onChange={(event) => setEditModal({ ...editModal, name: event.target.value })}
                  placeholder="Item name"
                  disabled={isInventoryRole && editModal.lane === "kitchen"}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editModal.category}
                  onChange={(event) => setEditModal({ ...editModal, category: event.target.value })}
                  disabled={isInventoryRole && editModal.lane === "kitchen"}
                >
                  <option value="">Select category</option>
                  {(editModal.lane === "kitchen" ? KITCHEN_CATEGORY_OPTIONS : BARISTA_CATEGORY_OPTIONS).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Size</p>
                <Input
                  value={editModal.size}
                  onChange={(event) => setEditModal({ ...editModal, size: event.target.value })}
                  placeholder="Size"
                  disabled={isInventoryRole && editModal.lane === "kitchen"}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qty</p>
                <Input type="number" min="0" value={editModal.qty} onChange={(event) => setEditModal({ ...editModal, qty: event.target.value })} placeholder="Qty" />
              </div>
              {editModal.lane === "kitchen" ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Damages</p>
                    <Input type="number" min="0" value={editModal.damages} onChange={(event) => setEditModal({ ...editModal, damages: event.target.value })} placeholder="Damages" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Received Stock</p>
                    <Input type="number" min="0" value={editModal.receivedStock} onChange={(event) => setEditModal({ ...editModal, receivedStock: event.target.value })} placeholder="Received stock" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Buying Price</p>
                    <Input type="number" min="0" value={editModal.buyingPrice} onChange={(event) => setEditModal({ ...editModal, buyingPrice: event.target.value })} placeholder="Buying price" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selling Price</p>
                    <Input type="number" min="0" value={editModal.sellingPrice} onChange={(event) => setEditModal({ ...editModal, sellingPrice: event.target.value })} placeholder="Selling price" />
                  </div>
                </>
              )}
              {!(isInventoryRole && editModal.lane === "kitchen") && (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Low Threshold</p>
                    <Input type="number" min="0" value={editModal.lowThreshold} onChange={(event) => setEditModal({ ...editModal, lowThreshold: event.target.value })} placeholder="Low threshold" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editModal.status}
                      onChange={(event) => setEditModal({ ...editModal, status: event.target.value as "ACTIVE" | "INACTIVE" })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </>
              )}
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
                <Button onClick={saveEditedItem}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
