
"use client";

import Image from "next/image";
import Link from "next/link";
import { Role } from "./lib/mock-data";
import { ShieldCheck, ShoppingCart, Package, Utensils, Coffee, Hotel } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const ROLES: { id: Role; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'manager', label: 'Hotel Manager', icon: ShieldCheck, color: 'bg-orange-500', desc: 'Full system oversight & analytics' },
  { id: 'inventory', label: 'Inventory Manager', icon: Package, color: 'bg-black', desc: 'Stock control & procurement' },
  { id: 'cashier', label: 'Receptionist / Cashier', icon: ShoppingCart, color: 'bg-orange-600', desc: 'Bookings, payments & shifts' },
  { id: 'kitchen', label: 'Kitchen POS', icon: Utensils, color: 'bg-orange-700', desc: 'Food orders & prep status' },
  { id: 'barista', label: 'Barista POS', icon: Coffee, color: 'bg-orange-400', desc: 'Drink service & beverage sales' },
];

export default function Home() {
  const handleSelectRole = (role: Role) => {
    localStorage.setItem('orangeflow-role', role);
  };

  const logo = PlaceHolderImages.find(img => img.id === 'app-logo');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-2 hover:rotate-0 transition-all duration-500 mb-12 overflow-hidden p-4">
            {logo ? (
              <Image 
                src={logo.imageUrl} 
                alt="Orange Hotel Logo" 
                width={180} 
                height={180} 
                className="object-contain"
                data-ai-hint={logo.imageHint}
              />
            ) : (
              <Hotel className="w-24 h-24 text-primary" />
            )}
          </div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Internal Management & Operations System for <span className="text-primary font-bold">Orange Hotel</span>. 
            Select your role to access your dedicated workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {ROLES.map((role) => (
            <Link
              key={role.id}
              href="/dashboard"
              onClick={() => handleSelectRole(role.id)}
              className="group bg-white border border-border p-8 rounded-2xl shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 text-left flex flex-col"
            >
              <div className={`${role.color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
                <role.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{role.label}</h3>
              <p className="text-sm text-muted-foreground flex-1">
                {role.desc}
              </p>
              <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Enter Dashboard →
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="p-8 border-t text-center text-sm text-muted-foreground">
        © 2024 Orange Hotel Operations. For internal use only. Authorized personnel only.
      </footer>
    </div>
  );
}
