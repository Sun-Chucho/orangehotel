
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Role } from "./lib/mock-data";
import { ShieldCheck, ShoppingCart, Package, Utensils, Coffee, Sun, Moon } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES: { id: Role; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'manager', label: 'Hotel Manager', icon: ShieldCheck, color: 'bg-orange-500', desc: 'Full system oversight & analytics' },
  { id: 'inventory', label: 'Inventory Manager', icon: Package, color: 'bg-black', desc: 'Stock control & procurement' },
  { id: 'cashier', label: 'Receptionist / Cashier', icon: ShoppingCart, color: 'bg-orange-600', desc: 'Bookings, payments & shifts' },
  { id: 'kitchen', label: 'Kitchen POS', icon: Utensils, color: 'bg-orange-700', desc: 'Food orders & prep status' },
  { id: 'barista', label: 'Barista POS', icon: Coffee, color: 'bg-orange-400', desc: 'Drink service & beverage sales' },
];

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [shift, setShift] = useState<'day' | 'night'>('day');

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
  };

  const handleLogin = (role: Role) => {
    localStorage.setItem('orange-hotel-role', role);
    if (role === 'cashier') {
      localStorage.setItem('orange-hotel-shift', shift);
      window.location.href = '/dashboard/cashier';
      return;
    }

    localStorage.removeItem('orange-hotel-shift');
    switch (role) {
      case 'manager':
        window.location.href = '/dashboard';
        break;
      case 'inventory':
        window.location.href = '/dashboard/inventory';
        break;
      case 'kitchen':
        window.location.href = '/dashboard/kitchen';
        break;
      case 'barista':
        window.location.href = '/dashboard/barista';
        break;
    }
  };

  const logo = useMemo(() => PlaceHolderImages.find(img => img.id === 'app-logo'), []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl transition-all duration-500 mb-4 overflow-hidden p-4">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="Orange Hotel Logo" 
                width={180} 
                height={180} 
                className="object-contain"
                data-ai-hint={logo.imageHint}
                priority
              />
            )}
          </div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black opacity-60">
            Internal Operations Portal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {ROLES.map((role) => (
            <div
              key={role.id}
              className={`group bg-white border p-8 rounded-2xl shadow-sm transition-all duration-300 text-left flex flex-col relative overflow-hidden ${
                selectedRole === role.id ? 'ring-2 ring-primary border-primary' : 'hover:shadow-xl hover:border-primary/50 border-border'
              }`}
            >
              <div className={`${role.color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
                <role.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2 group-hover:text-primary transition-colors tracking-tight uppercase">{role.label}</h3>
              <p className="text-sm text-muted-foreground font-medium flex-1 mb-6 leading-relaxed">
                {role.desc}
              </p>

              {role.id === 'cashier' && selectedRole === 'cashier' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Select Shift</span>
                    <Tabs defaultValue="day" onValueChange={(v) => setShift(v as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-muted h-12 rounded-xl p-1">
                        <TabsTrigger value="day" className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest rounded-lg">
                          <Sun className="w-3.5 h-3.5" /> Day
                        </TabsTrigger>
                        <TabsTrigger value="night" className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest rounded-lg">
                          <Moon className="w-3.5 h-3.5" /> Night
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg shadow-primary/20"
                    onClick={() => handleLogin('cashier')}
                  >
                    Enter Workspace
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => role.id === 'cashier' ? handleSelectRole(role.id) : handleLogin(role.id)}
                  className="mt-2 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-primary group-hover:translate-x-1 transition-transform text-left"
                >
                  {role.id === 'cashier' ? 'Configure Shift ->' : 'Enter Dashboard ->'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="p-8 border-t text-center text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black opacity-40">
        (C) 2024 Authorized Personnel Only | Security Monitored
      </footer>
    </div>
  );
}
