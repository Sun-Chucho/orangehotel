"use client";

import { useEffect, useMemo, useState } from "react";
import { ROOMS, Room } from "@/app/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Banknote, CalendarCheck2, Clock, CreditCard, Phone, Receipt, User } from "lucide-react";

type PaymentMethod = "cash" | "card" | "mobile-money";
type TransactionTab = "completed" | "credit";
type RoomType = "standard" | "platinum";
type TransactionStatus = "completed" | "credit" | "checked-out";

interface BookingRecord {
  id: string;
  receiptNo: string;
  createdAt: number;
  guestName: string;
  phone: string;
  roomType: RoomType;
  roomNumber: string;
  payment: PaymentMethod;
  entryDate: string;
  checkInDate: string;
  checkOutDate: string;
  checkOutTime: string;
  nights: number;
  total: number;
  status: TransactionStatus;
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isOverstay(record: BookingRecord): boolean {
  if (record.status === "checked-out") return false;
  const checkoutAt = new Date(`${record.checkOutDate}T${record.checkOutTime || "00:00"}:00`);
  return Date.now() > checkoutAt.getTime();
}

export default function BookingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [transactionTab, setTransactionTab] = useState<TransactionTab>("completed");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");

  const [rooms, setRooms] = useState<Room[]>(ROOMS.map((room) => ({ ...room })));
  const [transactions, setTransactions] = useState<BookingRecord[]>([]);
  const [receiptSeq, setReceiptSeq] = useState(84920);

  useEffect(() => {
    const savedTx = localStorage.getItem(STORAGE_TX);
    const savedSeq = localStorage.getItem(STORAGE_SEQ);

    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx) as BookingRecord[];
        if (Array.isArray(parsed)) {
          setTransactions(
            parsed.map((tx) => ({
              ...tx,
              status: tx.status === "credit" || tx.status === "checked-out" ? tx.status : "completed",
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

  const nights = useMemo(() => daysBetween(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const rate = ROOM_RATE[roomType];
  const total = nights * rate;

  const availableRooms = useMemo(() => {
    const wantedType = roomType === "standard" ? "Standard" : "Platinum";
    return rooms.filter((room) => room.type === wantedType && room.status === "available");
  }, [roomType, rooms]);

  const completedTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "completed" || tx.status === "checked-out"),
    [transactions],
  );
  const creditTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "credit"),
    [transactions],
  );

  const totalTransactions = transactions.length;
  const todayRevenue = transactions
    .filter((tx) => tx.status === "completed" || tx.status === "checked-out")
    .reduce((sum, tx) => sum + tx.total, 0);

  const clearBookingForm = () => {
    if (!window.confirm("Clear this booking form?")) return;
    setGuestName("");
    setPhone("");
    setEntryDate(today);
    setCheckInDate(today);
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setPayment("cash");
    setRoomType("standard");
  };

  const markRoomStatus = (roomNumber: string, status: Room["status"]) => {
    setRooms((current) =>
      current.map((room) => (room.number === roomNumber ? { ...room, status } : room)),
    );
  };

  const saveBooking = (status: "completed" | "credit") => {
    if (guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber) return;
    const confirmText = status === "credit" ? "Save this as CREDIT booking?" : "Complete this booking?";
    if (!window.confirm(confirmText)) return;

    const nextReceipt = receiptSeq + 1;
    setReceiptSeq(nextReceipt);

    const tx: BookingRecord = {
      id: `tx-${Date.now()}`,
      receiptNo: `#${nextReceipt}`,
      createdAt: Date.now(),
      guestName: guestName.trim(),
      phone: phone.trim(),
      roomType,
      roomNumber: selectedRoomNumber,
      payment,
      entryDate,
      checkInDate,
      checkOutDate,
      checkOutTime,
      nights,
      total,
      status,
    };

    setTransactions((current) => [tx, ...current]);
    markRoomStatus(selectedRoomNumber, "occupied");

    setGuestName("");
    setPhone("");
    setEntryDate(today);
    setCheckInDate(today);
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setPayment("cash");
    setRoomType("standard");
  };

  const completeBooking = () => saveBooking("completed");
  const createCreditBooking = () => saveBooking("credit");

  const clearCreditTransaction = (id: string) => {
    if (!window.confirm("Mark this credit transaction as cleared?")) return;
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, status: "completed" } : tx)),
    );
  };

  const checkOutBooking = (id: string) => {
    const booking = transactions.find((tx) => tx.id === id);
    if (!booking) return;
    if (!window.confirm(`Check out room ${booking.roomNumber} and free it?`)) return;

    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, status: "checked-out" } : tx)),
    );
    markRoomStatus(booking.roomNumber, "available");
  };

  const extendStay = (id: string) => {
    const booking = transactions.find((tx) => tx.id === id);
    if (!booking || booking.status === "checked-out") return;

    const raw = window.prompt("How many extra days to extend?", "1");
    const extraDays = Number(raw);
    if (!Number.isFinite(extraDays) || extraDays < 1) return;
    if (!window.confirm(`Create extension booking for ${extraDays} day(s)?`)) return;

    const nextReceipt = receiptSeq + 1;
    setReceiptSeq(nextReceipt);

    const extension: BookingRecord = {
      ...booking,
      id: `tx-${Date.now()}`,
      receiptNo: `#${nextReceipt}`,
      createdAt: Date.now(),
      entryDate: booking.checkOutDate,
      checkInDate: booking.checkOutDate,
      checkOutDate: addDays(booking.checkOutDate, extraDays),
      nights: extraDays,
      total: extraDays * ROOM_RATE[booking.roomType],
      status: booking.status === "credit" ? "credit" : "completed",
    };

    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, status: "checked-out" as const } : tx)).concat(extension),
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

      <Card className="shadow-2xl border-none bg-white overflow-hidden">
        <div className="h-1.5 bg-primary" />
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">New Booking</CardTitle>
          <CardDescription>Guest details, room selection, stay dates, and payment</CardDescription>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Room Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRoomType("standard");
                  setRoomPickerOpen(true);
                }}
                className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition ${
                  roomType === "standard" ? "bg-yellow-500 text-black border-yellow-500" : "bg-white"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomType("platinum");
                  setRoomPickerOpen(true);
                }}
                className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition ${
                  roomType === "platinum" ? "bg-yellow-500 text-black border-yellow-500" : "bg-white"
                }`}
              >
                Platinum
              </button>
            </div>
            {selectedRoomNumber && (
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Selected Room: {selectedRoomNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="pl-10" />
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button variant="outline" onClick={clearBookingForm} className="h-11 font-black uppercase text-[10px] tracking-widest">
              Clear
            </Button>
            <Button
              onClick={completeBooking}
              disabled={guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber}
              className="h-11 font-black uppercase text-[10px] tracking-widest"
            >
              Complete Booking
            </Button>
            <Button
              onClick={createCreditBooking}
              disabled={guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber}
              className="h-11 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-600/90 text-white"
            >
              Credit Booking
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Booked Rooms</CardTitle>
              <CardDescription>Manage completed and credit bookings</CardDescription>
            </div>
            <Tabs value={transactionTab} onValueChange={(value) => setTransactionTab(value as TransactionTab)}>
              <TabsList className="h-10">
                <TabsTrigger value="completed" className="text-[10px] font-black uppercase tracking-widest">Completed Transactions</TabsTrigger>
                <TabsTrigger value="credit" className="text-[10px] font-black uppercase tracking-widest">Credit Transactions</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Room #</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Guest Name</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Check-In Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Check-Out Time</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactionTab === "completed" ? completedTransactions : creditTransactions).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-black">{tx.roomNumber}</TableCell>
                  <TableCell className="font-bold">{tx.guestName}</TableCell>
                  <TableCell className="font-bold">{tx.checkInDate}</TableCell>
                  <TableCell className="font-bold">{tx.checkOutTime}</TableCell>
                  <TableCell>
                    {isOverstay(tx) ? (
                      <Badge className="bg-red-600 text-white border-red-600 hover:bg-red-600">Overstay</Badge>
                    ) : tx.status === "checked-out" ? (
                      <Badge className="bg-green-600 text-white border-green-600 hover:bg-green-600">Checked Out</Badge>
                    ) : tx.status === "credit" ? (
                      <Badge className="bg-orange-500 text-white border-orange-500 hover:bg-orange-500">Credit</Badge>
                    ) : (
                      <Badge className="bg-blue-600 text-white border-blue-600 hover:bg-blue-600">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {tx.status !== "checked-out" && (
                        <Button
                          onClick={() => checkOutBooking(tx.id)}
                          className="h-9 font-black uppercase text-[10px] tracking-widest"
                        >
                          Check Out
                        </Button>
                      )}
                      {tx.status !== "checked-out" && (
                        <Button
                          onClick={() => extendStay(tx.id)}
                          variant="outline"
                          className="h-9 font-black uppercase text-[10px] tracking-widest"
                        >
                          Extend Stay
                        </Button>
                      )}
                      {transactionTab === "credit" && tx.status === "credit" && (
                        <Button
                          onClick={() => clearCreditTransaction(tx.id)}
                          className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90"
                        >
                          Cleared
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {(transactionTab === "completed" ? completedTransactions : creditTransactions).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="opacity-40">
                      <Receipt className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-black uppercase tracking-widest text-xs">No bookings found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {roomPickerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">
                Available {roomType === "standard" ? "Standard" : "Platinum"} Rooms
              </CardTitle>
              <CardDescription>Select a free room for this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableRooms.map((room) => (
                  <Button
                    key={room.id}
                    variant={selectedRoomNumber === room.number ? "default" : "outline"}
                    onClick={() => {
                      setSelectedRoomNumber(room.number);
                      setRoomPickerOpen(false);
                    }}
                    className="h-10 font-black"
                  >
                    {room.number}
                  </Button>
                ))}
              </div>

              {availableRooms.length === 0 && (
                <p className="text-sm font-bold text-muted-foreground">No free rooms in this category.</p>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setRoomPickerOpen(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
