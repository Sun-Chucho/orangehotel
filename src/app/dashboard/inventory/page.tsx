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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";

type InventoryTab = "kitchen-stock" | "barista-stock" | "stock-control";
type ItemCategory = "Kitchen" | "Bar";
type StockControlTab = "kitchen" | "barista";

function getStockLabel(stock: number, minStock: number) {
  if (stock <= 0) return "Out";
  if (stock < minStock) return "Low";
  return "In Stock";
}

export default function InventoryPage() {
  const isDirector = useIsDirector();
  const [activeTab, setActiveTab] = useState<InventoryTab>("kitchen-stock");
  const [stockControlTab, setStockControlTab] = useState<StockControlTab>("kitchen");
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [movementLogs, setMovementLogs] = useState<StoreMovementLog[]>([]);

  const [kitchenName, setKitchenName] = useState("");
  const [kitchenQty, setKitchenQty] = useState("0");
  const [kitchenUnit, setKitchenUnit] = useState("kg");
  const [baristaName, setBaristaName] = useState("");
  const [baristaQty, setBaristaQty] = useState("0");
  const [baristaUnit, setBaristaUnit] = useState("kg");

  const [selectedKitchenStoreItemId, setSelectedKitchenStoreItemId] = useState("");
  const [selectedBaristaStoreItemId, setSelectedBaristaStoreItemId] = useState("");
  const [kitchenMoveQty, setKitchenMoveQty] = useState("1");
  const [baristaMoveQty, setBaristaMoveQty] = useState("1");
  const [kitchenConversionValue, setKitchenConversionValue] = useState("1");
  const [baristaConversionValue, setBaristaConversionValue] = useState("1");
  const [kitchenConversionNote, setKitchenConversionNote] = useState("");
  const [baristaConversionNote, setBaristaConversionNote] = useState("");

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
  const kitchenInventoryItems = useMemo(() => items.filter((i) => i.category === "Kitchen"), [items]);
  const baristaInventoryItems = useMemo(() => items.filter((i) => i.category === "Bar"), [items]);
  const selectedKitchenStoreItem = useMemo(() => kitchenStore.find((i) => i.id === selectedKitchenStoreItemId), [kitchenStore, selectedKitchenStoreItemId]);
  const selectedBaristaStoreItem = useMemo(() => baristaStore.find((i) => i.id === selectedBaristaStoreItemId), [baristaStore, selectedBaristaStoreItemId]);

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

  const moveFromStore = (lane: StoreLane) => {
    const selectedStoreItem = lane === "kitchen" ? selectedKitchenStoreItem : selectedBaristaStoreItem;
    const moveQty = lane === "kitchen" ? kitchenMoveQty : baristaMoveQty;
    const conversionValue = lane === "kitchen" ? kitchenConversionValue : baristaConversionValue;
    const conversionNote = (lane === "kitchen" ? kitchenConversionNote : baristaConversionNote).trim();
    if (isDirector || !selectedStoreItem || !conversionNote) return;

    const qty = Number(moveQty);
    const conversion = Number(conversionValue);
    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(conversion) || conversion <= 0 || qty > selectedStoreItem.stock) {
      return;
    }

    const converted = qty * conversion;
    const moveDestination: TransferDestination = lane;
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
        conversionNote,
        convertedQty: converted,
        movedAt: Date.now(),
      },
      ...prev,
    ]);

    if (lane === "kitchen") {
      setKitchenMoveQty("1");
      setKitchenConversionValue("1");
      setKitchenConversionNote("");
      return;
    }

    setBaristaMoveQty("1");
    setBaristaConversionValue("1");
    setBaristaConversionNote("");
  };

  const renderStoreCard = (lane: StoreLane, title: string, list: MainStoreItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
        <CardDescription>Enter and record stock received for {lane === "kitchen" ? "kitchen" : "barista"} operations.</CardDescription>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                  No stock recorded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderInventoryTable = (title: string, inventoryItems: InventoryItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
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
            {inventoryItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
              </TableRow>
            ))}
            {inventoryItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                  No stock entries found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderStockControl = (
    lane: StoreLane,
    list: MainStoreItem[],
    selectedStoreItem: MainStoreItem | undefined,
    selectedStoreItemId: string,
    setSelectedStoreItemId: (value: string) => void,
    moveQty: string,
    setMoveQty: (value: string) => void,
    conversionValue: string,
    setConversionValue: (value: string) => void,
    conversionNote: string,
    setConversionNote: (value: string) => void,
  ) => (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Stock Control</CardTitle>
          <CardDescription>Select an item and write the movement logic, for example: 1 kg meat = 20 units.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-4">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedStoreItemId}
            onChange={(event) => setSelectedStoreItemId(event.target.value)}
          >
            <option value="">Select item</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.stock} {item.unit})
              </option>
            ))}
          </select>
          <Input type="number" min="1" value={moveQty} onChange={(event) => setMoveQty(event.target.value)} placeholder="Qty moved" />
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={conversionValue}
            onChange={(event) => setConversionValue(event.target.value)}
            placeholder="1 unit = X units"
          />
          <Input value={conversionNote} onChange={(event) => setConversionNote(event.target.value)} placeholder="Logic note e.g. 1 kg meat = 20 units" />
          <Button className="h-10 font-black uppercase tracking-widest text-[10px]" onClick={() => moveFromStore(lane)} disabled={isDirector}>
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Record Movement
          </Button>
        </CardContent>
        {selectedStoreItem && (
          <CardContent className="pt-0">
            <div className="rounded-md border p-3">
              <p className="font-black">{selectedStoreItem.name}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Available: {selectedStoreItem.stock} {selectedStoreItem.unit}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Control Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Movement</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Logic</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementLogs
                .filter((movement) => movement.destination === lane)
                .map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-bold">{movement.itemName}</TableCell>
                    <TableCell className="font-bold">
                      {movement.storeQtyMoved} {movement.storeUnit} {"->"} {movement.convertedQty} units
                    </TableCell>
                    <TableCell className="font-bold">{movement.conversionNote}</TableCell>
                    <TableCell className="font-bold text-sm">{new Date(movement.movedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              {movementLogs.filter((movement) => movement.destination === lane).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    No control records yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Control</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Kitchen stock, barista stock, and stock control logic in one place
        </p>
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
          <TabsTrigger value="kitchen-stock" className="font-black uppercase text-[10px] tracking-widest">Kitchen Stock</TabsTrigger>
          <TabsTrigger value="barista-stock" className="font-black uppercase text-[10px] tracking-widest">Barista Stock</TabsTrigger>
          <TabsTrigger value="stock-control" className="font-black uppercase text-[10px] tracking-widest">Stock Control</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "kitchen-stock" && (
        <div className="space-y-6">
          {renderStoreCard("kitchen", "Kitchen Stock", kitchenStore)}
          {renderInventoryTable("Kitchen Inventory Records", kitchenInventoryItems)}
        </div>
      )}

      {activeTab === "barista-stock" && (
        <div className="space-y-6">
          {renderStoreCard("barista", "Barista Stock", baristaStore)}
          {renderInventoryTable("Barista Inventory Records", baristaInventoryItems)}
        </div>
      )}

      {activeTab === "stock-control" && (
        <Tabs value={stockControlTab} onValueChange={(value) => setStockControlTab(value as StockControlTab)}>
          <TabsList className="h-11">
            <TabsTrigger value="kitchen" className="font-black uppercase text-[10px] tracking-widest">Kitchen</TabsTrigger>
            <TabsTrigger value="barista" className="font-black uppercase text-[10px] tracking-widest">Barista</TabsTrigger>
          </TabsList>
          <TabsContent value="kitchen">
            {renderStockControl(
              "kitchen",
              kitchenStore,
              selectedKitchenStoreItem,
              selectedKitchenStoreItemId,
              setSelectedKitchenStoreItemId,
              kitchenMoveQty,
              setKitchenMoveQty,
              kitchenConversionValue,
              setKitchenConversionValue,
              kitchenConversionNote,
              setKitchenConversionNote,
            )}
          </TabsContent>
          <TabsContent value="barista">
            {renderStockControl(
              "barista",
              baristaStore,
              selectedBaristaStoreItem,
              selectedBaristaStoreItemId,
              setSelectedBaristaStoreItemId,
              baristaMoveQty,
              setBaristaMoveQty,
              baristaConversionValue,
              setBaristaConversionValue,
              baristaConversionNote,
              setBaristaConversionNote,
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
