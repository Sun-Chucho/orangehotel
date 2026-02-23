"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Banknote,
  CheckCircle2,
  Coffee,
  CreditCard,
  CupSoda,
  LoaderCircle,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuCategory = "all" | "espresso" | "coffee" | "tea" | "cold" | "snacks";
type OrderMode = "dine-in" | "takeaway" | "room-service";
type PaymentMethod = "cash" | "card" | "room-charge";
type OrderStatus = "new" | "brewing" | "ready";
type QueueFilter = "all" | OrderStatus;

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<MenuCategory, "all">;
  prepMinutes: number;
}

interface CartLine {
  item: MenuItem;
  qty: number;
}

interface BaristaOrder {
  id: string;
  ticket: string;
  createdAt: number;
  status: OrderStatus;
  mode: OrderMode;
  payment: PaymentMethod;
  lines: Array<{ name: string; qty: number }>;
  subtotal: number;
  tax: number;
  total: number;
}

const MENU: MenuItem[] = [
  { id: "m1", name: "Single Espresso", price: 7000, category: "espresso", prepMinutes: 2 },
  { id: "m2", name: "Double Espresso", price: 9500, category: "espresso", prepMinutes: 2 },
  { id: "m3", name: "Americano", price: 9000, category: "coffee", prepMinutes: 3 },
  { id: "m4", name: "Cappuccino", price: 12000, category: "coffee", prepMinutes: 4 },
  { id: "m5", name: "Vanilla Latte", price: 14000, category: "coffee", prepMinutes: 5 },
  { id: "m6", name: "Flat White", price: 13000, category: "coffee", prepMinutes: 4 },
  { id: "m7", name: "Masala Tea", price: 7000, category: "tea", prepMinutes: 3 },
  { id: "m8", name: "Earl Grey", price: 8000, category: "tea", prepMinutes: 3 },
  { id: "m9", name: "Iced Latte", price: 14500, category: "cold", prepMinutes: 4 },
  { id: "m10", name: "Cold Brew", price: 13500, category: "cold", prepMinutes: 3 },
  { id: "m11", name: "Orange Juice", price: 10000, category: "cold", prepMinutes: 2 },
  { id: "m12", name: "Croissant", price: 6000, category: "snacks", prepMinutes: 1 },
  { id: "m13", name: "Blueberry Muffin", price: 6500, category: "snacks", prepMinutes: 1 },
  { id: "m14", name: "Club Sandwich", price: 18000, category: "snacks", prepMinutes: 7 },
];

const STORAGE_ORDERS = "orange-hotel-barista-orders";
const STORAGE_SEQ = "orange-hotel-barista-seq";

function formatAgo(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  const elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMins < 1) return "Just now";
  if (elapsedMins < 60) return `${elapsedMins}m ago`;

  const hours = Math.floor(elapsedMins / 60);
  return `${hours}h ${elapsedMins % 60}m ago`;
}

export default function BaristaPage() {
  const [category, setCategory] = useState<MenuCategory>("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<OrderMode>("dine-in");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<BaristaOrder[]>([]);
  const [ticketSeq, setTicketSeq] = useState(490);

  useEffect(() => {
    const savedOrders = localStorage.getItem(STORAGE_ORDERS);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);

    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders) as BaristaOrder[];
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      } catch {
        setOrders([]);
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
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SEQ, String(ticketSeq));
  }, [ticketSeq]);

  const filteredMenu = useMemo(() => {
    return MENU.filter((item) => {
      const inCategory = category === "all" || item.category === category;
      const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return inCategory && inSearch;
    });
  }, [category, searchTerm]);

  const filteredOrders = useMemo(() => {
    if (queueFilter === "all") return orders;
    return orders.filter((order) => order.status === queueFilter);
  }, [orders, queueFilter]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.qty, 0),
    [cart],
  );
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const activeCount = orders.length;
  const newCount = orders.filter((order) => order.status === "new").length;
  const brewingCount = orders.filter((order) => order.status === "brewing").length;
  const readyCount = orders.filter((order) => order.status === "ready").length;

  const addToCart = (item: MenuItem) => {
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

  const removeItem = (itemId: string) => {
    setCart((current) => current.filter((line) => line.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const placeOrder = () => {
    if (cart.length === 0) return;

    const nextSeq = ticketSeq + 1;
    setTicketSeq(nextSeq);

    const order: BaristaOrder = {
      id: `bo-${Date.now()}`,
      ticket: `#${nextSeq}`,
      createdAt: Date.now(),
      status: "new",
      mode,
      payment,
      lines: cart.map((line) => ({ name: line.item.name, qty: line.qty })),
      subtotal,
      tax,
      total,
    };

    setOrders((current) => [order, ...current]);
    setCart([]);
  };

  const advanceOrder = (id: string) => {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;
        if (order.status === "new") return { ...order, status: "brewing" };
        if (order.status === "brewing") return { ...order, status: "ready" };
        return order;
      }),
    );
  };

  const completeOrder = (id: string) => {
    setOrders((current) => current.filter((order) => order.id !== id));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
            <Coffee className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Barista POS</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
              Order intake, preparation queue, and checkout
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
            {brewingCount} Brewing
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {readyCount} Ready
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
                  placeholder="Search drinks or snacks..."
                  className="pl-10 h-12"
                />
              </div>

              <Tabs value={category} onValueChange={(value) => setCategory(value as MenuCategory)}>
                <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
                  <TabsTrigger value="all" className="font-black uppercase text-[10px] tracking-widest rounded-lg">All</TabsTrigger>
                  <TabsTrigger value="espresso" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Espresso</TabsTrigger>
                  <TabsTrigger value="coffee" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Coffee</TabsTrigger>
                  <TabsTrigger value="tea" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Tea</TabsTrigger>
                  <TabsTrigger value="cold" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Cold</TabsTrigger>
                  <TabsTrigger value="snacks" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Snacks</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={mode} onValueChange={(value) => setMode(value as OrderMode)}>
                <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl">
                  <TabsTrigger value="dine-in" className="font-black uppercase text-[10px] tracking-widest">Dine-in</TabsTrigger>
                  <TabsTrigger value="takeaway" className="font-black uppercase text-[10px] tracking-widest">Takeaway</TabsTrigger>
                  <TabsTrigger value="room-service" className="font-black uppercase text-[10px] tracking-widest">Room Service</TabsTrigger>
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
                    <p className="font-black uppercase tracking-widest text-xs">No items found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Order Queue</CardTitle>
                  <CardDescription>Track beverage preparation status</CardDescription>
                </div>
                <Tabs value={queueFilter} onValueChange={(value) => setQueueFilter(value as QueueFilter)}>
                  <TabsList className="h-10">
                    <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                    <TabsTrigger value="new" className="text-[10px] font-black uppercase tracking-widest">New</TabsTrigger>
                    <TabsTrigger value="brewing" className="text-[10px] font-black uppercase tracking-widest">Brewing</TabsTrigger>
                    <TabsTrigger value="ready" className="text-[10px] font-black uppercase tracking-widest">Ready</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-2xl p-4 bg-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg tracking-tight">{order.ticket}</h3>
                        <Badge
                          className={cn(
                            "uppercase text-[9px] font-black tracking-widest border-none",
                            order.status === "new" && "bg-orange-100 text-orange-700",
                            order.status === "brewing" && "bg-blue-100 text-blue-700",
                            order.status === "ready" && "bg-green-100 text-green-700",
                          )}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                        {order.mode} | {order.payment} | {formatAgo(order.createdAt)}
                      </p>
                    </div>
                    <div className="font-black text-sm">TSh {order.total.toLocaleString()}</div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.lines.map((line) => (
                      <div key={`${order.id}-${line.name}`} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{line.name}</span>
                        <span className="font-black text-xs uppercase tracking-wider">x{line.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {order.status !== "ready" && (
                      <Button
                        onClick={() => advanceOrder(order.id)}
                        className="h-10 font-black uppercase tracking-widest text-[10px]"
                      >
                        {order.status === "new" ? (
                          <>
                            <LoaderCircle className="w-4 h-4 mr-2" /> Start Brewing
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Ready
                          </>
                        )}
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        onClick={() => completeOrder(order.id)}
                        className="h-10 font-black uppercase tracking-widest text-[10px] bg-green-600 hover:bg-green-600/90"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" /> Complete Pickup
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <div className="py-12 text-center opacity-40">
                  <Coffee className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-black uppercase tracking-widest text-xs">No orders in this queue</p>
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
            <CardDescription>Build and submit a beverage order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {cart.length === 0 ? (
              <div className="h-44 rounded-xl border border-dashed flex flex-col items-center justify-center text-center opacity-40">
                <Receipt className="w-10 h-10 mb-2" />
                <p className="font-black uppercase tracking-widest text-[10px]">Cart is empty</p>
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
                        onClick={() => removeItem(line.item.id)}
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

            <Tabs value={payment} onValueChange={(value) => setPayment(value as PaymentMethod)}>
              <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl">
                <TabsTrigger value="cash" className="text-[10px] font-black uppercase tracking-widest">
                  <Banknote className="w-3.5 h-3.5 mr-1" /> Cash
                </TabsTrigger>
                <TabsTrigger value="card" className="text-[10px] font-black uppercase tracking-widest">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Card
                </TabsTrigger>
                <TabsTrigger value="room-charge" className="text-[10px] font-black uppercase tracking-widest">
                  <CupSoda className="w-3.5 h-3.5 mr-1" /> Room
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
              <Button variant="outline" onClick={clearCart} disabled={cart.length === 0} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Clear Cart
              </Button>
              <Button onClick={placeOrder} disabled={cart.length === 0} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Place Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
