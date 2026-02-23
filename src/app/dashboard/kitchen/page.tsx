
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Utensils, 
  Clock, 
  CheckCircle2, 
  ChefHat,
  AlertTriangle,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_ORDERS = [
  { id: 'k1', table: '204', items: ['Grilled Salmon', 'Garden Salad'], time: '12m ago', status: 'preparing' },
  { id: 'k2', table: '101', items: ['Wagyu Burger (Medium)', 'Truffle Fries'], time: '8m ago', status: 'preparing' },
  { id: 'k3', table: 'Lobby', items: ['Club Sandwich'], time: '22m ago', status: 'delayed' },
  { id: 'k4', table: '305', items: ['Steak Frites'], time: '2m ago', status: 'new' },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);

  const completeOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Kitchen Monitor</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Active Prep Queue</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-1.5 font-bold border-primary text-primary bg-primary/5 uppercase tracking-tighter">
            {orders.length} Active Orders
          </Badge>
          <Button variant="ghost" size="icon"><History className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.map((order) => (
          <Card key={order.id} className={cn(
            "relative overflow-hidden border-2 flex flex-col h-full transition-all hover:shadow-xl",
            order.status === 'delayed' ? "border-destructive/30 bg-destructive/5 shadow-destructive/5" : "border-muted shadow-sm",
            order.status === 'preparing' && "border-primary/20",
          )}>
            {order.status === 'delayed' && (
              <div className="absolute top-0 right-0 p-3 bg-destructive text-white rounded-bl-xl z-10 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-2xl uppercase tracking-tighter">Room {order.table}</h3>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
                  <Clock className="w-3 h-3" /> {order.time}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <ul className="space-y-3 mb-8">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-bold text-lg leading-tight">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex gap-2">
                <Button 
                  onClick={() => completeOrder(order.id)}
                  className="flex-1 bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-xs h-12"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Done
                </Button>
                {order.status !== 'preparing' && (
                  <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/10 px-4">
                    Prep
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
