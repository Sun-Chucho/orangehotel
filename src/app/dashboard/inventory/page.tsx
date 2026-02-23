
"use client";

import { useState } from 'react';
import { INVENTORY, InventoryItem } from '@/app/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  History,
  AlertCircle,
  Package,
  ArrowDown
} from "lucide-react";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const lowStockItems = INVENTORY.filter(item => item.stock < item.minStock);
  const filteredInventory = INVENTORY.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Stock Control</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Inventory & procurement management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold">
            <History className="w-4 h-4 mr-2" /> Audit Log
          </Button>
          <Button className="bg-primary hover:bg-primary/90 font-bold">
            <Plus className="w-4 h-4 mr-2" /> New Entry
          </Button>
        </div>
      </header>

      {lowStockItems.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-destructive">Critical Stock Warning</h3>
                <p className="text-sm text-destructive/80 font-medium">{lowStockItems.length} items are below minimum threshold levels.</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="font-bold">Order Now</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search inventory..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Item Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Current Stock</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Level</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const stockRatio = (item.stock / (item.minStock * 2)) * 100;
                  const isLow = item.stock < item.minStock;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isLow ? "text-destructive font-black" : "font-bold"}>
                          {item.stock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <div className="space-y-1">
                          <Progress 
                            value={Math.min(stockRatio, 100)} 
                            className={isLow ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}
                          />
                          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Min: {item.minStock} {item.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="font-bold text-primary">Manage</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-muted flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Total Items</p>
                  <h4 className="text-2xl font-black">{INVENTORY.length}</h4>
                </div>
                <Package className="w-8 h-8 text-primary/40" />
              </div>
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-700 uppercase">Incoming Orders</p>
                  <h4 className="text-2xl font-black">2</h4>
                </div>
                <ArrowDown className="w-8 h-8 text-orange-500/40" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Quick Restock
              </CardTitle>
              <CardDescription>Instantly add received shipments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Select Item</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {INVENTORY.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Quantity</label>
                <Input type="number" placeholder="0.00" />
              </div>
              <Button className="w-full bg-primary font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-primary/20">
                Record Shipment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
