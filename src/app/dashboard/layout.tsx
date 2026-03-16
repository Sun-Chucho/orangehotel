"use client";

import { useState, useEffect } from 'react';
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { STORAGE_COMPANY_STOCK } from "@/app/lib/company-stock";
import { COMPANY_STOCK_SHEET } from "@/app/lib/company-stock-seed";
import { BARISTA_INVENTORY_SEED } from "@/app/lib/seed-barista-data";
import { InventoryItem, Role } from "@/app/lib/mock-data";
import { MainStoreItem, STORAGE_MAIN_STORE_ITEMS, getStoreItemLabel, normalizeStockName } from "@/app/lib/inventory-transfer";
import { getTotLimit } from "@/app/lib/barista-stock";
import { normalizeRole } from "@/app/lib/auth";
import { hydrateDefaultAppStateFromFirebase } from "@/app/lib/firebase-sync";
import { readJson, readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE, writeJson, writePosState } from "@/app/lib/storage";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User, Clock, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { readLocalLoginProfiles, renameProfileUser, saveLoginProfileToServer, writeLocalLoginProfiles } from "@/app/lib/login-profiles";

const VALID_ROLES: Role[] = ['manager', 'director', 'inventory', 'cashier', 'kitchen', 'barista'];
const KITCHEN_TRANSACTIONS_RESET_KEY = "orange-hotel-kitchen-transactions-reset-v2";
const DOMPO_STOCK_FIX_KEY = "orange-hotel-dompo-750ml-stock-fix-v1";
const BARISTA_STOCK_FIX_KEY = "orange-hotel-barista-stock-fix-v4";
const BARISTA_FINANCE_PRICE_FIX_KEY = "orange-hotel-barista-finance-price-fix-v1";
const BARISTA_SHARED_STATE_FIX_KEY = "orange-hotel-barista-shared-state-fix-v1";
const COMPANY_STOCK_SHEET_FIX_KEY = "orange-hotel-company-stock-sheet-fix-v1";

function resolveBarInventorySellingPrice(
  inventoryItems: InventoryItem[],
  storeItem: Pick<MainStoreItem, "name" | "size">,
) {
  const storeTargets = [
    normalizeStockName(storeItem.name),
    normalizeStockName(getStoreItemLabel(storeItem)),
  ];

  const inventoryMatch = inventoryItems.find((item) => {
    if (item.category !== "Bar") return false;
    const inventoryTargets = [
      normalizeStockName(item.name),
      normalizeStockName(item.size ? `${item.name} ${item.size}` : item.name),
    ];

    return storeTargets.some((target) => inventoryTargets.includes(target));
  });

  if (typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0) {
    return inventoryMatch.sellingPrice;
  }

  if (typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0) {
    return inventoryMatch.price;
  }

  return 0;
}

function normalizeBaristaMenuTarget(value: string) {
  return normalizeStockName(value.replace(/\s+TOTS?$/i, "").trim());
}

function getBaristaInventoryLabel(item: Pick<InventoryItem, "name" | "size">) {
  const rawName = item.name.trim();
  const isTotItem = /\s+TOTS?$/i.test(rawName);
  const baseName = rawName.replace(/\s+TOTS?$/i, "").trim();
  const size = item.size?.trim() ?? "";

  if (!size) return isTotItem ? `${baseName} TOTS` : baseName;
  if (rawName.toLowerCase().includes(size.toLowerCase())) return rawName;
  return isTotItem ? `${baseName} ${size} TOTS`.trim() : `${baseName} ${size}`.trim();
}

function syncBaristaMenuItemsWithSharedData(
  menuItems: Array<{ id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>,
  inventoryItems: InventoryItem[],
  storeItems: MainStoreItem[],
) {
  const inventoryMenuItems = inventoryItems
    .filter((item) => (item.category ?? "").toLowerCase() !== "kitchen")
    .map((item) => ({
      id: item.id,
      name: getBaristaInventoryLabel(item),
      price:
        typeof item.sellingPrice === "number" && item.sellingPrice > 0
          ? item.sellingPrice
          : typeof item.price === "number" && item.price > 0
            ? item.price
            : 0,
      category: item.category,
      prepMinutes: 2,
      barcode: item.barcode || "",
    }));

  const syncedItems = menuItems.map((item) => {
    const target = normalizeBaristaMenuTarget(item.name);
    const inventoryMatch = inventoryItems.find((entry) => {
      const entryTargets = [
        normalizeBaristaMenuTarget(entry.name),
        normalizeBaristaMenuTarget(getBaristaInventoryLabel(entry)),
      ];
      return entryTargets.includes(target);
    });
    const storeMatch = storeItems.find((entry) => normalizeBaristaMenuTarget(getStoreItemLabel(entry)) === target);

    if (!inventoryMatch && !storeMatch) {
      return item;
    }

    const nextName = storeMatch
      ? getTotLimit(storeMatch) > 0
        ? `${getStoreItemLabel(storeMatch)} TOTS`
        : getStoreItemLabel(storeMatch)
      : inventoryMatch
        ? getBaristaInventoryLabel(inventoryMatch)
        : item.name;
    const nextPrice =
      typeof inventoryMatch?.sellingPrice === "number" && inventoryMatch.sellingPrice > 0
        ? inventoryMatch.sellingPrice
        : typeof inventoryMatch?.price === "number" && inventoryMatch.price > 0
          ? inventoryMatch.price
          : item.price;
    const nextBarcode = inventoryMatch?.barcode || item.barcode;

    if (nextName === item.name && nextPrice === item.price && nextBarcode === item.barcode) {
      return item;
    }

    return {
      ...item,
      name: nextName,
      price: nextPrice,
      barcode: nextBarcode,
    };
  });

  const existingTargets = new Set(syncedItems.map((item) => normalizeBaristaMenuTarget(item.name)));
  const missingInventoryMenuItems = inventoryMenuItems.filter(
    (item) => !existingTargets.has(normalizeBaristaMenuTarget(item.name)),
  );

  return [...syncedItems, ...missingInventoryMenuItems];
}

function applyBusinessCorrections() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(KITCHEN_TRANSACTIONS_RESET_KEY)) {
    const kitchenSnapshot = readPosState<unknown, unknown, unknown>(
      STORAGE_KITCHEN_STATE,
      "orange-hotel-kitchen-tickets",
      "orange-hotel-kitchen-seq",
      "orange-hotel-kitchen-payments",
      "orange-hotel-kitchen-menu",
      300,
    );
    writePosState(STORAGE_KITCHEN_STATE, [], kitchenSnapshot.ticketSeq, [], kitchenSnapshot.menuItems);
    localStorage.setItem(KITCHEN_TRANSACTIONS_RESET_KEY, "1");
  }

  if (!localStorage.getItem(DOMPO_STOCK_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const dompoSeed = BARISTA_INVENTORY_SEED.find(
      (item) => item.name === "Classic Dompo" && item.size === "750ml",
    );

    if (inventoryItems.length > 0) {
      const dompoIndex = inventoryItems.findIndex(
        (item) => item.name === "Classic Dompo" && item.size === "750ml",
      );

      const nextInventoryItems = [...inventoryItems];
      if (dompoIndex >= 0) {
        nextInventoryItems[dompoIndex] = {
          ...nextInventoryItems[dompoIndex],
          stock: 3,
          minStock: Math.max(nextInventoryItems[dompoIndex].minStock ?? 0, 1),
          unit: nextInventoryItems[dompoIndex].unit || "Bottle",
        };
      } else if (dompoSeed) {
        nextInventoryItems.push({
          id: `inv-${dompoSeed.barcode || "dompo-750ml"}`,
          barcode: dompoSeed.barcode || "",
          name: dompoSeed.name || "Classic Dompo",
          category: dompoSeed.category || "Wine",
          size: dompoSeed.size || "750ml",
          stock: 3,
          buyingPrice: dompoSeed.buyingPrice || 0,
          sellingPrice: dompoSeed.sellingPrice || 20000,
          status: "ACTIVE",
          minStock: 1,
          unit: dompoSeed.unit || "Bottle",
          totSold: dompoSeed.totSold || 0,
          price: dompoSeed.sellingPrice || 20000,
        });
      }

      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    localStorage.setItem(DOMPO_STOCK_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_STOCK_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    if (inventoryItems.length > 0) {
      const stockOverrides: Record<string, number> = {
        "Kilimanjaro Premium Lager|375ml": 13,
        "Safari Lager|330ml": 19,
        "Serengeti Lager|330ml": 20,
        "Serengeti Lemon|300ml": 0,
      };

      const nextInventoryItems = inventoryItems.map((item) => {
        const key = `${item.name}|${item.size ?? ""}`;
        if (!(key in stockOverrides)) return item;
        return {
          ...item,
          stock: stockOverrides[key],
        };
      });

      writeJson("orange-hotel-inventory-items", nextInventoryItems);
    }

    localStorage.setItem(BARISTA_STOCK_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_FINANCE_PRICE_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? [];

    if (inventoryItems.length > 0 && storeItems.length > 0) {
      let hasChanges = false;
      const nextStoreItems = storeItems.map((item) => {
        if (item.lane !== "barista" || (typeof item.sellingPrice === "number" && item.sellingPrice > 0)) {
          return item;
        }

        const sellingPrice = resolveBarInventorySellingPrice(inventoryItems, item);
        if (sellingPrice <= 0) {
          return item;
        }

        hasChanges = true;
        return {
          ...item,
          sellingPrice,
        };
      });

      if (hasChanges) {
        writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
      }
    }

    localStorage.setItem(BARISTA_FINANCE_PRICE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(BARISTA_SHARED_STATE_FIX_KEY)) {
    const inventoryItems = readJson<InventoryItem[]>("orange-hotel-inventory-items") ?? [];
    const storeItems = (readJson<MainStoreItem[]>(STORAGE_MAIN_STORE_ITEMS) ?? []).filter((item) => item.lane === "barista");
    const baristaSnapshot = readPosState<{ id: string }, { id: string }, { id: string; name: string; price: number; category: string; prepMinutes: number; barcode?: string }>(
      STORAGE_BARISTA_STATE,
      "orange-hotel-barista-orders",
      "orange-hotel-barista-seq",
      "orange-hotel-barista-payments",
      "orange-hotel-barista-menu",
      490,
    );

    if (inventoryItems.length > 0 && storeItems.length > 0 && baristaSnapshot.menuItems.length > 0) {
      const nextMenuItems = syncBaristaMenuItemsWithSharedData(baristaSnapshot.menuItems, inventoryItems, storeItems);

      if (JSON.stringify(nextMenuItems) !== JSON.stringify(baristaSnapshot.menuItems)) {
        writePosState(STORAGE_BARISTA_STATE, baristaSnapshot.tickets, baristaSnapshot.ticketSeq, baristaSnapshot.payments, nextMenuItems);
      }
    }

    localStorage.setItem(BARISTA_SHARED_STATE_FIX_KEY, "1");
  }

  if (!localStorage.getItem(COMPANY_STOCK_SHEET_FIX_KEY)) {
    writeJson(STORAGE_COMPANY_STOCK, COMPANY_STOCK_SHEET);
    localStorage.setItem(COMPANY_STOCK_SHEET_FIX_KEY, "1");
  }
}

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
  const [activeUsername, setActiveUsername] = useState("");
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  const allowedByRole: Record<Role, string[]> = {
    manager: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/menu-create', '/dashboard/company-stock', '/dashboard/cashier', '/dashboard/website-bookings', '/dashboard/live-chat', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/settings', '/dashboard/settings/sync'],
    director: ['/dashboard', '/dashboard/rooms', '/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/menu-create', '/dashboard/company-stock', '/dashboard/fnb-suite', '/dashboard/fnb-pos', '/dashboard/cashier', '/dashboard/website-bookings', '/dashboard/live-chat', '/dashboard/payments', '/dashboard/kitchen', '/dashboard/cancelled', '/dashboard/barista', '/dashboard/staff', '/dashboard/analytics', '/dashboard/settings', '/dashboard/settings/sync'],
    inventory: ['/dashboard/inventory', '/dashboard/inventory/kitchen-stock', '/dashboard/inventory/barista-stock', '/dashboard/company-stock'],
    cashier: ['/dashboard/cashier', '/dashboard/website-bookings', '/dashboard/live-chat', '/dashboard/payments', '/dashboard/rooms'],
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
    async function initializeDashboard() {
      const savedRole = normalizeRole(localStorage.getItem('orange-hotel-role'));
      const savedShift = localStorage.getItem('orange-hotel-shift');
      if (!savedRole || !VALID_ROLES.includes(savedRole)) {
        localStorage.removeItem('orange-hotel-role');
        localStorage.removeItem('orange-hotel-shift');
        router.replace('/');
        return;
      }

      localStorage.setItem("orange-hotel-role", savedRole);
      setActiveUsername(localStorage.getItem("orange-hotel-username") ?? savedRole);
      setRole(savedRole);
      if (savedShift) setShift(savedShift);

      try {
        await hydrateDefaultAppStateFromFirebase();
        applyBusinessCorrections();
      } catch (error) {
        console.error("Dashboard hydration failed", error);
      } finally {
        if (typeof window !== "undefined") {
          setSidebarOpen(window.innerWidth >= 768);
        }
        setMounted(true);
      }
    }

    void initializeDashboard();
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

  const saveUsername = async () => {
    const nextUsername = usernameDraft.trim();
    const previousUsername = activeUsername.trim();
    if (!nextUsername || !previousUsername) return;

    setUsernameSaving(true);
    try {
      const profiles = readLocalLoginProfiles() ?? {};
      const currentProfile = profiles[role] ?? {
        username: previousUsername,
        updatedAt: Date.now(),
        users: [],
      };
      const nextProfile = renameProfileUser(currentProfile, previousUsername, nextUsername);
      const nextProfiles = {
        ...profiles,
        [role]: nextProfile,
      };

      writeLocalLoginProfiles(nextProfiles);
      localStorage.setItem("orange-hotel-username", nextUsername);
      setActiveUsername(nextUsername);
      setUsernameDialogOpen(false);
      await saveLoginProfileToServer(role, nextProfile);
    } finally {
      setUsernameSaving(false);
    }
  };

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
              <SyncStatusIndicator />
              <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-white" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 border-l pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">{activeUsername || role}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Username</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black leading-none uppercase tracking-tight">{role}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Active Session</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg">
                <User className="w-5 h-5" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  setUsernameDraft(activeUsername || role);
                  setUsernameDialogOpen(true);
                }}
              >
                Change Username
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>

      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Change Username</DialogTitle>
            <DialogDescription>Update the username for the current logged-in account.</DialogDescription>
          </DialogHeader>
          <Input
            value={usernameDraft}
            onChange={(event) => setUsernameDraft(event.target.value)}
            placeholder="Enter new username"
            className="h-11"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsernameDialogOpen(false)} disabled={usernameSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveUsername()} disabled={!usernameDraft.trim() || usernameSaving}>
              {usernameSaving ? "Saving..." : "Update Username"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
