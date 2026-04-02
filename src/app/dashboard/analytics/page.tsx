"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BeverageCostRow,
  RecipeCostRow,
  STORAGE_BEVERAGE_COST,
  STORAGE_RECIPE_COST,
  STORAGE_STOCK_SALES,
  StockSalesRow,
} from "@/app/lib/fnb-control";
import { readCashierState, readJson, readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE } from "@/app/lib/storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RangeKey = "7d" | "14d" | "30d";

type BookingTransaction = {
  createdAt?: number;
  total?: number;
  guestName?: string;
  status?: "completed" | "checked-out" | "credit";
};

type PosPaymentRecord = {
  createdAt?: number;
  total?: number;
  status?: "completed" | "credit";
};

type RevenueHistoryRow = {
  date: string;
  label: string;
  totalRevenue: number;
  roomRevenue: number;
  kitchenRevenue: number;
  baristaRevenue: number;
};

const COLORS = ["#F57C00", "#000000", "#FFB74D", "#757575"];

function formatShortDate(dateText: string) {
  return new Date(`${dateText}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function toDayKey(timestamp: number) {
  const value = new Date(timestamp);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDayKeys(range: RangeKey) {
  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const keys: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const next = new Date(today);
    next.setDate(today.getDate() - index);
    keys.push(toDayKey(next.getTime()));
  }

  return keys;
}

function calculateGrowth(current: number, previous: number) {
  if (current === 0 && previous === 0) return "0%";
  if (previous === 0) return "+100%";
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [bookings, setBookings] = useState<BookingTransaction[]>([]);
  const [kitchenPayments, setKitchenPayments] = useState<PosPaymentRecord[]>([]);
  const [baristaPayments, setBaristaPayments] = useState<PosPaymentRecord[]>([]);
  const [beverageRows, setBeverageRows] = useState<BeverageCostRow[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeCostRow[]>([]);
  const [stockSalesRows, setStockSalesRows] = useState<StockSalesRow[]>([]);

  useEffect(() => {
    const applyAnalyticsSnapshot = () => {
      const cashierSnapshot = readCashierState<BookingTransaction>(
        "orange-hotel-cashier-transactions",
        "orange-hotel-cashier-seq",
        84920,
      );
      const kitchenSnapshot = readPosState<unknown, PosPaymentRecord, unknown>(
        STORAGE_KITCHEN_STATE,
        "orange-hotel-kitchen-tickets",
        "orange-hotel-kitchen-seq",
        "orange-hotel-kitchen-payments",
        "orange-hotel-kitchen-menu",
        300,
      );
      const baristaSnapshot = readPosState<unknown, PosPaymentRecord, unknown>(
        STORAGE_BARISTA_STATE,
        "orange-hotel-barista-orders",
        "orange-hotel-barista-seq",
        "orange-hotel-barista-payments",
        "orange-hotel-barista-menu",
        490,
      );

      setBookings(cashierSnapshot.transactions);
      setKitchenPayments(kitchenSnapshot.payments);
      setBaristaPayments(baristaSnapshot.payments);
      setBeverageRows(readJson<BeverageCostRow[]>(STORAGE_BEVERAGE_COST) ?? []);
      setRecipeRows(readJson<RecipeCostRow[]>(STORAGE_RECIPE_COST) ?? []);
      setStockSalesRows(readJson<StockSalesRow[]>(STORAGE_STOCK_SALES) ?? []);
    };

    applyAnalyticsSnapshot();

    const unsubscribers = [
      subscribeToSyncedStorageKey("orange-hotel-cashier-state", applyAnalyticsSnapshot),
      subscribeToSyncedStorageKey(STORAGE_KITCHEN_STATE, applyAnalyticsSnapshot),
      subscribeToSyncedStorageKey(STORAGE_BARISTA_STATE, applyAnalyticsSnapshot),
      subscribeToSyncedStorageKey(STORAGE_BEVERAGE_COST, applyAnalyticsSnapshot),
      subscribeToSyncedStorageKey(STORAGE_RECIPE_COST, applyAnalyticsSnapshot),
      subscribeToSyncedStorageKey(STORAGE_STOCK_SALES, applyAnalyticsSnapshot),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const history = useMemo<RevenueHistoryRow[]>(() => {
    const keys = createDayKeys(range);
    const rows = new Map<string, RevenueHistoryRow>(
      keys.map((key) => [
        key,
        {
          date: key,
          label: key,
          totalRevenue: 0,
          roomRevenue: 0,
          kitchenRevenue: 0,
          baristaRevenue: 0,
        },
      ]),
    );

    bookings.forEach((booking) => {
      if (booking.status === "credit") return;
      if (!booking.createdAt || !booking.total) return;
      const key = toDayKey(booking.createdAt);
      const row = rows.get(key);
      if (!row) return;
      row.roomRevenue += booking.total;
      row.totalRevenue += booking.total;
    });

    kitchenPayments.forEach((payment) => {
      if (payment.status === "credit") return;
      if (!payment.createdAt || !payment.total) return;
      const key = toDayKey(payment.createdAt);
      const row = rows.get(key);
      if (!row) return;
      row.kitchenRevenue += payment.total;
      row.totalRevenue += payment.total;
    });

    baristaPayments.forEach((payment) => {
      if (payment.status === "credit") return;
      if (!payment.createdAt || !payment.total) return;
      const key = toDayKey(payment.createdAt);
      const row = rows.get(key);
      if (!row) return;
      row.baristaRevenue += payment.total;
      row.totalRevenue += payment.total;
    });

    return keys.map((key) => rows.get(key)!);
  }, [baristaPayments, bookings, kitchenPayments, range]);

  const totals = useMemo(() => {
    const totalRevenue = history.reduce((sum, day) => sum + day.totalRevenue, 0);
    const roomRevenue = history.reduce((sum, day) => sum + day.roomRevenue, 0);
    const kitchenRevenue = history.reduce((sum, day) => sum + day.kitchenRevenue, 0);
    const baristaRevenue = history.reduce((sum, day) => sum + day.baristaRevenue, 0);
    const avgDaily = history.length === 0 ? 0 : Math.round(totalRevenue / history.length);
    const totalGuests = bookings.filter((booking) => {
      if (booking.status === "credit") return false;
      if (!booking.createdAt) return false;
      return history.some((row) => row.date === toDayKey(booking.createdAt));
    }).length;
    const bookingFreq = history.length === 0 ? 0 : Number((totalGuests / history.length).toFixed(1));

    return {
      totalRevenue,
      roomRevenue,
      kitchenRevenue,
      baristaRevenue,
      avgDaily,
      totalGuests,
      bookingFreq,
    };
  }, [bookings, history]);

  const growth = useMemo(() => {
    const split = history.length;
    const previousKeys = createDayKeys(range).map((key) => key);
    const oldest = new Date(`${previousKeys[0]}T00:00:00`);
    const previousRows = previousKeys.map((_, index) => {
      const date = new Date(oldest);
      date.setDate(oldest.getDate() - split + index);
      return toDayKey(date.getTime());
    });

    const currentTotal = history.reduce((sum, row) => sum + row.totalRevenue, 0);
    let previousTotal = 0;

    bookings.forEach((booking) => {
      if (booking.status === "credit" || !booking.createdAt || !booking.total) return;
      if (previousRows.includes(toDayKey(booking.createdAt))) {
        previousTotal += booking.total;
      }
    });
    kitchenPayments.forEach((payment) => {
      if (payment.status === "credit" || !payment.createdAt || !payment.total) return;
      if (previousRows.includes(toDayKey(payment.createdAt))) {
        previousTotal += payment.total;
      }
    });
    baristaPayments.forEach((payment) => {
      if (payment.status === "credit" || !payment.createdAt || !payment.total) return;
      if (previousRows.includes(toDayKey(payment.createdAt))) {
        previousTotal += payment.total;
      }
    });

    return calculateGrowth(currentTotal, previousTotal);
  }, [baristaPayments, bookings, history, kitchenPayments, range]);

  const pieData = useMemo(
    () => [
      { name: "Room Revenue", value: totals.roomRevenue },
      { name: "Kitchen Revenue", value: totals.kitchenRevenue },
      { name: "Barista Revenue", value: totals.baristaRevenue },
      {
        name: "Credit Exposure",
        value:
          bookings.filter((booking) => booking.status === "credit").reduce((sum, booking) => sum + (booking.total ?? 0), 0) +
          kitchenPayments.filter((payment) => payment.status === "credit").reduce((sum, payment) => sum + (payment.total ?? 0), 0) +
          baristaPayments.filter((payment) => payment.status === "credit").reduce((sum, payment) => sum + (payment.total ?? 0), 0),
      },
    ],
    [baristaPayments, bookings, kitchenPayments, totals.baristaRevenue, totals.kitchenRevenue, totals.roomRevenue],
  );

  const stats = useMemo(
    () => [
      { label: "Avg Daily Revenue", value: `TSh ${totals.avgDaily.toLocaleString()}`, trend: `${range.toUpperCase()} Live`, icon: DollarSign },
      { label: "Period Growth", value: growth, trend: "Vs previous period", icon: TrendingUp },
      { label: "Total Guests", value: totals.totalGuests.toLocaleString(), trend: `${range.toUpperCase()} bookings`, icon: Users },
      { label: "Booking Freq", value: `${totals.bookingFreq}/day`, trend: "Live average", icon: Calendar },
    ],
    [growth, range, totals.avgDaily, totals.bookingFreq, totals.totalGuests],
  );

  const fnbControlMetrics = useMemo(() => {
    const beverageRevenue = beverageRows.reduce((sum, row) => sum + row.salesRevenue, 0);
    const beverageCogs = beverageRows.reduce((sum, row) => {
      const consumed = Math.max(0, row.openingStock + row.purchasedStock - row.closingStock);
      const unitCost = row.purchasedStock > 0 ? row.purchaseCostTotal / row.purchasedStock : 0;
      return sum + consumed * unitCost;
    }, 0);
    const beverageCostPct = beverageRevenue > 0 ? (beverageCogs / beverageRevenue) * 100 : 0;

    const recipeCostPctAvg =
      recipeRows.length === 0
        ? 0
        : recipeRows.reduce((sum, row) => {
            const costPerPortion = row.yieldPortions > 0 ? row.batchCost / row.yieldPortions : 0;
            const pct = row.sellingPricePerPortion > 0 ? (costPerPortion / row.sellingPricePerPortion) * 100 : 0;
            return sum + pct;
          }, 0) / recipeRows.length;

    const varianceUnits = stockSalesRows.reduce((sum, row) => sum + Math.abs(row.salesUnits - row.stockOut), 0);
    const matchedRows = stockSalesRows.filter((row) => row.salesUnits === row.stockOut).length;

    return {
      beverageCostPct,
      recipeCostPctAvg,
      varianceUnits,
      matchedRows,
      totalRows: stockSalesRows.length,
    };
  }, [beverageRows, recipeRows, stockSalesRows]);

  const exportReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      range,
      totals,
      history,
      pieData,
      fnbControlMetrics,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${range}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Performance Analytics</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Live business intelligence and trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
            <TabsList className="h-10">
              <TabsTrigger value="7d" className="text-[10px] font-black uppercase tracking-widest">7D</TabsTrigger>
              <TabsTrigger value="14d" className="text-[10px] font-black uppercase tracking-widest">14D</TabsTrigger>
              <TabsTrigger value="30d" className="text-[10px] font-black uppercase tracking-widest">30D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="bg-primary font-black uppercase tracking-widest text-[10px]" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted/50 text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-muted-foreground">{stat.trend}</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-xl font-black mt-1 tracking-tight">{stat.value}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">F&amp;B Control Sheet Metrics</CardTitle>
          <CardDescription>Live KPIs from beverage cost, recipe costing, and stock-sales tracking sheets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Beverage Cost %</p>
              <p className="text-2xl font-black mt-1">{fnbControlMetrics.beverageCostPct.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Recipe Cost %</p>
              <p className="text-2xl font-black mt-1">{fnbControlMetrics.recipeCostPctAvg.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock/Sales Variance Units</p>
              <p className="text-2xl font-black mt-1">{fnbControlMetrics.varianceUnits.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rows Matched</p>
              <p className="text-2xl font-black mt-1">
                {fnbControlMetrics.matchedRows}/{fnbControlMetrics.totalRows}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Revenue Trend</CardTitle>
            <CardDescription>Actual room, kitchen, and barista revenue for the selected range</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F57C00" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#F57C00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tickFormatter={formatShortDate} />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tickFormatter={(value) => `TSh ${Math.round(value / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", fontWeight: "bold" }}
                    formatter={(value: number) => [`TSh ${value.toLocaleString()}`, "Revenue"]}
                    labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString()}
                  />
                  <Area type="monotone" dataKey="totalRevenue" stroke="#F57C00" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Revenue Mix</CardTitle>
            <CardDescription>Current distribution across live departments and credit exposure</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                    {pieData.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`TSh ${value.toLocaleString()}`, "Value"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-4 w-full mt-6 border-t pt-6">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-black">TSh {item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
