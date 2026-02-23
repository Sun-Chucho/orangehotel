"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Role, ROOMS, INVENTORY } from "@/app/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  BedDouble,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from "lucide-react";

interface CashierTransaction {
  total: number;
}

interface QueueTicket {
  id: string;
}

export default function OverviewPage() {
  const [role, setRole] = useState<Role>("manager");
  const [shift, setShift] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reportText, setReportText] = useState("");

  const [cashierRevenue, setCashierRevenue] = useState(0);
  const [activeKitchen, setActiveKitchen] = useState(0);
  const [activeBarista, setActiveBarista] = useState(0);

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    const savedShift = localStorage.getItem("orange-hotel-shift");
    const savedTx = localStorage.getItem("orange-hotel-cashier-transactions");
    const kitchenQueue = localStorage.getItem("orange-hotel-kitchen-tickets");
    const baristaQueue = localStorage.getItem("orange-hotel-barista-orders");

    if (savedRole) setRole(savedRole);
    if (savedShift) setShift(savedShift);

    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx) as CashierTransaction[];
        if (Array.isArray(parsed)) {
          setCashierRevenue(parsed.reduce((sum, tx) => sum + (tx.total || 0), 0));
        }
      } catch {
        setCashierRevenue(0);
      }
    }

    if (kitchenQueue) {
      try {
        const parsed = JSON.parse(kitchenQueue) as QueueTicket[];
        if (Array.isArray(parsed)) setActiveKitchen(parsed.length);
      } catch {
        setActiveKitchen(0);
      }
    }

    if (baristaQueue) {
      try {
        const parsed = JSON.parse(baristaQueue) as QueueTicket[];
        if (Array.isArray(parsed)) setActiveBarista(parsed.length);
      } catch {
        setActiveBarista(0);
      }
    }

    setMounted(true);
  }, []);

  const lowStock = useMemo(() => INVENTORY.filter((item) => item.stock < item.minStock), []);
  const occupiedRooms = useMemo(() => ROOMS.filter((room) => room.status === "occupied").length, []);
  const recentRooms = useMemo(() => ROOMS.slice(0, 4), []);

  const stats = useMemo(
    () => [
      { label: "Cashier Revenue", value: `TSh ${cashierRevenue.toLocaleString()}`, icon: DollarSign, trend: "+12%", trendUp: true, color: "text-green-500" },
      { label: "Room Occupancy", value: `${Math.round((occupiedRooms / ROOMS.length) * 100)}%`, icon: BedDouble, trend: "+5%", trendUp: true, color: "text-blue-500" },
      { label: "Kitchen Queue", value: `${activeKitchen}`, icon: TrendingUp, trend: activeKitchen > 5 ? "High" : "Stable", trendUp: activeKitchen <= 5, color: "text-orange-500" },
      { label: "Barista Queue", value: `${activeBarista}`, icon: Users, trend: activeBarista > 5 ? "High" : "Stable", trendUp: activeBarista <= 5, color: "text-purple-500" },
    ],
    [activeBarista, activeKitchen, cashierRevenue, occupiedRooms],
  );

  const generateReport = () => {
    const text = [
      `Operations Report (${new Date().toLocaleString()})`,
      `Role: ${role}${shift ? ` (${shift} shift)` : ""}`,
      `Cashier Revenue: TSh ${cashierRevenue.toLocaleString()}`,
      `Occupied Rooms: ${occupiedRooms}/${ROOMS.length}`,
      `Low Stock Items: ${lowStock.length}`,
      `Active Kitchen Tickets: ${activeKitchen}`,
      `Active Barista Tickets: ${activeBarista}`,
    ].join("\n");

    setReportText(text);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Operations Overview</h1>
          <p className="text-muted-foreground uppercase font-bold text-xs tracking-wider">Active performance tracking for {role}</p>
        </div>
        <div className="flex gap-2">
          {shift && (
            <Badge variant="outline" className="bg-white border-primary text-primary px-3 py-1 font-bold uppercase tracking-tight">
              <Clock className="w-3 h-3 mr-2" />
              {shift} Shift
            </Badge>
          )}
          <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold px-6 uppercase tracking-widest text-[10px]" onClick={generateReport}>
            <FileText className="w-3.5 h-3.5 mr-2" /> Generate Report
          </Button>
        </div>
      </header>

      {reportText && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <pre className="text-xs whitespace-pre-wrap font-semibold text-muted-foreground">{reportText}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors")}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div className={cn("flex items-center text-xs font-bold", stat.trendUp ? "text-green-500" : "text-destructive")}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black mt-1 tracking-tight">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Inventory Alerts</CardTitle>
                  <CardDescription>Items below threshold levels</CardDescription>
                </div>
                <AlertCircle className="w-5 h-5 text-destructive" />
              </CardHeader>
              <CardContent className="space-y-4">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50/30">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-black">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-destructive">{item.stock} {item.unit}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Min: {item.minStock}</p>
                    </div>
                  </div>
                ))}
                <Button variant="link" className="w-full text-[10px] text-primary font-black uppercase tracking-widest" asChild>
                  <Link href="/dashboard/inventory">Manage Inventory <ChevronRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Room Status</CardTitle>
                  <CardDescription>Real-time housekeeping update</CardDescription>
                </div>
                <BedDouble className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-4">
                {recentRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center font-black text-sm">
                        {room.number}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-none font-black uppercase tracking-tighter">{room.type}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize font-black uppercase tracking-tighter",
                        room.status === "available" && "bg-green-50 text-green-700 border-green-200",
                        room.status === "occupied" && "bg-blue-50 text-blue-700 border-blue-200",
                        room.status === "cleaning" && "bg-orange-50 text-orange-700 border-orange-200",
                        room.status === "maintenance" && "bg-gray-50 text-gray-700 border-gray-200",
                      )}
                    >
                      {room.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-black text-white shadow-lg overflow-hidden relative border-none rounded-3xl">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary rounded-full blur-3xl opacity-20" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight">Activity Log</CardTitle>
            <CardDescription className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Internal Updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { user: "Reception", action: "Guest Room 204 checked in", time: `${activeKitchen} kitchen tickets active` },
                { user: "Kitchen", action: "Prep pipeline updated", time: `${activeKitchen} open orders` },
                { user: "Barista", action: "Beverage queue updated", time: `${activeBarista} open orders` },
                { user: "Inventory", action: "Low-stock monitoring active", time: `${lowStock.length} alerts` },
              ].map((log, index) => (
                <div key={index} className="flex gap-3 relative">
                  {index !== 3 && <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-sidebar-accent" />}
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent shrink-0 flex items-center justify-center border border-white/10 z-10">
                    <span className="text-[10px] font-black">{log.user[0]}</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter">{log.user}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{log.action}</p>
                    <p className="text-[9px] text-primary mt-1 flex items-center gap-1 uppercase tracking-widest font-black">
                      <Clock className="w-2 h-2" /> {log.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
