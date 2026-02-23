
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Coffee, 
  Clock, 
  CheckCircle2, 
  CupSoda,
  Plus,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_BEVERAGES = [
  { id: 'b1', order: '#491', items: ['Cappuccino (Oat)', 'Double Espresso'], time: '4m ago', status: 'brewing' },
  { id: 'b2', order: '#492', items: ['Iced Latte (Vanilla)', 'Croissant'], time: '2m ago', status: 'brewing' },
  { id: 'b3', order: '#493', items: ['Flat White'], time: 'Just now', status: 'new' },
];

export default function BaristaPage() {
  const [orders, setOrders] = useState(MOCK_BEVERAGES);

  const completeOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
            <Coffee className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Barista Station</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Beverage & Snack Orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-2" /> Quick Sale
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="border-none shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="h-1 bg-primary" />
            <CardHeader className="bg-muted/10 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl">{order.order}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Express Order</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-primary">
                    <Clock className="w-3 h-3" /> {order.time}
                  </span>
                  <Badge className="bg-black text-primary border-none text-[9px] uppercase font-bold mt-1">
                    {order.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <div className="space-y-4 mb-8">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-muted rounded-md text-primary">
                      <CupSoda className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg leading-tight">{item}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => completeOrder(order.id)}
                className="mt-auto w-full bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.2em] text-xs h-14 group shadow-lg shadow-primary/20"
              >
                Complete Order <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-30">
            <Coffee className="w-16 h-16 mb-4" />
            <h3 className="font-black text-xl uppercase tracking-widest">All orders served</h3>
          </div>
        )}
      </div>
    </div>
  );
}
