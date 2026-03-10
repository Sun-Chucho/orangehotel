"use client";

import { useEffect, useState } from "react";
import { readPosState, STORAGE_BARISTA_STATE, STORAGE_KITCHEN_STATE, writePosState } from "@/app/lib/storage";
import {
  DEFAULT_KITCHEN_MENU,
  KITCHEN_CATEGORY_LABELS,
  KITCHEN_CATEGORY_OPTIONS,
  KitchenMenuCategory,
  KitchenMenuItem,
  mergeKitchenMenuItems,
} from "@/app/lib/kitchen-menu";
import { useIsDirector } from "@/hooks/use-is-director";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type BaristaCategory = "espresso" | "coffee" | "tea" | "cold" | "snacks";

interface BaristaMenuItem {
  id: string;
  name: string;
  price: number;
  category: BaristaCategory;
  prepMinutes: number;
}

interface QueueTicket {
  id: string;
}

interface PaymentRecord {
  id: string;
}

const KITCHEN_LEGACY = {
  tickets: "orange-hotel-kitchen-tickets",
  seq: "orange-hotel-kitchen-seq",
  payments: "orange-hotel-kitchen-payments",
  menu: "orange-hotel-kitchen-menu",
  defaultSeq: 300,
} as const;

const BARISTA_LEGACY = {
  tickets: "orange-hotel-barista-orders",
  seq: "orange-hotel-barista-seq",
  payments: "orange-hotel-barista-payments",
  menu: "orange-hotel-barista-menu",
  defaultSeq: 490,
} as const;

export function MenuCreateView() {
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
  const [tab, setTab] = useState<"kitchen" | "barista">("kitchen");

  const [kitchenTickets, setKitchenTickets] = useState<QueueTicket[]>([]);
  const [kitchenPayments, setKitchenPayments] = useState<PaymentRecord[]>([]);
  const [kitchenSeq, setKitchenSeq] = useState(300);
  const [kitchenMenuItems, setKitchenMenuItems] = useState<KitchenMenuItem[]>([]);
  const [kitchenName, setKitchenName] = useState("");
  const [kitchenPrice, setKitchenPrice] = useState("");
  const [kitchenPrepMinutes, setKitchenPrepMinutes] = useState("15");
  const [kitchenCategory, setKitchenCategory] = useState<KitchenMenuCategory>("salad");

  const [baristaTickets, setBaristaTickets] = useState<QueueTicket[]>([]);
  const [baristaPayments, setBaristaPayments] = useState<PaymentRecord[]>([]);
  const [baristaSeq, setBaristaSeq] = useState(490);
  const [baristaMenuItems, setBaristaMenuItems] = useState<BaristaMenuItem[]>([]);
  const [baristaName, setBaristaName] = useState("");
  const [baristaPrice, setBaristaPrice] = useState("");
  const [baristaPrepMinutes, setBaristaPrepMinutes] = useState("10");
  const [baristaCategory, setBaristaCategory] = useState<BaristaCategory>("coffee");

  useEffect(() => {
    const kitchenSnapshot = readPosState<QueueTicket, PaymentRecord, KitchenMenuItem>(
      STORAGE_KITCHEN_STATE,
      KITCHEN_LEGACY.tickets,
      KITCHEN_LEGACY.seq,
      KITCHEN_LEGACY.payments,
      KITCHEN_LEGACY.menu,
      KITCHEN_LEGACY.defaultSeq,
    );
    setKitchenTickets(kitchenSnapshot.tickets);
    setKitchenPayments(kitchenSnapshot.payments);
    setKitchenSeq(kitchenSnapshot.ticketSeq);
    const nextKitchenMenuItems = mergeKitchenMenuItems(kitchenSnapshot.menuItems);
    setKitchenMenuItems(nextKitchenMenuItems);
    if (JSON.stringify(nextKitchenMenuItems) !== JSON.stringify(kitchenSnapshot.menuItems)) {
      writePosState(
        STORAGE_KITCHEN_STATE,
        kitchenSnapshot.tickets,
        kitchenSnapshot.ticketSeq,
        kitchenSnapshot.payments,
        nextKitchenMenuItems,
      );
    }

    const baristaSnapshot = readPosState<QueueTicket, PaymentRecord, BaristaMenuItem>(
      STORAGE_BARISTA_STATE,
      BARISTA_LEGACY.tickets,
      BARISTA_LEGACY.seq,
      BARISTA_LEGACY.payments,
      BARISTA_LEGACY.menu,
      BARISTA_LEGACY.defaultSeq,
    );
    setBaristaTickets(baristaSnapshot.tickets);
    setBaristaPayments(baristaSnapshot.payments);
    setBaristaSeq(baristaSnapshot.ticketSeq);
    setBaristaMenuItems(baristaSnapshot.menuItems);
  }, []);

  const addKitchenMenuItem = async () => {
    if (isDirector) return;
    const price = Number(kitchenPrice);
    const prepMinutes = Number(kitchenPrepMinutes);
    if (!kitchenName.trim() || Number.isNaN(price) || price <= 0 || Number.isNaN(prepMinutes) || prepMinutes <= 0) return;
    const approved = await confirm({
      title: "Create Kitchen Menu Item",
      description: `Are you sure you want to add ${kitchenName.trim()} at $${price.toLocaleString()}?`,
      actionLabel: "Add Menu Item",
    });
    if (!approved) return;

    const nextMenuItems = [
      {
        id: `km-${Date.now()}`,
        name: kitchenName.trim(),
        price,
        prepMinutes,
        category: kitchenCategory,
      },
      ...kitchenMenuItems,
    ];
    setKitchenMenuItems(nextMenuItems);
    writePosState(STORAGE_KITCHEN_STATE, kitchenTickets, kitchenSeq, kitchenPayments, nextMenuItems);
    setKitchenName("");
    setKitchenPrice("");
    setKitchenPrepMinutes("15");
    setKitchenCategory("salad");
  };

  const addBaristaMenuItem = async () => {
    if (isDirector) return;
    const price = Number(baristaPrice);
    const prepMinutes = Number(baristaPrepMinutes);
    if (!baristaName.trim() || Number.isNaN(price) || price <= 0 || Number.isNaN(prepMinutes) || prepMinutes <= 0) return;
    const approved = await confirm({
      title: "Create Barista Menu Item",
      description: `Are you sure you want to add ${baristaName.trim()} at TSh ${price.toLocaleString()}?`,
      actionLabel: "Add Menu Item",
    });
    if (!approved) return;

    const nextMenuItems = [
      {
        id: `bm-${Date.now()}`,
        name: baristaName.trim(),
        price,
        prepMinutes,
        category: baristaCategory,
      },
      ...baristaMenuItems,
    ];
    setBaristaMenuItems(nextMenuItems);
    writePosState(STORAGE_BARISTA_STATE, baristaTickets, baristaSeq, baristaPayments, nextMenuItems);
    setBaristaName("");
    setBaristaPrice("");
    setBaristaPrepMinutes("10");
    setBaristaCategory("coffee");
  };

  return (
    <div className="space-y-6">
      {dialog}
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Menu Create</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Create and manage kitchen and barista menu items from one place
        </p>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "kitchen" | "barista")}>
        <TabsList className="h-11">
          <TabsTrigger value="kitchen" className="font-black uppercase text-[10px] tracking-widest">Kitchen POS</TabsTrigger>
          <TabsTrigger value="barista" className="font-black uppercase text-[10px] tracking-widest">Barista POS</TabsTrigger>
        </TabsList>

        <TabsContent value="kitchen" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Create Kitchen Menu Item</CardTitle>
              <CardDescription>Set dish name, section, preparation time, and selling price.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input value={kitchenName} onChange={(event) => setKitchenName(event.target.value)} placeholder="Dish name" disabled={isDirector} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={kitchenCategory}
                onChange={(event) => setKitchenCategory(event.target.value as KitchenMenuCategory)}
                disabled={isDirector}
              >
                {KITCHEN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Input type="number" min="1" value={kitchenPrepMinutes} onChange={(event) => setKitchenPrepMinutes(event.target.value)} placeholder="Prep minutes" disabled={isDirector} />
              <Input type="number" min="1" value={kitchenPrice} onChange={(event) => setKitchenPrice(event.target.value)} placeholder="Price" disabled={isDirector} />
              <div className="md:col-span-4">
                <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addKitchenMenuItem} disabled={isDirector}>
                  Add Menu Item
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Kitchen Menu</CardTitle>
              <CardDescription>Current kitchen menu items and selling prices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Category</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Prep</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitchenMenuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell className="font-bold uppercase text-[10px] tracking-widest">{KITCHEN_CATEGORY_LABELS[item.category]}</TableCell>
                      <TableCell className="font-bold">{item.prepMinutes} min</TableCell>
                      <TableCell className="font-bold">${item.price.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {kitchenMenuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        No kitchen menu items yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barista" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Create Barista Menu Item</CardTitle>
              <CardDescription>Set item name, category, preparation time, and price.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input value={baristaName} onChange={(event) => setBaristaName(event.target.value)} placeholder="Drink or snack name" disabled={isDirector} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={baristaCategory}
                onChange={(event) => setBaristaCategory(event.target.value as BaristaCategory)}
                disabled={isDirector}
              >
                <option value="espresso">Espresso</option>
                <option value="coffee">Coffee</option>
                <option value="tea">Tea</option>
                <option value="cold">Cold</option>
                <option value="snacks">Snacks</option>
              </select>
              <Input type="number" min="1" value={baristaPrepMinutes} onChange={(event) => setBaristaPrepMinutes(event.target.value)} placeholder="Prep minutes" disabled={isDirector} />
              <Input type="number" min="1" value={baristaPrice} onChange={(event) => setBaristaPrice(event.target.value)} placeholder="Price" disabled={isDirector} />
              <div className="md:col-span-4">
                <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={addBaristaMenuItem} disabled={isDirector}>
                  Add Menu Item
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Barista Menu</CardTitle>
              <CardDescription>Current barista menu items and selling prices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Item</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Category</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Prep</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest h-12">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baristaMenuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell className="font-bold uppercase text-[10px] tracking-widest">{item.category}</TableCell>
                      <TableCell className="font-bold">{item.prepMinutes} min</TableCell>
                      <TableCell className="font-bold">TSh {item.price.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {baristaMenuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        No barista menu items yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
