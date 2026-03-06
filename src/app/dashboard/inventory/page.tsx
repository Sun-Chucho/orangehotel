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
import {
  BeverageCostRow,
  RecipeCostRow,
  RecipeType,
  STORAGE_BEVERAGE_COST,
  STORAGE_RECIPE_COST,
  STORAGE_STOCK_SALES,
  StockDepartment,
  StockSalesRow,
} from "@/app/lib/fnb-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";

type InventoryTab = "stock" | "kitchen" | "barista";
type ItemCategory = "Kitchen" | "Bar";
type FnbSuiteTab = "beverage" | "recipes" | "stock-sales";

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
  const isDirector = useIsDirector();
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

  const [fnbSuiteTab, setFnbSuiteTab] = useState<FnbSuiteTab>("beverage");
  const [beverageRows, setBeverageRows] = useState<BeverageCostRow[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeCostRow[]>([]);
  const [stockSalesRows, setStockSalesRows] = useState<StockSalesRow[]>([]);

  const [bevItemName, setBevItemName] = useState("");
  const [bevOpening, setBevOpening] = useState("0");
  const [bevPurchased, setBevPurchased] = useState("0");
  const [bevPurchaseCost, setBevPurchaseCost] = useState("0");
  const [bevClosing, setBevClosing] = useState("0");
  const [bevSalesRevenue, setBevSalesRevenue] = useState("0");

  const [recipeName, setRecipeName] = useState("");
  const [recipeType, setRecipeType] = useState<RecipeType>("kitchen");
  const [recipeYield, setRecipeYield] = useState("1");
  const [recipeBatchCost, setRecipeBatchCost] = useState("0");
  const [recipeSellingPrice, setRecipeSellingPrice] = useState("0");

  const [stockSalesItem, setStockSalesItem] = useState("");
  const [stockSalesDepartment, setStockSalesDepartment] = useState<StockDepartment>("kitchen");
  const [stockSalesOpening, setStockSalesOpening] = useState("0");
  const [stockSalesIn, setStockSalesIn] = useState("0");
  const [stockSalesOut, setStockSalesOut] = useState("0");
  const [stockSalesUnits, setStockSalesUnits] = useState("0");

  useEffect(() => {
    const inv = localStorage.getItem(STORAGE_INVENTORY_ITEMS);
    const store = localStorage.getItem(STORAGE_MAIN_STORE_ITEMS);
    const moves = localStorage.getItem(STORAGE_STORE_MOVEMENTS);
    const assets = localStorage.getItem(STORAGE_COMPANY_STOCK);
    const bev = localStorage.getItem(STORAGE_BEVERAGE_COST);
    const recipes = localStorage.getItem(STORAGE_RECIPE_COST);
    const stockSales = localStorage.getItem(STORAGE_STOCK_SALES);
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
    if (bev) {
      try {
        const parsed = JSON.parse(bev) as BeverageCostRow[];
        if (Array.isArray(parsed)) setBeverageRows(parsed);
      } catch {}
    }
    if (recipes) {
      try {
        const parsed = JSON.parse(recipes) as RecipeCostRow[];
        if (Array.isArray(parsed)) setRecipeRows(parsed);
      } catch {}
    }
    if (stockSales) {
      try {
        const parsed = JSON.parse(stockSales) as StockSalesRow[];
        if (Array.isArray(parsed)) setStockSalesRows(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_INVENTORY_ITEMS, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem(STORAGE_MAIN_STORE_ITEMS, JSON.stringify(storeItems)), [storeItems]);
  useEffect(() => localStorage.setItem(STORAGE_STORE_MOVEMENTS, JSON.stringify(movementLogs)), [movementLogs]);
  useEffect(() => localStorage.setItem(STORAGE_COMPANY_STOCK, JSON.stringify(companyStock)), [companyStock]);
  useEffect(() => localStorage.setItem(STORAGE_BEVERAGE_COST, JSON.stringify(beverageRows)), [beverageRows]);
  useEffect(() => localStorage.setItem(STORAGE_RECIPE_COST, JSON.stringify(recipeRows)), [recipeRows]);
  useEffect(() => localStorage.setItem(STORAGE_STOCK_SALES, JSON.stringify(stockSalesRows)), [stockSalesRows]);

  const kitchenStore = useMemo(() => storeItems.filter((i) => i.lane === "kitchen"), [storeItems]);
  const baristaStore = useMemo(() => storeItems.filter((i) => i.lane === "barista"), [storeItems]);
  const selectedStoreItem = useMemo(() => storeItems.find((i) => i.id === selectedStoreItemId), [storeItems, selectedStoreItemId]);
  const currentLaneItems = useMemo(
    () => items.filter((i) => i.category === (activeTab === "kitchen" ? "Kitchen" : "Bar")),
    [items, activeTab],
  );
  const filteredAssets = useMemo(() => companyStock.filter((a) => a.category === companyTab), [companyStock, companyTab]);

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
    } else {
      setBaristaName("");
      setBaristaQty("0");
      setBaristaUnit("kg");
    }
  };

  const moveFromStore = () => {
    if (isDirector) return;
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
    if (isDirector) return;
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

  const addBeverageRow = () => {
    if (isDirector) return;
    const openingStock = Number(bevOpening);
    const purchasedStock = Number(bevPurchased);
    const purchaseCostTotal = Number(bevPurchaseCost);
    const closingStock = Number(bevClosing);
    const salesRevenue = Number(bevSalesRevenue);
    if (
      !bevItemName.trim() ||
      [openingStock, purchasedStock, purchaseCostTotal, closingStock, salesRevenue].some((n) => Number.isNaN(n) || n < 0)
    ) {
      return;
    }
    setBeverageRows((prev) => [
      {
        id: `bev-${Date.now()}`,
        itemName: bevItemName.trim(),
        openingStock,
        purchasedStock,
        purchaseCostTotal,
        closingStock,
        salesRevenue,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setBevItemName("");
    setBevOpening("0");
    setBevPurchased("0");
    setBevPurchaseCost("0");
    setBevClosing("0");
    setBevSalesRevenue("0");
  };

  const addRecipeRow = () => {
    if (isDirector) return;
    const yieldPortions = Number(recipeYield);
    const batchCost = Number(recipeBatchCost);
    const sellingPricePerPortion = Number(recipeSellingPrice);
    if (!recipeName.trim() || [yieldPortions, batchCost, sellingPricePerPortion].some((n) => Number.isNaN(n) || n <= 0)) {
      return;
    }
    setRecipeRows((prev) => [
      {
        id: `rec-${Date.now()}`,
        recipeName: recipeName.trim(),
        recipeType,
        yieldPortions,
        batchCost,
        sellingPricePerPortion,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setRecipeName("");
    setRecipeType("kitchen");
    setRecipeYield("1");
    setRecipeBatchCost("0");
    setRecipeSellingPrice("0");
  };

  const addStockSalesRow = () => {
    if (isDirector) return;
    const openingStock = Number(stockSalesOpening);
    const stockIn = Number(stockSalesIn);
    const stockOut = Number(stockSalesOut);
    const salesUnits = Number(stockSalesUnits);
    if (!stockSalesItem.trim() || [openingStock, stockIn, stockOut, salesUnits].some((n) => Number.isNaN(n) || n < 0)) {
      return;
    }
    setStockSalesRows((prev) => [
      {
        id: `ss-${Date.now()}`,
        itemName: stockSalesItem.trim(),
        department: stockSalesDepartment,
        openingStock,
        stockIn,
        stockOut,
        salesUnits,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setStockSalesItem("");
    setStockSalesDepartment("kitchen");
    setStockSalesOpening("0");
    setStockSalesIn("0");
    setStockSalesOut("0");
    setStockSalesUnits("0");
  };

  const beverageSummary = useMemo(() => {
    const totalRevenue = beverageRows.reduce((sum, row) => sum + row.salesRevenue, 0);
    const totalCogs = beverageRows.reduce((sum, row) => {
      const consumedUnits = Math.max(0, row.openingStock + row.purchasedStock - row.closingStock);
      if (row.purchasedStock <= 0 || row.purchaseCostTotal <= 0) return sum;
      const unitCost = row.purchaseCostTotal / row.purchasedStock;
      return sum + consumedUnits * unitCost;
    }, 0);
    const costPct = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCogs, costPct };
  }, [beverageRows]);

  const stockSalesVarianceRows = useMemo(
    () =>
      stockSalesRows.map((row) => {
        const computedClosing = row.openingStock + row.stockIn - row.stockOut;
        const varianceUnits = row.salesUnits - row.stockOut;
        return { ...row, computedClosing, varianceUnits };
      }),
    [stockSalesRows],
  );

  const downloadTemplateCsv = (kind: FnbSuiteTab) => {
    const templates: Record<FnbSuiteTab, { filename: string; headers: string[] }> = {
      beverage: {
        filename: "bar-beverage-cost-control-template.csv",
        headers: ["item_name", "opening_stock", "purchased_stock", "purchase_cost_total", "closing_stock", "sales_revenue"],
      },
      recipes: {
        filename: "recipe-costing-template.csv",
        headers: ["recipe_name", "recipe_type(kitchen|cocktail)", "yield_portions", "batch_cost", "selling_price_per_portion"],
      },
      "stock-sales": {
        filename: "automated-stock-sales-tracking-template.csv",
        headers: ["item_name", "department(kitchen|barista|bar)", "opening_stock", "stock_in", "stock_out", "sales_units"],
      },
    };
    const chosen = templates[kind];
    const csv = `${chosen.headers.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = chosen.filename;
    link.click();
    URL.revokeObjectURL(url);
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
                  <Button className="font-black uppercase tracking-widest text-xs h-10" onClick={moveFromStore} disabled={isDirector}>Confirm Move</Button>
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
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">Hotel F&amp;B Excel Template Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Tabs value={fnbSuiteTab} onValueChange={(v) => setFnbSuiteTab(v as FnbSuiteTab)}>
            <TabsList className="h-10">
              <TabsTrigger value="beverage" className="font-black uppercase text-[10px] tracking-widest">Bar Beverage Cost</TabsTrigger>
              <TabsTrigger value="recipes" className="font-black uppercase text-[10px] tracking-widest">Recipe Costing</TabsTrigger>
              <TabsTrigger value="stock-sales" className="font-black uppercase text-[10px] tracking-widest">Stock + Sales</TabsTrigger>
            </TabsList>
          </Tabs>

          {fnbSuiteTab === "beverage" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="outline" className="h-9 font-black uppercase text-[10px] tracking-widest" onClick={() => downloadTemplateCsv("beverage")}>
                  Download Template CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                <Input value={bevItemName} onChange={(e) => setBevItemName(e.target.value)} placeholder="Beverage item" />
                <Input type="number" min="0" value={bevOpening} onChange={(e) => setBevOpening(e.target.value)} placeholder="Opening" />
                <Input type="number" min="0" value={bevPurchased} onChange={(e) => setBevPurchased(e.target.value)} placeholder="Purchased" />
                <Input type="number" min="0" value={bevPurchaseCost} onChange={(e) => setBevPurchaseCost(e.target.value)} placeholder="Purchase Cost" />
                <Input type="number" min="0" value={bevClosing} onChange={(e) => setBevClosing(e.target.value)} placeholder="Closing" />
                <Input type="number" min="0" value={bevSalesRevenue} onChange={(e) => setBevSalesRevenue(e.target.value)} placeholder="Sales Revenue" />
                <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addBeverageRow} disabled={isDirector}>Add Row</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="shadow-none border"><CardContent className="p-3 text-xs font-black uppercase tracking-widest">Revenue: TSh {beverageSummary.totalRevenue.toLocaleString()}</CardContent></Card>
                <Card className="shadow-none border"><CardContent className="p-3 text-xs font-black uppercase tracking-widest">COGS: TSh {Math.round(beverageSummary.totalCogs).toLocaleString()}</CardContent></Card>
                <Card className="shadow-none border"><CardContent className="p-3 text-xs font-black uppercase tracking-widest">Cost %: {beverageSummary.costPct.toFixed(1)}%</CardContent></Card>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Consumed</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">COGS</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Sales</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Beverage Cost %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beverageRows.map((row) => {
                    const consumedUnits = Math.max(0, row.openingStock + row.purchasedStock - row.closingStock);
                    const unitCost = row.purchasedStock > 0 ? row.purchaseCostTotal / row.purchasedStock : 0;
                    const cogs = consumedUnits * unitCost;
                    const costPct = row.salesRevenue > 0 ? (cogs / row.salesRevenue) * 100 : 0;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-bold">{row.itemName}</TableCell>
                        <TableCell className="font-bold">{consumedUnits.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">TSh {Math.round(cogs).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">TSh {row.salesRevenue.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{costPct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {fnbSuiteTab === "recipes" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="outline" className="h-9 font-black uppercase text-[10px] tracking-widest" onClick={() => downloadTemplateCsv("recipes")}>
                  Download Template CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <Input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Recipe name" />
                <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={recipeType} onChange={(e) => setRecipeType(e.target.value as RecipeType)}>
                  <option value="kitchen">Kitchen</option>
                  <option value="cocktail">Cocktail</option>
                </select>
                <Input type="number" min="1" value={recipeYield} onChange={(e) => setRecipeYield(e.target.value)} placeholder="Yield portions" />
                <Input type="number" min="0" value={recipeBatchCost} onChange={(e) => setRecipeBatchCost(e.target.value)} placeholder="Batch cost" />
                <Input type="number" min="0" value={recipeSellingPrice} onChange={(e) => setRecipeSellingPrice(e.target.value)} placeholder="Selling price/portion" />
                <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addRecipeRow} disabled={isDirector}>Add Row</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Recipe</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Cost/Portion</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Sell Price</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Food/Drink Cost %</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Gross Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeRows.map((row) => {
                    const costPerPortion = row.batchCost / row.yieldPortions;
                    const costPct = row.sellingPricePerPortion > 0 ? (costPerPortion / row.sellingPricePerPortion) * 100 : 0;
                    const margin = row.sellingPricePerPortion - costPerPortion;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-bold">{row.recipeName}</TableCell>
                        <TableCell className="font-bold uppercase text-[10px] tracking-widest">{row.recipeType}</TableCell>
                        <TableCell className="font-bold">TSh {Math.round(costPerPortion).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">TSh {row.sellingPricePerPortion.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{costPct.toFixed(1)}%</TableCell>
                        <TableCell className="font-bold">TSh {Math.round(margin).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {fnbSuiteTab === "stock-sales" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button variant="outline" className="h-9 font-black uppercase text-[10px] tracking-widest" onClick={() => downloadTemplateCsv("stock-sales")}>
                  Download Template CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                <Input value={stockSalesItem} onChange={(e) => setStockSalesItem(e.target.value)} placeholder="Item name" />
                <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={stockSalesDepartment} onChange={(e) => setStockSalesDepartment(e.target.value as StockDepartment)}>
                  <option value="kitchen">Kitchen</option>
                  <option value="barista">Barista</option>
                  <option value="bar">Bar</option>
                </select>
                <Input type="number" min="0" value={stockSalesOpening} onChange={(e) => setStockSalesOpening(e.target.value)} placeholder="Opening" />
                <Input type="number" min="0" value={stockSalesIn} onChange={(e) => setStockSalesIn(e.target.value)} placeholder="Stock In" />
                <Input type="number" min="0" value={stockSalesOut} onChange={(e) => setStockSalesOut(e.target.value)} placeholder="Stock Out" />
                <Input type="number" min="0" value={stockSalesUnits} onChange={(e) => setStockSalesUnits(e.target.value)} placeholder="Sales Units" />
                <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addStockSalesRow} disabled={isDirector}>Add Row</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Department</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Computed Closing</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock-Out</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Sales Units</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockSalesVarianceRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-bold">{row.itemName}</TableCell>
                      <TableCell className="font-bold uppercase text-[10px] tracking-widest">{row.department}</TableCell>
                      <TableCell className="font-bold">{row.computedClosing.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">{row.stockOut.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">{row.salesUnits.toFixed(2)}</TableCell>
                      <TableCell className={row.varianceUnits === 0 ? "font-bold" : row.varianceUnits > 0 ? "font-bold text-red-600" : "font-bold text-orange-600"}>
                        {row.varianceUnits.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
              <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addAsset} disabled={isDirector}>Add</Button>
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
