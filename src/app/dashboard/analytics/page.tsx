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

type ReportRange = "daily" | "weekly" | "monthly" | "all-time";

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

type RevenueEvent = {
  date: string;
  timestamp: number;
  source: "rooms" | "kitchen" | "barista";
  total: number;
};

const COLORS = ["#F57C00", "#000000", "#FFB74D", "#757575"];

function formatShortDate(dateText: string) {
  if (/^\d{4}-\d{2}$/.test(dateText)) {
    return new Date(`${dateText}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).toUpperCase();
  }
  return new Date(`${dateText}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
}

function toDayKey(timestamp: number) {
  const value = new Date(timestamp);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(timestamp: number) {
  const value = new Date(timestamp);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string) {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function createRecentDayKeys(days: number) {
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

function createMonthDayKeys(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const keys: string[] = [];

  for (let day = 1; day <= days; day += 1) {
    keys.push(`${yearText}-${monthText}-${String(day).padStart(2, "0")}`);
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
  const [range, setRange] = useState<ReportRange>("daily");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
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

  const revenueEvents = useMemo<RevenueEvent[]>(() => {
    const events: RevenueEvent[] = [];

    bookings.forEach((booking) => {
      if (booking.status === "credit" || !booking.createdAt || !booking.total) return;
      events.push({ date: toDayKey(booking.createdAt), timestamp: booking.createdAt, source: "rooms", total: booking.total });
    });

    kitchenPayments.forEach((payment) => {
      if (payment.status === "credit" || !payment.createdAt || !payment.total) return;
      events.push({ date: toDayKey(payment.createdAt), timestamp: payment.createdAt, source: "kitchen", total: payment.total });
    });

    baristaPayments.forEach((payment) => {
      if (payment.status === "credit" || !payment.createdAt || !payment.total) return;
      events.push({ date: toDayKey(payment.createdAt), timestamp: payment.createdAt, source: "barista", total: payment.total });
    });

    return events;
  }, [baristaPayments, bookings, kitchenPayments]);

  const availableMonths = useMemo(() => {
    const monthKeys = Array.from(new Set(revenueEvents.map((event) => toMonthKey(event.timestamp))));
    if (monthKeys.length === 0) monthKeys.push(toMonthKey(Date.now()));
    return monthKeys.sort((a, b) => b.localeCompare(a));
  }, [revenueEvents]);

  useEffect(() => {
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0] ?? toMonthKey(Date.now()));
    }
  }, [availableMonths, selectedMonth]);

  const activeReportLabel = useMemo(() => {
    if (range === "daily") return "Today";
    if (range === "weekly") return "Last 7 Days";
    if (range === "monthly") return formatMonthLabel(selectedMonth || availableMonths[0] || toMonthKey(Date.now()));
    return "All Time";
  }, [availableMonths, range, selectedMonth]);

  const history = useMemo<RevenueHistoryRow[]>(() => {
    const keys =
      range === "daily"
        ? createRecentDayKeys(1)
        : range === "weekly"
          ? createRecentDayKeys(7)
          : range === "monthly"
            ? createMonthDayKeys(selectedMonth || availableMonths[0] || toMonthKey(Date.now()))
            : availableMonths.slice().reverse();

    const rows = new Map<string, RevenueHistoryRow>(
      keys.map((key) => [
        key,
        {
          date: key,
          label: /^\d{4}-\d{2}$/.test(key) ? formatMonthLabel(key) : key,
          totalRevenue: 0,
          roomRevenue: 0,
          kitchenRevenue: 0,
          baristaRevenue: 0,
        },
      ]),
    );

    revenueEvents.forEach((event) => {
      const key = range === "all-time" ? toMonthKey(event.timestamp) : event.date;
      const row = rows.get(key);
      if (!row) return;
      if (event.source === "rooms") row.roomRevenue += event.total;
      if (event.source === "kitchen") row.kitchenRevenue += event.total;
      if (event.source === "barista") row.baristaRevenue += event.total;
      row.totalRevenue += event.total;
    });

    return keys.map((key) => rows.get(key)!);
  }, [availableMonths, range, revenueEvents, selectedMonth]);

  const totals = useMemo(() => {
    const totalRevenue = history.reduce((sum, day) => sum + day.totalRevenue, 0);
    const roomRevenue = history.reduce((sum, day) => sum + day.roomRevenue, 0);
    const kitchenRevenue = history.reduce((sum, day) => sum + day.kitchenRevenue, 0);
    const baristaRevenue = history.reduce((sum, day) => sum + day.baristaRevenue, 0);
    const avgDaily = history.length === 0 ? 0 : Math.round(totalRevenue / history.length);
    const periodKeys = new Set(history.map((row) => row.date));
    const totalGuests = bookings.filter((booking) => {
      if (booking.status === "credit" || !booking.createdAt) return false;
      const key = range === "all-time" ? toMonthKey(booking.createdAt) : toDayKey(booking.createdAt);
      return periodKeys.has(key);
    }).length;
    const divisor = range === "all-time" ? Math.max(history.length, 1) : Math.max(history.filter((row) => row.totalRevenue > 0).length, 1);
    const bookingFreq = Number((totalGuests / divisor).toFixed(1));

    return {
      totalRevenue,
      roomRevenue,
      kitchenRevenue,
      baristaRevenue,
      avgDaily,
      totalGuests,
      bookingFreq,
    };
  }, [bookings, history, range]);

  const growth = useMemo(() => {
    if (range === "all-time") return "All";
    const split = history.length;
    const previousKeys = history.map((row) => row.date);
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
      { label: range === "all-time" ? "Avg Period Revenue" : "Avg Daily Revenue", value: `TSh ${totals.avgDaily.toLocaleString()}`, trend: activeReportLabel, icon: DollarSign },
      { label: "Period Growth", value: growth, trend: "Vs previous period", icon: TrendingUp },
      { label: "Total Guests", value: totals.totalGuests.toLocaleString(), trend: "Filtered bookings", icon: Users },
      { label: "Booking Freq", value: `${totals.bookingFreq}/${range === "all-time" ? "period" : "day"}`, trend: "Filtered average", icon: Calendar },
    ],
    [activeReportLabel, growth, range, totals.avgDaily, totals.bookingFreq, totals.totalGuests],
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
      selectedMonth,
      activeReportLabel,
      totals,
      history,
      pieData,
      fnbControlMetrics,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `md-report-${range}${range === "monthly" ? `-${selectedMonth}` : ""}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase md:text-3xl">MD Reports</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Daily, weekly, monthly, and all-time business reports</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={range} onValueChange={(value) => setRange(value as ReportRange)}>
            <TabsList className="h-10 flex-wrap">
              <TabsTrigger value="daily" className="text-[10px] font-black uppercase tracking-widest">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-[10px] font-black uppercase tracking-widest">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-[10px] font-black uppercase tracking-widest">Monthly</TabsTrigger>
              <TabsTrigger value="all-time" className="text-[10px] font-black uppercase tracking-widest">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="bg-primary font-black uppercase tracking-widest text-[10px]" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </header>

      {range === "monthly" && (
        <Card className="rounded-lg border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Select Month</CardTitle>
            <CardDescription>Choose a month to open that month&apos;s report.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              {availableMonths.map((month) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => setSelectedMonth(month)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selectedMonth === month ? "border-primary bg-primary/10 text-primary" : "bg-white hover:border-primary/40"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Report</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-tight">{formatMonthLabel(month)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-lg border border-black/5 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Report</p>
            <p className="mt-1 text-xl font-black uppercase tracking-tight">{activeReportLabel}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rooms</p>
              <p className="text-sm font-black">TSh {totals.roomRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kitchen</p>
              <p className="text-sm font-black">TSh {totals.kitchenRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Barista</p>
              <p className="text-sm font-black">TSh {totals.baristaRevenue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-lg border-none bg-white shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted/50 text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-muted-foreground">{stat.trend}</span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h4 className="mt-1 break-words text-lg font-black tracking-tight md:text-xl">{stat.value}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border-none bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">F&amp;B Control Sheet Metrics</CardTitle>
          <CardDescription>Live KPIs from beverage cost, recipe costing, and stock-sales tracking sheets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
        <Card className="rounded-lg border-none bg-white shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Revenue Trend</CardTitle>
            <CardDescription>Actual room, kitchen, and barista revenue for {activeReportLabel}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[260px] w-full md:h-[350px]">
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
                    labelFormatter={(value) => (/^\d{4}-\d{2}$/.test(String(value)) ? formatMonthLabel(String(value)) : new Date(`${value}T00:00:00`).toLocaleDateString())}
                  />
                  <Area type="monotone" dataKey="totalRevenue" stroke="#F57C00" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Revenue Mix</CardTitle>
            <CardDescription>Current distribution across live departments and credit exposure</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[220px] w-full md:h-[280px]">
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

      <Card className="rounded-lg border-none bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Report Breakdown</CardTitle>
          <CardDescription>Each row is grouped by the selected report period.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Period</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Rooms</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Kitchen</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Barista</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="px-4 py-3 font-bold">{row.label}</td>
                    <td className="px-4 py-3 font-bold">TSh {row.roomRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">TSh {row.kitchenRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">TSh {row.baristaRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-black">TSh {row.totalRevenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
