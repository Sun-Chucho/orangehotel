"use client";

import { useEffect, useMemo, useState } from "react";
import { InventoryItem } from "@/app/lib/mock-data";
import { MainStoreItem, STORAGE_INVENTORY_ITEMS, STORAGE_MAIN_STORE_ITEMS } from "@/app/lib/inventory-transfer";
import {
  KitchenDailyStockHistoryEntry,
  KitchenDailyStockLine,
  KitchenDailyStockSession,
  KitchenPurchaseHistoryEntry,
  KitchenPurchaseLine,
  KitchenPurchaseSession,
  KitchenSessionSignoff,
  STORAGE_KITCHEN_DAILY_STOCK_HISTORY,
  STORAGE_KITCHEN_DAILY_STOCK_SESSION,
  STORAGE_KITCHEN_PURCHASE_HISTORY,
  STORAGE_KITCHEN_PURCHASE_SESSION,
} from "@/app/lib/kitchen-session-storage";
import { readJson, writeJson } from "@/app/lib/storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type KitchenWorkflowTab = "purchase" | "daily-stock";
type CloseTarget = "purchase" | "daily-stock" | null;

const DEFAULT_SIGNOFF: KitchenSessionSignoff = {
  preparedBy: "",
  checkedBy: "",
  approvedBy: "",
  cashier: "",
};

function roundStock(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createPurchaseLine(item?: MainStoreItem): KitchenPurchaseLine {
  return {
    id: `purchase-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId: item?.id ?? null,
    itemName: item?.name ?? "",
    category: item?.subCategory ?? "",
    unit: item?.unit ?? "kg",
    previousBalance: roundStock(item?.stock ?? 0),
    addedQty: 0,
    pricePerUnit: roundStock(item?.buyingPrice ?? 0),
  };
}

function createDailyLine(item?: MainStoreItem): KitchenDailyStockLine {
  return {
    id: `daily-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId: item?.id ?? null,
    itemName: item?.name ?? "",
    category: item?.subCategory ?? "",
    unit: item?.unit ?? "kg",
    openingStock: roundStock(item?.stock ?? 0),
    received: 0,
    used: 0,
    wastage: 0,
  };
}

function formatMoney(value: number) {
  return `TSh ${Math.round(value).toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getWorkflowCopy(tab: KitchenWorkflowTab) {
  if (tab === "purchase") {
    return {
      tabLabel: "Daily Purchases",
      title: "Daily Purchase Entries",
      empty: "Open shift to begin entering daily purchase rows.",
      success: "Purchase entries saved",
      active: "Shift Open Since",
      inactive: "Shift Closed",
      openButton: "Open Shift",
      closeButton: "Close Shift",
      dialogTitle: "Close Purchase Shift",
    };
  }

  return {
    tabLabel: "Daily Entries",
    title: "Daily Stock Entries",
    empty: "Open shift to begin entering the day's stock movement.",
    success: "Daily entries saved",
    active: "Shift Open Since",
    inactive: "Shift Closed",
    openButton: "Open Shift",
    closeButton: "Close Shift",
    dialogTitle: "Close Daily Entries Shift",
  };
}

function getInventoryMatch(inventoryItems: InventoryItem[], storeItem: MainStoreItem) {
  return inventoryItems.find(
    (entry) =>
      entry.category === "Kitchen" &&
      entry.name === storeItem.name &&
      (entry.size ?? "") === (storeItem.size ?? ""),
  );
}

export function KitchenSessionManager({ isDirector }: { isDirector: boolean }) {
  const [activeTab, setActiveTab] = useState<KitchenWorkflowTab>("purchase");
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchaseSession, setPurchaseSession] = useState<KitchenPurchaseSession | null>(null);
  const [dailySession, setDailySession] = useState<KitchenDailyStockSession | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<KitchenPurchaseHistoryEntry[]>([]);
  const [dailyHistory, setDailyHistory] = useState<KitchenDailyStockHistoryEntry[]>([]);
  const [closeTarget, setCloseTarget] = useState<CloseTarget>(null);
  const [closeNotes, setCloseNotes] = useState(DEFAULT_SIGNOFF);
  const purchaseCopy = getWorkflowCopy("purchase");
  const dailyCopy = getWorkflowCopy("daily-stock");

  useEffect(() => {
    const applySnapshot = () => {
      const allStore = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];
      setStoreItems(allStore.filter((item) => item.lane === "kitchen"));
      setInventoryItems(readJson<InventoryItem[]>(STORAGE_INVENTORY_ITEMS) ?? []);
      setPurchaseSession(readJson<KitchenPurchaseSession>(STORAGE_KITCHEN_PURCHASE_SESSION));
      setDailySession(readJson<KitchenDailyStockSession>(STORAGE_KITCHEN_DAILY_STOCK_SESSION));
      setPurchaseHistory(readJson<KitchenPurchaseHistoryEntry[]>(STORAGE_KITCHEN_PURCHASE_HISTORY) ?? []);
      setDailyHistory(readJson<KitchenDailyStockHistoryEntry[]>(STORAGE_KITCHEN_DAILY_STOCK_HISTORY) ?? []);
    };

    applySnapshot();
    const unsubscribers = [
      subscribeToSyncedStorageKey(STORAGE_MAIN_STORE_ITEMS, applySnapshot),
      subscribeToSyncedStorageKey(STORAGE_INVENTORY_ITEMS, applySnapshot),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_PURCHASE_SESSION, applySnapshot),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_PURCHASE_HISTORY, applySnapshot),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_DAILY_STOCK_SESSION, applySnapshot),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_DAILY_STOCK_HISTORY, applySnapshot),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const purchaseTotalAmount = useMemo(
    () =>
      (purchaseSession?.lines ?? []).reduce(
        (sum, line) => sum + roundStock(line.addedQty) * roundStock(line.pricePerUnit),
        0,
      ),
    [purchaseSession],
  );

  const dailyTotals = useMemo(() => {
    return (dailySession?.lines ?? []).reduce(
      (acc, line) => {
        acc.received += roundStock(line.received);
        acc.used += roundStock(line.used);
        acc.wastage += roundStock(line.wastage);
        return acc;
      },
      { received: 0, used: 0, wastage: 0 },
    );
  }, [dailySession]);

  const persistPurchaseSession = (next: KitchenPurchaseSession | null) => {
    setPurchaseSession(next);
    writeJson(STORAGE_KITCHEN_PURCHASE_SESSION, next);
  };

  const persistDailySession = (next: KitchenDailyStockSession | null) => {
    setDailySession(next);
    writeJson(STORAGE_KITCHEN_DAILY_STOCK_SESSION, next);
  };

  const startPurchaseSession = () => {
    if (isDirector || purchaseSession) return;
    const next: KitchenPurchaseSession = {
      id: `purchase-session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      lines: storeItems.map((item) => createPurchaseLine(item)),
    };
    persistPurchaseSession(next);
    toast({ title: "Purchase session started" });
  };

  const startDailySession = () => {
    if (isDirector || dailySession) return;
    const next: KitchenDailyStockSession = {
      id: `daily-session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      lines: storeItems.map((item) => createDailyLine(item)),
    };
    persistDailySession(next);
    toast({ title: "Daily stock sheet started" });
  };

  const updatePurchaseLine = (lineId: string, field: keyof KitchenPurchaseLine, value: string) => {
    if (!purchaseSession) return;
    persistPurchaseSession({
      ...purchaseSession,
      lines: purchaseSession.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]:
                field === "itemName" || field === "category" || field === "unit"
                  ? value
                  : roundStock(asNumber(value)),
            }
          : line,
      ),
    });
  };

  const updateDailyLine = (lineId: string, field: keyof KitchenDailyStockLine, value: string) => {
    if (!dailySession) return;
    persistDailySession({
      ...dailySession,
      lines: dailySession.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]:
                field === "itemName" || field === "category" || field === "unit"
                  ? value
                  : roundStock(asNumber(value)),
            }
          : line,
      ),
    });
  };

  const addPurchaseLine = () => {
    if (!purchaseSession || isDirector) return;
    persistPurchaseSession({ ...purchaseSession, lines: [...purchaseSession.lines, createPurchaseLine()] });
  };

  const addDailyLine = () => {
    if (!dailySession || isDirector) return;
    persistDailySession({ ...dailySession, lines: [...dailySession.lines, createDailyLine()] });
  };

  const removePurchaseLine = (lineId: string) => {
    if (!purchaseSession || isDirector) return;
    persistPurchaseSession({ ...purchaseSession, lines: purchaseSession.lines.filter((line) => line.id !== lineId) });
  };

  const removeDailyLine = (lineId: string) => {
    if (!dailySession || isDirector) return;
    persistDailySession({ ...dailySession, lines: dailySession.lines.filter((line) => line.id !== lineId) });
  };

  const openCloseDialog = (target: Exclude<CloseTarget, null>) => {
    if (isDirector) return;
    setCloseNotes(DEFAULT_SIGNOFF);
    setCloseTarget(target);
  };

  const applyStoreAndInventoryChanges = (nextKitchenStore: MainStoreItem[], nextInventory: InventoryItem[]) => {
    const allStore = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];
    const nonKitchenStore = allStore.filter((item) => item.lane !== "kitchen");
    writeJson(STORAGE_MAIN_STORE_ITEMS, [...nonKitchenStore, ...nextKitchenStore]);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventory);
  };

  const closePurchaseSession = () => {
    if (!purchaseSession) return;

    const validLines = purchaseSession.lines.filter((line) => line.itemName.trim().length > 0);
    if (validLines.length === 0) {
      toast({ title: "No purchase rows to save", variant: "destructive" });
      return;
    }

    let nextKitchenStore = [...storeItems];
    let nextInventory = [...inventoryItems];

    validLines.forEach((line) => {
      const totalBalance = roundStock(line.previousBalance + line.addedQty);
      const existingStore = line.itemId ? nextKitchenStore.find((item) => item.id === line.itemId) : null;

      if (existingStore) {
        nextKitchenStore = nextKitchenStore.map((item) =>
          item.id === existingStore.id
            ? {
                ...item,
                name: line.itemName.trim(),
                subCategory: line.category.trim(),
                unit: line.unit.trim() || item.unit,
                stock: totalBalance,
                buyingPrice: line.pricePerUnit > 0 ? line.pricePerUnit : item.buyingPrice,
                receivedStock: roundStock((item.receivedStock ?? 0) + line.addedQty),
              }
            : item,
        );

        const refreshedStore = nextKitchenStore.find((item) => item.id === existingStore.id)!;
        const inventoryMatch = getInventoryMatch(nextInventory, refreshedStore);

        if (inventoryMatch) {
          nextInventory = nextInventory.map((item) =>
            item.id === inventoryMatch.id
              ? {
                  ...item,
                  name: refreshedStore.name,
                  subCategory: refreshedStore.subCategory ?? "",
                  unit: refreshedStore.unit,
                  stock: totalBalance,
                  buyingPrice: refreshedStore.buyingPrice ?? item.buyingPrice,
                  receivedStock: roundStock((item.receivedStock ?? 0) + line.addedQty),
                }
              : item,
          );
        } else {
          nextInventory = [
            {
              id: `inv-kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              barcode: "",
              name: refreshedStore.name,
              category: "Kitchen",
              subCategory: refreshedStore.subCategory ?? "",
              size: refreshedStore.size ?? "",
              stock: totalBalance,
              totSold: 0,
              buyingPrice: refreshedStore.buyingPrice ?? line.pricePerUnit,
              sellingPrice: 0,
              price: 0,
              status: "ACTIVE",
              minStock: refreshedStore.minStock,
              unit: refreshedStore.unit,
              damages: 0,
              receivedStock: line.addedQty,
            },
            ...nextInventory,
          ];
        }
      } else {
        const newStore: MainStoreItem = {
          id: `kitchen-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: line.itemName.trim(),
          subCategory: line.category.trim(),
          stock: totalBalance,
          unit: line.unit.trim() || "kg",
          minStock: 1,
          lane: "kitchen",
          buyingPrice: line.pricePerUnit,
          receivedStock: line.addedQty,
          damages: 0,
        };

        nextKitchenStore = [newStore, ...nextKitchenStore];
        nextInventory = [
          {
            id: `inv-kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            barcode: "",
            name: newStore.name,
            category: "Kitchen",
            subCategory: newStore.subCategory ?? "",
            size: "",
            stock: totalBalance,
            totSold: 0,
            buyingPrice: line.pricePerUnit,
            sellingPrice: 0,
            price: 0,
            status: "ACTIVE",
            minStock: 1,
            unit: newStore.unit,
            damages: 0,
            receivedStock: line.addedQty,
          },
          ...nextInventory,
        ];
      }
    });

    applyStoreAndInventoryChanges(nextKitchenStore, nextInventory);

    writeJson(STORAGE_KITCHEN_PURCHASE_HISTORY, [
      {
        ...purchaseSession,
        lines: validLines,
        closedAt: new Date().toISOString(),
        signoff: closeNotes,
      },
      ...purchaseHistory,
    ]);
    persistPurchaseSession(null);
    setCloseTarget(null);
    toast({ title: purchaseCopy.success });
  };

  const closeDailySession = () => {
    if (!dailySession) return;

    const validLines = dailySession.lines.filter((line) => line.itemName.trim().length > 0);
    if (validLines.length === 0) {
      toast({ title: "No stock sheet rows to save", variant: "destructive" });
      return;
    }

    let nextKitchenStore = [...storeItems];
    let nextInventory = [...inventoryItems];

    validLines.forEach((line) => {
      const closingStock = roundStock(line.openingStock + line.received - line.used - line.wastage);
      const existingStore = line.itemId ? nextKitchenStore.find((item) => item.id === line.itemId) : null;

      if (existingStore) {
        nextKitchenStore = nextKitchenStore.map((item) =>
          item.id === existingStore.id
            ? {
                ...item,
                name: line.itemName.trim(),
                subCategory: line.category.trim(),
                unit: line.unit.trim() || item.unit,
                stock: closingStock,
                receivedStock: roundStock((item.receivedStock ?? 0) + line.received),
                damages: roundStock((item.damages ?? 0) + line.wastage),
              }
            : item,
        );

        const refreshedStore = nextKitchenStore.find((item) => item.id === existingStore.id)!;
        const inventoryMatch = getInventoryMatch(nextInventory, refreshedStore);

        if (inventoryMatch) {
          nextInventory = nextInventory.map((item) =>
            item.id === inventoryMatch.id
              ? {
                  ...item,
                  name: refreshedStore.name,
                  subCategory: refreshedStore.subCategory ?? "",
                  unit: refreshedStore.unit,
                  stock: closingStock,
                  receivedStock: roundStock((item.receivedStock ?? 0) + line.received),
                  damages: roundStock((item.damages ?? 0) + line.wastage),
                }
              : item,
          );
        } else {
          nextInventory = [
            {
              id: `inv-kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              barcode: "",
              name: refreshedStore.name,
              category: "Kitchen",
              subCategory: refreshedStore.subCategory ?? "",
              size: refreshedStore.size ?? "",
              stock: closingStock,
              totSold: 0,
              buyingPrice: refreshedStore.buyingPrice ?? 0,
              sellingPrice: 0,
              price: 0,
              status: "ACTIVE",
              minStock: refreshedStore.minStock,
              unit: refreshedStore.unit,
              damages: line.wastage,
              receivedStock: line.received,
            },
            ...nextInventory,
          ];
        }
      } else {
        const newStore: MainStoreItem = {
          id: `kitchen-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: line.itemName.trim(),
          subCategory: line.category.trim(),
          stock: closingStock,
          unit: line.unit.trim() || "kg",
          minStock: 1,
          lane: "kitchen",
          buyingPrice: 0,
          receivedStock: line.received,
          damages: line.wastage,
        };

        nextKitchenStore = [newStore, ...nextKitchenStore];
        nextInventory = [
          {
            id: `inv-kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            barcode: "",
            name: newStore.name,
            category: "Kitchen",
            subCategory: newStore.subCategory ?? "",
            size: "",
            stock: closingStock,
            totSold: 0,
            buyingPrice: 0,
            sellingPrice: 0,
            price: 0,
            status: "ACTIVE",
            minStock: 1,
            unit: newStore.unit,
            damages: line.wastage,
            receivedStock: line.received,
          },
          ...nextInventory,
        ];
      }
    });

    applyStoreAndInventoryChanges(nextKitchenStore, nextInventory);

    writeJson(STORAGE_KITCHEN_DAILY_STOCK_HISTORY, [
      {
        ...dailySession,
        lines: validLines,
        closedAt: new Date().toISOString(),
        signoff: closeNotes,
      },
      ...dailyHistory,
    ]);
    persistDailySession(null);
    setCloseTarget(null);
    toast({ title: dailyCopy.success });
  };

  const submitCloseDialog = () => {
    if (
      !closeNotes.preparedBy.trim() ||
      !closeNotes.checkedBy.trim() ||
      !closeNotes.approvedBy.trim() ||
      !closeNotes.cashier.trim()
    ) {
      toast({ title: "Fill all signoff fields", variant: "destructive" });
      return;
    }

    if (closeTarget === "purchase") {
      closePurchaseSession();
      return;
    }

    if (closeTarget === "daily-stock") {
      closeDailySession();
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as KitchenWorkflowTab)}>
        <TabsList className="h-11">
          <TabsTrigger value="purchase" className="font-black uppercase text-[10px] tracking-widest">
            {purchaseCopy.tabLabel}
          </TabsTrigger>
          <TabsTrigger value="daily-stock" className="font-black uppercase text-[10px] tracking-widest">
            {dailyCopy.tabLabel}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "purchase" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase">{purchaseCopy.title}</CardTitle>
                  <CardDescription>
                    Start a purchase sheet, enter added stock for the day, then close it to save history and update kitchen inventory.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {purchaseSession ? (
                    <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700">
                      {purchaseCopy.active} {formatDateTime(purchaseSession.startedAt)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{purchaseCopy.inactive}</Badge>
                  )}
                  <Button onClick={startPurchaseSession} disabled={Boolean(purchaseSession) || isDirector}>
                    {purchaseCopy.openButton}
                  </Button>
                  <Button variant="outline" onClick={() => openCloseDialog("purchase")} disabled={!purchaseSession || isDirector}>
                    {purchaseCopy.closeButton}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {purchaseSession ? (
                <>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={addPurchaseLine} disabled={isDirector}>
                      Add Item Row
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Add</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total Balance</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseSession.lines.map((line) => {
                        const totalBalance = roundStock(line.previousBalance + line.addedQty);
                        const amount = roundStock(line.addedQty * line.pricePerUnit);
                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                              <Input value={line.itemName} onChange={(event) => updatePurchaseLine(line.id, "itemName", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={line.category} onChange={(event) => updatePurchaseLine(line.id, "category", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={line.unit} onChange={(event) => updatePurchaseLine(line.id, "unit", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.previousBalance} onChange={(event) => updatePurchaseLine(line.id, "previousBalance", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.addedQty} onChange={(event) => updatePurchaseLine(line.id, "addedQty", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.pricePerUnit} onChange={(event) => updatePurchaseLine(line.id, "pricePerUnit", event.target.value)} />
                            </TableCell>
                            <TableCell className="font-bold">{totalBalance}</TableCell>
                            <TableCell className="font-bold">{formatMoney(amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => removePurchaseLine(line.id)} disabled={isDirector}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <p className="text-sm font-black uppercase tracking-widest">Total Amount: {formatMoney(purchaseTotalAmount)}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{purchaseCopy.empty}</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-black uppercase">Saved Purchase History</CardTitle>
              <CardDescription>Closed purchase sessions are stored here for daily reference.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Prepared By</TableHead>
                    <TableHead>Approved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">{formatDateTime(entry.closedAt)}</TableCell>
                      <TableCell className="font-bold">{entry.lines.length}</TableCell>
                      <TableCell className="font-bold">
                        {formatMoney(entry.lines.reduce((sum, line) => sum + line.addedQty * line.pricePerUnit, 0))}
                      </TableCell>
                      <TableCell className="font-bold">{entry.signoff.preparedBy}</TableCell>
                      <TableCell className="font-bold">{entry.signoff.approvedBy}</TableCell>
                    </TableRow>
                  ))}
                  {purchaseHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                        No saved purchase sessions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "daily-stock" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase">{dailyCopy.title}</CardTitle>
                  <CardDescription>
                    Start a daily stock session, record opening, received, used, wastage, and close it to save the day and update inventory.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {dailySession ? (
                    <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700">
                      {dailyCopy.active} {formatDateTime(dailySession.startedAt)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{dailyCopy.inactive}</Badge>
                  )}
                  <Button onClick={startDailySession} disabled={Boolean(dailySession) || isDirector}>
                    {dailyCopy.openButton}
                  </Button>
                  <Button variant="outline" onClick={() => openCloseDialog("daily-stock")} disabled={!dailySession || isDirector}>
                    {dailyCopy.closeButton}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {dailySession ? (
                <>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={addDailyLine} disabled={isDirector}>
                      Add Item Row
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Opening Stock</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Wastage</TableHead>
                        <TableHead>Closing Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySession.lines.map((line) => {
                        const closingStock = roundStock(line.openingStock + line.received - line.used - line.wastage);
                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                              <Input value={line.itemName} onChange={(event) => updateDailyLine(line.id, "itemName", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={line.category} onChange={(event) => updateDailyLine(line.id, "category", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={line.unit} onChange={(event) => updateDailyLine(line.id, "unit", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.openingStock} onChange={(event) => updateDailyLine(line.id, "openingStock", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.received} onChange={(event) => updateDailyLine(line.id, "received", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.used} onChange={(event) => updateDailyLine(line.id, "used", event.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" value={line.wastage} onChange={(event) => updateDailyLine(line.id, "wastage", event.target.value)} />
                            </TableCell>
                            <TableCell className="font-bold">{closingStock}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => removeDailyLine(line.id)} disabled={isDirector}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Received</p>
                        <p className="mt-2 text-2xl font-black">{dailyTotals.received}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Used</p>
                        <p className="mt-2 text-2xl font-black">{dailyTotals.used}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Wastage</p>
                        <p className="mt-2 text-2xl font-black">{dailyTotals.wastage}</p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{dailyCopy.empty}</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-black uppercase">Saved Daily Stock History</CardTitle>
              <CardDescription>Closed daily stock sheets are stored here for review.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Wastage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">{formatDateTime(entry.closedAt)}</TableCell>
                      <TableCell className="font-bold">{entry.lines.length}</TableCell>
                      <TableCell className="font-bold">{entry.lines.reduce((sum, line) => sum + line.received, 0)}</TableCell>
                      <TableCell className="font-bold">{entry.lines.reduce((sum, line) => sum + line.used, 0)}</TableCell>
                      <TableCell className="font-bold">{entry.lines.reduce((sum, line) => sum + line.wastage, 0)}</TableCell>
                    </TableRow>
                  ))}
                  {dailyHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                        No saved daily sheets
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={closeTarget !== null} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              {closeTarget === "purchase" ? purchaseCopy.dialogTitle : dailyCopy.dialogTitle}
            </DialogTitle>
            <DialogDescription>
              Fill the signoff details before saving the session and updating inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Prepared by" value={closeNotes.preparedBy} onChange={(event) => setCloseNotes((current) => ({ ...current, preparedBy: event.target.value }))} />
            <Input placeholder="Checked by" value={closeNotes.checkedBy} onChange={(event) => setCloseNotes((current) => ({ ...current, checkedBy: event.target.value }))} />
            <Input placeholder="Approved by" value={closeNotes.approvedBy} onChange={(event) => setCloseNotes((current) => ({ ...current, approvedBy: event.target.value }))} />
            <Input placeholder="Cashier" value={closeNotes.cashier} onChange={(event) => setCloseNotes((current) => ({ ...current, cashier: event.target.value }))} />
          </div>
          <Textarea value={`Prepared by: ${closeNotes.preparedBy}\nChecked by: ${closeNotes.checkedBy}\nApproved by: ${closeNotes.approvedBy}\nCashier: ${closeNotes.cashier}`} readOnly className="min-h-[110px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button onClick={submitCloseDialog}>Save Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
