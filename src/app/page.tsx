"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    if (role === 'cashier') {
      setSelectedRole('cashier');
    } else {
      localStorage.setItem('orange-hotel-role', role);
      localStorage.removeItem('orange-hotel-shift');
    }
  };

  const handleLogin = (role: Role) => {
    localStorage.setItem('orange-hotel-role', role);
    if (role === 'cashier') {
      localStorage.setItem('orange-hotel-shift', shift);
    }
    window.location.href = '/dashboard';
  };

  const logo = PlaceHolderImages.find(img => img.id === 'app-logo');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl transition-all duration-500 mb-4 overflow-hidden p-4">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="Logo" 
                width={180} 
                height={180} 
                className="object-contain"
                data-ai-hint={logo.imageHint}
              />
            )}
          </div>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
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
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{role.label}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-6">
                {role.desc}
              </p>

              {role.id === 'cashier' && selectedRole === 'cashier' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Select Shift</span>
                    <Tabs defaultValue="day" onValueChange={(v) => setShift(v as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-muted h-12">
                        <TabsTrigger value="day" className="flex items-center gap-2">
                          <Sun className="w-4 h-4" /> Day
                        </TabsTrigger>
                        <TabsTrigger value="night" className="flex items-center gap-2">
                          <Moon className="w-4 h-4" /> Night
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                    onClick={() => handleLogin('cashier')}
                  >
                    Enter Workspace
                  </Button>
                </div>
              ) : (
                <Link
                  href={role.id === 'cashier' ? '#' : '/dashboard'}
                  onClick={() => handleSelectRole(role.id)}
                  className="mt-2 flex items-center text-xs font-bold uppercase tracking-wider text-primary group-hover:translate-x-1 transition-transform"
                >
                  {role.id === 'cashier' ? 'Configure Shift →' : 'Enter Dashboard →'}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="p-8 border-t text-center text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
        © 2024 Authorized Personnel Only. Security Monitored.
      </footer>
    </div>
  );
}
