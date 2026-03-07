"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Coffee, Package, ShieldCheck, ShoppingCart, Sun, Moon, Utensils } from "lucide-react";
import { Role } from "@/app/lib/mock-data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RoleLoginPageProps {
  role: Role;
}

const ROLE_CONFIG: Record<Role, { label: string; description: string; color: string; destination: string; icon: typeof ShieldCheck }> = {
  manager: {
    label: "Hotel Manager",
    description: "Full system oversight and operations control.",
    color: "bg-orange-500",
    destination: "/dashboard",
    icon: ShieldCheck,
  },
  director: {
    label: "Managing Director",
    description: "Executive overview and strategic read-only controls.",
    color: "bg-emerald-700",
    destination: "/dashboard",
    icon: Building2,
  },
  inventory: {
    label: "Inventory Manager",
    description: "Stock control, movements, and procurement management.",
    color: "bg-black",
    destination: "/dashboard/inventory",
    icon: Package,
  },
  cashier: {
    label: "Reception Booking",
    description: "Bookings, guest check-in, and reception payments.",
    color: "bg-orange-600",
    destination: "/dashboard/cashier",
    icon: ShoppingCart,
  },
  kitchen: {
    label: "Kitchen POS",
    description: "Kitchen orders, queue handling, and stock usage.",
    color: "bg-orange-700",
    destination: "/dashboard/kitchen",
    icon: Utensils,
  },
  barista: {
    label: "Barista POS",
    description: "Barista orders, beverage service, and stock usage.",
    color: "bg-orange-400",
    destination: "/dashboard/barista",
    icon: Coffee,
  },
};

export function RoleLoginPage({ role }: RoleLoginPageProps) {
  const router = useRouter();
  const [shift, setShift] = useState<"day" | "night">("day");
  const config = ROLE_CONFIG[role];
  const logo = useMemo(() => PlaceHolderImages.find((img) => img.id === "app-logo"), []);

  const handleLogin = () => {
    localStorage.setItem("orange-hotel-role", role);

    if (role === "cashier") {
      localStorage.setItem("orange-hotel-shift", shift);
    } else {
      localStorage.removeItem("orange-hotel-shift");
    }

    router.push(config.destination);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <div className="w-40 h-40 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-4 overflow-hidden p-4">
            {logo && (
              <Image
                src={logo.imageUrl}
                alt="Orange Hotel Logo"
                width={150}
                height={150}
                className="object-contain"
                data-ai-hint={logo.imageHint}
                priority
              />
            )}
          </div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black opacity-60">
            Authorized Access Only
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white border p-8 rounded-2xl shadow-sm text-left">
            <div className={`${config.color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-black/5`}>
              <config.icon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-2 tracking-tight uppercase">{config.label}</h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6">
              {config.description}
            </p>

            {role === "cashier" && (
              <div className="space-y-3 mb-6">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Select Shift</span>
                <Tabs value={shift} onValueChange={(value) => setShift(value as "day" | "night")} className="w-full">
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
            )}

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg shadow-primary/20"
              onClick={handleLogin}
            >
              Enter Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
