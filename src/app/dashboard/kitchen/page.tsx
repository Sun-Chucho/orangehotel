"use client";

import { useEffect, useMemo, useState } from "react";
import { INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type KitchenCategory = "all" | "grill" | "pasta" | "salad" | "sides" | "dessert";
type ServiceMode = "restaurant" | "room-service" | "poolside";
type TicketStatus = "new" | "preparing" | "plated" | "delayed";
type QueueFilter = "all" | TicketStatus;

interface KitchenMenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<KitchenCategory, "all">;
  prepMinutes: number;
}

interface CartLine {
  item: KitchenMenuItem;
  qty: number;
}

interface KitchenTicket {
  id: string;
  code: string;
  createdAt: number;
  status: TicketStatus;
  mode: ServiceMode;
  location: string;
  lines: Array<{ name: string; qty: number }>;
  subtotal: number;
  tax: number;
  total: number;
}

const KITCHEN_MENU: KitchenMenuItem[] = [
  { id: "k1", name: "Grilled Salmon", price: 42000, category: "grill", prepMinutes: 14 },
  { id: "k2", name: "Steak Frites", price: 58000, category: "grill", prepMinutes: 16 },
  { id: "k3", name: "Chicken Alfredo", price: 36000, category: "pasta", prepMinutes: 12 },
  { id: "k4", name: "Beef Lasagna", price: 39000, category: "pasta", prepMinutes: 13 },
  { id: "k5", name: "Caesar Salad", price: 24000, category: "salad", prepMinutes: 7 },
  { id: "k6", name: "Greek Salad", price: 23000, category: "salad", prepMinutes: 7 },
  { id: "k7", name: "Truffle Fries", price: 15000, category: "sides", prepMinutes: 5 },
  { id: "k8", name: "Garlic Bread", price: 12000, category: "sides", prepMinutes: 4 },
  { id: "k9", name: "Chocolate Lava Cake", price: 20000, category: "dessert", prepMinutes: 8 },
  { id: "k10", name: "Cheesecake", price: 18000, category: "dessert", prepMinutes: 6 },
];

const STORAGE_TICKETS = "orange-hotel-kitchen-tickets";
const STORAGE_SEQ = "orange-hotel-kitchen-seq";
const STORAGE_ITEMS = "orange-hotel-inventory-items";

function formatAgo(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  const elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMins < 1) return "Just now";
  if (elapsedMins < 60) return `${elapsedMins}m ago`;

  const hours = Math.floor(elapsedMins / 60);
  return `${hours}h ${elapsedMins % 60}m ago`;
}

export default function KitchenPage() {
  const [category, setCategory] = useState<KitchenCategory>("all");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("restaurant");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("Table 1");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [ticketSeq, setTicketSeq] = useState(300);
  const [kitchenInventory, setKitchenInventory] = useState<InventoryItem[]>(
    INVENTORY.filter((item) => item.category === "Kitchen"),
  );

  useEffect(() => {
    const savedTickets = localStorage.getItem(STORAGE_TICKETS);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);

    if (savedTickets) {
      try {
        const parsed = JSON.parse(savedTickets) as KitchenTicket[];
        if (Array.isArray(parsed)) {
          setTickets(parsed);
        }
      } catch {
        setTickets([]);
      }
    }

    if (savedSeq) {
      const parsedSeq = Number(savedSeq);
      if (!Number.isNaN(parsedSeq) && parsedSeq > 0) {
        setTicketSeq(parsedSeq);
      }
    }
  }, []);

  useEffect(() => {
    const savedItems = localStorage.getItem(STORAGE_ITEMS);
    if (!savedItems) return;
    try {
      const parsed = JSON.parse(savedItems) as InventoryItem[];
      if (Array.isArray(parsed)) {
        setKitchenInventory(parsed.filter((item) => item.category === "Kitchen"));
      }
    } catch {
      setKitchenInventory(INVENTORY.filter((item) => item.category === "Kitchen"));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SEQ, String(ticketSeq));
  }, [ticketSeq]);

  const filteredMenu = useMemo(() => {
    return KITCHEN_MENU.filter((item) => {
      const inCategory = category === "all" || item.category === category;
      const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return inCategory && inSearch;
    });
  }, [category, searchTerm]);

  const filteredTickets = useMemo(() => {
    if (queueFilter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === queueFilter);
  }, [tickets, queueFilter]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.qty, 0),
    [cart],
  );
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const addToCart = (item: KitchenMenuItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }

      return [...current, { item, qty: 1 }];
    });
  };

  const increaseQty = (itemId: string) => {
    setCart((current) =>
      current.map((line) =>
        line.item.id === itemId ? { ...line, qty: line.qty + 1 } : line,
      ),
    );
  };

  const decreaseQty = (itemId: string) => {
    setCart((current) =>
      current
        .map((line) =>
          line.item.id === itemId ? { ...line, qty: Math.max(0, line.qty - 1) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (itemId: string) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const placeTicket = () => {
    if (cart.length === 0) return;

    const nextSeq = ticketSeq + 1;
    setTicketSeq(nextSeq);

    const ticket: KitchenTicket = {
      id: `kt-${Date.now()}`,
      code: `K-${nextSeq}`,
      createdAt: Date.now(),
      status: "new",
      mode: serviceMode,
      location: location.trim() || "General",
      lines: cart.map((line) => ({ name: line.item.name, qty: line.qty })),
      subtotal,
      tax,
      total,
    };

    setTickets((current) => [ticket, ...current]);
    setCart([]);
  };

  const advanceTicket = (id: string) => {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== id) return ticket;
        if (ticket.status === "new" || ticket.status === "delayed") {
          return { ...ticket, status: "preparing" };
        }
        if (ticket.status === "preparing") {
          return { ...ticket, status: "plated" };
        }
        return ticket;
      }),
    );
  };

  const markDelayed = (id: string) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id && ticket.status !== "plated" ? { ...ticket, status: "delayed" } : ticket,
      ),
    );
  };

  const completeTicket = (id: string) => {
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
  };

  const activeCount = tickets.length;
  const newCount = tickets.filter((ticket) => ticket.status === "new").length;
  const prepCount = tickets.filter((ticket) => ticket.status === "preparing").length;
  const platedCount = tickets.filter((ticket) => ticket.status === "plated").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Kitchen POS</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
              Order intake, preparation flow, and pass-off
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto">
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            {activeCount} Active
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {newCount} New
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {prepCount} Preparing
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {platedCount} Plated
          </Badge>
        </div>
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
                  placeholder="Search dishes..."
                  className="pl-10 h-12"
                />
              </div>

              <Tabs value={category} onValueChange={(value) => setCategory(value as KitchenCategory)}>
                <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
                  <TabsTrigger value="all" className="font-black uppercase text-[10px] tracking-widest rounded-lg">All</TabsTrigger>
                  <TabsTrigger value="grill" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Grill</TabsTrigger>
                  <TabsTrigger value="pasta" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Pasta</TabsTrigger>
                  <TabsTrigger value="salad" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Salad</TabsTrigger>
                  <TabsTrigger value="sides" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Sides</TabsTrigger>
                  <TabsTrigger value="dessert" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Dessert</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={serviceMode} onValueChange={(value) => setServiceMode(value as ServiceMode)}>
                <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl">
                  <TabsTrigger value="restaurant" className="font-black uppercase text-[10px] tracking-widest">Restaurant</TabsTrigger>
                  <TabsTrigger value="room-service" className="font-black uppercase text-[10px] tracking-widest">Room Service</TabsTrigger>
                  <TabsTrigger value="poolside" className="font-black uppercase text-[10px] tracking-widest">Poolside</TabsTrigger>
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
                    <p className="font-black uppercase tracking-widest text-xs">No dishes found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Kitchen Queue</CardTitle>
                  <CardDescription>Monitor prep pipeline by status</CardDescription>
                </div>
                <Tabs value={queueFilter} onValueChange={(value) => setQueueFilter(value as QueueFilter)}>
                  <TabsList className="h-10">
                    <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                    <TabsTrigger value="new" className="text-[10px] font-black uppercase tracking-widest">New</TabsTrigger>
                    <TabsTrigger value="preparing" className="text-[10px] font-black uppercase tracking-widest">Preparing</TabsTrigger>
                    <TabsTrigger value="plated" className="text-[10px] font-black uppercase tracking-widest">Plated</TabsTrigger>
                    <TabsTrigger value="delayed" className="text-[10px] font-black uppercase tracking-widest">Delayed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-2xl p-4 bg-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg tracking-tight">{ticket.code}</h3>
                        <Badge
                          className={cn(
                            "uppercase text-[9px] font-black tracking-widest border-none",
                            ticket.status === "new" && "bg-orange-100 text-orange-700",
                            ticket.status === "preparing" && "bg-blue-100 text-blue-700",
                            ticket.status === "plated" && "bg-green-100 text-green-700",
                            ticket.status === "delayed" && "bg-destructive/15 text-destructive",
                          )}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                        {ticket.mode} | {ticket.location} | {formatAgo(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="font-black text-sm">TSh {ticket.total.toLocaleString()}</div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {ticket.lines.map((line) => (
                      <div key={`${ticket.id}-${line.name}`} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{line.name}</span>
                        <span className="font-black text-xs uppercase tracking-wider">x{line.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ticket.status !== "plated" && (
                      <Button
                        onClick={() => advanceTicket(ticket.id)}
                        className="h-10 font-black uppercase tracking-widest text-[10px]"
                      >
                        {ticket.status === "new" || ticket.status === "delayed" ? (
                          <>
                            <Clock className="w-4 h-4 mr-2" /> Start Prep
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Plated
                          </>
                        )}
                      </Button>
                    )}

                    {ticket.status !== "plated" && ticket.status !== "delayed" && (
                      <Button
                        onClick={() => markDelayed(ticket.id)}
                        variant="outline"
                        className="h-10 font-black uppercase tracking-widest text-[10px]"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" /> Delay
                      </Button>
                    )}

                    {ticket.status === "plated" && (
                      <Button
                        onClick={() => completeTicket(ticket.id)}
                        className="h-10 font-black uppercase tracking-widest text-[10px] bg-green-600 hover:bg-green-600/90"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" /> Served
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="py-12 text-center opacity-40">
                  <ChefHat className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-black uppercase tracking-widest text-xs">No tickets in this queue</p>
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
            <CardDescription>Prepare and dispatch a kitchen order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Kitchen Inventory (Auto-filled)
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {kitchenInventory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold">{item.name}</span>
                    <span className="font-black uppercase tracking-wider">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                ))}
                {kitchenInventory.length === 0 && (
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    No kitchen inventory items
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Table 1 or Room 204" />
            </div>

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
              <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-60">
                <span>Subtotal</span>
                <span>TSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-60">
                <span>Tax (5%)</span>
                <span>TSh {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-2">
                <span>Total</span>
                <span className="text-primary">TSh {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Clear Ticket
              </Button>
              <Button
                onClick={placeTicket}
                disabled={cart.length === 0}
                className="h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Send To Kitchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
