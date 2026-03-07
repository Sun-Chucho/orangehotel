"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Role, ROOMS, INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import {
  CompanyStockCategory,
  CompanyStockItem,
  STORAGE_COMPANY_STOCK,
} from "@/app/lib/company-stock";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { STORAGE_INVENTORY_ITEMS } from "@/app/lib/inventory-transfer";

interface CashierTransaction {
  total: number;
  status?: "completed" | "checked-out" | "credit";
}

interface QueueTicket {
  id: string;
}

interface POSPaymentRecord {
  total: number;
  status?: "completed" | "credit";
  createdAt?: number;
}

const COMPANY_CATEGORIES: Array<{ value: CompanyStockCategory; label: string }> = [
  { value: "kitchen-equipment", label: "Kitchen Equipment" },
  { value: "technology", label: "Technology" },
  { value: "electronics", label: "Electronics" },
  { value: "cleaning-supplies", label: "Cleaning Supplies" },
  { value: "furniture", label: "Furniture" },
];

export default function OverviewPage() {
  const [role, setRole] = useState<Role>("manager");
  const [shift, setShift] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reportText, setReportText] = useState("");

  const [bookingRevenue, setBookingRevenue] = useState(0);
  const [activeKitchen, setActiveKitchen] = useState(0);
  const [activeBarista, setActiveBarista] = useState(0);
  const [companyStockItems, setCompanyStockItems] = useState<CompanyStockItem[]>([]);
  const [companyTab, setCompanyTab] = useState<CompanyStockCategory>("kitchen-equipment");
  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetQty, setAssetQty] = useState("1");
  const [assetCategory, setAssetCategory] = useState<CompanyStockCategory>("kitchen-equipment");
  const [foodRevenue, setFoodRevenue] = useState(0);
  const [creditExposure, setCreditExposure] = useState(0);
  const [settledToday, setSettledToday] = useState(0);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(INVENTORY);

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    const savedShift = localStorage.getItem("orange-hotel-shift");
    const savedTx = localStorage.getItem("orange-hotel-cashier-transactions");
    const kitchenQueue = localStorage.getItem("orange-hotel-kitchen-tickets");
    const baristaQueue = localStorage.getItem("orange-hotel-barista-orders");
    const companyStock = localStorage.getItem(STORAGE_COMPANY_STOCK);
    const savedInventory = localStorage.getItem(STORAGE_INVENTORY_ITEMS);
    const kitchenPayments = localStorage.getItem("orange-hotel-kitchen-payments");
    const baristaPayments = localStorage.getItem("orange-hotel-barista-payments");

    if (savedRole) setRole(savedRole);
    if (savedShift) setShift(savedShift);

    if (savedTx) {
      try {
        const parsed = JSON.parse(savedTx) as CashierTransaction[];
        if (Array.isArray(parsed)) {
          setBookingRevenue(
            parsed
              .filter((tx) => tx.status !== "credit")
              .reduce((sum, tx) => sum + (tx.total || 0), 0),
          );
        }
      } catch {
        setBookingRevenue(0);
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

    if (companyStock) {
      try {
        const parsed = JSON.parse(companyStock) as CompanyStockItem[];
        if (Array.isArray(parsed)) setCompanyStockItems(parsed);
      } catch {
        setCompanyStockItems([]);
      }
    }

    if (savedInventory) {
      try {
        const parsed = JSON.parse(savedInventory) as InventoryItem[];
        if (Array.isArray(parsed)) setInventoryItems(parsed);
      } catch {
        setInventoryItems(INVENTORY);
      }
    }

    const collectPaymentMetrics = (records: POSPaymentRecord[]) => {
      const today = new Date().toDateString();
      const paid = records
        .filter((record) => record.status !== "credit")
        .reduce((sum, record) => sum + (record.total || 0), 0);
      const credit = records
        .filter((record) => record.status === "credit")
        .reduce((sum, record) => sum + (record.total || 0), 0);
      const settledCount = records.filter((record) => {
        if (record.status === "credit" || !record.createdAt) return false;
        return new Date(record.createdAt).toDateString() === today;
      }).length;
      return { paid, credit, settledCount };
    };

    let kitchenMetrics = { paid: 0, credit: 0, settledCount: 0 };
    let baristaMetrics = { paid: 0, credit: 0, settledCount: 0 };

    if (kitchenPayments) {
      try {
        const parsed = JSON.parse(kitchenPayments) as POSPaymentRecord[];
        if (Array.isArray(parsed)) kitchenMetrics = collectPaymentMetrics(parsed);
      } catch {
        kitchenMetrics = { paid: 0, credit: 0, settledCount: 0 };
      }
    }

    if (baristaPayments) {
      try {
        const parsed = JSON.parse(baristaPayments) as POSPaymentRecord[];
        if (Array.isArray(parsed)) baristaMetrics = collectPaymentMetrics(parsed);
      } catch {
        baristaMetrics = { paid: 0, credit: 0, settledCount: 0 };
      }
    }

    setFoodRevenue(kitchenMetrics.paid + baristaMetrics.paid);
    setCreditExposure(kitchenMetrics.credit + baristaMetrics.credit);
    setSettledToday(kitchenMetrics.settledCount + baristaMetrics.settledCount);

    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_COMPANY_STOCK, JSON.stringify(companyStockItems));
  }, [companyStockItems]);

  const lowStock = useMemo(() => inventoryItems.filter((item) => item.stock < item.minStock), [inventoryItems]);
  const occupiedRooms = useMemo(() => ROOMS.filter((room) => room.status === "occupied").length, []);
  const recentRooms = useMemo(() => ROOMS.slice(0, 4), []);
  const isDirector = role === "director";
  const occupancyPct = Math.round((occupiedRooms / ROOMS.length) * 100);
  const totalRevenue = bookingRevenue + foodRevenue;
  const revPar = Math.round(totalRevenue / Math.max(ROOMS.length, 1));

  const stats = useMemo(
    () => [
      { label: "Booking Revenue", value: `TSh ${bookingRevenue.toLocaleString()}`, icon: DollarSign, trend: "+12%", trendUp: true, color: "text-green-500" },
      { label: "Room Occupancy", value: `${occupancyPct}%`, icon: BedDouble, trend: "+5%", trendUp: true, color: "text-blue-500" },
      { label: "Kitchen Queue", value: `${activeKitchen}`, icon: TrendingUp, trend: activeKitchen > 5 ? "High" : "Stable", trendUp: activeKitchen <= 5, color: "text-orange-500" },
      { label: "Barista Queue", value: `${activeBarista}`, icon: Users, trend: activeBarista > 5 ? "High" : "Stable", trendUp: activeBarista <= 5, color: "text-purple-500" },
    ],
    [activeBarista, activeKitchen, bookingRevenue, occupancyPct],
  );

  const executiveStats = useMemo(
    () => [
      { label: "Total Revenue", value: `TSh ${totalRevenue.toLocaleString()}`, note: "Rooms + F&B collections" },
      { label: "F&B Revenue", value: `TSh ${foodRevenue.toLocaleString()}`, note: "Kitchen and Barista settlements" },
      { label: "Credit Exposure", value: `TSh ${creditExposure.toLocaleString()}`, note: "Outstanding unsettled balances" },
      { label: "RevPAR", value: `TSh ${revPar.toLocaleString()}`, note: "Revenue per available room" },
      { label: "Occupancy", value: `${occupancyPct}%`, note: `${occupiedRooms}/${ROOMS.length} occupied rooms` },
      { label: "Settled Today", value: `${settledToday}`, note: "Completed POS settlements today" },
    ],
    [creditExposure, foodRevenue, occupancyPct, occupiedRooms, revPar, settledToday, totalRevenue],
  );

  const generateReport = () => {
    const text = [
      `Operations Report (${new Date().toLocaleString()})`,
      `Role: ${role}${shift ? ` (${shift} shift)` : ""}`,
      `Booking Revenue: TSh ${bookingRevenue.toLocaleString()}`,
      `Occupied Rooms: ${occupiedRooms}/${ROOMS.length}`,
      `Low Stock Items: ${lowStock.length}`,
      `Active Kitchen Tickets: ${activeKitchen}`,
      `Active Barista Tickets: ${activeBarista}`,
    ].join("\n");

    setReportText(text);
  };

  const filteredCompanyStock = useMemo(
    () => companyStockItems.filter((item) => item.category === companyTab),
    [companyStockItems, companyTab],
  );

  const addCompanyStock = () => {
    const quantity = Number(assetQty);
    if (assetName.trim().length === 0 || assetDescription.trim().length === 0 || Number.isNaN(quantity) || quantity <= 0) return;
    setCompanyStockItems((current) => [
      {
        id: `cs-${Date.now()}`,
        name: assetName.trim(),
        description: assetDescription.trim(),
        quantity,
        category: assetCategory,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setAssetName("");
    setAssetDescription("");
    setAssetQty("1");
    setAssetCategory("kitchen-equipment");
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">
            {isDirector ? "Executive Overview" : "Operations Overview"}
          </h1>
          <p className="text-muted-foreground uppercase font-bold text-xs tracking-wider">
            {isDirector ? "Read-only strategic dashboard for managing director" : `Active performance tracking for ${role}`}
          </p>
        </div>
        <div className="flex gap-2">
          {shift && (
            <Badge variant="outline" className="bg-white border-primary text-primary px-3 py-1 font-bold uppercase tracking-tight">
              <Clock className="w-3 h-3 mr-2" />
              {shift} Shift
            </Badge>
          )}
          {!isDirector && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold px-6 uppercase tracking-widest text-[10px]" onClick={generateReport}>
              <FileText className="w-3.5 h-3.5 mr-2" /> Generate Report
            </Button>
          )}
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

      {isDirector && (
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Managing Director Snapshot</CardTitle>
            <CardDescription>Strategic indicators across revenue, occupancy, and receivables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {executiveStats.map((metric) => (
                <div key={metric.label} className="rounded-xl border p-4 bg-muted/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-black mt-2">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                {!isDirector && (
                  <Button variant="link" className="w-full text-[10px] text-primary font-black uppercase tracking-widest" asChild>
                    <Link href="/dashboard/inventory">Manage Inventory <ChevronRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                )}
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

          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Company Stock</CardTitle>
              <CardDescription>Non-consumable assets for business operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {!isDirector && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="Item Name" />
                  <Input value={assetDescription} onChange={(event) => setAssetDescription(event.target.value)} placeholder="Description" />
                  <Input type="number" min="1" value={assetQty} onChange={(event) => setAssetQty(event.target.value)} placeholder="Quantity" />
                  <div className="flex gap-2">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assetCategory}
                      onChange={(event) => setAssetCategory(event.target.value as CompanyStockCategory)}
                    >
                      {COMPANY_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <Button className="h-10 font-black uppercase tracking-widest text-[10px]" onClick={addCompanyStock}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
              {isDirector && (
                <div className="rounded-lg border bg-muted/20 p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Read-only access for managing director
                </div>
              )}

              <Tabs value={companyTab} onValueChange={(value) => setCompanyTab(value as CompanyStockCategory)}>
                <TabsList className="h-auto flex-wrap">
                  {COMPANY_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.value} value={category.value} className="font-black uppercase text-[10px] tracking-widest">
                      {category.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Item Name</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanyStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell className="font-bold">{item.description}</TableCell>
                      <TableCell className="font-bold">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {filteredCompanyStock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center opacity-50 font-black uppercase text-[10px] tracking-widest">
                        No company stock in this category
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
