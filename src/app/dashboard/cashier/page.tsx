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
import { Clock, Phone, Receipt, User } from "lucide-react";

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
  checkInDate: string;
  checkInTime: string;
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

function daysBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inDate = new Date(`${checkIn}T00:00:00`);
  const outDate = new Date(`${checkOut}T00:00:00`);
  const ms = outDate.getTime() - inDate.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

function isOverstay(record: BookingRecord): boolean {
  if (record.status === "checked-out") return false;
  const checkoutAt = new Date(`${record.checkOutDate}T${record.checkOutTime || "00:00"}:00`);
  return Date.now() > checkoutAt.getTime();
}

export default function BookingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [transactionTab, setTransactionTab] = useState<TransactionTab>("completed");
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");

  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showPayNowPopup, setShowPayNowPopup] = useState(false);

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
    setCheckInDate(today);
    setCheckInTime("14:00");
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setRoomType("standard");
    setShowSettlementPopup(false);
    setShowPayNowPopup(false);
  };

  const markRoomStatus = (roomNumber: string, status: Room["status"]) => {
    setRooms((current) => current.map((room) => (room.number === roomNumber ? { ...room, status } : room)));
  };

  const saveBooking = (status: "completed" | "credit", paymentMethod: PaymentMethod) => {
    if (guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber) return;

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
      payment: paymentMethod,
      checkInDate,
      checkInTime,
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
    setCheckInDate(today);
    setCheckInTime("14:00");
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setRoomType("standard");
    setShowSettlementPopup(false);
    setShowPayNowPopup(false);
  };

  const openSettlementPopup = () => {
    if (guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber) return;
    setShowSettlementPopup(true);
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
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Room: {selectedRoomNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-In Date</p>
              <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-In Time</p>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-Out Date</p>
              <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check-Out Time</p>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearBookingForm} className="h-11 font-black uppercase text-[10px] tracking-widest">
              Clear
            </Button>
            <Button
              onClick={openSettlementPopup}
              disabled={guestName.trim().length === 0 || phone.trim().length < 7 || nights < 1 || !selectedRoomNumber}
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
              <CardTitle className="text-xl font-black uppercase tracking-tight">Booked Rooms</CardTitle>
              <CardDescription>Completed and credit booking records</CardDescription>
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
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          tx.status !== "checked-out" && !isOverstay(tx)
                            ? "bg-green-600 text-white border-green-600 hover:bg-green-600"
                            : "bg-gray-200 text-gray-600 border-gray-200 hover:bg-gray-200"
                        }
                      >
                        Occupied
                      </Badge>
                      <Badge
                        className={
                          tx.status !== "checked-out" && isOverstay(tx)
                            ? "bg-red-600 text-white border-red-600 hover:bg-red-600"
                            : "bg-gray-200 text-gray-600 border-gray-200 hover:bg-gray-200"
                        }
                      >
                        Overstay
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {(transactionTab === "completed" ? completedTransactions : creditTransactions).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
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
                Pay Now
              </Button>
              <Button
                onClick={() => saveBooking("credit", "cash")}
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
              <Button onClick={() => saveBooking("completed", "cash")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Cash
              </Button>
              <Button onClick={() => saveBooking("completed", "card")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Card
              </Button>
              <Button onClick={() => saveBooking("completed", "mobile-money")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
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
