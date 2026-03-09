"use client";

import { useEffect, useMemo, useState } from "react";
import { InventoryItem, ROOMS, Role } from "@/app/lib/mock-data";
import {
  adjustInventoryQuantity,
  MainStoreItem,
  getStoreItemLabel,
  STORAGE_MAIN_STORE_ITEMS,
  STORAGE_INVENTORY_ITEMS,
  STORAGE_STORE_MOVEMENTS,
  STORAGE_STORE_USAGE,
  StoreMovementLog,
  StoreUsageLog,
} from "@/app/lib/inventory-transfer";
import { findStoreItemForMenuName, formatTotStatus, getRemainingTots, getTotLimit, isTotTrackedMenuItem } from "@/app/lib/barista-stock";
import { printDepartmentReceipt } from "@/app/lib/receipt-print";
import { readJson, readPosState, STORAGE_BARISTA_STATE, writeJson, writePosState } from "@/app/lib/storage";
import { useIsDirector } from "@/hooks/use-is-director";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Coffee, Minus, Plus, Receipt, Search, Trash2, XCircle } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

type BaristaCategory = "all" | "espresso" | "coffee" | "tea" | "cold" | "snacks";
type ServiceMode = "restaurant" | "room-service" | "take-away";
type BaristaPaymentMethod = "cash" | "card" | "mobile" | "credit";
type BaristaPaymentStatus = "completed" | "credit";

interface BaristaMenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<BaristaCategory, "all">;
  prepMinutes: number;
}

interface CartLine {
  item: BaristaMenuItem;
  qty: number;
}

interface BaristaTicket {
  id: string;
  code: string;
  createdAt: number;
  mode: ServiceMode;
  destination: string;
  lines: Array<{ name: string; qty: number }>;
  total: number;
}

interface BaristaPaymentRecord {
  id: string;
  ticketId: string;
  code: string;
  createdAt: number;
  mode: ServiceMode;
  destination: string;
  total: number;
  status: BaristaPaymentStatus;
  method: BaristaPaymentMethod;
}

interface CancelledBaristaTicket extends BaristaTicket {
  source?: "kitchen" | "barista";
  cancelledAt: number;
}

interface PendingOrder {
  mode: ServiceMode;
  destination: string;
  lines: Array<{ name: string; qty: number }>;
  total: number;
}

const BARISTA_MENU: BaristaMenuItem[] = [];

const STORAGE_TICKETS = "orange-hotel-barista-orders";
const STORAGE_SEQ = "orange-hotel-barista-seq";
const STORAGE_MENU = "orange-hotel-barista-menu";
const STORAGE_PAYMENTS = "orange-hotel-barista-payments";
const STORAGE_CANCELLED = "orange-hotel-cancelled-tickets";

const normalizeCategory = (value: string): Exclude<BaristaCategory, "all"> => {
  if (value === "espresso" || value === "coffee" || value === "tea" || value === "cold" || value === "snacks") {
    return value;
  }
  return "coffee";
};

export default function BaristaPage() {
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
  const [role, setRole] = useState<Role | null>(null);
  const isManager = role === "manager";
  const [directorTab, setDirectorTab] = useState<"inventory" | "sales">("inventory");
  const [category, setCategory] = useState<BaristaCategory>("all");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("restaurant");
  const [searchTerm, setSearchTerm] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [tickets, setTickets] = useState<BaristaTicket[]>([]);
  const [ticketSeq, setTicketSeq] = useState(490);
  const [menuItems, setMenuItems] = useState<BaristaMenuItem[]>(BARISTA_MENU);
  const [baristaPayments, setBaristaPayments] = useState<BaristaPaymentRecord[]>([]);
  const [queueTab, setQueueTab] = useState<"queue" | "from-store">("queue");
  const [baristaStoreItems, setBaristaStoreItems] = useState<MainStoreItem[]>([]);
  const [fromStoreEntries, setFromStoreEntries] = useState<StoreMovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<StoreUsageLog[]>([]);
  const [useEntryId, setUseEntryId] = useState("");
  const [useQty, setUseQty] = useState("1");

  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showPayNowPopup, setShowPayNowPopup] = useState(false);

  const roomSuggestions = useMemo(() => ROOMS.map((room) => room.number), []);
  const tableSuggestions = useMemo(
    () => Array.from({ length: 30 }, (_, index) => String(index + 1)),
    [],
  );

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    setRole(savedRole);
  }, []);

  useEffect(() => {
    const applyBaristaSnapshot = () => {
      const snapshot = readPosState<BaristaTicket, BaristaPaymentRecord, BaristaMenuItem>(
        STORAGE_BARISTA_STATE,
        STORAGE_TICKETS,
        STORAGE_SEQ,
        STORAGE_PAYMENTS,
        STORAGE_MENU,
        490,
      );
      setTickets(snapshot.tickets);
      setTicketSeq(snapshot.ticketSeq);
      setBaristaPayments(snapshot.payments);
      setMenuItems(snapshot.menuItems.length > 0 ? snapshot.menuItems : BARISTA_MENU);
    };

    applyBaristaSnapshot();
    const unsubscribeBarista = subscribeToSyncedStorageKey(STORAGE_BARISTA_STATE, applyBaristaSnapshot);

    return () => unsubscribeBarista();
  }, []);

  const loadFromStoreData = () => {
    const savedStoreItems = readJson<Array<MainStoreItem & { lane?: "kitchen" | "barista" }>>(STORAGE_MAIN_STORE_ITEMS);
    const savedMovements = readJson<StoreMovementLog[]>(STORAGE_STORE_MOVEMENTS);
    const savedUsage = readJson<StoreUsageLog[]>(STORAGE_STORE_USAGE);
    setBaristaStoreItems(Array.isArray(savedStoreItems) ? savedStoreItems.filter((entry) => entry.lane === "barista") : []);
    setFromStoreEntries(Array.isArray(savedMovements) ? savedMovements.filter((entry) => entry.destination === "barista") : []);
    setUsageLogs(Array.isArray(savedUsage) ? savedUsage.filter((entry) => entry.destination === "barista") : []);
  };

  useEffect(() => {
    loadFromStoreData();
    const unsubscribeStoreItems = subscribeToSyncedStorageKey(STORAGE_MAIN_STORE_ITEMS, loadFromStoreData);
    const unsubscribeMovements = subscribeToSyncedStorageKey(STORAGE_STORE_MOVEMENTS, loadFromStoreData);
    const unsubscribeUsage = subscribeToSyncedStorageKey(STORAGE_STORE_USAGE, loadFromStoreData);

    return () => {
      unsubscribeStoreItems();
      unsubscribeMovements();
      unsubscribeUsage();
    };
  }, []);

  useEffect(() => {
    if (queueTab === "from-store") loadFromStoreData();
  }, [queueTab]);

  useEffect(() => {
    if (serviceMode === "restaurant") {
      setRoomNumber("");
      return;
    }
    if (serviceMode === "room-service") {
      setTableNumber("");
      return;
    }
    setRoomNumber("");
    setTableNumber("");
  }, [serviceMode]);

  const getUsedQty = (movementId: string) =>
    usageLogs.filter((entry) => entry.movementId === movementId).reduce((sum, entry) => sum + entry.quantityUsed, 0);

  const updateBaristaStoreStock = (
    lines: Array<{ name: string; qty: number }>,
    direction: "consume" | "restore",
  ) => {
    const allStoreItems = readJson<Array<MainStoreItem & { lane?: "kitchen" | "barista" }>>(STORAGE_MAIN_STORE_ITEMS) ?? [];
    const otherStoreItems = allStoreItems.filter((entry) => entry.lane !== "barista");
    const currentBaristaItems = allStoreItems
      .filter((entry) => entry.lane === "barista")
      .map((entry) => ({ ...entry, lane: "barista" as const }));
    const nextBaristaItems = [...currentBaristaItems];
    let nextInventoryItems = readJson<InventoryItem[]>(STORAGE_INVENTORY_ITEMS) ?? [];

    for (const line of lines) {
      const matchedItem = findStoreItemForMenuName(nextBaristaItems, line.name);
      if (!matchedItem) continue;

      const itemIndex = nextBaristaItems.findIndex((entry) => entry.id === matchedItem.id);
      if (itemIndex < 0) continue;

      const currentItem = nextBaristaItems[itemIndex];
      const inventoryLabel = getStoreItemLabel(currentItem);
      if (isTotTrackedMenuItem(line.name)) {
        const totLimit = getTotLimit(currentItem);
        if (totLimit <= 0) {
          return { ok: false as const, error: `Missing tot limit for ${line.name}.` };
        }

        const currentTotSold = typeof currentItem.totSold === "number" && currentItem.totSold > 0 ? currentItem.totSold : 0;
        if (direction === "consume") {
          const remainingTots = getRemainingTots(currentItem);
          if (line.qty > remainingTots) {
            return { ok: false as const, error: `Not enough tots remaining for ${line.name}.` };
          }

          const totalTotSold = currentTotSold + line.qty;
          const bottlesConsumed = Math.floor(totalTotSold / totLimit);
          nextBaristaItems[itemIndex] = {
            ...currentItem,
            stock: currentItem.stock - bottlesConsumed,
            totLimit,
            totSold: totalTotSold % totLimit,
          };
          nextInventoryItems = adjustInventoryQuantity(nextInventoryItems, "Bar", inventoryLabel, -bottlesConsumed);
          continue;
        }

        const totalTotSold = currentTotSold - line.qty;
        if (totalTotSold >= 0) {
          nextBaristaItems[itemIndex] = {
            ...currentItem,
            totLimit,
            totSold: totalTotSold,
          };
          continue;
        }

        const bottlesRestored = Math.ceil(Math.abs(totalTotSold) / totLimit);
        nextBaristaItems[itemIndex] = {
          ...currentItem,
          stock: currentItem.stock + bottlesRestored,
          totLimit,
          totSold: totalTotSold + bottlesRestored * totLimit,
        };
        nextInventoryItems = adjustInventoryQuantity(nextInventoryItems, "Bar", inventoryLabel, bottlesRestored);
        continue;
      }

      if (direction === "consume") {
        if (line.qty > currentItem.stock) {
          return { ok: false as const, error: `Not enough stock for ${line.name}.` };
        }
        nextBaristaItems[itemIndex] = { ...currentItem, stock: currentItem.stock - line.qty };
        nextInventoryItems = adjustInventoryQuantity(nextInventoryItems, "Bar", inventoryLabel, -line.qty);
        continue;
      }

      nextBaristaItems[itemIndex] = { ...currentItem, stock: currentItem.stock + line.qty };
      nextInventoryItems = adjustInventoryQuantity(nextInventoryItems, "Bar", inventoryLabel, line.qty);
    }

    const nextStoreItems = [...otherStoreItems, ...nextBaristaItems];
    setBaristaStoreItems(nextBaristaItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventoryItems);
    return { ok: true as const };
  };

  const addUsage = async () => {
    const qty = Number(useQty);
    const entry = fromStoreEntries.find((item) => item.id === useEntryId);
    if (!entry || Number.isNaN(qty) || qty <= 0) return;
    const remaining = entry.convertedQty - getUsedQty(entry.id);
    if (qty > remaining) return;
    const approved = await confirm({
      title: "Record Barista Usage",
      description: `Are you sure you want to record ${qty} units used for ${entry.itemName}?`,
      actionLabel: "Record Usage",
    });
    if (!approved) return;
    const log: StoreUsageLog = {
      id: `su-${Date.now()}`,
      movementId: entry.id,
      destination: "barista",
      quantityUsed: qty,
      usedAt: Date.now(),
    };
    const next = [log, ...usageLogs];
    setUsageLogs(next);
    const existingUsage = readJson<StoreUsageLog[]>(STORAGE_STORE_USAGE) ?? [];
    const existingInventory = readJson<InventoryItem[]>(STORAGE_INVENTORY_ITEMS) ?? [];
    const nextInventory = adjustInventoryQuantity(existingInventory, "Bar", entry.itemName, -qty);
    writeJson(
      STORAGE_STORE_USAGE,
      [...next, ...existingUsage.filter((i) => i.destination !== "barista")],
    );
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventory);
    setUseQty("1");
  };

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) => {
        const inCategory = category === "all" || item.category === category;
        const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return inCategory && inSearch;
      }),
    [category, menuItems, searchTerm],
  );

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.item.price * line.qty, 0), [cart]);

  const addToCart = (item: BaristaMenuItem) => {
    if (isDirector) return;
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) {
        return current.map((line) => (line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { item, qty: 1 }];
    });
  };

  const increaseQty = (itemId: string) => {
    if (isDirector) return;
    setCart((current) => current.map((line) => (line.item.id === itemId ? { ...line, qty: line.qty + 1 } : line)));
  };

  const decreaseQty = (itemId: string) => {
    if (isDirector) return;
    setCart((current) =>
      current
        .map((line) => (line.item.id === itemId ? { ...line, qty: Math.max(0, line.qty - 1) } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (itemId: string) => {
    if (isDirector) return;
    setCart((current) => current.filter((line) => line.item.id !== itemId));
  };

  const clearCart = async () => {
    if (isDirector) return;
    const approved = await confirm({
      title: "Clear Barista Ticket",
      description: "Are you sure you want to clear the current ticket?",
      actionLabel: "Clear Ticket",
    });
    if (!approved) return;
    setCart([]);
  };

  const placeTicket = () => {
    if (isDirector) return;
    if (cart.length === 0) return;

    const destination =
      serviceMode === "room-service"
        ? `Room ${roomNumber.trim()}`
        : serviceMode === "restaurant"
        ? `Table ${tableNumber.trim()}`
        : "Take Away";

    if (serviceMode === "room-service" && !roomNumber.trim()) {
      window.alert("Enter the room number for room service.");
      return;
    }

    if (serviceMode === "restaurant" && !tableNumber.trim()) {
      window.alert("Enter the table number for restaurant service.");
      return;
    }

    setPendingOrder({
      mode: serviceMode,
      destination,
      lines: cart.map((line) => ({ name: line.item.name, qty: line.qty })),
      total: subtotal,
    });
    setShowSettlementPopup(true);
  };

  const finalizeOrder = async (status: BaristaPaymentStatus, method: BaristaPaymentMethod) => {
    if (isDirector) return;
    if (!pendingOrder) return;

    const stockResult = updateBaristaStoreStock(pendingOrder.lines, "consume");
    if (!stockResult.ok) {
      window.alert(stockResult.error);
      return;
    }

    const nextSeq = ticketSeq + 1;
    const createdAt = Date.now();
    setTicketSeq(nextSeq);

    const orderId = `bt-${createdAt}`;
    const code = `B-${nextSeq}`;

    const ticket: BaristaTicket = {
      id: orderId,
      code,
      createdAt,
      mode: pendingOrder.mode,
      destination: pendingOrder.destination,
      lines: pendingOrder.lines,
      total: pendingOrder.total,
    };

    const paymentRecord: BaristaPaymentRecord = {
      id: `bp-${createdAt}`,
      ticketId: orderId,
      code,
      createdAt,
      mode: pendingOrder.mode,
      destination: pendingOrder.destination,
      total: pendingOrder.total,
      status,
      method,
    };

    const nextTickets = [ticket, ...tickets];
    const nextPayments = [paymentRecord, ...baristaPayments];
    setTickets(nextTickets);
    setBaristaPayments(nextPayments);
    writePosState(STORAGE_BARISTA_STATE, nextTickets, nextSeq, nextPayments, menuItems);

    setCart([]);
    setPendingOrder(null);
    setShowSettlementPopup(false);
    setShowPayNowPopup(false);

    const printResult = await printDepartmentReceipt({
      department: "barista",
      code,
      destination: pendingOrder.destination,
      mode: pendingOrder.mode,
      method,
      status,
      total: pendingOrder.total,
      createdAt,
      lines: pendingOrder.lines,
    });

    if (!printResult.ok && printResult.reason) {
      window.alert(`Barista receipt was not printed: ${printResult.reason}`);
    }
  };

  const deliverTicket = async (id: string) => {
    if (isDirector) return;
    const approved = await confirm({
      title: "Deliver Barista Order",
      description: "Are you sure you want to mark this barista order as delivered?",
      actionLabel: "Deliver",
    });
    if (!approved) return;
    const nextTickets = tickets.filter((ticket) => ticket.id !== id);
    setTickets(nextTickets);
    writePosState(STORAGE_BARISTA_STATE, nextTickets, ticketSeq, baristaPayments, menuItems);
  };

  const cancelTicket = async (id: string) => {
    if (isDirector) return;
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const approved = await confirm({
      title: "Cancel Barista Order",
      description: "Are you sure you want to cancel this barista order?",
      actionLabel: "Cancel Order",
    });
    if (!approved) return;

    const stockResult = updateBaristaStoreStock(ticket.lines, "restore");
    if (!stockResult.ok) {
      window.alert(stockResult.error);
      return;
    }

    const cancelled: CancelledBaristaTicket = {
      ...ticket,
      source: "barista",
      cancelledAt: Date.now(),
    };

    const existing = readJson<CancelledBaristaTicket[]>(STORAGE_CANCELLED) ?? [];
    writeJson(STORAGE_CANCELLED, [cancelled, ...existing]);

    const nextTickets = tickets.filter((ticket) => ticket.id !== id);
    setTickets(nextTickets);
    writePosState(STORAGE_BARISTA_STATE, nextTickets, ticketSeq, baristaPayments, menuItems);
  };

  if (isManager) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Coffee className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Barista Setup</h1>
              <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
                Inventory visibility for barista operations
              </p>
            </div>
          </div>
        </header>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Inventory from Store</CardTitle>
            <CardDescription>Store additions update here immediately. Menu creation now lives in Menu Create.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Store Qty</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Tot Status</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Low Threshold</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baristaStoreItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                    <TableCell className="font-bold">{formatTotStatus(item)}</TableCell>
                    <TableCell className="font-bold">{item.minStock}</TableCell>
                    <TableCell className="font-black uppercase text-[10px] tracking-widest">
                      {item.stock <= 0 ? "Out" : item.stock < item.minStock ? "Low" : "In Stock"}
                    </TableCell>
                  </TableRow>
                ))}
                {baristaStoreItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      No barista store stock
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDirector) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Coffee className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Barista Analytics</h1>
              <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
                Managing Director read-only controls
              </p>
            </div>
          </div>
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            {baristaPayments.length} Sales Records
          </Badge>
        </header>

        <Tabs value={directorTab} onValueChange={(value) => setDirectorTab(value as "inventory" | "sales")}>
          <TabsList className="h-10">
            <TabsTrigger value="inventory" className="font-black uppercase text-[10px] tracking-widest">Inventory</TabsTrigger>
            <TabsTrigger value="sales" className="font-black uppercase text-[10px] tracking-widest">Sales</TabsTrigger>
          </TabsList>
        </Tabs>

        {directorTab === "inventory" ? (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Inventory from Store</CardTitle>
              <CardDescription>Store additions plus received, used, and remaining quantities</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Store Qty</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Tot Status</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Received</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Used</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baristaStoreItems.map((item) => {
                    const itemEntries = fromStoreEntries.filter((entry) => entry.itemName === item.name);
                    const received = itemEntries.reduce((sum, entry) => sum + entry.convertedQty, 0);
                    const used = itemEntries.reduce((sum, entry) => sum + getUsedQty(entry.id), 0);
                    const remaining = Math.max(0, received - used);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.name}</TableCell>
                        <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                        <TableCell className="font-bold">{formatTotStatus(item)}</TableCell>
                        <TableCell className="font-bold">{received} units</TableCell>
                        <TableCell className="font-bold">{used} units</TableCell>
                        <TableCell className="font-bold">{remaining} units</TableCell>
                      </TableRow>
                    );
                  })}
                  {baristaStoreItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        No inventory records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Sales</CardTitle>
              <CardDescription>Completed and credit sales summary</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Code</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Destination</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Method</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Amount</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baristaPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-black">{payment.code}</TableCell>
                      <TableCell className="font-bold">{payment.destination}</TableCell>
                      <TableCell className="font-black uppercase text-[10px] tracking-widest">{payment.status}</TableCell>
                      <TableCell className="font-black uppercase text-[10px] tracking-widest">{payment.method}</TableCell>
                      <TableCell className="font-bold">TSh {payment.total.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-sm">{new Date(payment.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {baristaPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        No sales records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {dialog}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Coffee className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Barista POS</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
              Order intake and delivery control
            </p>
          </div>
        </div>

        <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
          {tickets.length} Active Orders
        </Badge>
      </header>
      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Barista operations analytics and stock visibility only
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search drinks..."
                  className="pl-10 h-12"
                />
              </div>

              <Tabs value={category} onValueChange={(value) => setCategory(value as BaristaCategory)}>
                <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
                  <TabsTrigger value="all" className="font-black uppercase text-[10px] tracking-widest rounded-lg">All</TabsTrigger>
                  <TabsTrigger value="espresso" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Espresso</TabsTrigger>
                  <TabsTrigger value="coffee" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Coffee</TabsTrigger>
                  <TabsTrigger value="tea" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Tea</TabsTrigger>
                  <TabsTrigger value="cold" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Cold</TabsTrigger>
                  <TabsTrigger value="snacks" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Snacks</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={serviceMode} onValueChange={(value) => setServiceMode(value as ServiceMode)}>
                <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl">
                  <TabsTrigger value="restaurant" className="font-black uppercase text-[10px] tracking-widest">Restaurant</TabsTrigger>
                  <TabsTrigger value="room-service" className="font-black uppercase text-[10px] tracking-widest">Room Service</TabsTrigger>
                  <TabsTrigger value="take-away" className="font-black uppercase text-[10px] tracking-widest">Take Away</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="text-left bg-white border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest">
                        {item.category}
                      </Badge>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {item.prepMinutes} min
                      </span>
                    </div>
                    <h3 className="font-black text-lg leading-tight">{item.name}</h3>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="font-black">TSh {item.price.toLocaleString()}</span>
                      <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}

                {filteredMenu.length === 0 && (
                  <div className="col-span-full text-center py-10 opacity-50">
                    <p className="font-black uppercase tracking-widest text-xs">No drinks found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Operations</CardTitle>
              <CardDescription>Queue and stock received from Main Store</CardDescription>
              <Tabs value={queueTab} onValueChange={(value) => setQueueTab(value as "queue" | "from-store")}>
                <TabsList className="w-full md:w-[280px] grid grid-cols-2 h-10 bg-muted/30 rounded-xl">
                  <TabsTrigger value="queue" className="font-black uppercase text-[10px] tracking-widest">Queue</TabsTrigger>
                  <TabsTrigger value="from-store" className="font-black uppercase text-[10px] tracking-widest">From Store</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {queueTab === "queue" ? (
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Ticket</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Details</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Total</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-black">
                          <p>{ticket.code}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                            {ticket.mode} | {ticket.destination}
                          </p>
                        </TableCell>
                        <TableCell className="font-bold text-sm">
                          {ticket.lines.map((line) => `${line.name} x${line.qty}`).join(" | ")}
                        </TableCell>
                        <TableCell className="font-black">TSh {ticket.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => deliverTicket(ticket.id)} disabled={isDirector} className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Delivered
                            </Button>
                            <Button onClick={() => cancelTicket(ticket.id)} disabled={isDirector} className="h-9 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-600/90 text-white">
                              <XCircle className="w-4 h-4 mr-1" /> Cancelled
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {tickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center opacity-40">
                          <Coffee className="w-12 h-12 mx-auto mb-3" />
                          <p className="font-black uppercase tracking-widest text-xs">No orders in queue</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="space-y-3 p-4">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Store Item</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Qty</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Tot Status</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Low Threshold</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {baristaStoreItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold">{item.name}</TableCell>
                          <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                          <TableCell className="font-bold">{formatTotStatus(item)}</TableCell>
                          <TableCell className="font-bold">{item.minStock}</TableCell>
                          <TableCell className="font-black uppercase text-[10px] tracking-widest">
                            {item.stock <= 0 ? "Out" : item.stock < item.minStock ? "Low" : "In Stock"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {baristaStoreItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center opacity-40">
                            <p className="font-black uppercase tracking-widest text-xs">No stock added from inventory yet</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={useEntryId}
                      onChange={(event) => setUseEntryId(event.target.value)}
                    >
                      <option value="">Select item to use</option>
                      {fromStoreEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.itemName}
                        </option>
                      ))}
                    </select>
                    <Input type="number" min="1" value={useQty} onChange={(event) => setUseQty(event.target.value)} placeholder="Usage quantity" />
                    <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addUsage} disabled={!useEntryId}>
                      Record Usage
                    </Button>
                  </div>

                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Quantity Received</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Used</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Remaining</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Conversion</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Date</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fromStoreEntries.map((entry) => {
                        const used = getUsedQty(entry.id);
                        const remaining = Math.max(0, entry.convertedQty - used);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-bold">{entry.itemName}</TableCell>
                            <TableCell className="font-bold">{entry.convertedQty} units</TableCell>
                            <TableCell className="font-bold">{used} units</TableCell>
                            <TableCell className="font-bold">{remaining} units</TableCell>
                            <TableCell className="font-bold">1 {entry.storeUnit} = {entry.conversionValue} units</TableCell>
                            <TableCell className="font-bold text-sm">{new Date(entry.movedAt).toLocaleString()}</TableCell>
                            <TableCell className="font-black uppercase text-[10px] tracking-widest">Store</TableCell>
                          </TableRow>
                        );
                      })}
                      {fromStoreEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-12 text-center opacity-40">
                            <p className="font-black uppercase tracking-widest text-xs">No stock received from store</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl border-none bg-white overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tight">Current Ticket</CardTitle>
              <Badge variant="outline" className="font-black uppercase text-[10px] tracking-widest">
                {cart.reduce((count, line) => count + line.qty, 0)} items
              </Badge>
            </div>
            <CardDescription>Prepare and place a barista order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {serviceMode === "room-service" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Number</label>
                <Input
                  list="barista-room-numbers"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  placeholder="Enter room number"
                />
                <datalist id="barista-room-numbers">
                  {roomSuggestions.map((room) => (
                    <option key={room} value={room} />
                  ))}
                </datalist>
              </div>
            ) : serviceMode === "restaurant" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Table Number</label>
                <Input
                  list="barista-table-numbers"
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  placeholder="Enter table number"
                />
                <datalist id="barista-table-numbers">
                  {tableSuggestions.map((table) => (
                    <option key={table} value={table} />
                  ))}
                </datalist>
              </div>
            ) : (
              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service Type</p>
                <p className="font-bold">Take Away</p>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="h-44 rounded-xl border border-dashed flex flex-col items-center justify-center text-center opacity-40">
                <Receipt className="w-10 h-10 mb-2" />
                <p className="font-black uppercase tracking-widest text-[10px]">Ticket is empty</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {cart.map((line) => (
                  <div key={line.item.id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold leading-tight">{line.item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                          TSh {line.item.price.toLocaleString()} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeLine(line.item.id)}
                        className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${line.item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => decreaseQty(line.item.id)}>
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-8 text-center font-black">{line.qty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => increaseQty(line.item.id)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <span className="font-black text-sm">TSh {(line.item.price * line.qty).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-lg font-black pt-2">
                <span>Total</span>
                <span className="text-primary">TSh {subtotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={clearCart} disabled={cart.length === 0 || isDirector} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Clear Ticket
              </Button>
              <Button onClick={placeTicket} disabled={cart.length === 0 || isDirector} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Place Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isDirector && showSettlementPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Select Settlement</CardTitle>
              <CardDescription>Choose Pay Now or Credit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => {
                  setShowSettlementPopup(false);
                  setShowPayNowPopup(true);
                }}
                className="w-full h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Paid Now
              </Button>
              <Button
                onClick={() => finalizeOrder("credit", "credit")}
                className="w-full h-11 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-600/90 text-white"
              >
                Credit
              </Button>
              <Button variant="outline" onClick={() => setShowSettlementPopup(false)} className="w-full h-10 font-black uppercase text-[10px] tracking-widest">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!isDirector && showPayNowPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Pay Now Method</CardTitle>
              <CardDescription>Select cash, card, or mobile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => finalizeOrder("completed", "cash")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Cash
              </Button>
              <Button onClick={() => finalizeOrder("completed", "card")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Card
              </Button>
              <Button onClick={() => finalizeOrder("completed", "mobile")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Mobile
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayNowPopup(false);
                  setShowSettlementPopup(true);
                }}
                className="w-full h-10 font-black uppercase text-[10px] tracking-widest"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
