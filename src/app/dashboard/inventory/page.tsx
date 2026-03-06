"use client";

import { useEffect, useMemo, useState } from "react";
import { INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import {
  MainStoreItem,
  STORAGE_INVENTORY_ITEMS,
  STORAGE_MAIN_STORE_ITEMS,
  STORAGE_STORE_MOVEMENTS,
  StoreLane,
  StoreMovementLog,
  TransferDestination,
} from "@/app/lib/inventory-transfer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";

type InventoryTab = "stock" | "kitchen" | "barista";
type ItemCategory = "Kitchen" | "Bar";

function getStockLabel(stock: number, minStock: number) {
  if (stock <= 0) return "Out";
  if (stock < minStock) return "Low";
  return "In Stock";
}

export default function InventoryPage() {
  const isDirector = useIsDirector();
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [movementLogs, setMovementLogs] = useState<StoreMovementLog[]>([]);

  const [kitchenName, setKitchenName] = useState("");
  const [kitchenQty, setKitchenQty] = useState("0");
  const [kitchenUnit, setKitchenUnit] = useState("kg");
  const [baristaName, setBaristaName] = useState("");
  const [baristaQty, setBaristaQty] = useState("0");
  const [baristaUnit, setBaristaUnit] = useState("kg");

  const [selectedStoreItemId, setSelectedStoreItemId] = useState("");
  const [moveDestination, setMoveDestination] = useState<TransferDestination>("kitchen");
  const [moveQty, setMoveQty] = useState("1");
  const [conversionValue, setConversionValue] = useState("1");

  useEffect(() => {
    const inv = localStorage.getItem(STORAGE_INVENTORY_ITEMS);
    const store = localStorage.getItem(STORAGE_MAIN_STORE_ITEMS);
    const moves = localStorage.getItem(STORAGE_STORE_MOVEMENTS);
    if (inv) {
      try {
        const parsed = JSON.parse(inv) as InventoryItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {}
    }
    if (store) {
      try {
        const parsed = JSON.parse(store) as Array<MainStoreItem & { lane?: StoreLane }>;
        if (Array.isArray(parsed)) {
          setStoreItems(parsed.map((i) => ({ ...i, lane: i.lane === "barista" ? "barista" : "kitchen" })));
        }
      } catch {}
    }
    if (moves) {
      try {
        const parsed = JSON.parse(moves) as StoreMovementLog[];
        if (Array.isArray(parsed)) setMovementLogs(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_INVENTORY_ITEMS, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem(STORAGE_MAIN_STORE_ITEMS, JSON.stringify(storeItems)), [storeItems]);
  useEffect(() => localStorage.setItem(STORAGE_STORE_MOVEMENTS, JSON.stringify(movementLogs)), [movementLogs]);

  const kitchenStore = useMemo(() => storeItems.filter((i) => i.lane === "kitchen"), [storeItems]);
  const baristaStore = useMemo(() => storeItems.filter((i) => i.lane === "barista"), [storeItems]);
  const selectedStoreItem = useMemo(() => storeItems.find((i) => i.id === selectedStoreItemId), [storeItems, selectedStoreItemId]);
  const currentLaneItems = useMemo(
    () => items.filter((i) => i.category === (activeTab === "kitchen" ? "Kitchen" : "Bar")),
    [items, activeTab],
  );

  const addStoreItem = (lane: StoreLane) => {
    if (isDirector) return;
    const name = lane === "kitchen" ? kitchenName : baristaName;
    const qtyRaw = lane === "kitchen" ? kitchenQty : baristaQty;
    const unit = lane === "kitchen" ? kitchenUnit : baristaUnit;
    const qty = Number(qtyRaw);
    if (!name.trim() || Number.isNaN(qty) || qty < 0 || !unit.trim()) return;

    setStoreItems((prev) => [{ id: `s-${Date.now()}`, name: name.trim(), stock: qty, unit, minStock: 1, lane }, ...prev]);

    if (lane === "kitchen") {
      setKitchenName("");
      setKitchenQty("0");
      setKitchenUnit("kg");
      return;
    }

    setBaristaName("");
    setBaristaQty("0");
    setBaristaUnit("kg");
  };

  const moveFromStore = () => {
    if (isDirector || !selectedStoreItem) return;

    const qty = Number(moveQty);
    const conversion = Number(conversionValue);
    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(conversion) || conversion <= 0 || qty > selectedStoreItem.stock) {
      return;
    }

    const converted = qty * conversion;
    const destinationCategory: ItemCategory = moveDestination === "kitchen" ? "Kitchen" : "Bar";
    const normalized = selectedStoreItem.name.trim().toLowerCase();

    setStoreItems((prev) => prev.map((i) => (i.id === selectedStoreItem.id ? { ...i, stock: i.stock - qty } : i)));

    setItems((prev) => {
      const existing = prev.find((i) => i.category === destinationCategory && i.name.trim().toLowerCase() === normalized);
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, stock: i.stock + converted } : i));
      }
      return [{ id: `i-${Date.now()}`, name: selectedStoreItem.name, category: destinationCategory, stock: converted, minStock: 1, unit: "units", price: 0 }, ...prev];
    });

    setMovementLogs((prev) => [
      {
        id: `mv-${Date.now()}`,
        itemId: selectedStoreItem.id,
        itemName: selectedStoreItem.name,
        source: "store",
        destination: moveDestination,
        storeQtyMoved: qty,
        storeUnit: selectedStoreItem.unit,
        conversionValue: conversion,
        convertedQty: converted,
        movedAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const renderStoreCard = (lane: StoreLane, title: string, list: MainStoreItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            value={lane === "kitchen" ? kitchenName : baristaName}
            onChange={(event) => (lane === "kitchen" ? setKitchenName(event.target.value) : setBaristaName(event.target.value))}
            placeholder="Item name"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenQty : baristaQty}
            onChange={(event) => (lane === "kitchen" ? setKitchenQty(event.target.value) : setBaristaQty(event.target.value))}
            placeholder="Store quantity"
          />
          <Input
            value={lane === "kitchen" ? kitchenUnit : baristaUnit}
            onChange={(event) => (lane === "kitchen" ? setKitchenUnit(event.target.value) : setBaristaUnit(event.target.value))}
            placeholder="Unit"
          />
          <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => addStoreItem(lane)} disabled={isDirector}>
            <Plus className="w-4 h-4 mr-2" /> Add Stock
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    className="h-8 font-black uppercase text-[10px] tracking-widest"
                    onClick={() => {
                      setSelectedStoreItemId(item.id);
                      setMoveDestination(lane);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1" /> Move
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Management</h1>
      </header>

      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Stock and movement analytics (read-only)
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)}>
        <TabsList className="h-11">
          <TabsTrigger value="stock" className="font-black uppercase text-[10px] tracking-widest">Stock</TabsTrigger>
          <TabsTrigger value="kitchen" className="font-black uppercase text-[10px] tracking-widest">Kitchen</TabsTrigger>
          <TabsTrigger value="barista" className="font-black uppercase text-[10px] tracking-widest">Barista</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "stock" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {renderStoreCard("kitchen", "Kitchen Stock", kitchenStore)}
            {renderStoreCard("barista", "Barista Stock", baristaStore)}
          </div>

          {selectedStoreItem && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg uppercase font-black">Move from Store</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2 rounded-md border p-3">
                  <p className="font-black">{selectedStoreItem.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mt-1">
                    Available: {selectedStoreItem.stock} {selectedStoreItem.unit}
                  </p>
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={moveDestination}
                  onChange={(event) => setMoveDestination(event.target.value as TransferDestination)}
                >
                  <option value="kitchen">Kitchen</option>
                  <option value="barista">Barista</option>
                </select>
                <Input type="number" min="1" value={moveQty} onChange={(event) => setMoveQty(event.target.value)} placeholder="Qty to move" />
                <Input type="number" min="0.01" step="0.01" value={conversionValue} onChange={(event) => setConversionValue(event.target.value)} placeholder="1 unit = X units" />
                <div className="md:col-span-5">
                  <Button className="font-black uppercase tracking-widest text-xs h-10" onClick={moveFromStore} disabled={isDirector}>
                    Confirm Move
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg uppercase font-black">Store Movement Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Moved</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Destination</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementLogs.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-bold">{movement.itemName}</TableCell>
                      <TableCell className="font-bold">{movement.storeQtyMoved} {movement.storeUnit} {"->"} {movement.convertedQty} units</TableCell>
                      <TableCell className="font-black uppercase text-[10px] tracking-widest">{movement.destination}</TableCell>
                      <TableCell className="font-bold text-sm">{new Date(movement.movedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg uppercase font-black">{activeTab === "kitchen" ? "Kitchen Inventory" : "Barista Inventory"}</CardTitle>
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
                {currentLaneItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                    <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
