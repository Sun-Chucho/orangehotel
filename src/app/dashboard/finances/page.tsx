"use client";

import { useEffect, useMemo, useState } from "react";
import { ExpenseRecord, STORAGE_EXPENSES, getExpenseDepartmentLabel } from "@/app/lib/expenses";
import { LaundryRecord, STORAGE_LAUNDRY_RECORDS } from "@/app/lib/laundry";
import { readCashierState, readJson, readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE } from "@/app/lib/storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BookingRecord {
  total: number;
  status?: "completed" | "checked-out" | "credit";
}

interface PosPaymentRecord {
  total: number;
  status?: "completed" | "credit";
}

function money(value: number) {
  return `TSh ${Math.round(value).toLocaleString()}`;
}

export default function FinancesPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [kitchenPayments, setKitchenPayments] = useState<PosPaymentRecord[]>([]);
  const [baristaPayments, setBaristaPayments] = useState<PosPaymentRecord[]>([]);
  const [laundryRecords, setLaundryRecords] = useState<LaundryRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  useEffect(() => {
    const refreshFinances = () => {
      const cashierSnapshot = readCashierState<BookingRecord>("orange-hotel-cashier-transactions", "orange-hotel-cashier-seq", 84920);
      const kitchenSnapshot = readPosState<unknown, PosPaymentRecord, unknown>(STORAGE_KITCHEN_STATE, "orange-hotel-kitchen-tickets", "orange-hotel-kitchen-seq", "orange-hotel-kitchen-payments", "orange-hotel-kitchen-menu", 300);
      const baristaSnapshot = readPosState<unknown, PosPaymentRecord, unknown>(STORAGE_BARISTA_STATE, "orange-hotel-barista-orders", "orange-hotel-barista-seq", "orange-hotel-barista-payments", "orange-hotel-barista-menu", 490);
      setBookings(cashierSnapshot.transactions);
      setKitchenPayments(kitchenSnapshot.payments);
      setBaristaPayments(baristaSnapshot.payments);
      setLaundryRecords(readJson<LaundryRecord[]>(STORAGE_LAUNDRY_RECORDS) ?? []);
      setExpenses(readJson<ExpenseRecord[]>(STORAGE_EXPENSES) ?? []);
    };

    refreshFinances();
    const unsubscribers = [
      subscribeToSyncedStorageKey("orange-hotel-cashier-state", refreshFinances),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_STATE, refreshFinances),
      subscribeToSyncedStorageKey(STORAGE_BARISTA_STATE, refreshFinances),
      subscribeToSyncedStorageKey(STORAGE_LAUNDRY_RECORDS, refreshFinances),
      subscribeToSyncedStorageKey(STORAGE_EXPENSES, refreshFinances),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const totals = useMemo(() => {
    const bookingRevenue = bookings.filter((item) => item.status !== "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const bookingCredit = bookings.filter((item) => item.status === "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const kitchenRevenue = kitchenPayments.filter((item) => item.status !== "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const kitchenCredit = kitchenPayments.filter((item) => item.status === "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const baristaRevenue = baristaPayments.filter((item) => item.status !== "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const baristaCredit = baristaPayments.filter((item) => item.status === "credit").reduce((sum, item) => sum + (item.total || 0), 0);
    const laundryRevenue = laundryRecords.filter((item) => item.status !== "credit").reduce((sum, item) => sum + item.totalAmount, 0);
    const laundryCredit = laundryRecords.filter((item) => item.status === "credit").reduce((sum, item) => sum + item.totalAmount, 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const incomeTotal = bookingRevenue + kitchenRevenue + baristaRevenue + laundryRevenue;
    const creditTotal = bookingCredit + kitchenCredit + baristaCredit + laundryCredit;

    return {
      bookingRevenue,
      kitchenRevenue,
      baristaRevenue,
      laundryRevenue,
      incomeTotal,
      expenseTotal,
      creditTotal,
      netCash: incomeTotal - expenseTotal,
    };
  }, [baristaPayments, bookings, expenses, kitchenPayments, laundryRecords]);

  const expenseRows = useMemo(() => {
    const grouped = new Map<string, number>();
    expenses.forEach((expense) => {
      grouped.set(expense.department, (grouped.get(expense.department) ?? 0) + expense.amount);
    });
    return Array.from(grouped.entries()).map(([department, total]) => ({
      label: getExpenseDepartmentLabel(department as ExpenseRecord["department"]),
      total,
    }));
  }, [expenses]);

  const incomeRows = [
    { label: "Booking Revenue", total: totals.bookingRevenue },
    { label: "Kitchen Revenue", total: totals.kitchenRevenue },
    { label: "Barista Revenue", total: totals.baristaRevenue },
    { label: "Laundry Revenue", total: totals.laundryRevenue },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight">Finances</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Income, expenses, credit exposure, and actual cash position
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Income</p>
            <p className="mt-2 text-2xl font-black text-green-700">{money(totals.incomeTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expenses</p>
            <p className="mt-2 text-2xl font-black text-red-700">{money(totals.expenseTotal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actual Cash</p>
            <p className={`mt-2 text-2xl font-black ${totals.netCash >= 0 ? "text-green-700" : "text-red-700"}`}>{money(totals.netCash)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credit</p>
            <p className="mt-2 text-2xl font-black text-amber-700">{money(totals.creditTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Income Breakdown</CardTitle>
            <CardDescription>Completed collections by department.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Lane</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-bold">{row.label}</TableCell>
                    <TableCell className="text-right font-black">{money(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Expense Breakdown</CardTitle>
            <CardDescription>Recorded manager expenses by lane.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Lane</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-bold">{row.label}</TableCell>
                    <TableCell className="text-right font-black">{money(row.total)}</TableCell>
                  </TableRow>
                ))}
                {expenseRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      No expenses recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
