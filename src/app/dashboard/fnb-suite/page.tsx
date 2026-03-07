"use client";

import { useEffect, useMemo, useState } from "react";
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
import { readJson, writeJson } from "@/app/lib/storage";
import { useIsDirector } from "@/hooks/use-is-director";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type FnbSuiteTab = "beverage" | "recipes" | "stock-sales";

export default function FnbSuitePage() {
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
  const [tab, setTab] = useState<FnbSuiteTab>("beverage");
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
    const bev = readJson<BeverageCostRow[]>(STORAGE_BEVERAGE_COST);
    const recipes = readJson<RecipeCostRow[]>(STORAGE_RECIPE_COST);
    const stockSales = readJson<StockSalesRow[]>(STORAGE_STOCK_SALES);
    if (Array.isArray(bev)) setBeverageRows(bev);
    if (Array.isArray(recipes)) setRecipeRows(recipes);
    if (Array.isArray(stockSales)) setStockSalesRows(stockSales);
  }, []);

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

  const addBeverageRow = async () => {
    if (isDirector) return;
    const openingStock = Number(bevOpening);
    const purchasedStock = Number(bevPurchased);
    const purchaseCostTotal = Number(bevPurchaseCost);
    const closingStock = Number(bevClosing);
    const salesRevenue = Number(bevSalesRevenue);
    if (!bevItemName.trim() || [openingStock, purchasedStock, purchaseCostTotal, closingStock, salesRevenue].some((n) => Number.isNaN(n) || n < 0)) return;
    const approved = await confirm({
      title: "Add Beverage Control Row",
      description: `Are you sure you want to add the beverage cost row for ${bevItemName.trim()}?`,
      actionLabel: "Add Row",
    });
    if (!approved) return;
    const nextRows = [{ id: `bev-${Date.now()}`, itemName: bevItemName.trim(), openingStock, purchasedStock, purchaseCostTotal, closingStock, salesRevenue, createdAt: Date.now() }, ...beverageRows];
    setBeverageRows(nextRows);
    writeJson(STORAGE_BEVERAGE_COST, nextRows);
    setBevItemName("");
    setBevOpening("0");
    setBevPurchased("0");
    setBevPurchaseCost("0");
    setBevClosing("0");
    setBevSalesRevenue("0");
  };

  const addRecipeRow = async () => {
    if (isDirector) return;
    const yieldPortions = Number(recipeYield);
    const batchCost = Number(recipeBatchCost);
    const sellingPricePerPortion = Number(recipeSellingPrice);
    if (!recipeName.trim() || [yieldPortions, batchCost, sellingPricePerPortion].some((n) => Number.isNaN(n) || n <= 0)) return;
    const approved = await confirm({
      title: "Add Recipe Cost Row",
      description: `Are you sure you want to add the recipe row for ${recipeName.trim()}?`,
      actionLabel: "Add Row",
    });
    if (!approved) return;
    const nextRows = [{ id: `rec-${Date.now()}`, recipeName: recipeName.trim(), recipeType, yieldPortions, batchCost, sellingPricePerPortion, createdAt: Date.now() }, ...recipeRows];
    setRecipeRows(nextRows);
    writeJson(STORAGE_RECIPE_COST, nextRows);
    setRecipeName("");
    setRecipeType("kitchen");
    setRecipeYield("1");
    setRecipeBatchCost("0");
    setRecipeSellingPrice("0");
  };

  const addStockSalesRow = async () => {
    if (isDirector) return;
    const openingStock = Number(stockSalesOpening);
    const stockIn = Number(stockSalesIn);
    const stockOut = Number(stockSalesOut);
    const salesUnits = Number(stockSalesUnits);
    if (!stockSalesItem.trim() || [openingStock, stockIn, stockOut, salesUnits].some((n) => Number.isNaN(n) || n < 0)) return;
    const approved = await confirm({
      title: "Add Stock And Sales Row",
      description: `Are you sure you want to add the stock and sales row for ${stockSalesItem.trim()}?`,
      actionLabel: "Add Row",
    });
    if (!approved) return;
    const nextRows = [{ id: `ss-${Date.now()}`, itemName: stockSalesItem.trim(), department: stockSalesDepartment, openingStock, stockIn, stockOut, salesUnits, createdAt: Date.now() }, ...stockSalesRows];
    setStockSalesRows(nextRows);
    writeJson(STORAGE_STOCK_SALES, nextRows);
    setStockSalesItem("");
    setStockSalesDepartment("kitchen");
    setStockSalesOpening("0");
    setStockSalesIn("0");
    setStockSalesOut("0");
    setStockSalesUnits("0");
  };

  return (
    <div className="space-y-6">
      {dialog}
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Hotel F&amp;B Excel Template Suite</h1>
      </header>

      <Card className="shadow-sm">
        <CardContent className="space-y-4 pt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as FnbSuiteTab)}>
            <TabsList className="h-10">
              <TabsTrigger value="beverage" className="font-black uppercase text-[10px] tracking-widest">Bar Beverage Cost</TabsTrigger>
              <TabsTrigger value="recipes" className="font-black uppercase text-[10px] tracking-widest">Recipe Costing</TabsTrigger>
              <TabsTrigger value="stock-sales" className="font-black uppercase text-[10px] tracking-widest">Stock + Sales</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "beverage" && (
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
            </div>
          )}

          {tab === "recipes" && (
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
            </div>
          )}

          {tab === "stock-sales" && (
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
    </div>
  );
}
