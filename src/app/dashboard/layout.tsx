"use client";

import { useState, useEffect } from 'react';
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Role } from "@/app/lib/mock-data";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

  const allowedByRole: Record<Role, string[]> = {
    manager: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/kitchen', '/dashboard/barista', '/dashboard/staff', '/dashboard/analytics', '/dashboard/settings'],
    inventory: ['/dashboard/inventory'],
    cashier: ['/dashboard/cashier', '/dashboard/rooms'],
    kitchen: ['/dashboard/kitchen'],
    barista: ['/dashboard/barista'],
  };

  const defaultByRole: Record<Role, string> = {
    manager: '/dashboard',
    inventory: '/dashboard/inventory',
    cashier: '/dashboard/cashier',
    kitchen: '/dashboard/kitchen',
    barista: '/dashboard/barista',
  };

  useEffect(() => {
    const savedRole = localStorage.getItem('orange-hotel-role') as Role;
    const savedShift = localStorage.getItem('orange-hotel-shift');
    if (!savedRole) {
      router.replace('/');
      return;
    }

    setRole(savedRole);
    if (savedShift) setShift(savedShift);
    setMounted(true);
  }, [router]);

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
      <SidebarNav role={role} />
      
      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-16 bg-white border-b sticky top-0 z-30 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4 w-1/3">
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
