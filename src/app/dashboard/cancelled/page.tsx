"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface CancelledKitchenTicket {
  id: string;
  code: string;
  createdAt: number;
  mode: "restaurant" | "room-service" | "take-away";
  destination: string;
  lines: Array<{ name: string; qty: number }>;
  total: number;
  source?: "kitchen" | "barista";
  cancelledAt: number;
}

const STORAGE_CANCELLED = "orange-hotel-cancelled-tickets";
const LEGACY_STORAGE_CANCELLED = "orange-hotel-kitchen-cancelled-tickets";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function CancelledPage() {
  const [cancelled, setCancelled] = useState<CancelledKitchenTicket[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_CANCELLED) ?? localStorage.getItem(LEGACY_STORAGE_CANCELLED);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CancelledKitchenTicket[];
      if (Array.isArray(parsed)) setCancelled(parsed);
    } catch {
      setCancelled([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_CANCELLED, JSON.stringify(cancelled));
  }, [cancelled]);

  const totalCancelledValue = useMemo(
    () => cancelled.reduce((sum, ticket) => sum + ticket.total, 0),
    [cancelled],
  );

  const clearAll = () => {
    if (!window.confirm("Clear all cancelled orders?")) return;
    setCancelled([]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Cancelled Orders</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Orders moved here from Kitchen and Barista queues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-10 px-4 justify-center border-primary text-primary font-black uppercase text-[10px] tracking-widest">
            {cancelled.length} Cancelled
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            TSh {totalCancelledValue.toLocaleString()}
          </Badge>
          <Button variant="outline" className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </header>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Cancelled Queue</CardTitle>
          <CardDescription>Kitchen and barista orders that were cancelled</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Ticket</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Source</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Details</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Amount</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Cancelled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancelled.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-black">
                    <p>{ticket.code}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                      {ticket.mode} | {ticket.destination}
                    </p>
                  </TableCell>
                  <TableCell className="font-black uppercase text-[10px] tracking-widest">
                    {ticket.source ?? "kitchen"}
                  </TableCell>
                  <TableCell className="font-bold text-sm">
                    {ticket.lines.map((line) => `${line.name} x${line.qty}`).join(" | ")}
                  </TableCell>
                  <TableCell className="font-black">TSh {ticket.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className="bg-red-600 text-white border-red-600 hover:bg-red-600">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> {formatAgo(ticket.cancelledAt)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {cancelled.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center opacity-40">
                    <XCircle className="w-12 h-12 mx-auto mb-3" />
                    <p className="font-black uppercase tracking-widest text-xs">No cancelled orders</p>
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
