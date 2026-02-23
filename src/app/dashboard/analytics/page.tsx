
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SALES_HISTORY } from '@/app/lib/mock-data';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  Filter,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ['#F57C00', '#000000', '#FFB74D', '#333333'];

export default function AnalyticsPage() {
  const pieData = [
    { name: 'Room Revenue', value: 8200 },
    { name: 'Food & Drinks', value: 3400 },
    { name: 'Services', value: 1200 },
    { name: 'Other', value: 800 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Performance Analytics</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Business intelligence & trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-bold">
            <Filter className="w-4 h-4 mr-2" /> Custom Range
          </Button>
          <Button size="sm" className="bg-primary font-bold">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Daily Revenue', value: '$2,840', trend: '+14%', icon: DollarSign },
          { label: 'Weekly Growth', value: '22.4%', trend: '+4%', icon: TrendingUp },
          { label: 'Total Guests', value: '1,248', trend: '+8%', icon: Users },
          { label: 'Booking Freq', value: '8.2/day', trend: '-2%', icon: Calendar },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted/50 text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-black ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-destructive'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <h4 className="text-2xl font-black mt-1 tracking-tight">{stat.value}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">Revenue Trend</CardTitle>
            <CardDescription>Daily financial performance for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SALES_HISTORY}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F57C00" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F57C00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="totalRevenue" stroke="#F57C00" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">Revenue Mix</CardTitle>
            <CardDescription>Income distribution by department</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {pieData.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-black ml-4">${item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
