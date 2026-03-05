"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Banknote,
  BedDouble,
  CalendarCheck2,
  CreditCard,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";

type ServiceCategory = "all" | "rooms" | "transport" | "wellness" | "food" | "fees";
type PaymentMethod = "cash" | "card" | "mobile-money" | "room-charge";
type TxFilter = "all" | PaymentMethod;
type RoomAction = "occupied" | "left" | "reserved" | "cleaning";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<ServiceCategory, "all">;
}

interface CartLine {
  item: ServiceItem;
  qty: number;
}

interface Transaction {
  id: string;
  receiptNo: string;
  createdAt: number;
  guestName: string;
  roomNumber: string;
  roomAction: RoomAction;
  payment: PaymentMethod;
  lines: Array<{ name: string; qty: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  total: number;
}

const SERVICES: ServiceItem[] = [
  { id: "s1", name: "Standard Room Booking", price: 70000, category: "rooms" },
  { id: "s2", name: "Platinum Room Booking", price: 100000, category: "rooms" },
  { id: "s3", name: "Late Checkout Fee", price: 50000, category: "fees" },
  { id: "s4", name: "Airport Transfer", price: 35000, category: "transport" },
  { id: "s5", name: "City Shuttle", price: 20000, category: "transport" },
  { id: "s6", name: "Spa Day Pass", price: 80000, category: "wellness" },
  { id: "s7", name: "Laundry Express", price: 20000, category: "fees" },
  { id: "s8", name: "Dinner Buffet", price: 45000, category: "food" },
  { id: "s9", name: "Breakfast Voucher", price: 25000, category: "food" },
];

const STORAGE_TX = "orange-hotel-cashier-transactions";
const STORAGE_SEQ = "orange-hotel-cashier-seq";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function CashierPage() {
  const [category, setCategory] = useState<ServiceCategory>("all");
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [roomAction, setRoomAction] = useState<RoomAction>("occupied");
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receiptSeq, setReceiptSeq] = useState(84920);

  useEffect(() => {
    const savedTx = localStorage.getItem(STORAGE_TX);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);

    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx) as Transaction[];
        if (Array.isArray(parsed)) setTransactions(parsed);
      } catch {
        setTransactions([]);
      }
    }

    if (savedSeq) {
      const parsedSeq = Number(savedSeq);
      if (!Number.isNaN(parsedSeq) && parsedSeq > 0) setReceiptSeq(parsedSeq);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TX, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SEQ, String(receiptSeq));
  }, [receiptSeq]);

  const filteredServices = useMemo(() => {
    return SERVICES.filter((service) => {
      const inCategory = category === "all" || service.category === category;
      const inSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
      return inCategory && inSearch;
    });
  }, [category, searchTerm]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === "all") return transactions;
    return transactions.filter((tx) => tx.payment === txFilter);
  }, [transactions, txFilter]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.qty, 0),
    [cart],
  );
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const addToCart = (item: ServiceItem) => {
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

  const incQty = (id: string) => {
    setCart((current) =>
      current.map((line) => (line.item.id === id ? { ...line, qty: line.qty + 1 } : line)),
    );
  };

  const decQty = (id: string) => {
    setCart((current) =>
      current
        .map((line) => (line.item.id === id ? { ...line, qty: Math.max(0, line.qty - 1) } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (id: string) => {
    setCart((current) => current.filter((line) => line.item.id !== id));
  };

  const clearOrder = () => {
    setCart([]);
  };

  const completePayment = () => {
    if (cart.length === 0 || guestName.trim().length === 0) return;

    const nextReceipt = receiptSeq + 1;
    setReceiptSeq(nextReceipt);

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNo: `#${nextReceipt}`,
      createdAt: Date.now(),
      guestName: guestName.trim(),
      roomNumber: roomNumber.trim() || "Walk-in",
      roomAction,
      payment,
      lines: cart.map((line) => ({ name: line.item.name, qty: line.qty, unitPrice: line.item.price })),
      subtotal,
      tax,
      total,
    };

    setTransactions((current) => [tx, ...current]);
    setCart([]);
    setGuestName("");
    setRoomNumber("");
  };

  const totalTransactions = transactions.length;
  const todayRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Reception Booking</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Check-in billing, service charges, and payment processing
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            {totalTransactions} Transactions
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            TSh {todayRevenue.toLocaleString()} Today
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
                  placeholder="Search services, rooms, or items..."
                  className="pl-10 h-12"
                />
              </div>

              <Tabs value={category} onValueChange={(value) => setCategory(value as ServiceCategory)}>
                <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
                  <TabsTrigger value="all" className="font-black uppercase text-[10px] tracking-widest rounded-lg">All</TabsTrigger>
                  <TabsTrigger value="rooms" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Rooms</TabsTrigger>
                  <TabsTrigger value="transport" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Transport</TabsTrigger>
                  <TabsTrigger value="wellness" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Wellness</TabsTrigger>
                  <TabsTrigger value="food" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Food</TabsTrigger>
                  <TabsTrigger value="fees" className="font-black uppercase text-[10px] tracking-widest rounded-lg">Fees</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service)}
                    className="text-left bg-white border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest">
                        {service.category}
                      </Badge>
                      <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-black text-lg leading-tight">{service.name}</h3>
                    <div className="mt-4 font-black text-sm">TSh {service.price.toLocaleString()}</div>
                  </button>
                ))}
                {filteredServices.length === 0 && (
                  <div className="col-span-full py-10 text-center opacity-40">
                    <p className="font-black uppercase tracking-widest text-xs">No matching services</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Recent Transactions</CardTitle>
                  <CardDescription>Completed cashier transactions</CardDescription>
                </div>
                <Tabs value={txFilter} onValueChange={(value) => setTxFilter(value as TxFilter)}>
                  <TabsList className="h-10">
                    <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                    <TabsTrigger value="cash" className="text-[10px] font-black uppercase tracking-widest">Cash</TabsTrigger>
                    <TabsTrigger value="card" className="text-[10px] font-black uppercase tracking-widest">Card</TabsTrigger>
                    <TabsTrigger value="mobile-money" className="text-[10px] font-black uppercase tracking-widest">Mobile</TabsTrigger>
                    <TabsTrigger value="room-charge" className="text-[10px] font-black uppercase tracking-widest">Room</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTransactions.slice(0, 8).map((tx) => (
                <div key={tx.id} className="border rounded-2xl p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm">{tx.receiptNo}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                        {tx.guestName} | Room: {tx.roomNumber} ({tx.roomAction}) | {tx.payment} | {formatAgo(tx.createdAt)}
                      </p>
                    </div>
                    <p className="font-black text-sm">TSh {tx.total.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {filteredTransactions.length === 0 && (
                <div className="py-10 text-center opacity-40">
                  <Receipt className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-black uppercase tracking-widest text-xs">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl border-none bg-white overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-tight">Current Order</CardTitle>
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-primary shadow-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <CardDescription>Capture guest details and process payment</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Guest name"
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  placeholder="Room number (optional)"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Action</p>
              <div className="grid grid-cols-2 gap-2">
                {(["occupied", "left", "reserved", "cleaning"] as RoomAction[]).map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant={roomAction === action ? "default" : "outline"}
                    onClick={() => setRoomAction(action)}
                    className="h-10 font-black uppercase text-[10px] tracking-widest"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="h-44 rounded-xl border border-dashed flex flex-col items-center justify-center text-center opacity-40">
                <Receipt className="w-10 h-10 mb-2" />
                <p className="font-black uppercase tracking-widest text-[10px]">Waiting for items...</p>
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => decQty(line.item.id)}>
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-8 text-center font-black">{line.qty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => incQty(line.item.id)}>
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
              <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
                <TabsTrigger value="cash" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <Banknote className="w-3.5 h-3.5 mr-1" /> Cash
                </TabsTrigger>
                <TabsTrigger value="card" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Card
                </TabsTrigger>
                <TabsTrigger value="mobile-money" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <CalendarCheck2 className="w-3.5 h-3.5 mr-1" /> Mobile
                </TabsTrigger>
                <TabsTrigger value="room-charge" className="text-[10px] font-black uppercase tracking-widest rounded-lg">
                  <Receipt className="w-3.5 h-3.5 mr-1" /> Room
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
              <Button
                variant="outline"
                onClick={clearOrder}
                disabled={cart.length === 0}
                className="h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Clear
              </Button>
              <Button
                onClick={completePayment}
                disabled={cart.length === 0 || guestName.trim().length === 0}
                className="h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Complete Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
