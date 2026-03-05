"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, CalendarCheck2, Clock, CreditCard, Phone, Receipt, User } from "lucide-react";

type PaymentMethod = "cash" | "card" | "mobile-money";
type TransactionTab = "completed" | "credit";
type RoomType = "standard" | "platinum";
type StayMode = "days" | "calendar";
type TransactionStatus = "completed" | "credit";

interface Transaction {
  id: string;
  receiptNo: string;
  createdAt: number;
  guestName: string;
  phone: string;
  roomType: RoomType;
  nights: number;
  payment: PaymentMethod;
  status: TransactionStatus;
  bookingTime: string;
  checkIn?: string;
  checkOut?: string;
  total: number;
}

const ROOM_RATE: Record<RoomType, number> = {
  standard: 70000,
  platinum: 100000,
};

const STORAGE_TX = "orange-hotel-cashier-transactions";
const STORAGE_SEQ = "orange-hotel-cashier-seq";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

function daysBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inDate = new Date(`${checkIn}T00:00:00`);
  const outDate = new Date(`${checkOut}T00:00:00`);
  const ms = outDate.getTime() - inDate.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

export default function BookingPage() {
  const [transactionTab, setTransactionTab] = useState<TransactionTab>("completed");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [stayMode, setStayMode] = useState<StayMode>("days");

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingTime, setBookingTime] = useState("12:00");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [daysInput, setDaysInput] = useState("1");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receiptSeq, setReceiptSeq] = useState(84920);

  useEffect(() => {
    const savedTx = localStorage.getItem(STORAGE_TX);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);

    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx) as Transaction[];
        if (Array.isArray(parsed)) {
          setTransactions(
            parsed.map((tx) => ({
              ...tx,
              status: tx.status === "credit" ? "credit" : "completed",
            })),
          );
        }
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

  const nights = useMemo(() => {
    if (stayMode === "days") {
      const value = Number(daysInput);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    }
    return daysBetween(checkIn, checkOut);
  }, [stayMode, daysInput, checkIn, checkOut]);

  const rate = ROOM_RATE[roomType];
  const total = nights * rate;

  const completedTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "completed"),
    [transactions],
  );
  const creditTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "credit"),
    [transactions],
  );

  const totalTransactions = transactions.length;
  const todayRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);

  const clearBookingForm = () => {
    setGuestName("");
    setPhone("");
    setBookingTime("12:00");
    setCheckIn("");
    setCheckOut("");
    setDaysInput("1");
    setRoomType("standard");
    setPayment("cash");
    setStayMode("days");
  };

  const saveBooking = (status: TransactionStatus) => {
    if (guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1) return;

    const nextReceipt = receiptSeq + 1;
    setReceiptSeq(nextReceipt);

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNo: `#${nextReceipt}`,
      createdAt: Date.now(),
      guestName: guestName.trim(),
      phone: phone.trim(),
      roomType,
      nights,
      payment,
      status,
      bookingTime,
      checkIn: stayMode === "calendar" ? checkIn : undefined,
      checkOut: stayMode === "calendar" ? checkOut : undefined,
      total,
    };

    setTransactions((current) => [tx, ...current]);
    clearBookingForm();
  };

  const completeBooking = () => saveBooking("completed");
  const createCreditBooking = () => saveBooking("credit");

  const clearCreditTransaction = (id: string) => {
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, status: "completed" } : tx)),
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Reception Booking</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Guest booking capture and payment processing
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
        <Card className="xl:col-span-2 shadow-2xl border-none bg-white overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">New Booking</CardTitle>
            <CardDescription>Guest details, stay duration, room type, and payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" className="pl-10" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Type</p>
              <Tabs value={roomType} onValueChange={(value) => setRoomType(value as RoomType)}>
                <TabsList className="w-full grid grid-cols-2 h-11 bg-muted/30 rounded-xl">
                  <TabsTrigger value="standard" className="font-black uppercase text-[10px] tracking-widest">Standard</TabsTrigger>
                  <TabsTrigger value="platinum" className="font-black uppercase text-[10px] tracking-widest">Platinum</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stay Selection</p>
              <Tabs value={stayMode} onValueChange={(value) => setStayMode(value as StayMode)}>
                <TabsList className="w-full grid grid-cols-2 h-11 bg-muted/30 rounded-xl">
                  <TabsTrigger value="days" className="font-black uppercase text-[10px] tracking-widest">Number Of Days</TabsTrigger>
                  <TabsTrigger value="calendar" className="font-black uppercase text-[10px] tracking-widest">Calendar Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {stayMode === "days" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input type="number" min="1" value={daysInput} onChange={(e) => setDaysInput(e.target.value)} placeholder="Number of days" />
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="pl-10" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="pl-10" />
                </div>
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
                <TabsTrigger value="mobile-money" className="text-[10px] font-black uppercase tracking-widest">
                  <CalendarCheck2 className="w-3.5 h-3.5 mr-1" /> Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-60">
                <span>Rate / Night</span>
                <span>TSh {rate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-60">
                <span>Days</span>
                <span>{nights}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-2">
                <span>Total</span>
                <span className="text-primary">TSh {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={clearBookingForm} className="h-11 font-black uppercase text-[10px] tracking-widest">
                Clear
              </Button>
              <Button
                onClick={createCreditBooking}
                disabled={guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1}
                className="h-11 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-600/90 text-white"
              >
                Credit Payment
              </Button>
              <Button
                onClick={completeBooking}
                disabled={guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1}
                className="h-11 font-black uppercase text-[10px] tracking-widest"
              >
                Complete Booking
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Recent Transactions</CardTitle>
                <CardDescription>Completed and credit booking transactions</CardDescription>
              </div>
              <Tabs value={transactionTab} onValueChange={(value) => setTransactionTab(value as TransactionTab)}>
                <TabsList className="h-10">
                  <TabsTrigger value="completed" className="text-[10px] font-black uppercase tracking-widest">Completed</TabsTrigger>
                  <TabsTrigger value="credit" className="text-[10px] font-black uppercase tracking-widest">Credit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(transactionTab === "completed" ? completedTransactions : creditTransactions)
              .slice(0, 10)
              .map((tx) => (
                <div key={tx.id} className="border rounded-2xl p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-sm">{tx.receiptNo}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                        {tx.guestName} | {tx.phone} | {tx.roomType} | {tx.nights} days | {tx.payment} | {tx.bookingTime} | {formatAgo(tx.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-sm">TSh {tx.total.toLocaleString()}</p>
                      {transactionTab === "credit" && (
                        <Button
                          onClick={() => clearCreditTransaction(tx.id)}
                          className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90"
                        >
                          Cleared
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {(transactionTab === "completed" ? completedTransactions : creditTransactions).length === 0 && (
              <div className="py-10 text-center opacity-40">
                <Receipt className="w-10 h-10 mx-auto mb-2" />
                <p className="font-black uppercase tracking-widest text-xs">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
