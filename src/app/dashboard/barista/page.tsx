"use client";

import { useEffect, useMemo, useState } from "react";
import { Role } from "@/app/lib/mock-data";
import {
  STORAGE_STORE_MOVEMENTS,
  STORAGE_STORE_USAGE,
  StoreMovementLog,
  StoreUsageLog,
} from "@/app/lib/inventory-transfer";
import { printDepartmentReceipt } from "@/app/lib/receipt-print";
import { useIsDirector } from "@/hooks/use-is-director";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Coffee, Minus, Plus, Receipt, Search, Trash2, XCircle } from "lucide-react";

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
  const [role, setRole] = useState<Role | null>(null);
  const isManager = role === "manager";
  const [managerTab, setManagerTab] = useState<"inventory" | "menu">("inventory");
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
  const [fromStoreEntries, setFromStoreEntries] = useState<StoreMovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<StoreUsageLog[]>([]);
  const [useEntryId, setUseEntryId] = useState("");
  const [useQty, setUseQty] = useState("1");
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuPrepMinutes, setMenuPrepMinutes] = useState("10");
  const [menuCategory, setMenuCategory] = useState<Exclude<BaristaCategory, "all">>("coffee");

  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showPayNowPopup, setShowPayNowPopup] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    setRole(savedRole);
  }, []);

  useEffect(() => {
    const savedTickets = localStorage.getItem(STORAGE_TICKETS);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);
    const savedPayments = localStorage.getItem(STORAGE_PAYMENTS);

    if (savedTickets) {
      try {
        const parsed = JSON.parse(savedTickets) as BaristaTicket[];
        if (Array.isArray(parsed)) setTickets(parsed);
      } catch {
        setTickets([]);
      }
    }

    if (savedSeq) {
      const parsedSeq = Number(savedSeq);
      if (!Number.isNaN(parsedSeq) && parsedSeq > 0) setTicketSeq(parsedSeq);
    }

    if (savedPayments) {
      try {
        const parsed = JSON.parse(savedPayments) as BaristaPaymentRecord[];
        if (Array.isArray(parsed)) setBaristaPayments(parsed);
      } catch {
        setBaristaPayments([]);
      }
    }
  }, []);

  useEffect(() => {
    const savedMenu = localStorage.getItem(STORAGE_MENU);
    if (!savedMenu) return;
    try {
      const parsed = JSON.parse(savedMenu) as BaristaMenuItem[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((item) => ({ ...item, category: normalizeCategory(String(item.category)) }));
        setMenuItems([...normalized, ...BARISTA_MENU]);
      }
    } catch {
      setMenuItems(BARISTA_MENU);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SEQ, String(ticketSeq));
  }, [ticketSeq]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PAYMENTS, JSON.stringify(baristaPayments));
  }, [baristaPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MENU, JSON.stringify(menuItems));
  }, [menuItems]);

  const loadFromStoreData = () => {
    const savedMovements = localStorage.getItem(STORAGE_STORE_MOVEMENTS);
    const savedUsage = localStorage.getItem(STORAGE_STORE_USAGE);
    if (savedMovements) {
      try {
        const parsed = JSON.parse(savedMovements) as StoreMovementLog[];
        if (Array.isArray(parsed)) setFromStoreEntries(parsed.filter((entry) => entry.destination === "barista"));
      } catch {
        setFromStoreEntries([]);
      }
    }
    if (savedUsage) {
      try {
        const parsed = JSON.parse(savedUsage) as StoreUsageLog[];
        if (Array.isArray(parsed)) setUsageLogs(parsed.filter((entry) => entry.destination === "barista"));
      } catch {
        setUsageLogs([]);
      }
    }
  };

  useEffect(() => {
    loadFromStoreData();
  }, []);

  useEffect(() => {
    if (queueTab === "from-store") loadFromStoreData();
  }, [queueTab]);

  const getUsedQty = (movementId: string) =>
    usageLogs.filter((entry) => entry.movementId === movementId).reduce((sum, entry) => sum + entry.quantityUsed, 0);

  const addUsage = () => {
    const qty = Number(useQty);
    const entry = fromStoreEntries.find((item) => item.id === useEntryId);
    if (!entry || Number.isNaN(qty) || qty <= 0) return;
    const remaining = entry.convertedQty - getUsedQty(entry.id);
    if (qty > remaining) return;
    const log: StoreUsageLog = {
      id: `su-${Date.now()}`,
      movementId: entry.id,
      destination: "barista",
      quantityUsed: qty,
      usedAt: Date.now(),
    };
    const next = [log, ...usageLogs];
    setUsageLogs(next);
    const rawUsage = localStorage.getItem(STORAGE_STORE_USAGE);
    let existingUsage: StoreUsageLog[] = [];
    if (rawUsage) {
      try {
        const parsed = JSON.parse(rawUsage) as StoreUsageLog[];
        if (Array.isArray(parsed)) existingUsage = parsed;
      } catch {
        existingUsage = [];
      }
    }
    localStorage.setItem(
      STORAGE_STORE_USAGE,
      JSON.stringify([...next, ...existingUsage.filter((i) => i.destination !== "barista")]),
    );
    setUseQty("1");
  };

  const addMenuItem = () => {
    if (!isManager) return;
    const price = Number(menuPrice);
    const prepMinutes = Number(menuPrepMinutes);
    if (!menuName.trim() || Number.isNaN(price) || price <= 0 || Number.isNaN(prepMinutes) || prepMinutes <= 0) return;

    setMenuItems((current) => [
      {
        id: `bm-${Date.now()}`,
        name: menuName.trim(),
        price,
        prepMinutes,
        category: menuCategory,
      },
      ...current,
    ]);
    setMenuName("");
    setMenuPrice("");
    setMenuPrepMinutes("10");
    setMenuCategory("coffee");
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

  const clearCart = () => {
    if (isDirector) return;
    if (!window.confirm("Clear current ticket?")) return;
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

    setTickets((current) => [ticket, ...current]);
    setBaristaPayments((current) => [paymentRecord, ...current]);

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

  const deliverTicket = (id: string) => {
    if (isDirector) return;
    if (!window.confirm("Mark this order as delivered?")) return;
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
  };

  const cancelTicket = (id: string) => {
    if (isDirector) return;
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    if (!window.confirm("Cancel this order?")) return;

    const cancelled: CancelledBaristaTicket = {
      ...ticket,
      source: "barista",
      cancelledAt: Date.now(),
    };

    const existingRaw = localStorage.getItem(STORAGE_CANCELLED);
    const existing = existingRaw ? (JSON.parse(existingRaw) as CancelledBaristaTicket[]) : [];
    localStorage.setItem(STORAGE_CANCELLED, JSON.stringify([cancelled, ...existing]));

    setTickets((current) => current.filter((ticket) => ticket.id !== id));
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
                Inventory and menu settings for barista operations
              </p>
            </div>
          </div>
        </header>

        <Tabs value={managerTab} onValueChange={(value) => setManagerTab(value as "inventory" | "menu")}>
          <TabsList className="h-10">
            <TabsTrigger value="inventory" className="font-black uppercase text-[10px] tracking-widest">Inventory</TabsTrigger>
            <TabsTrigger value="menu" className="font-black uppercase text-[10px] tracking-widest">Menu Settings</TabsTrigger>
          </TabsList>
        </Tabs>

        {managerTab === "inventory" ? (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Inventory from Store</CardTitle>
              <CardDescription>Received stock linked to barista operations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Received</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Logic</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fromStoreEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">{entry.itemName}</TableCell>
                      <TableCell className="font-bold">{entry.convertedQty} units</TableCell>
                      <TableCell className="font-bold">{entry.conversionNote}</TableCell>
                      <TableCell className="font-bold text-sm">{new Date(entry.movedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {fromStoreEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        No barista inventory records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Create Barista Menu Item</CardTitle>
                <CardDescription>Set item name, category, preparation time, and price</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input value={menuName} onChange={(event) => setMenuName(event.target.value)} placeholder="Drink or snack name" />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={menuCategory}
                  onChange={(event) => setMenuCategory(event.target.value as Exclude<BaristaCategory, "all">)}
                >
                  <option value="espresso">Espresso</option>
                  <option value="coffee">Coffee</option>
                  <option value="tea">Tea</option>
                  <option value="cold">Cold</option>
                  <option value="snacks">Snacks</option>
                </select>
                <Input type="number" min="1" value={menuPrepMinutes} onChange={(event) => setMenuPrepMinutes(event.target.value)} placeholder="Prep minutes" />
                <Input type="number" min="1" value={menuPrice} onChange={(event) => setMenuPrice(event.target.value)} placeholder="Price" />
                <div className="md:col-span-4">
                  <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addMenuItem}>
                    Add Menu Item
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Menu</CardTitle>
                <CardDescription>Current items and selling prices</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Category</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Prep</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.name}</TableCell>
                        <TableCell className="font-bold uppercase text-[10px] tracking-widest">{item.category}</TableCell>
                        <TableCell className="font-bold">{item.prepMinutes} min</TableCell>
                        <TableCell className="font-bold">TSh {item.price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {menuItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                          No barista menu items yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
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
              <CardDescription>Received, used, and remaining quantities</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Received</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Used</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Remaining</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Date</TableHead>
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
                        <TableCell className="font-bold text-sm">{new Date(entry.movedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {fromStoreEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
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
                    <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addUsage}>
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
                <Input value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="Enter room number" />
              </div>
            ) : serviceMode === "restaurant" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Table Number</label>
                <Input value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} placeholder="Enter table number" />
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
