
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  { id: 's1', name: 'Standard Room Booking', price: 150, category: 'Rooms' },
  { id: 's2', name: 'Late Checkout Fee', price: 50, category: 'Rooms' },
  { id: 's3', name: 'Airport Transfer', price: 35, category: 'General' },
  { id: 's4', name: 'Spa Day Pass', price: 80, category: 'General' },
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
            <h1 className="text-3xl font-black tracking-tight">POS Terminal</h1>
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Quick check-in & service billing</p>
          </div>
          <Button variant="outline" className="font-bold">
            <UserPlus className="w-4 h-4 mr-2" /> Guest Search
          </Button>
        </header>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search services, rooms, or items..." className="pl-10 h-12 text-lg shadow-sm" />
          </div>
          <div className="flex gap-2">
            {['All', 'Rooms', 'General'].map(cat => (
              <Button key={cat} variant="secondary" size="sm" className="font-bold px-4">{cat}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-2">
          {MOCK_SERVICES.map((service) => (
            <button 
              key={service.id}
              onClick={() => addToCart(service)}
              className="group p-6 bg-white rounded-2xl border hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all text-left flex flex-col justify-between h-40"
            >
              <div>
                <Badge variant="outline" className="text-[9px] uppercase font-black mb-2">{service.category}</Badge>
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{service.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black">${service.price}</span>
                <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex flex-col shadow-2xl border-none bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black">Current Order</CardTitle>
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          </div>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Transaction #84920</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
              <Receipt className="w-12 h-12 mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Cart is empty</p>
            </div>
          ) : (
            cart.map((i) => (
              <div key={i.item.id} className="flex items-center justify-between group">
                <div className="flex-1">
                  <p className="font-bold text-sm leading-tight">{i.item.name}</p>
                  <p className="text-xs text-muted-foreground font-medium">Qty: {i.qty} × ${i.item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black">${i.item.price * i.qty}</span>
                  <button 
                    onClick={() => removeFromCart(i.item.id)}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <div className="p-6 bg-muted/30 border-t space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Tax (5%)</span>
              <span>${(total * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black pt-2 border-t border-muted-foreground/10">
              <span>Total</span>
              <span className="text-primary">${(total * 1.05).toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 font-black flex flex-col items-center justify-center gap-1 group">
              <Banknote className="w-5 h-5 group-hover:text-primary" />
              <span className="text-[9px] uppercase tracking-widest">Cash</span>
            </Button>
            <Button variant="outline" className="h-14 font-black flex flex-col items-center justify-center gap-1 group">
              <CreditCard className="w-5 h-5 group-hover:text-primary" />
              <span className="text-[9px] uppercase tracking-widest">Card</span>
            </Button>
          </div>

          <Button 
            disabled={cart.length === 0}
            className="w-full h-16 bg-primary font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-primary/20"
          >
            Complete Payment
          </Button>
        </div>
      </Card>
    </div>
  );
}
