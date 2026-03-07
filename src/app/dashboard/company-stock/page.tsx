"use client";

import { useEffect, useMemo, useState } from "react";
import { CompanyStockCategory, CompanyStockItem, STORAGE_COMPANY_STOCK } from "@/app/lib/company-stock";
import { readJson, writeJson } from "@/app/lib/storage";
import { useIsDirector } from "@/hooks/use-is-director";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

const COMPANY_CATEGORIES: Array<{ value: CompanyStockCategory; label: string }> = [
  { value: "kitchen-equipment", label: "Kitchen Equipment" },
  { value: "technology", label: "Technology" },
  { value: "electronics", label: "Electronics" },
  { value: "cleaning-supplies", label: "Cleaning Supplies" },
  { value: "furniture", label: "Furniture" },
];

export default function CompanyStockPage() {
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState<CompanyStockItem[]>([]);
  const [tab, setTab] = useState<CompanyStockCategory>("kitchen-equipment");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState<CompanyStockCategory>("kitchen-equipment");

  useEffect(() => {
    const applyCompanyStockSnapshot = () => {
      const saved = readJson<CompanyStockItem[]>(STORAGE_COMPANY_STOCK);
      if (Array.isArray(saved)) {
        setItems(saved);
        return;
      }
      setItems([]);
    };

    applyCompanyStockSnapshot();
    const unsubscribeCompanyStock = subscribeToSyncedStorageKey(STORAGE_COMPANY_STOCK, applyCompanyStockSnapshot);

    return () => unsubscribeCompanyStock();
  }, []);

  const filteredItems = useMemo(() => items.filter((item) => item.category === tab), [items, tab]);

  const addItem = async () => {
    if (isDirector) return;
    const qty = Number(quantity);
    if (name.trim().length === 0 || description.trim().length === 0 || Number.isNaN(qty) || qty <= 0) return;
    const approved = await confirm({
      title: "Add Company Stock",
      description: `Are you sure you want to add ${qty} ${name.trim()} to company stock?`,
      actionLabel: "Add Item",
    });
    if (!approved) return;
    const nextItems = [
      {
        id: `cs-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        quantity: qty,
        category,
        createdAt: Date.now(),
      },
      ...items,
    ];
    setItems(nextItems);
    writeJson(STORAGE_COMPANY_STOCK, nextItems);
    setName("");
    setDescription("");
    setQuantity("1");
    setCategory("kitchen-equipment");
  };

  return (
    <div className="space-y-6">
      {dialog}
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Company Stock</h1>
        <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
          Enter and record company stock assets and supplies
        </p>
      </header>

      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Company stock visibility only (read-only)
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-none bg-white">
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Asset Register</CardTitle>
          <CardDescription>Tab where the team can enter and record towels, spoons, CCTV cameras, TVs, equipment and more</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {!isDirector && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Item Name" />
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
              <Input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" />
              <div className="flex gap-2">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CompanyStockCategory)}
                >
                  {COMPANY_CATEGORIES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <Button className="h-10 font-black uppercase tracking-widest text-[10px]" onClick={addItem}>
                  Add
                </Button>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={(value) => setTab(value as CompanyStockCategory)}>
            <TabsList className="h-auto flex-wrap">
              {COMPANY_CATEGORIES.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value} className="font-black uppercase text-[10px] tracking-widest">
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Item Name</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold">{item.name}</TableCell>
                  <TableCell className="font-bold">{item.description}</TableCell>
                  <TableCell className="font-bold">{item.quantity}</TableCell>
                  <TableCell className="font-bold text-sm">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    No company stock items in this category
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
