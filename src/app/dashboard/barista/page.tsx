"use client";

import { useEffect, useMemo, useState } from "react";
import { ROOMS } from "@/app/lib/mock-data";
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
  const [category, setCategory] = useState<BaristaCategory>("all");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("restaurant");
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("Table 1");
  const [roomServiceRoom, setRoomServiceRoom] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [tickets, setTickets] = useState<BaristaTicket[]>([]);
  const [ticketSeq, setTicketSeq] = useState(490);
  const [menuItems, setMenuItems] = useState<BaristaMenuItem[]>(BARISTA_MENU);
  const [baristaPayments, setBaristaPayments] = useState<BaristaPaymentRecord[]>([]);

  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showPayNowPopup, setShowPayNowPopup] = useState(false);

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

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) => {
        const inCategory = category === "all" || item.category === category;
        const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return inCategory && inSearch;
      }),
    [category, menuItems, searchTerm],
  );

  const serviceRooms = useMemo(
    () => ROOMS.filter((room) => room.status === "available" || room.status === "occupied"),
    [],
  );

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.item.price * line.qty, 0), [cart]);

  const addToCart = (item: BaristaMenuItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) {
        return current.map((line) => (line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { item, qty: 1 }];
    });
  };

  const increaseQty = (itemId: string) => {
    setCart((current) => current.map((line) => (line.item.id === itemId ? { ...line, qty: line.qty + 1 } : line)));
  };

  const decreaseQty = (itemId: string) => {
    setCart((current) =>
      current
        .map((line) => (line.item.id === itemId ? { ...line, qty: Math.max(0, line.qty - 1) } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (itemId: string) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId));
  };

  const clearCart = () => {
    if (!window.confirm("Clear current ticket?")) return;
    setCart([]);
  };

  const placeTicket = () => {
    if (cart.length === 0) return;

    const destination =
      serviceMode === "room-service"
        ? roomServiceRoom || "Room not selected"
        : serviceMode === "restaurant"
        ? location.trim() || "Restaurant"
        : "Take Away";

    if (serviceMode === "room-service" && !roomServiceRoom) {
      window.alert("Select a room for room service.");
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

  const finalizeOrder = (status: BaristaPaymentStatus, method: BaristaPaymentMethod) => {
    if (!pendingOrder) return;

    const nextSeq = ticketSeq + 1;
    setTicketSeq(nextSeq);

    const orderId = `bt-${Date.now()}`;
    const code = `B-${nextSeq}`;

    const ticket: BaristaTicket = {
      id: orderId,
      code,
      createdAt: Date.now(),
      mode: pendingOrder.mode,
      destination: pendingOrder.destination,
      lines: pendingOrder.lines,
      total: pendingOrder.total,
    };

    const paymentRecord: BaristaPaymentRecord = {
      id: `bp-${Date.now()}`,
      ticketId: orderId,
      code,
      createdAt: Date.now(),
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
  };

  const deliverTicket = (id: string) => {
    if (!window.confirm("Mark this order as delivered?")) return;
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
  };

  const cancelTicket = (id: string) => {
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
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Queue</CardTitle>
              <CardDescription>Placed orders with delivery and cancellation actions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                          <Button onClick={() => deliverTicket(ticket.id)} className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Delivered
                          </Button>
                          <Button onClick={() => cancelTicket(ticket.id)} className="h-9 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-600/90 text-white">
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
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room (Available & Booked-In)</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={roomServiceRoom}
                  onChange={(event) => setRoomServiceRoom(event.target.value)}
                >
                  <option value="">Select room</option>
                  {serviceRooms.map((room) => (
                    <option key={room.id} value={`Room ${room.number}`}>
                      Room {room.number} - {room.status === "occupied" ? "Booked-In" : "Available"}
                    </option>
                  ))}
                </select>
              </div>
            ) : serviceMode === "restaurant" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</label>
                <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Table 1" />
              </div>
            ) : (
              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</p>
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
              <Button variant="outline" onClick={clearCart} disabled={cart.length === 0} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Clear Ticket
              </Button>
              <Button onClick={placeTicket} disabled={cart.length === 0} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Place Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSettlementPopup && (
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

      {showPayNowPopup && (
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
