"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  CreditCard, 
  Banknote, 
  Receipt, 
  UserPlus,
  ArrowRight,
  ShoppingCart,
  Trash2
} from "lucide-react";

const MOCK_SERVICES = [
  { id: 's1', name: 'Standard Room Booking', price: 150000, category: 'Rooms' },
  { id: 's2', name: 'Late Checkout Fee', price: 50000, category: 'Rooms' },
  { id: 's3', name: 'Airport Transfer', price: 35000, category: 'General' },
  { id: 's4', name: 'Spa Day Pass', price: 80000, category: 'General' },
  { id: 's5', name: 'Laundry Express', price: 20000, category: 'General' },
  { id: 's6', name: 'Dinner Buffet', price: 45000, category: 'General' },
];

export default function CashierPage() {
  const [cart, setCart] = useState<{item: any, qty: number}[]>([]);

  const addToCart = (item: any) => {
    const existing = cart.find(i => i.item.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { item, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.item.id !== id));
  };

  const total = cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
      <div className="lg:col-span-2 space-y-6 flex flex-col">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">POS Terminal</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Quick check-in & service billing</p>
          </div>
          <Button variant="outline" className="font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" /> Guest Search
          </Button>
        </header>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search services, rooms, or items..." className="pl-10 h-14 text-lg shadow-sm border-none bg-white font-medium" />
          </div>
          <div className="flex gap-2 bg-muted/30 p-1.5 rounded-xl">
            {['All', 'Rooms', 'General'].map(cat => (
              <Button key={cat} variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] px-6 h-11 hover:bg-white hover:shadow-sm transition-all">{cat}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-2 pb-6">
          {MOCK_SERVICES.map((service) => (
            <button 
              key={service.id}
              onClick={() => addToCart(service)}
              className="group p-6 bg-white rounded-3xl border-none shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all text-left flex flex-col justify-between h-48 relative overflow-hidden active:scale-95"
            >
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <div>
                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest mb-3 border-primary/20 text-primary">{service.category}</Badge>
                <h3 className="font-black text-xl leading-tight group-hover:text-primary transition-colors tracking-tight">{service.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black">TSh {service.price.toLocaleString()}</span>
                <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex flex-col shadow-2xl border-none bg-white relative overflow-hidden rounded-[40px]">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
        <CardHeader className="bg-muted/10 pb-6 pt-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Current Order</CardTitle>
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-primary shadow-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <CardDescription className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Transaction #84920</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-8 space-y-6 px-8">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
              <Receipt className="w-20 h-20 mb-6 stroke-[1]" />
              <p className="font-black uppercase tracking-widest text-xs">Waiting for items...</p>
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.item.id} className="flex items-center justify-between group animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex-1">
                  <p className="font-black text-sm uppercase tracking-tight">{i.item.name}</p>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                    Qty: {i.qty} × TSh {i.item.price.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-sm">TSh {(i.item.price * i.qty).toLocaleString()}</span>
                  <button 
                    onClick={() => removeFromCart(i.item.id)}
                    className="p-2 rounded-xl bg-destructive/5 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <div className="p-8 bg-muted/10 border-t space-y-8 rounded-t-[40px] shadow-inner">
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest opacity-60">
              <span>Subtotal</span>
              <span>TSh {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest opacity-60">
              <span>Service Tax (5%)</span>
              <span>TSh {(total * 0.05).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-3xl font-black pt-4 border-t border-muted-foreground/10 tracking-tighter">
              <span className="uppercase text-lg mt-1">Total</span>
              <span className="text-primary">TSh {(total * 1.05).toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 font-black flex flex-col items-center justify-center gap-1.5 group rounded-2xl border-none bg-white shadow-sm hover:shadow-xl transition-all">
              <Banknote className="w-6 h-6 group-hover:text-primary transition-colors" />
              <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">Cash</span>
            </Button>
            <Button variant="outline" className="h-20 font-black flex flex-col items-center justify-center gap-1.5 group rounded-2xl border-none bg-white shadow-sm hover:shadow-xl transition-all">
              <CreditCard className="w-6 h-6 group-hover:text-primary transition-colors" />
              <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100">Card</span>
            </Button>
          </div>

          <Button 
            disabled={cart.length === 0}
            className="w-full h-20 bg-primary hover:bg-primary/90 font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 rounded-2xl group transition-all"
          >
            Complete Payment <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
      </Card>
    </div>
  );
}