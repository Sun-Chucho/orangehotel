"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

type PaymentsTab = "completed" | "credit";
type PaymentMethod = "cash" | "card" | "mobile-money";
type TransactionStatus = "completed" | "credit" | "checked-out";
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

const STORAGE_TX = "orange-hotel-cashier-transactions";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function PaymentsPage() {
  const [paymentsTab, setPaymentsTab] = useState<PaymentsTab>("completed");
  const [transactions, setTransactions] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const savedTx = localStorage.getItem(STORAGE_TX);
    if (!savedTx) return;

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
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_TX, JSON.stringify(transactions));
  }, [transactions]);

  const completedPayments = useMemo(
    () => transactions.filter((tx) => tx.status === "completed" || tx.status === "checked-out"),
    [transactions],
  );
  const creditPayments = useMemo(
    () => transactions.filter((tx) => tx.status === "credit"),
    [transactions],
  );

  const totalCompleted = completedPayments.reduce((sum, tx) => sum + tx.total, 0);
  const totalCredit = creditPayments.reduce((sum, tx) => sum + tx.total, 0);

  const clearCreditPayment = (id: string) => {
    if (!window.confirm("Mark this credit payment as cleared?")) return;
    setTransactions((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, status: "completed" } : tx)),
    );
  };

  const rows = paymentsTab === "completed" ? completedPayments : creditPayments;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Payments</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Completed and credit payment tracking
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

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Payment Transactions</CardTitle>
              <CardDescription>Use tabs to review completed and credit records</CardDescription>
            </div>
            <Tabs value={paymentsTab} onValueChange={(value) => setPaymentsTab(value as PaymentsTab)}>
              <TabsList className="h-10">
                <TabsTrigger value="completed" className="text-[10px] font-black uppercase tracking-widest">
                  Completed Payments
                </TabsTrigger>
                <TabsTrigger value="credit" className="text-[10px] font-black uppercase tracking-widest">
                  Credit Payments
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Receipt</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Guest</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Room</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Payment</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Amount</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-black">{tx.receiptNo}</TableCell>
                  <TableCell className="font-bold">
                    <p>{tx.guestName}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                      {formatAgo(tx.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="font-bold">{tx.roomNumber}</TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-widest">{tx.payment}</TableCell>
                  <TableCell className="font-black">TSh {tx.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {paymentsTab === "credit" ? (
                      <Button
                        onClick={() => clearCreditPayment(tx.id)}
                        className="h-9 font-black uppercase text-[10px] tracking-widest bg-green-600 hover:bg-green-600/90"
                      >
                        Cleared
                      </Button>
                    ) : (
                      <Badge className="bg-blue-600 text-white border-blue-600 hover:bg-blue-600">Completed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
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
    </div>
  );
}
