"use client";

import { useEffect, useMemo, useState } from "react";
import { INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Minus,
  Package,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";

type StockFilter = "all" | "healthy" | "low" | "out";
type CategoryFilter = "all" | InventoryItem["category"];
type AdjustmentMode = "restock" | "consume";

interface InventoryLog {
  id: string;
  createdAt: number;
  itemId: string;
  itemName: string;
  delta: number;
  note: string;
}

const STORAGE_ITEMS = "orange-hotel-inventory-items";
const STORAGE_LOGS = "orange-hotel-inventory-logs";

function formatAgo(timestamp: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [selectedItemId, setSelectedItemId] = useState(INVENTORY[0]?.id ?? "");
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>("restock");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustNote, setAdjustNote] = useState("Manual update");

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<InventoryItem["category"]>("General");
  const [newStock, setNewStock] = useState("0");
  const [newMinStock, setNewMinStock] = useState("1");
  const [newUnit, setNewUnit] = useState("pcs");

  useEffect(() => {
    const savedItems = localStorage.getItem(STORAGE_ITEMS);
    const savedLogs = localStorage.getItem(STORAGE_LOGS);

    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems) as InventoryItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setSelectedItemId(parsed[0].id);
        }
      } catch {
        setItems(INVENTORY);
      }
    }

    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs) as InventoryLog[];
        if (Array.isArray(parsed)) {
          setLogs(parsed);
        }
      } catch {
        setLogs([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
  }, [logs]);

  const lowStockItems = useMemo(() => items.filter((item) => item.stock < item.minStock && item.stock > 0), [items]);
  const outOfStockItems = useMemo(() => items.filter((item) => item.stock <= 0), [items]);

  const filteredInventory = useMemo(() => {
    return items.filter((item) => {
      const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const inCategory = categoryFilter === "all" || item.category === categoryFilter;
      const inStock =
        stockFilter === "all" ||
        (stockFilter === "healthy" && item.stock >= item.minStock) ||
        (stockFilter === "low" && item.stock < item.minStock && item.stock > 0) ||
        (stockFilter === "out" && item.stock <= 0);
      return inSearch && inCategory && inStock;
    });
  }, [items, searchTerm, categoryFilter, stockFilter]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId), [items, selectedItemId]);

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10), [logs]);

  const stockValue = useMemo(() => items.reduce((sum, item) => sum + item.stock, 0), [items]);

  const addLog = (item: InventoryItem, delta: number, note: string) => {
    const entry: InventoryLog = {
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      itemId: item.id,
      itemName: item.name,
      delta,
      note,
    };
    setLogs((current) => [entry, ...current]);
  };

  const adjustStock = (itemId: string, delta: number, note: string) => {
    if (delta === 0) return;

    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const nextStock = Math.max(0, item.stock + delta);
        const appliedDelta = nextStock - item.stock;
        if (appliedDelta !== 0) {
          addLog(item, appliedDelta, note);
        }
        return { ...item, stock: nextStock };
      }),
    );
  };

  const runQuickAdjustment = () => {
    const qty = Number(adjustQty);
    if (!selectedItem || Number.isNaN(qty) || qty <= 0) return;

    const sign = adjustmentMode === "restock" ? 1 : -1;
    adjustStock(selectedItem.id, sign * qty, adjustNote.trim() || "Manual adjustment");
    setAdjustQty("1");
  };

  const addNewItem = () => {
    const stock = Number(newStock);
    const minStock = Number(newMinStock);

    if (newName.trim().length === 0 || Number.isNaN(stock) || Number.isNaN(minStock) || minStock < 0 || stock < 0 || newUnit.trim().length === 0) {
      return;
    }

    const newItem: InventoryItem = {
      id: `i-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      stock,
      minStock,
      unit: newUnit.trim(),
    };

    setItems((current) => [newItem, ...current]);
    setSelectedItemId(newItem.id);
    addLog(newItem, stock, "New inventory item added");

    setNewName("");
    setNewCategory("General");
    setNewStock("0");
    setNewMinStock("1");
    setNewUnit("pcs");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Stock visibility, replenishment, and audit tracking</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest border-primary text-primary">
            {items.length} Items
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {lowStockItems.length} Low
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {outOfStockItems.length} Out
          </Badge>
          <Badge variant="outline" className="h-10 px-4 justify-center font-black uppercase text-[10px] tracking-widest bg-white">
            {stockValue} Units
          </Badge>
        </div>
      </header>

      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <Card className="bg-destructive/5 border-destructive/20 shadow-none">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-destructive">Critical Stock Warning</h3>
                <p className="text-sm text-destructive/80 font-medium">
                  {lowStockItems.length} low stock and {outOfStockItems.length} out-of-stock items need action.
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="font-bold" onClick={() => setStockFilter("low")}>
              Focus Low Stock
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b space-y-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-10" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                <TabsList className="h-10">
                  <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                  <TabsTrigger value="Kitchen" className="text-[10px] font-black uppercase tracking-widest">Kitchen</TabsTrigger>
                  <TabsTrigger value="Bar" className="text-[10px] font-black uppercase tracking-widest">Bar</TabsTrigger>
                  <TabsTrigger value="General" className="text-[10px] font-black uppercase tracking-widest">General</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
                <TabsList className="h-10">
                  <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                  <TabsTrigger value="healthy" className="text-[10px] font-black uppercase tracking-widest">Healthy</TabsTrigger>
                  <TabsTrigger value="low" className="text-[10px] font-black uppercase tracking-widest">Low</TabsTrigger>
                  <TabsTrigger value="out" className="text-[10px] font-black uppercase tracking-widest">Out</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Level</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Quick Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const stockRatio = item.minStock === 0 ? 100 : (item.stock / (item.minStock * 2)) * 100;
                  const isOut = item.stock <= 0;
                  const isLow = item.stock < item.minStock && !isOut;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isOut ? "text-destructive font-black" : isLow ? "text-orange-600 font-black" : "font-bold"}>
                          {item.stock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="w-[160px]">
                        <div className="space-y-1">
                          <Progress value={Math.min(stockRatio, 100)} className={isOut ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"} />
                          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Min: {item.minStock} {item.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" className="font-bold" onClick={() => adjustStock(item.id, 1, "Quick restock (+1)")}>
                          <Plus className="w-3 h-3 mr-1" /> +1
                        </Button>
                        <Button variant="outline" size="sm" className="font-bold" onClick={() => adjustStock(item.id, -1, "Quick usage (-1)")}>
                          <Minus className="w-3 h-3 mr-1" /> -1
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 uppercase font-black">
                <ArrowUp className="w-5 h-5 text-primary" /> Stock Adjustment
              </CardTitle>
              <CardDescription>Restock or consume selected inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Item</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <Tabs value={adjustmentMode} onValueChange={(value) => setAdjustmentMode(value as AdjustmentMode)}>
                <TabsList className="w-full grid grid-cols-2 h-10">
                  <TabsTrigger value="restock" className="text-[10px] font-black uppercase tracking-widest">Restock</TabsTrigger>
                  <TabsTrigger value="consume" className="text-[10px] font-black uppercase tracking-widest">Consume</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Quantity</label>
                <Input type="number" min="1" value={adjustQty} onChange={(event) => setAdjustQty(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Note</label>
                <Input value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} placeholder="Shipment #, usage reason, etc." />
              </div>

              <Button className="w-full bg-primary font-black uppercase tracking-widest text-xs h-11" onClick={runQuickAdjustment}>
                {adjustmentMode === "restock" ? <ArrowDown className="w-4 h-4 mr-2" /> : <ArrowUp className="w-4 h-4 mr-2" />}
                Apply Adjustment
              </Button>

              {selectedItem && (
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Current: {selectedItem.stock} {selectedItem.unit}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 uppercase font-black">
                <Package className="w-5 h-5 text-primary" /> Add New Item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Item name" />

              <div className="grid grid-cols-2 gap-2">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newCategory} onChange={(event) => setNewCategory(event.target.value as InventoryItem["category"])}>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bar">Bar</option>
                  <option value="General">General</option>
                </select>
                <Input value={newUnit} onChange={(event) => setNewUnit(event.target.value)} placeholder="Unit (kg/L/pcs)" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" value={newStock} onChange={(event) => setNewStock(event.target.value)} placeholder="Initial stock" />
                <Input type="number" min="0" value={newMinStock} onChange={(event) => setNewMinStock(event.target.value)} placeholder="Min stock" />
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-11" onClick={addNewItem}>
                <Plus className="w-4 h-4 mr-2" /> Add Inventory Item
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg uppercase font-black flex items-center gap-2">
                <TriangleAlert className="w-5 h-5 text-primary" /> Recent Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-xl bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm leading-tight">{log.itemName}</p>
                    <span className={log.delta > 0 ? "text-green-600 font-black text-xs" : "text-orange-600 font-black text-xs"}>
                      {log.delta > 0 ? `+${log.delta}` : log.delta}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{log.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatAgo(log.createdAt)}</p>
                </div>
              ))}

              {sortedLogs.length === 0 && (
                <div className="py-8 text-center opacity-40">
                  <p className="font-black uppercase tracking-widest text-xs">No activity yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
