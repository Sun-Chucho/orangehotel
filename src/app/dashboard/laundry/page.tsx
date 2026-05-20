"use client";

import { useEffect, useMemo, useState } from "react";
import { readStoredRole } from "@/app/lib/auth";
import { LaundryPaymentMethod, LaundryPaymentStatus, LaundryRecord, STORAGE_LAUNDRY_RECORDS } from "@/app/lib/laundry";
import { Role } from "@/app/lib/mock-data";
import { readJson, writeJson } from "@/app/lib/storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shirt, Save } from "lucide-react";

function formatMoney(value: number) {
  return `TSh ${Math.round(value).toLocaleString()}`;
}

function formatDate(value: number) {
  return new Date(value).toLocaleString();
}

export default function LaundryPage() {
  const [role, setRole] = useState<Role>("cashier");
  const [records, setRecords] = useState<LaundryRecord[]>([]);
  const [tab, setTab] = useState<LaundryPaymentStatus>("completed");
  const [clientName, setClientName] = useState("");
  const [itemCount, setItemCount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<LaundryPaymentMethod>("cash");
  const [status, setStatus] = useState<LaundryPaymentStatus>("completed");

  useEffect(() => {
    setRole(readStoredRole() ?? "cashier");

    const refreshLaundry = () => {
      const saved = readJson<LaundryRecord[]>(STORAGE_LAUNDRY_RECORDS);
      setRecords(Array.isArray(saved) ? saved : []);
    };

    refreshLaundry();
    return subscribeToSyncedStorageKey(STORAGE_LAUNDRY_RECORDS, refreshLaundry);
  }, []);

  const isReadOnly = role === "manager" || role === "director";
  const filteredRecords = useMemo(
    () => records.filter((record) => record.status === tab).sort((a, b) => b.createdAt - a.createdAt),
    [records, tab],
  );
  const completedTotal = records.filter((record) => record.status === "completed").reduce((sum, record) => sum + record.totalAmount, 0);
  const creditTotal = records.filter((record) => record.status === "credit").reduce((sum, record) => sum + record.totalAmount, 0);

  const saveLaundry = () => {
    const parsedItems = Number(itemCount);
    const parsedAmount = Number(totalAmount);
    if (!clientName.trim() || Number.isNaN(parsedItems) || parsedItems <= 0 || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    const nextRecord: LaundryRecord = {
      id: `laundry-${Date.now()}`,
      clientName: clientName.trim(),
      itemCount: parsedItems,
      totalAmount: parsedAmount,
      status,
      paymentMethod: status === "credit" ? "credit" : paymentMethod,
      createdAt: Date.now(),
      createdBy: role,
    };
    const nextRecords = [nextRecord, ...records];
    setRecords(nextRecords);
    writeJson(STORAGE_LAUNDRY_RECORDS, nextRecords);
    setClientName("");
    setItemCount("");
    setTotalAmount("");
    setPaymentMethod("cash");
    setStatus("completed");
    setTab(nextRecord.status);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Laundry</h1>
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Laundry income records for completed and credit payments
          </p>
        </div>
        <Badge variant="outline" className="w-fit px-3 py-1 font-black uppercase tracking-widest">
          Completed {formatMoney(completedTotal)}
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completed Laundry</p>
              <p className="mt-2 text-2xl font-black">{formatMoney(completedTotal)}</p>
            </div>
            <Shirt className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credit Laundry</p>
            <p className="mt-2 text-2xl font-black text-red-600">{formatMoney(creditTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {!isReadOnly && (
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight">New Laundry Income</CardTitle>
            <CardDescription>Enter client, item count, amount, status, and method of payment.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client Name</Label>
              <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Number of Items</Label>
              <Input type="number" min="1" value={itemCount} onChange={(event) => setItemCount(event.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Amount</Label>
              <Input type="number" min="1" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as LaundryPaymentStatus)}>
                <option value="completed">Completed</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Method of Payment</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as LaundryPaymentMethod)} disabled={status === "credit"}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile-money">Mobile Money</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={saveLaundry} className="h-10 font-black uppercase tracking-widest text-[10px]">
                <Save className="mr-2 h-4 w-4" />
                Save Laundry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Laundry Records</CardTitle>
              <CardDescription>{filteredRecords.length} records in this status.</CardDescription>
            </div>
            <Tabs value={tab} onValueChange={(value) => setTab(value as LaundryPaymentStatus)}>
              <TabsList className="h-10">
                <TabsTrigger value="completed" className="font-black uppercase text-[10px] tracking-widest">Completed</TabsTrigger>
                <TabsTrigger value="credit" className="font-black uppercase text-[10px] tracking-widest">Credit</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Client</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Items</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Method</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-bold">{formatDate(record.createdAt)}</TableCell>
                  <TableCell className="font-bold">{record.clientName}</TableCell>
                  <TableCell className="font-bold">{record.itemCount}</TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-widest">{record.paymentMethod}</TableCell>
                  <TableCell className="text-right font-black">{formatMoney(record.totalAmount)}</TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    No laundry records in this status
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
