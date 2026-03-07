"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SALES_HISTORY } from "@/app/lib/mock-data";
import {
  BeverageCostRow,
  RecipeCostRow,
  STORAGE_BEVERAGE_COST,
  STORAGE_RECIPE_COST,
  STORAGE_STOCK_SALES,
  StockSalesRow,
} from "@/app/lib/fnb-control";
import { readJson } from "@/app/lib/storage";
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

const COLORS = ["#F57C00", "#000000", "#FFB74D", "#333333"];

function formatShortDate(dateText: string) {
  return new Date(dateText).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [beverageRows, setBeverageRows] = useState<BeverageCostRow[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeCostRow[]>([]);
  const [stockSalesRows, setStockSalesRows] = useState<StockSalesRow[]>([]);

  useEffect(() => {
    const bev = readJson<BeverageCostRow[]>(STORAGE_BEVERAGE_COST);
    const rec = readJson<RecipeCostRow[]>(STORAGE_RECIPE_COST);
    const ss = readJson<StockSalesRow[]>(STORAGE_STOCK_SALES);
    if (Array.isArray(bev)) setBeverageRows(bev);
    if (Array.isArray(rec)) setRecipeRows(rec);
    if (Array.isArray(ss)) setStockSalesRows(ss);
  }, []);

  const history = useMemo(() => {
    if (range === "7d") return SALES_HISTORY;

    if (range === "14d") {
      const clone = [...SALES_HISTORY, ...SALES_HISTORY].slice(-14);
      return clone.map((item, index) => ({ ...item, date: `2024-06-${String(index + 1).padStart(2, "0")}` }));
    }

    const triple = [...SALES_HISTORY, ...SALES_HISTORY, ...SALES_HISTORY, ...SALES_HISTORY, ...SALES_HISTORY].slice(-30);
    return triple.map((item, index) => ({ ...item, date: `2024-07-${String(index + 1).padStart(2, "0")}` }));
  }, [range]);

  const totals = useMemo(() => {
    const totalRevenue = history.reduce((sum, day) => sum + day.totalRevenue, 0);
    const avgDaily = history.length === 0 ? 0 : Math.round(totalRevenue / history.length);
    const roomRevenue = history.reduce((sum, day) => sum + day.roomRevenue, 0);
    const foodRevenue = history.reduce((sum, day) => sum + day.foodAndDrinksRevenue, 0);

    return {
      totalRevenue,
      avgDaily,
      roomRevenue,
      foodRevenue,
      serviceRevenue: Math.max(0, Math.round(totalRevenue * 0.12)),
      otherRevenue: Math.max(0, Math.round(totalRevenue * 0.08)),
    };
  }, [history]);

  const pieData = useMemo(
    () => [
      { name: "Room Revenue", value: totals.roomRevenue },
      { name: "Food and Drinks", value: totals.foodRevenue },
      { name: "Services", value: totals.serviceRevenue },
      { name: "Other", value: totals.otherRevenue },
    ],
    [totals],
  );

  const stats = useMemo(
    () => [
      { label: "Avg Daily Revenue", value: `TSh ${totals.avgDaily.toLocaleString()}`, trend: history.length > 0 ? "Live" : "No Data", icon: DollarSign },
      { label: "Weekly Growth", value: history.length > 0 ? "Pending" : "0%", trend: history.length > 0 ? "Live" : "No Data", icon: TrendingUp },
      { label: "Total Guests", value: "0", trend: "Live", icon: Users },
      { label: "Booking Freq", value: "0/day", trend: history.length > 0 ? "Live" : "No Data", icon: Calendar },
    ],
    [history.length, totals.avgDaily],
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
            const costPerPortion = row.batchCost / row.yieldPortions;
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
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Business intelligence and trends</p>
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
                <span className={`text-xs font-black ${stat.trend.startsWith("+") ? "text-green-500" : "text-destructive"}`}>{stat.trend}</span>
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
            <CardDescription>Financial performance for selected range ({range})</CardDescription>
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
            <CardDescription>Income distribution by department</CardDescription>
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
