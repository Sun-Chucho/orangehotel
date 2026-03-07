"use client";

import { useEffect, useMemo, useState } from "react";
import { Role } from "@/app/lib/mock-data";
import { readCashierState, readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE, writeCashierState, writePosState } from "@/app/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

type PaymentsTab = "reception" | "kitchen" | "barista";
type PaymentMethod = "cash" | "card" | "mobile-money";
type KitchenPaymentMethod = "cash" | "card" | "mobile" | "credit";
type BaristaPaymentMethod = "cash" | "card" | "mobile" | "credit";
type TransactionStatus = "completed" | "credit" | "checked-out";
type KitchenPaymentStatus = "completed" | "credit";
type BaristaPaymentStatus = "completed" | "credit";
type RoomType = "standard" | "platinum";

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
  checkOutDate: string;
  checkOutTime: string;
  nights: number;
  total: number;
  status: TransactionStatus;
}

interface KitchenPaymentRecord {
  id: string;
  ticketId: string;
  code: string;
  createdAt: number;
  mode: "restaurant" | "room-service" | "take-away";
  destination: string;
  total: number;
  status: KitchenPaymentStatus;
  method: KitchenPaymentMethod;
}

interface BaristaPaymentRecord {
  id: string;
  ticketId: string;
  code: string;
  createdAt: number;
  mode: "restaurant" | "room-service" | "take-away";
  destination: string;
  total: number;
  status: BaristaPaymentStatus;
  method: BaristaPaymentMethod;
}

interface PaymentRow {
  source: "booking" | "kitchen" | "barista";
  id: string;
  ref: string;
  payer: string;
  context: string;
  method: string;
  amount: number;
  createdAt: number;
  status: "completed" | "credit";
}

const STORAGE_BOOKING_TX = "orange-hotel-cashier-transactions";
const STORAGE_KITCHEN_PAYMENTS = "orange-hotel-kitchen-payments";
const STORAGE_BARISTA_PAYMENTS = "orange-hotel-barista-payments";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function PaymentsPage() {
  const isDirector = useIsDirector();
  const [role, setRole] = useState<Role>("manager");
  const [paymentsTab, setPaymentsTab] = useState<PaymentsTab>("reception");
  const [bookingTransactions, setBookingTransactions] = useState<BookingRecord[]>([]);
  const [kitchenPayments, setKitchenPayments] = useState<KitchenPaymentRecord[]>([]);
  const [baristaPayments, setBaristaPayments] = useState<BaristaPaymentRecord[]>([]);

  const [selectedCredit, setSelectedCredit] = useState<{ source: "booking" | "kitchen" | "barista"; id: string } | null>(null);
  const [showMethodPopup, setShowMethodPopup] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    if (savedRole) {
      setRole(savedRole);
      setPaymentsTab(savedRole === "kitchen" ? "kitchen" : savedRole === "barista" ? "barista" : "reception");
    }
  }, []);

  useEffect(() => {
    const refreshPayments = () => {
      const cashierSnapshot = readCashierState<BookingRecord>(STORAGE_BOOKING_TX, "orange-hotel-cashier-seq", 84920);
      const kitchenSnapshot = readPosState<unknown, KitchenPaymentRecord, unknown>(
        STORAGE_KITCHEN_STATE,
        "orange-hotel-kitchen-tickets",
        "orange-hotel-kitchen-seq",
        STORAGE_KITCHEN_PAYMENTS,
        "orange-hotel-kitchen-menu",
        300,
      );
      const baristaSnapshot = readPosState<unknown, BaristaPaymentRecord, unknown>(
        STORAGE_BARISTA_STATE,
        "orange-hotel-barista-orders",
        "orange-hotel-barista-seq",
        STORAGE_BARISTA_PAYMENTS,
        "orange-hotel-barista-menu",
        490,
      );

      setBookingTransactions(
        cashierSnapshot.transactions.map((tx) => ({
          ...tx,
          status: tx.status === "credit" || tx.status === "checked-out" ? tx.status : "completed",
        })),
      );
      setKitchenPayments(kitchenSnapshot.payments.map((tx) => ({ ...tx, status: tx.status === "credit" ? "credit" : "completed" })));
      setBaristaPayments(baristaSnapshot.payments.map((tx) => ({ ...tx, status: tx.status === "credit" ? "credit" : "completed" })));
    };

    refreshPayments();

    const unsubscribeCashier = subscribeToSyncedStorageKey("orange-hotel-cashier-state", refreshPayments);
    const unsubscribeKitchen = subscribeToSyncedStorageKey(STORAGE_KITCHEN_STATE, refreshPayments);
    const unsubscribeBarista = subscribeToSyncedStorageKey(STORAGE_BARISTA_STATE, refreshPayments);

    return () => {
      unsubscribeCashier();
      unsubscribeKitchen();
      unsubscribeBarista();
    };
  }, []);

  const bookingRows = useMemo<PaymentRow[]>(
    () =>
      bookingTransactions.map((tx) => ({
        source: "booking",
        id: tx.id,
        ref: tx.receiptNo,
        payer: tx.guestName,
        context: `Room ${tx.roomNumber}`,
        method: tx.payment,
        amount: tx.total,
        createdAt: tx.createdAt,
        status: tx.status === "credit" ? "credit" : "completed",
      })),
    [bookingTransactions],
  );

  const kitchenRows = useMemo<PaymentRow[]>(
    () =>
      kitchenPayments.map((tx) => ({
        source: "kitchen",
        id: tx.id,
        ref: tx.code,
        payer: "Kitchen Order",
        context: tx.destination,
        method: tx.method,
        amount: tx.total,
        createdAt: tx.createdAt,
        status: tx.status,
      })),
    [kitchenPayments],
  );

  const baristaRows = useMemo<PaymentRow[]>(
    () =>
      baristaPayments.map((tx) => ({
        source: "barista",
        id: tx.id,
        ref: tx.code,
        payer: "Barista Order",
        context: tx.destination,
        method: tx.method,
        amount: tx.total,
        createdAt: tx.createdAt,
        status: tx.status,
      })),
    [baristaPayments],
  );

  const allRows = useMemo(() => [...bookingRows, ...kitchenRows, ...baristaRows], [bookingRows, kitchenRows, baristaRows]);
  const completedPayments = useMemo(() => allRows.filter((tx) => tx.status === "completed"), [allRows]);
  const creditPayments = useMemo(() => allRows.filter((tx) => tx.status === "credit"), [allRows]);

  const totalCompleted = completedPayments.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCredit = creditPayments.reduce((sum, tx) => sum + tx.amount, 0);

  const openPaidFlow = (row: PaymentRow) => {
    if (isDirector) return;
    setSelectedCredit({ source: row.source, id: row.id });
    setShowMethodPopup(true);
  };

  const applyPaidMethod = (method: "cash" | "card" | "mobile") => {
    if (!selectedCredit) return;

    if (selectedCredit.source === "booking") {
      const mappedMethod: PaymentMethod = method === "mobile" ? "mobile-money" : method;
      const nextTransactions = bookingTransactions.map((tx) =>
        tx.id === selectedCredit.id ? { ...tx, status: "completed", payment: mappedMethod } : tx,
      );
      setBookingTransactions(nextTransactions);
      writeCashierState(nextTransactions, readCashierState<BookingRecord>(STORAGE_BOOKING_TX, "orange-hotel-cashier-seq", 84920).receiptSeq);
    } else if (selectedCredit.source === "kitchen") {
      const nextPayments = kitchenPayments.map((tx) =>
        tx.id === selectedCredit.id ? { ...tx, status: "completed", method } : tx,
      );
      setKitchenPayments(nextPayments);
      const kitchenSnapshot = readPosState<unknown, KitchenPaymentRecord, unknown>(STORAGE_KITCHEN_STATE, "orange-hotel-kitchen-tickets", "orange-hotel-kitchen-seq", STORAGE_KITCHEN_PAYMENTS, "orange-hotel-kitchen-menu", 300);
      writePosState(STORAGE_KITCHEN_STATE, kitchenSnapshot.tickets, kitchenSnapshot.ticketSeq, nextPayments, kitchenSnapshot.menuItems);
    } else {
      const nextPayments = baristaPayments.map((tx) =>
        tx.id === selectedCredit.id ? { ...tx, status: "completed", method } : tx,
      );
      setBaristaPayments(nextPayments);
      const baristaSnapshot = readPosState<unknown, BaristaPaymentRecord, unknown>(STORAGE_BARISTA_STATE, "orange-hotel-barista-orders", "orange-hotel-barista-seq", STORAGE_BARISTA_PAYMENTS, "orange-hotel-barista-menu", 490);
      writePosState(STORAGE_BARISTA_STATE, baristaSnapshot.tickets, baristaSnapshot.ticketSeq, nextPayments, baristaSnapshot.menuItems);
    }

    setShowMethodPopup(false);
    setSelectedCredit(null);
  };

  const rows = useMemo(() => {
    const base =
      paymentsTab === "reception"
        ? bookingRows
        : paymentsTab === "kitchen"
        ? kitchenRows
        : baristaRows;
    return [...base].sort((a, b) => b.createdAt - a.createdAt);
  }, [paymentsTab, bookingRows, kitchenRows, baristaRows]);

  const canViewAllTabs = role === "manager" || role === "director";
  const headerDescription =
    role === "kitchen"
      ? "Kitchen payment tracking only"
      : role === "barista"
      ? "Barista payment tracking only"
      : role === "cashier"
      ? "Reception payment tracking only"
      : "Reception, kitchen, and barista payment tracking";
  const cardDescription =
    role === "kitchen"
      ? "Kitchen payments only"
      : role === "barista"
      ? "Barista payments only"
      : role === "cashier"
      ? "Reception booking payments only"
      : "Use tabs to review reception, kitchen, and barista payments";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Payments</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            {headerDescription}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            Completed TSh {totalCompleted.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            Credit TSh {totalCredit.toLocaleString()}
          </Badge>
        </div>
      </header>
      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Revenue and credit visibility only (read-only)
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Payment Transactions</CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </div>
            {canViewAllTabs && (
              <Tabs value={paymentsTab} onValueChange={(value) => setPaymentsTab(value as PaymentsTab)}>
                <TabsList className="h-10">
                  <TabsTrigger value="reception" className="text-[10px] font-black uppercase tracking-widest">
                    Reception
                  </TabsTrigger>
                  <TabsTrigger value="kitchen" className="text-[10px] font-black uppercase tracking-widest">
                    Kitchen
                  </TabsTrigger>
                  <TabsTrigger value="barista" className="text-[10px] font-black uppercase tracking-widest">
                    Barista
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Reference</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Payer</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Context</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Method</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Amount</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tx) => (
                <TableRow key={`${tx.source}-${tx.id}`}>
                  <TableCell className="font-black">{tx.ref}</TableCell>
                  <TableCell className="font-bold">
                    <p>{tx.payer}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                      {formatAgo(tx.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="font-bold">{tx.context}</TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-widest">{tx.method}</TableCell>
                  <TableCell className="font-black">TSh {tx.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={tx.status === "credit" ? "bg-red-600 text-white border-red-600 hover:bg-red-600" : "bg-blue-600 text-white border-blue-600 hover:bg-blue-600"}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {tx.status === "credit" && !isDirector ? (
                      <Button
                        onClick={() => openPaidFlow(tx)}
                        className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90"
                      >
                        Paid
                      </Button>
                    ) : (
                      <Badge className="bg-gray-200 text-gray-700 border-gray-200 hover:bg-gray-200">View</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="opacity-40">
                      <Receipt className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-black uppercase tracking-widest text-xs">No payments found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showMethodPopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Select Paid Method</CardTitle>
              <CardDescription>Choose how this credit was paid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => applyPaidMethod("cash")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Cash
              </Button>
              <Button onClick={() => applyPaidMethod("card")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Card
              </Button>
              <Button onClick={() => applyPaidMethod("mobile")} className="w-full h-11 font-black uppercase text-[10px] tracking-widest">
                Mobile
              </Button>
              <Button variant="outline" onClick={() => setShowMethodPopup(false)} className="w-full h-10 font-black uppercase text-[10px] tracking-widest">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
