"use client";

import { useEffect, useMemo, useState } from "react";
import { ROOMS, Room } from "@/app/lib/mock-data";
import { readCashierState, STORAGE_CASHIER_STATE, writeCashierState } from "@/app/lib/storage";
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
import { useIsDirector } from "@/hooks/use-is-director";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { readRoomsState, updateRoomStatusByNumber } from "@/app/lib/rooms-storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

type PaymentMethod = "cash" | "card" | "mobile-money" | "credit";
type TransactionTab = "completed" | "credit";
type RoomType = "standard" | "platinum";
type TransactionStatus = "completed" | "credit" | "checked-out";
type BookingCurrency = "TSh";
type SpecialPackage = "resident-no-breakfast" | "non-resident-no-breakfast";

interface BookingRecord {
  id: string;
  receiptNo: string;
  createdAt: number;
  guestName: string;
  phone: string;
  roomType: RoomType;
  roomNumber: string;
  specialPackage?: SpecialPackage;
  currency?: BookingCurrency;
  ratePerNight?: number;
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

const SPECIAL_PACKAGES: Record<
  SpecialPackage,
  { label: string; currency: BookingCurrency; standardRate: number; platinumRate: number }
> = {
  "resident-no-breakfast": {
    label: "Resident no Breakfast",
    currency: "TSh",
    standardRate: 80000,
    platinumRate: 120000,
  },
  "non-resident-no-breakfast": {
    label: "Non Resident no Breakfast",
    currency: "TSh",
    standardRate: 50000,
    platinumRate: 70000,
  },
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
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
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
  const [selectedPackage, setSelectedPackage] = useState<SpecialPackage | "none">("none");
  const [packageRate, setPackageRate] = useState("");

  const [showSettlementPopup, setShowSettlementPopup] = useState(false);
  const [showPayNowPopup, setShowPayNowPopup] = useState(false);
  const [selectedExtendBookingId, setSelectedExtendBookingId] = useState<string | null>(null);
  const [extendCheckOutDate, setExtendCheckOutDate] = useState("");
  const [extendCheckOutTime, setExtendCheckOutTime] = useState("12:00");

  const [rooms, setRooms] = useState<Room[]>(ROOMS.map((room) => ({ ...room })));
  const [transactions, setTransactions] = useState<BookingRecord[]>([]);
  const [receiptSeq, setReceiptSeq] = useState(84920);

  useEffect(() => {
    const applyCashierSnapshot = () => {
      const snapshot = readCashierState<BookingRecord>(STORAGE_TX, STORAGE_SEQ, 84920);
      setTransactions(
        snapshot.transactions.map((tx) => ({
          ...tx,
          status: tx.status === "credit" || tx.status === "checked-out" ? tx.status : "completed",
        })),
      );
      setReceiptSeq(snapshot.receiptSeq);
    };

    applyCashierSnapshot();
    setRooms(readRoomsState());

    const unsubscribeCashier = subscribeToSyncedStorageKey(STORAGE_CASHIER_STATE, () => {
      applyCashierSnapshot();
    });
    const unsubscribeRooms = subscribeToSyncedStorageKey<Room[]>("orange-hotel-rooms-state", (value) => {
      setRooms(Array.isArray(value) && value.length > 0 ? value : readRoomsState());
    });

    return () => {
      unsubscribeCashier();
      unsubscribeRooms();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab === "completed" || requestedTab === "credit") {
      setTransactionTab(requestedTab);
    }
  }, []);

  const nights = useMemo(() => daysBetween(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const packageConfig = selectedPackage === "none" ? null : SPECIAL_PACKAGES[selectedPackage];
  const selectedRate = packageConfig
    ? roomType === "standard"
      ? packageConfig.standardRate
      : packageConfig.platinumRate
    : ROOM_RATE[roomType];
  const rate = Number.isFinite(selectedRate) && selectedRate > 0 ? selectedRate : 0;
  const bookingCurrency: BookingCurrency = packageConfig?.currency ?? "TSh";
  const total = nights * rate;
  const canSubmitBooking =
    guestName.trim().length > 0 &&
    phone.trim().length >= 7 &&
    nights >= 1 &&
    Boolean(selectedRoomNumber);

  const availableRooms = useMemo(() => {
    const wantedType = roomType === "standard" ? "Standard" : "Platinum";
    return rooms.filter((room) => room.type === wantedType && room.status === "available");
  }, [roomType, rooms]);

  useEffect(() => {
    if (!packageConfig) {
      setPackageRate("");
      return;
    }
    setPackageRate(String(roomType === "standard" ? packageConfig.standardRate : packageConfig.platinumRate));
  }, [packageConfig, roomType]);

  const completedTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "completed" || tx.status === "checked-out"),
    [transactions],
  );
  const creditTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === "credit"),
    [transactions],
  );
  const selectedExtendBooking = useMemo(
    () => transactions.find((entry) => entry.id === selectedExtendBookingId) ?? null,
    [selectedExtendBookingId, transactions],
  );
  const extendNights = useMemo(
    () => (selectedExtendBooking ? daysBetween(selectedExtendBooking.checkInDate, extendCheckOutDate) : 0),
    [extendCheckOutDate, selectedExtendBooking],
  );
  const extendTotal = useMemo(
    () => (selectedExtendBooking && extendNights > 0 ? extendNights * (selectedExtendBooking.ratePerNight ?? 0) : 0),
    [extendNights, selectedExtendBooking],
  );
  const extendIncrement = useMemo(
    () => (selectedExtendBooking ? Math.max(0, extendTotal - selectedExtendBooking.total) : 0),
    [extendTotal, selectedExtendBooking],
  );

  const totalTransactions = transactions.length;
  const todayRevenueTSh = transactions
    .filter((tx) => (tx.status === "completed" || tx.status === "checked-out") && (tx.currency ?? "TSh") === "TSh")
    .reduce((sum, tx) => sum + tx.total, 0);

  const clearBookingForm = async () => {
    const approved = await confirm({
      title: "Clear Booking Form",
      description: "Are you sure you want to clear this booking form?",
      actionLabel: "Clear Form",
    });
    if (!approved) return;
    setGuestName("");
    setPhone("");
    setCheckInDate(today);
    setCheckInTime("14:00");
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setRoomType("standard");
    setSelectedPackage("none");
    setPackageRate("");
    setShowSettlementPopup(false);
    setShowPayNowPopup(false);
  };

  const markRoomStatus = (roomNumber: string, status: Room["status"]) => {
    const nextRooms = updateRoomStatusByNumber(roomNumber, status);
    setRooms(nextRooms);
  };

  const saveBooking = (status: "completed" | "credit", paymentMethod: PaymentMethod) => {
    if (isDirector) return;
    if (!canSubmitBooking) return;

    const nextReceipt = receiptSeq + 1;

    const tx: BookingRecord = {
      id: `tx-${Date.now()}`,
      receiptNo: `#${nextReceipt}`,
      createdAt: Date.now(),
      guestName: guestName.trim(),
      phone: phone.trim(),
      roomType,
      roomNumber: selectedRoomNumber,
      specialPackage: selectedPackage === "none" ? undefined : selectedPackage,
      currency: bookingCurrency,
      ratePerNight: rate,
      payment: paymentMethod,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      nights,
      total,
      status,
    };

    const nextTransactions = [tx, ...transactions];
    setTransactions(nextTransactions);
    setReceiptSeq(nextReceipt);
    writeCashierState(nextTransactions, nextReceipt);
    markRoomStatus(selectedRoomNumber, "occupied");
    setTransactionTab(status === "credit" ? "credit" : "completed");

    setGuestName("");
    setPhone("");
    setCheckInDate(today);
    setCheckInTime("14:00");
    setCheckOutDate("");
    setCheckOutTime("12:00");
    setSelectedRoomNumber("");
    setRoomType("standard");
    setSelectedPackage("none");
    setPackageRate("");
    setShowSettlementPopup(false);
    setShowPayNowPopup(false);
  };

  const openSettlementPopup = () => {
    if (isDirector) return;
    if (!canSubmitBooking) return;
    setShowSettlementPopup(true);
  };

  const redirectToBookedRooms = (tab: TransactionTab) => {
    window.location.assign(`/dashboard/cashier?tab=${tab}#booked-rooms`);
  };

  const confirmCreditBooking = async () => {
    if (isDirector || !canSubmitBooking) return;
    const approved = await confirm({
      title: "Book Room On Credit",
      description: `Are you sure you want to book room ${selectedRoomNumber} for ${guestName.trim()} on credit?`,
      actionLabel: "Book On Credit",
    });
    if (!approved) return;
    saveBooking("credit", "credit");
    redirectToBookedRooms("credit");
  };

  const completePaidBooking = async (paymentMethod: Exclude<PaymentMethod, "credit">) => {
    if (isDirector || !canSubmitBooking) return;
    const paymentLabel =
      paymentMethod === "mobile-money" ? "mobile money" : paymentMethod;
    const approved = await confirm({
      title: "Complete Booking Payment",
      description: `Are you sure you want to complete booking room ${selectedRoomNumber} for ${guestName.trim()} using ${paymentLabel}?`,
      actionLabel: "Complete Payment",
    });
    if (!approved) return;
    saveBooking("completed", paymentMethod);
    redirectToBookedRooms("completed");
  };

  const openExtendStay = (booking: BookingRecord) => {
    if (isDirector || booking.status === "checked-out") return;
    setSelectedExtendBookingId(booking.id);
    setExtendCheckOutDate(booking.checkOutDate);
    setExtendCheckOutTime(booking.checkOutTime || "12:00");
  };

  const applyExtendStay = async () => {
    if (isDirector || !selectedExtendBookingId || !extendCheckOutDate || !extendCheckOutTime) return;

    const booking = selectedExtendBooking;
    if (!booking) return;

    const nextNights = extendNights;
    if (nextNights < 1) return;

    const approved = await confirm({
      title: "Extend Stay",
      description: `Are you sure you want to extend ${booking.guestName} in room ${booking.roomNumber} until ${extendCheckOutDate} ${extendCheckOutTime}?`,
      actionLabel: "Extend Stay",
    });
    if (!approved) return;

    const nextTransactions = transactions.map((entry) =>
      entry.id === selectedExtendBookingId
        ? {
            ...entry,
            checkOutDate: extendCheckOutDate,
            checkOutTime: extendCheckOutTime,
            nights: nextNights,
            total: extendTotal,
          }
        : entry,
    );

    setTransactions(nextTransactions);
    writeCashierState(nextTransactions, receiptSeq);
    setSelectedExtendBookingId(null);
    setExtendCheckOutDate("");
    setExtendCheckOutTime("12:00");
  };

  return (
    <div className="space-y-8">
      {dialog}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Reception Booking</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Guest booking capture and payment processing
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            {totalTransactions} Transactions
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            TSh {todayRevenueTSh.toLocaleString()} Today
          </Badge>
        </div>
      </header>
      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Booking and revenue visibility only (read-only)
          </CardContent>
        </Card>
      )}

      {!isDirector && (
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

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Special Package</p>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
              value={selectedPackage}
              onChange={(event) => setSelectedPackage(event.target.value as SpecialPackage | "none")}
            >
              <option value="none">No special package</option>
              <option value="resident-no-breakfast">Resident no Breakfast (Standard TSh 80,000 | Platinum TSh 120,000)</option>
              <option value="non-resident-no-breakfast">Non Resident no Breakfast (Standard TSh 50,000 | Platinum TSh 70,000)</option>
            </select>

            {packageConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={packageRate}
                  readOnly
                  placeholder="Rate per night"
                />
                <div className="rounded-md border px-3 py-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                  {roomType === "standard" ? "Standard" : "Platinum"} package rate: {packageConfig.currency} {rate.toLocaleString()}
                </div>
              </div>
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
              <span>{bookingCurrency} {rate.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-60">
              <span>Days</span>
              <span>{nights}</span>
            </div>
            <div className="flex justify-between text-lg font-black pt-2">
              <span>Total</span>
              <span className="text-primary">{bookingCurrency} {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearBookingForm} className="h-11 font-black uppercase text-[10px] tracking-widest">
              Clear
            </Button>
            <Button
              onClick={openSettlementPopup}
              disabled={!canSubmitBooking}
              className="h-11 font-black uppercase text-[10px] tracking-widest"
            >
              Complete Booking
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card id="booked-rooms" className="border-none shadow-sm">
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
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Check-Out</TableHead>
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
                  <TableCell className="font-bold">
                    <p>{tx.checkOutDate}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{tx.checkOutTime}</p>
                  </TableCell>
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
                  <TableCell className="text-right">
                    {tx.status !== "checked-out" && !isDirector ? (
                      <Button
                        variant="outline"
                        onClick={() => openExtendStay(tx)}
                        className="h-9 font-black uppercase text-[10px] tracking-widest"
                      >
                        Extend Stay
                      </Button>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-700 border-gray-200 hover:bg-gray-200">View</Badge>
                    )}
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

      {selectedExtendBookingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Extend Stay</CardTitle>
              <CardDescription>Update the guest check-out date and time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Check-Out Date</p>
                <Input type="date" value={extendCheckOutDate} onChange={(event) => setExtendCheckOutDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Check-Out Time</p>
                <Input type="time" value={extendCheckOutTime} onChange={(event) => setExtendCheckOutTime(event.target.value)} />
              </div>
              {selectedExtendBooking && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Rate / Night</span>
                    <span>{selectedExtendBooking.currency ?? "TSh"} {(selectedExtendBooking.ratePerNight ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Days</span>
                    <span>{extendNights}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Added Amount</span>
                    <span>{selectedExtendBooking.currency ?? "TSh"} {extendIncrement.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-black uppercase tracking-widest">
                    <span>New Total</span>
                    <span>{selectedExtendBooking.currency ?? "TSh"} {extendTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedExtendBookingId(null);
                    setExtendCheckOutDate("");
                    setExtendCheckOutTime("12:00");
                  }}
                  className="h-11 font-black uppercase text-[10px] tracking-widest"
                >
                  Close
                </Button>
                <Button onClick={applyExtendStay} disabled={extendNights < 1} className="h-11 font-black uppercase text-[10px] tracking-widest">
                  Save Extension
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                Pay Now
              </Button>
              <Button
                onClick={confirmCreditBooking}
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
              <Button onClick={() => completePaidBooking("cash")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Cash
              </Button>
              <Button onClick={() => completePaidBooking("card")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Card
              </Button>
              <Button onClick={() => completePaidBooking("mobile-money")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
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
