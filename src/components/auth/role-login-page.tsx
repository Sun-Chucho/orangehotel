"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Coffee, Lock, Package, ShieldCheck, ShoppingCart, Sun, Moon, User, Utensils } from "lucide-react";
import { Role } from "@/app/lib/mock-data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { hydrateStorageKeyFromFirebase, subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import { LoginProfiles, STORAGE_LOGIN_PROFILES } from "@/app/lib/login-profiles";
import { readJson, writeJson } from "@/app/lib/storage";

interface RoleLoginPageProps {
  role: Role;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DEFAULT_PASSWORD = "1234";

const ROLE_CONFIG: Record<Role, { label: string; username: string; description: string; color: string; destination: string; icon: typeof ShieldCheck }> = {
  manager: {
    label: "Hotel Manager",
    username: "manager",
    description: "Full system oversight and operations control.",
    color: "bg-orange-500",
    destination: "/dashboard",
    icon: ShieldCheck,
  },
  director: {
    label: "Managing Director",
    username: "md",
    description: "Executive overview and strategic read-only controls.",
    color: "bg-emerald-700",
    destination: "/dashboard",
    icon: Building2,
  },
  inventory: {
    label: "Inventory Manager",
    username: "inventory",
    description: "Stock control, movements, and procurement management.",
    color: "bg-black",
    destination: "/dashboard/inventory",
    icon: Package,
  },
  cashier: {
    label: "Reception Booking",
    username: "reception",
    description: "Bookings, guest check-in, and reception payments.",
    color: "bg-orange-600",
    destination: "/dashboard/cashier",
    icon: ShoppingCart,
  },
  kitchen: {
    label: "Kitchen POS",
    username: "kitchen",
    description: "Kitchen orders, queue handling, and stock usage.",
    color: "bg-orange-700",
    destination: "/dashboard/kitchen",
    icon: Utensils,
  },
  barista: {
    label: "Barista POS",
    username: "barista",
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
  const [username, setUsername] = useState(config.username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const logo = useMemo(() => PlaceHolderImages.find((img) => img.id === "app-logo"), []);

  useEffect(() => {
    const applyProfiles = () => {
      const profiles = readJson<LoginProfiles>(STORAGE_LOGIN_PROFILES);
      const profile = profiles?.[role];
      if (!profile) return;
      setUsername(profile.username || config.username);
      if (role === "cashier" && (profile.shift === "day" || profile.shift === "night")) {
        setShift(profile.shift);
      }
    };

    applyProfiles();
    void hydrateStorageKeyFromFirebase(STORAGE_LOGIN_PROFILES).then(applyProfiles);
    const unsubscribe = subscribeToSyncedStorageKey<LoginProfiles>(STORAGE_LOGIN_PROFILES, (profiles) => {
      const profile = profiles?.[role];
      if (!profile) return;
      setUsername(profile.username || config.username);
      if (role === "cashier" && (profile.shift === "day" || profile.shift === "night")) {
        setShift(profile.shift);
      }
    });

    return () => unsubscribe();
  }, [config.username, role]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => undefined;
  }, []);

  const handleLogin = () => {
    if (!username.trim() || password !== DEFAULT_PASSWORD) {
      setError("Invalid username or password.");
      return;
    }

    setError("");
    localStorage.setItem("orange-hotel-username", username.trim());
    localStorage.setItem("orange-hotel-role", role);

    if (role === "cashier") {
      localStorage.setItem("orange-hotel-shift", shift);
    } else {
      localStorage.removeItem("orange-hotel-shift");
    }

    const profiles = readJson<LoginProfiles>(STORAGE_LOGIN_PROFILES) ?? {};
    writeJson(STORAGE_LOGIN_PROFILES, {
      ...profiles,
      [role]: {
        username: username.trim(),
        shift: role === "cashier" ? shift : undefined,
        updatedAt: Date.now(),
      },
    });

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

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Username</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="pl-10 h-12"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10 h-12"
                    placeholder="Enter password"
                  />
                </div>
              </div>
            </div>

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

            <div className="mb-6 rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Synced Default Username: {config.username}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                Default Password: {DEFAULT_PASSWORD}
              </p>
            </div>

            <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                Install This {config.label}
              </p>
              <p className="mt-1 text-xs font-medium text-orange-900">
                Use your browser app dropdown or install menu to install this role with the app icon.
              </p>
            </div>

            {error && (
              <p className="mb-4 text-xs font-bold text-red-600">{error}</p>
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
