
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Hotel, 
  Package, 
  ShoppingCart, 
  Utensils, 
  Coffee, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@/app/lib/mock-data";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['manager'] },
  { label: 'Rooms', href: '/dashboard/rooms', icon: Hotel, roles: ['manager', 'cashier'] },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Package, roles: ['manager', 'inventory'] },
  { label: 'POS Terminal', href: '/dashboard/cashier', icon: ShoppingCart, roles: ['cashier'] },
  { label: 'Kitchen POS', href: '/dashboard/kitchen', icon: Utensils, roles: ['manager', 'kitchen'] },
  { label: 'Barista POS', href: '/dashboard/barista', icon: Coffee, roles: ['manager', 'barista'] },
  { label: 'Staff', href: '/dashboard/staff', icon: Users, roles: ['manager'] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['manager'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['manager'] },
];

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full bg-secondary text-white border-r border-sidebar-border w-64 fixed left-0 top-0 z-40">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Hotel className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight text-white">
            Orange<span className="text-primary">Flow</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2">
          Menu
        </div>
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent mb-4">
          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
            <img src={`https://picsum.photos/seed/${role}/50/50`} alt="avatar" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
