"use client";

import { useState, useEffect } from 'react';
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Role } from "@/app/lib/mock-data";
import { hydrateDefaultAppStateFromFirebase } from "@/app/lib/firebase-sync";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Clock, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VALID_ROLES: Role[] = ['manager', 'director', 'inventory', 'cashier', 'kitchen', 'barista'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>('manager');
  const [shift, setShift] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allowedByRole: Record<Role, string[]> = {
    manager: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/inventory/stock-movement', '/dashboard/menu-create', '/dashboard/company-stock', '/dashboard/fnb-suite', '/dashboard/cashier', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/settings'],
    director: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/inventory/stock-movement', '/dashboard/menu-create', '/dashboard/company-stock', '/dashboard/fnb-suite', '/dashboard/fnb-pos', '/dashboard/cashier', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/analytics', '/dashboard/settings'],
    inventory: ['/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/inventory/stock-movement', '/dashboard/company-stock'],
    cashier: ['/dashboard/cashier', '/dashboard/payments', '/dashboard/rooms'],
    kitchen: ['/dashboard/fnb-pos', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/payments'],
    barista: ['/dashboard/fnb-pos', '/dashboard/barista', '/dashboard/payments', '/dashboard/cancelled'],
  };

  const defaultByRole: Record<Role, string> = {
    manager: '/dashboard',
    director: '/dashboard',
    inventory: '/dashboard/inventory',
    cashier: '/dashboard/cashier',
    kitchen: '/dashboard/kitchen',
    barista: '/dashboard/barista',
  };

  useEffect(() => {
    let active = true;

    async function initializeDashboard() {
      const savedRole = localStorage.getItem('orange-hotel-role');
      const savedShift = localStorage.getItem('orange-hotel-shift');
      if (!savedRole || !VALID_ROLES.includes(savedRole as Role)) {
        localStorage.removeItem('orange-hotel-role');
        localStorage.removeItem('orange-hotel-shift');
        router.replace('/');
        return;
      }

      await hydrateDefaultAppStateFromFirebase();
      if (!active) return;

      setRole(savedRole as Role);
      if (savedShift) setShift(savedShift);
      setMounted(true);

      if (typeof window !== "undefined") {
        setSidebarOpen(window.innerWidth >= 768);
      }
    }

    void initializeDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    const onSidebarClose = () => setSidebarOpen(false);

    window.addEventListener("resize", onResize);
    window.addEventListener("orange-hotel-sidebar-close", onSidebarClose as EventListener);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orange-hotel-sidebar-close", onSidebarClose as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const allowedRoutes = allowedByRole[role];
    if (!allowedRoutes.includes(pathname)) {
      router.replace(defaultByRole[role]);
    }
  }, [mounted, pathname, role, router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarNav role={role} />
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}
      
      <div className={cn("flex-1 flex flex-col transition-[margin] duration-300", sidebarOpen ? "md:ml-64" : "md:ml-0")}>
        <header className="h-16 bg-white border-b sticky top-0 z-30 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-1/3">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Toggle sidebar"
              className="h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-10 h-9 bg-muted/50 border-none focus-visible:ring-primary text-sm" 
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {shift && (
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary text-primary px-2">
                <Clock className="w-3 h-3 mr-1" /> {shift}
              </Badge>
            )}
            
            <div className="flex items-center gap-4 text-muted-foreground">
              <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-white" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 border-l pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black leading-none uppercase tracking-tight">{role}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Active Session</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
