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
import { CompanyStockCategory, CompanyStockItem, STORAGE_COMPANY_STOCK } from "@/app/lib/company-stock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus } from "lucide-react";

type InventoryTab = "stock" | "kitchen" | "barista";
type ItemCategory = "Kitchen" | "Bar";

const COMPANY_CATEGORIES: Array<{ value: CompanyStockCategory; label: string }> = [
  { value: "kitchen-equipment", label: "Kitchen Equipment" },
  { value: "technology", label: "Technology" },
  { value: "electronics", label: "Electronics" },
  { value: "cleaning-supplies", label: "Cleaning Supplies" },
  { value: "furniture", label: "Furniture" },
];

function getStockLabel(stock: number, minStock: number) {
  if (stock <= 0) return "Out";
  if (stock < minStock) return "Low";
  return "In Stock";
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [movementLogs, setMovementLogs] = useState<StoreMovementLog[]>([]);
  const [companyStock, setCompanyStock] = useState<CompanyStockItem[]>([]);
  const [companyTab, setCompanyTab] = useState<CompanyStockCategory>("kitchen-equipment");

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

  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetQty, setAssetQty] = useState("1");
  const [assetCategory, setAssetCategory] = useState<CompanyStockCategory>("kitchen-equipment");

  useEffect(() => {
    const inv = localStorage.getItem(STORAGE_INVENTORY_ITEMS);
    const store = localStorage.getItem(STORAGE_MAIN_STORE_ITEMS);
    const moves = localStorage.getItem(STORAGE_STORE_MOVEMENTS);
    const assets = localStorage.getItem(STORAGE_COMPANY_STOCK);
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
    if (assets) {
      try {
        const parsed = JSON.parse(assets) as CompanyStockItem[];
        if (Array.isArray(parsed)) setCompanyStock(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_INVENTORY_ITEMS, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem(STORAGE_MAIN_STORE_ITEMS, JSON.stringify(storeItems)), [storeItems]);
  useEffect(() => localStorage.setItem(STORAGE_STORE_MOVEMENTS, JSON.stringify(movementLogs)), [movementLogs]);
  useEffect(() => localStorage.setItem(STORAGE_COMPANY_STOCK, JSON.stringify(companyStock)), [companyStock]);

  const kitchenStore = useMemo(() => storeItems.filter((i) => i.lane === "kitchen"), [storeItems]);
  const baristaStore = useMemo(() => storeItems.filter((i) => i.lane === "barista"), [storeItems]);
  const selectedStoreItem = useMemo(() => storeItems.find((i) => i.id === selectedStoreItemId), [storeItems, selectedStoreItemId]);
  const currentLaneItems = useMemo(
    () => items.filter((i) => i.category === (activeTab === "kitchen" ? "Kitchen" : "Bar")),
    [items, activeTab],
  );
  const filteredAssets = useMemo(() => companyStock.filter((a) => a.category === companyTab), [companyStock, companyTab]);

  const addStoreItem = (lane: StoreLane) => {
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
    } else {
      setBaristaName("");
      setBaristaQty("0");
      setBaristaUnit("kg");
    }
  };

  const moveFromStore = () => {
    if (!selectedStoreItem) return;
    const qty = Number(moveQty);
    const conversion = Number(conversionValue);
    if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(conversion) || conversion <= 0 || qty > selectedStoreItem.stock) return;
    const converted = qty * conversion;
    const destinationCategory: ItemCategory = moveDestination === "kitchen" ? "Kitchen" : "Bar";
    const normalized = selectedStoreItem.name.trim().toLowerCase();

    setStoreItems((prev) => prev.map((i) => (i.id === selectedStoreItem.id ? { ...i, stock: i.stock - qty } : i)));
    setItems((prev) => {
      const existing = prev.find((i) => i.category === destinationCategory && i.name.trim().toLowerCase() === normalized);
      if (existing) return prev.map((i) => (i.id === existing.id ? { ...i, stock: i.stock + converted } : i));
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

  const addAsset = () => {
    const qty = Number(assetQty);
    if (!assetName.trim() || !assetDescription.trim() || Number.isNaN(qty) || qty <= 0) return;
    setCompanyStock((prev) => [
      { id: `cs-${Date.now()}`, name: assetName.trim(), description: assetDescription.trim(), quantity: qty, category: assetCategory, createdAt: Date.now() },
      ...prev,
    ]);
    setAssetName("");
    setAssetDescription("");
    setAssetQty("1");
    setAssetCategory("kitchen-equipment");
  };

  const renderStoreCard = (lane: StoreLane, title: string, list: MainStoreItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b"><CardTitle className="text-lg uppercase font-black">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            value={lane === "kitchen" ? kitchenName : baristaName}
            onChange={(e) => (lane === "kitchen" ? setKitchenName(e.target.value) : setBaristaName(e.target.value))}
            placeholder="Item name"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenQty : baristaQty}
            onChange={(e) => (lane === "kitchen" ? setKitchenQty(e.target.value) : setBaristaQty(e.target.value))}
            placeholder="Store quantity"
          />
          <Input
            value={lane === "kitchen" ? kitchenUnit : baristaUnit}
            onChange={(e) => (lane === "kitchen" ? setKitchenUnit(e.target.value) : setBaristaUnit(e.target.value))}
            placeholder="Unit"
          />
          <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => addStoreItem(lane)}>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InventoryTab)}>
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
              <CardHeader><CardTitle className="text-lg uppercase font-black">Move from Store</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2 rounded-md border p-3">
                  <p className="font-black">{selectedStoreItem.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mt-1">
                    Available: {selectedStoreItem.stock} {selectedStoreItem.unit}
                  </p>
                </div>
                <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={moveDestination} onChange={(e) => setMoveDestination(e.target.value as TransferDestination)}>
                  <option value="kitchen">Kitchen</option>
                  <option value="barista">Barista</option>
                </select>
                <Input type="number" min="1" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="Qty to move" />
                <Input type="number" min="0.01" step="0.01" value={conversionValue} onChange={(e) => setConversionValue(e.target.value)} placeholder="1 unit = X units" />
                <div className="md:col-span-5">
                  <Button className="font-black uppercase tracking-widest text-xs h-10" onClick={moveFromStore}>Confirm Move</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="border-b"><CardTitle className="text-lg uppercase font-black">Store Movement Log</CardTitle></CardHeader>
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
                  {movementLogs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold">{m.itemName}</TableCell>
                      <TableCell className="font-bold">{m.storeQtyMoved} {m.storeUnit} {"->"} {m.convertedQty} units</TableCell>
                      <TableCell className="font-black uppercase text-[10px] tracking-widest">{m.destination}</TableCell>
                      <TableCell className="font-bold text-sm">{new Date(m.movedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="border-b"><CardTitle className="text-lg uppercase font-black">{activeTab === "kitchen" ? "Kitchen Inventory" : "Barista Inventory"}</CardTitle></CardHeader>
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

      <Card className="shadow-sm">
        <CardHeader className="border-b"><CardTitle className="text-lg uppercase font-black">Company Stock</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Item Name" />
            <Input value={assetDescription} onChange={(e) => setAssetDescription(e.target.value)} placeholder="Description" />
            <Input type="number" min="1" value={assetQty} onChange={(e) => setAssetQty(e.target.value)} placeholder="Quantity" />
            <div className="flex gap-2">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={assetCategory} onChange={(e) => setAssetCategory(e.target.value as CompanyStockCategory)}>
                {COMPANY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addAsset}>Add</Button>
            </div>
          </div>
          <Tabs value={companyTab} onValueChange={(v) => setCompanyTab(v as CompanyStockCategory)}>
            <TabsList className="h-auto flex-wrap">
              {COMPANY_CATEGORIES.map((c) => <TabsTrigger key={c.value} value={c.value} className="font-black uppercase text-[10px] tracking-widest">{c.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Item Name</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-bold">{a.name}</TableCell>
                  <TableCell className="font-bold">{a.description}</TableCell>
                  <TableCell className="font-bold">{a.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
