"use client";

import { useEffect, useMemo, useState } from "react";
import { INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Minus, Package, Plus } from "lucide-react";

type InventoryTab = "kitchen" | "barista";
type ItemCategory = "Kitchen" | "Bar";
type KitchenMenuCategory = "breakfast" | "lunch" | "dinner";
type BaristaMenuCategory = "espresso" | "coffee" | "tea" | "cold" | "snacks";

interface KitchenMenuItem {
  id: string;
  name: string;
  price: number;
  category: KitchenMenuCategory;
  prepMinutes: number;
}

interface BaristaMenuItem {
  id: string;
  name: string;
  price: number;
  category: BaristaMenuCategory;
  prepMinutes: number;
}

const STORAGE_ITEMS = "orange-hotel-inventory-items";
const STORAGE_KITCHEN_MENU = "orange-hotel-kitchen-menu";
const STORAGE_BARISTA_MENU = "orange-hotel-barista-menu";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [activeTab, setActiveTab] = useState<InventoryTab>("kitchen");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showCreateMenuForm, setShowCreateMenuForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustMode, setAdjustMode] = useState<"add" | "remove">("add");

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newStock, setNewStock] = useState("0");
  const [newPrice, setNewPrice] = useState("0");
  const [newKitchenCategory, setNewKitchenCategory] = useState<KitchenMenuCategory>("breakfast");
  const [newBaristaCategory, setNewBaristaCategory] = useState<BaristaMenuCategory>("coffee");
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("0");
  const [menuPrepMinutes, setMenuPrepMinutes] = useState("10");
  const [menuKitchenCategory, setMenuKitchenCategory] = useState<KitchenMenuCategory>("breakfast");
  const [menuBaristaCategory, setMenuBaristaCategory] = useState<BaristaMenuCategory>("coffee");

  useEffect(() => {
    const savedItems = localStorage.getItem(STORAGE_ITEMS);
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems) as InventoryItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      } catch {
        setItems(INVENTORY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
  }, [items]);

  const activeCategory: ItemCategory = activeTab === "kitchen" ? "Kitchen" : "Bar";
  const tabItems = useMemo(
    () => items.filter((item) => item.category === activeCategory),
    [items, activeCategory],
  );

  useEffect(() => {
    if (tabItems.length === 0) {
      setSelectedItemId("");
      return;
    }
    const exists = tabItems.some((item) => item.id === selectedItemId);
    if (!exists) {
      setSelectedItemId(tabItems[0].id);
    }
  }, [selectedItemId, tabItems]);

  const adjustStock = (itemId: string, delta: number) => {
    if (delta === 0) return;
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const nextStock = Math.max(0, item.stock + delta);
        return { ...item, stock: nextStock };
      }),
    );
  };

  const runAdjustment = () => {
    const qty = Number(adjustQty);
    if (selectedItemId.length === 0 || Number.isNaN(qty) || qty <= 0) return;
    if (!window.confirm("Apply this stock adjustment?")) return;
    const signedQty = adjustMode === "add" ? qty : -qty;
    adjustStock(selectedItemId, signedQty);
    setAdjustQty("1");
  };

  const addNewItem = () => {
    const stock = Number(newStock);
    const price = Number(newPrice);
    if (
      newName.trim().length === 0 ||
      Number.isNaN(stock) ||
      stock < 0 ||
      Number.isNaN(price) ||
      price <= 0 ||
      newUnit.trim().length === 0
    ) {
      return;
    }
    if (!window.confirm("Add this item and sync it to POS menu?")) return;

    const newItem: InventoryItem = {
      id: `i-${Date.now()}`,
      name: newName.trim(),
      category: activeCategory,
      stock,
      minStock: 1,
      unit: newUnit.trim(),
      price,
    };

    setItems((current) => [newItem, ...current]);
    setSelectedItemId(newItem.id);

    if (activeTab === "kitchen") {
      const menuItem: KitchenMenuItem = {
        id: `km-${Date.now()}`,
        name: newName.trim(),
        price,
        category: newKitchenCategory,
        prepMinutes: 10,
      };
      const raw = localStorage.getItem(STORAGE_KITCHEN_MENU);
      const parsed = raw ? (JSON.parse(raw) as KitchenMenuItem[]) : [];
      localStorage.setItem(STORAGE_KITCHEN_MENU, JSON.stringify([menuItem, ...parsed]));
    } else {
      const menuItem: BaristaMenuItem = {
        id: `bm-${Date.now()}`,
        name: newName.trim(),
        price,
        category: newBaristaCategory,
        prepMinutes: 3,
      };
      const raw = localStorage.getItem(STORAGE_BARISTA_MENU);
      const parsed = raw ? (JSON.parse(raw) as BaristaMenuItem[]) : [];
      localStorage.setItem(STORAGE_BARISTA_MENU, JSON.stringify([menuItem, ...parsed]));
    }

    setNewName("");
    setNewStock("0");
    setNewPrice("0");
    setNewUnit("pcs");
    setNewKitchenCategory("breakfast");
    setNewBaristaCategory("coffee");
    setShowAddForm(false);
  };

  const createMenuItem = () => {
    const price = Number(menuPrice);
    const prepMinutes = Number(menuPrepMinutes);
    if (
      menuName.trim().length === 0 ||
      Number.isNaN(price) ||
      price <= 0 ||
      Number.isNaN(prepMinutes) ||
      prepMinutes <= 0
    ) {
      return;
    }
    if (!window.confirm("Create this menu item and sync to POS?")) return;

    if (activeTab === "kitchen") {
      const menuItem: KitchenMenuItem = {
        id: `km-${Date.now()}`,
        name: menuName.trim(),
        price,
        category: menuKitchenCategory,
        prepMinutes,
      };
      const raw = localStorage.getItem(STORAGE_KITCHEN_MENU);
      const parsed = raw ? (JSON.parse(raw) as KitchenMenuItem[]) : [];
      localStorage.setItem(STORAGE_KITCHEN_MENU, JSON.stringify([menuItem, ...parsed]));
    } else {
      const menuItem: BaristaMenuItem = {
        id: `bm-${Date.now()}`,
        name: menuName.trim(),
        price,
        category: menuBaristaCategory,
        prepMinutes,
      };
      const raw = localStorage.getItem(STORAGE_BARISTA_MENU);
      const parsed = raw ? (JSON.parse(raw) as BaristaMenuItem[]) : [];
      localStorage.setItem(STORAGE_BARISTA_MENU, JSON.stringify([menuItem, ...parsed]));
    }

    setMenuName("");
    setMenuPrice("0");
    setMenuPrepMinutes(activeTab === "kitchen" ? "10" : "3");
    setMenuKitchenCategory("breakfast");
    setMenuBaristaCategory("coffee");
    setShowCreateMenuForm(false);
  };

  const getStockLabel = (item: InventoryItem) => {
    if (item.stock <= 0) return "Out";
    if (item.stock < item.minStock) return "Low";
    return "In Stock";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            Kitchen and barista stock control
          </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)}>
        <TabsList className="h-11">
          <TabsTrigger value="kitchen" className="font-black uppercase text-[10px] tracking-widest">
            Kitchen
          </TabsTrigger>
          <TabsTrigger value="barista" className="font-black uppercase text-[10px] tracking-widest">
            Barista
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg uppercase font-black">
              {activeTab === "kitchen" ? "Kitchen Inventory" : "Barista Inventory"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell className="font-bold">
                      {item.stock} {item.unit}
                    </TableCell>
                    <TableCell className="font-black uppercase text-[10px] tracking-widest">
                      {getStockLabel(item)}
                    </TableCell>
                  </TableRow>
                ))}
                {tabItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      No items in this section
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            <Button
              className="h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setShowAddForm((current) => !current);
                setShowAdjustForm(false);
                setShowCreateMenuForm(false);
              }}
            >
              <Package className="w-4 h-4 mr-2" /> Add Item
            </Button>
            <Button
              variant="outline"
              className="h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setShowCreateMenuForm((current) => !current);
                setShowAddForm(false);
                setShowAdjustForm(false);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Menu
            </Button>
            <Button
              variant="outline"
              className="h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setShowAdjustForm((current) => !current);
                setShowAddForm(false);
                setShowCreateMenuForm(false);
              }}
            >
              <Minus className="w-4 h-4 mr-2" /> Adjust Stock
            </Button>
          </div>

          {showAddForm && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 uppercase font-black">
                  <Plus className="w-5 h-5 text-primary" /> Add {activeTab === "kitchen" ? "Kitchen" : "Barista"} Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Item name" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" value={newStock} onChange={(event) => setNewStock(event.target.value)} placeholder="Quantity" />
                  <Input type="number" min="1" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} placeholder="Price (TZS)" />
                </div>
                <Input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} placeholder="Unit (kg/L/pcs)" />
                {activeTab === "kitchen" ? (
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newKitchenCategory}
                    onChange={(event) => setNewKitchenCategory(event.target.value as KitchenMenuCategory)}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                ) : (
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newBaristaCategory}
                    onChange={(event) => setNewBaristaCategory(event.target.value as BaristaMenuCategory)}
                  >
                    <option value="espresso">Espresso</option>
                    <option value="coffee">Coffee</option>
                    <option value="tea">Tea</option>
                    <option value="cold">Cold</option>
                    <option value="snacks">Snacks</option>
                  </select>
                )}
                <Button className="w-full bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-11" onClick={addNewItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </CardContent>
            </Card>
          )}

          {showCreateMenuForm && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 uppercase font-black">
                  <Plus className="w-5 h-5 text-primary" /> Create {activeTab === "kitchen" ? "Kitchen" : "Barista"} Menu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={menuName} onChange={(event) => setMenuName(event.target.value)} placeholder="Menu item name" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="1" value={menuPrice} onChange={(event) => setMenuPrice(event.target.value)} placeholder="Price (TZS)" />
                  <Input type="number" min="1" value={menuPrepMinutes} onChange={(event) => setMenuPrepMinutes(event.target.value)} placeholder="Prep (min)" />
                </div>
                {activeTab === "kitchen" ? (
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={menuKitchenCategory}
                    onChange={(event) => setMenuKitchenCategory(event.target.value as KitchenMenuCategory)}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                ) : (
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={menuBaristaCategory}
                    onChange={(event) => setMenuBaristaCategory(event.target.value as BaristaMenuCategory)}
                  >
                    <option value="espresso">Espresso</option>
                    <option value="coffee">Coffee</option>
                    <option value="tea">Tea</option>
                    <option value="cold">Cold</option>
                    <option value="snacks">Snacks</option>
                  </select>
                )}
                <Button className="w-full bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-11" onClick={createMenuItem}>
                  <Plus className="w-4 h-4 mr-2" /> Create Menu
                </Button>
              </CardContent>
            </Card>
          )}

          {showAdjustForm && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 uppercase font-black">
                  <Minus className="w-5 h-5 text-primary" /> Adjust Stock
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                >
                  {tabItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Tabs value={adjustMode} onValueChange={(value) => setAdjustMode(value as "add" | "remove")}> 
                  <TabsList className="w-full grid grid-cols-2 h-10">
                    <TabsTrigger value="add" className="text-[10px] font-black uppercase tracking-widest">
                      Add
                    </TabsTrigger>
                    <TabsTrigger value="remove" className="text-[10px] font-black uppercase tracking-widest">
                      Remove
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Input type="number" min="1" value={adjustQty} onChange={(event) => setAdjustQty(event.target.value)} placeholder="Quantity" />
                <Button className="w-full font-black uppercase tracking-widest text-xs h-11" onClick={runAdjustment}>
                  Apply
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
