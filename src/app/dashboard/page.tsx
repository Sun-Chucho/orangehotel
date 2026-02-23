"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Role, ROOMS, INVENTORY } from '@/app/lib/mock-data';
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
  ArrowDownRight
} from "lucide-react";

export default function OverviewPage() {
  const [role, setRole] = useState<Role>('manager');
  const [shift, setShift] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem('orange-hotel-role') as Role;
    const savedShift = localStorage.getItem('orange-hotel-shift');
    if (savedRole) setRole(savedRole);
    if (savedShift) setShift(savedShift);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const stats = [
    { label: 'Total Revenue', value: 'TSh 4,285,000', icon: DollarSign, trend: '+12%', trendUp: true, color: 'text-green-500' },
    { label: 'Room Occupancy', value: '82%', icon: BedDouble, trend: '+5%', trendUp: true, color: 'text-blue-500' },
    { label: 'Food & Drinks', value: 'TSh 1,120,000', icon: TrendingUp, trend: '-2%', trendUp: false, color: 'text-orange-500' },
    { label: 'Staff on Duty', value: '18', icon: Users, trend: 'Normal', trendUp: true, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Operations Overview</h1>
          <p className="text-muted-foreground">Monitoring active performance for {role === 'cashier' ? `${shift} shift` : role}.</p>
        </div>
        <div className="flex gap-2">
          {shift && (
            <Badge variant="outline" className="bg-white border-primary text-primary px-3 py-1 font-bold uppercase tracking-tight">
              <Clock className="w-3 h-3 mr-2" />
              {shift} Shift
            </Badge>
          )}
          <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold px-6">
            Generate Report
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
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
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black mt-1 tracking-tight">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Inventory Alerts</CardTitle>
                  <CardDescription>Items below threshold levels</CardDescription>
                </div>
                <AlertCircle className="w-5 h-5 text-destructive" />
              </CardHeader>
              <CardContent className="space-y-4">
                {INVENTORY.filter(i => i.stock < i.minStock).map(item => (
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
                <Button variant="link" className="w-full text-xs text-primary font-black uppercase tracking-widest" asChild>
                  <Link href="/dashboard/inventory">Manage Inventory <ChevronRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Housekeeping</CardTitle>
                  <CardDescription>Real-time room status update</CardDescription>
                </div>
                <BedDouble className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-4">
                {ROOMS.slice(0, 4).map(room => (
                  <div key={room.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center font-black text-sm">
                        {room.number}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none font-black uppercase tracking-tighter">{room.type}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] capitalize font-black uppercase tracking-tighter",
                        room.status === 'available' && "bg-green-50 text-green-700 border-green-200",
                        room.status === 'occupied' && "bg-blue-50 text-blue-700 border-blue-200",
                        room.status === 'cleaning' && "bg-orange-50 text-orange-700 border-orange-200",
                        room.status === 'maintenance' && "bg-gray-50 text-gray-700 border-gray-200",
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

        <div className="space-y-8">
          <Card className="bg-secondary text-white shadow-lg overflow-hidden relative border-none">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary rounded-full blur-3xl opacity-20" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Internal Log</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { user: 'Reception', action: 'Guest Room 204 checked in', time: '12m ago' },
                  { user: 'Kitchen', action: 'Order #242 served', time: '15m ago' },
                  { user: 'Manager', action: 'Stock audit completed', time: '45m ago' },
                  { user: 'Housekeeping', action: 'Room 103 cleaned', time: '1h ago' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-3 relative">
                    {i !== 3 && <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-sidebar-accent" />}
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
    </div>
  );
}