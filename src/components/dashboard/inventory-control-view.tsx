"use client";

import { useEffect, useMemo, useState } from "react";
import { readStoredRole } from "@/app/lib/auth";
import { INVENTORY, InventoryItem } from "@/app/lib/mock-data";
import {
  getStoreItemLabel,
  MainStoreItem,
  normalizeStockName,
  STORAGE_INVENTORY_ITEMS,
  STORAGE_MAIN_STORE_ITEMS,
  STORAGE_STOCK_LOGIC,
  STORAGE_STORE_MOVEMENTS,
  STORAGE_STORE_USAGE,
  StockLogicRule,
  StoreLane,
  StoreMovementLog,
  StoreUsageLog,
  TransferDestination,
} from "@/app/lib/inventory-transfer";
import { readJson, writeJson } from "@/app/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus, Save, Trash2 } from "lucide-react";
import { useIsDirector } from "@/hooks/use-is-director";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

export type InventoryTab =
  | "kitchen-stock"
  | "barista-stock"
  | "stock-control"
  | "stock-movement";

type ItemCategory = "Kitchen" | "Bar";
type StockControlTab = "kitchen" | "barista";

type KitchenCatalogEntry = {
  name: string;
  unit: string;
  buyingPrice: number;
  subCategory:
    | "Fruits"
    | "Vegetables"
    | "Herbs"
    | "Frozen - Meat"
    | "Frozen - Fish"
    | "Butter & Cheese"
    | "Dry Goods"
    | "Juices & Drinks"
    | "Cleaning / Household";
};

const KITCHEN_CATALOG_ITEMS: KitchenCatalogEntry[] = [
  { name: "Avocado", unit: "Each", buyingPrice: 1000, subCategory: "Fruits" },
  { name: "Apple (red/green/pink)", unit: "Each", buyingPrice: 1000, subCategory: "Fruits" },
  { name: "Banana ripe", unit: "Bunch", buyingPrice: 4000, subCategory: "Fruits" },
  { name: "Blueberry 250g", unit: "Each", buyingPrice: 12500, subCategory: "Fruits" },
  { name: "Asparagus", unit: "Kg", buyingPrice: 40000, subCategory: "Fruits" },
  { name: "Cucumber", unit: "Kg", buyingPrice: 2500, subCategory: "Fruits" },
  { name: "Carrots", unit: "Kg", buyingPrice: 3000, subCategory: "Fruits" },
  { name: "Cassava", unit: "Kg", buyingPrice: 2500, subCategory: "Fruits" },
  { name: "Mango", unit: "Each", buyingPrice: 1000, subCategory: "Fruits" },
  { name: "Pineapple", unit: "Each", buyingPrice: 3300, subCategory: "Fruits" },
  { name: "Watermelon", unit: "Kg", buyingPrice: 900, subCategory: "Fruits" },
  { name: "Watermelon", unit: "Pc", buyingPrice: 5000, subCategory: "Fruits" },
  { name: "Sweet banana", unit: "Bunch", buyingPrice: 4000, subCategory: "Fruits" },
  { name: "Green banana / cooking banana", unit: "Bunch", buyingPrice: 7000, subCategory: "Fruits" },
  { name: "Pawpaw", unit: "Each", buyingPrice: 3000, subCategory: "Fruits" },
  { name: "Orange local", unit: "Each", buyingPrice: 500, subCategory: "Fruits" },
  { name: "Lemon local", unit: "Each", buyingPrice: 300, subCategory: "Fruits" },
  { name: "Lemon export yellow", unit: "Kg", buyingPrice: 13000, subCategory: "Fruits" },
  { name: "Lime local", unit: "Each", buyingPrice: 300, subCategory: "Fruits" },
  { name: "Passion fruits (yellow/black)", unit: "Kg", buyingPrice: 5000, subCategory: "Fruits" },
  { name: "Beetroot", unit: "Kg", buyingPrice: 4000, subCategory: "Fruits" },
  { name: "Green grapes export", unit: "Packet", buyingPrice: 12000, subCategory: "Fruits" },
  { name: "Red grapes export", unit: "Packet", buyingPrice: 12000, subCategory: "Fruits" },
  { name: "Cherry tomato 250g", unit: "Packet", buyingPrice: 4000, subCategory: "Fruits" },
  { name: "Red plums export", unit: "Kg", buyingPrice: 18000, subCategory: "Fruits" },
  { name: "Orange yellow export", unit: "Kg", buyingPrice: 12000, subCategory: "Fruits" },
  { name: "Raspberries 250g", unit: "Packet", buyingPrice: 8000, subCategory: "Fruits" },
  { name: "Strawberries 250g", unit: "Packet", buyingPrice: 8000, subCategory: "Fruits" },
  { name: "Tangerine local", unit: "Each", buyingPrice: 700, subCategory: "Fruits" },
  { name: "Tangerine export yellow", unit: "Kg", buyingPrice: 15000, subCategory: "Fruits" },
  { name: "Green garden peas", unit: "Kg", buyingPrice: 8000, subCategory: "Fruits" },
  { name: "Coconut dry", unit: "Pcs", buyingPrice: 2000, subCategory: "Fruits" },
  { name: "Banana mzuzu / plantain banana", unit: "Bunch", buyingPrice: 8000, subCategory: "Fruits" },
  { name: "Sweet melon", unit: "Kg", buyingPrice: 5000, subCategory: "Fruits" },
  { name: "Pomegranate fruits", unit: "Each", buyingPrice: 4000, subCategory: "Fruits" },
  { name: "Kiwi fruits", unit: "Each", buyingPrice: 3000, subCategory: "Fruits" },
  { name: "Pears", unit: "Kg", buyingPrice: 15000, subCategory: "Fruits" },
  { name: "Green grapefruit export", unit: "Pkt", buyingPrice: 12000, subCategory: "Fruits" },
  { name: "Red grapes", unit: "Pkt", buyingPrice: 12000, subCategory: "Fruits" },
  { name: "Irish potatoes", unit: "Kg", buyingPrice: 2200, subCategory: "Vegetables" },
  { name: "Irish potato (debe)", unit: "Debe", buyingPrice: 25000, subCategory: "Vegetables" },
  { name: "Green pepper", unit: "Kg", buyingPrice: 3000, subCategory: "Vegetables" },
  { name: "Yellow pepper", unit: "Kg", buyingPrice: 10000, subCategory: "Vegetables" },
  { name: "Red pepper", unit: "Kg", buyingPrice: 10000, subCategory: "Vegetables" },
  { name: "Green beans", unit: "Kg", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Broccoli", unit: "Kg", buyingPrice: 5000, subCategory: "Vegetables" },
  { name: "Cauliflower", unit: "Kg", buyingPrice: 6000, subCategory: "Vegetables" },
  { name: "Leeks", unit: "Kg", buyingPrice: 6000, subCategory: "Vegetables" },
  { name: "Zucchini", unit: "Kg", buyingPrice: 5000, subCategory: "Vegetables" },
  { name: "Butternut", unit: "Kg", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Red onion", unit: "Kg", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Red onion (sack)", unit: "Sado", buyingPrice: 10000, subCategory: "Vegetables" },
  { name: "White onion", unit: "Kg", buyingPrice: 7000, subCategory: "Vegetables" },
  { name: "Tomato", unit: "Kg", buyingPrice: 2500, subCategory: "Vegetables" },
  { name: "Tomato (sack)", unit: "Sado", buyingPrice: 8000, subCategory: "Vegetables" },
  { name: "Radish", unit: "Bunch", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "White cabbage", unit: "Each", buyingPrice: 2000, subCategory: "Vegetables" },
  { name: "Red cabbage", unit: "Each", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Lettuce fancy/green", unit: "Each", buyingPrice: 800, subCategory: "Vegetables" },
  { name: "Rocket lettuce", unit: "Bunch", buyingPrice: 1000, subCategory: "Vegetables" },
  { name: "Garlic exported", unit: "Kg", buyingPrice: 15000, subCategory: "Vegetables" },
  { name: "Fresh chili", unit: "Kg", buyingPrice: 8000, subCategory: "Vegetables" },
  { name: "Spinach", unit: "Bunch", buyingPrice: 500, subCategory: "Vegetables" },
  { name: "Sweet potato", unit: "Kg", buyingPrice: 2000, subCategory: "Vegetables" },
  { name: "Ginger", unit: "Kg", buyingPrice: 5000, subCategory: "Vegetables" },
  { name: "Celery", unit: "Kg", buyingPrice: 9000, subCategory: "Vegetables" },
  { name: "Aubergine / Eggplant", unit: "Kg", buyingPrice: 2500, subCategory: "Vegetables" },
  { name: "Sugar snaps 250g", unit: "Packet", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Snow peas 250g", unit: "Packet", buyingPrice: 4000, subCategory: "Vegetables" },
  { name: "Mushrooms button", unit: "Packet", buyingPrice: 12000, subCategory: "Vegetables" },
  { name: "Mushrooms oyster", unit: "Packet", buyingPrice: 12000, subCategory: "Vegetables" },
  { name: "Mchicha local", unit: "Bunch", buyingPrice: 700, subCategory: "Vegetables" },
  { name: "Sukuma wiki", unit: "Bunch", buyingPrice: 700, subCategory: "Vegetables" },
  { name: "Yam potato (magimbi)", unit: "Kg", buyingPrice: 6000, subCategory: "Vegetables" },
  { name: "Tamarind", unit: "Kg", buyingPrice: 6000, subCategory: "Vegetables" },
  { name: "Baby potato", unit: "Kg", buyingPrice: 3500, subCategory: "Vegetables" },
  { name: "Okra / bamia", unit: "Kg", buyingPrice: 5000, subCategory: "Vegetables" },
  { name: "Bitter tomato / ngogwe", unit: "Kg", buyingPrice: 3000, subCategory: "Vegetables" },
  { name: "Pumpkin", unit: "Each", buyingPrice: 5000, subCategory: "Vegetables" },
  { name: "Parsley fresh", unit: "Bunch", buyingPrice: 1500, subCategory: "Herbs" },
  { name: "Basil", unit: "Bunch", buyingPrice: 1500, subCategory: "Herbs" },
  { name: "Fresh rosemary", unit: "Bunch", buyingPrice: 2000, subCategory: "Herbs" },
  { name: "Coriander", unit: "Bunch", buyingPrice: 300, subCategory: "Herbs" },
  { name: "Tarragon", unit: "Bunch", buyingPrice: 2500, subCategory: "Herbs" },
  { name: "Mint", unit: "Bunch", buyingPrice: 2000, subCategory: "Herbs" },
  { name: "Spring onion", unit: "Bunch", buyingPrice: 1500, subCategory: "Herbs" },
  { name: "Chives", unit: "Bunch", buyingPrice: 2000, subCategory: "Herbs" },
  { name: "Oregano", unit: "Bunch", buyingPrice: 1500, subCategory: "Herbs" },
  { name: "Chicken", unit: "1 pc", buyingPrice: 9000, subCategory: "Frozen - Meat" },
  { name: "Chicken breast", unit: "1 pkt", buyingPrice: 18000, subCategory: "Frozen - Meat" },
  { name: "Chicken wings", unit: "1 pkt", buyingPrice: 13000, subCategory: "Frozen - Meat" },
  { name: "Chicken drumstick", unit: "1 pkt", buyingPrice: 13000, subCategory: "Frozen - Meat" },
  { name: "Chicken thigh", unit: "1 pkt", buyingPrice: 15000, subCategory: "Frozen - Meat" },
  { name: "Eggs", unit: "Tray", buyingPrice: 11000, subCategory: "Frozen - Meat" },
  { name: "Lamb leg", unit: "1 kg", buyingPrice: 16000, subCategory: "Frozen - Meat" },
  { name: "Lamb chop", unit: "1 kg", buyingPrice: 20000, subCategory: "Frozen - Meat" },
  { name: "Staff beef", unit: "1 kg", buyingPrice: 13000, subCategory: "Frozen - Meat" },
  { name: "Mince meat", unit: "1 kg", buyingPrice: 15000, subCategory: "Frozen - Meat" },
  { name: "Beef fillet", unit: "1 kg", buyingPrice: 24000, subCategory: "Frozen - Meat" },
  { name: "Beef steak", unit: "1 kg", buyingPrice: 16500, subCategory: "Frozen - Meat" },
  { name: "Beef bacon", unit: "1 kg", buyingPrice: 40000, subCategory: "Frozen - Meat" },
  { name: "Strike bacon", unit: "1 kg", buyingPrice: 30000, subCategory: "Frozen - Meat" },
  { name: "Chicken sausage", unit: "Kg", buyingPrice: 25000, subCategory: "Frozen - Meat" },
  { name: "Chicken sausage Vienna", unit: "500g", buyingPrice: 12000, subCategory: "Frozen - Meat" },
  { name: "Beef sausage", unit: "Pkt", buyingPrice: 7500, subCategory: "Frozen - Meat" },
  { name: "Jumbo prawns", unit: "2 kg", buyingPrice: 150000, subCategory: "Frozen - Fish" },
  { name: "Fish fillet", unit: "1 kg", buyingPrice: 24000, subCategory: "Frozen - Fish" },
  { name: "Tiger prawns", unit: "1 kg", buyingPrice: 85000, subCategory: "Frozen - Fish" },
  { name: "Red snapper", unit: "1 kg", buyingPrice: 20000, subCategory: "Frozen - Fish" },
  { name: "King fish", unit: "1 kg", buyingPrice: 25000, subCategory: "Frozen - Fish" },
  { name: "Peeled prawns", unit: "1 kg", buyingPrice: 38000, subCategory: "Frozen - Fish" },
  { name: "Tuna fish", unit: "1 kg", buyingPrice: 22000, subCategory: "Frozen - Fish" },
  { name: "Calamari", unit: "1 kg", buyingPrice: 45000, subCategory: "Frozen - Fish" },
  { name: "Tilapia fish", unit: "1 kg", buyingPrice: 16000, subCategory: "Frozen - Fish" },
  { name: "Nile perch whole", unit: "1 kg", buyingPrice: 16000, subCategory: "Frozen - Fish" },
  { name: "Mozzarella cheese", unit: "1 kg", buyingPrice: 30000, subCategory: "Butter & Cheese" },
  { name: "Cheddar cheese", unit: "1 kg", buyingPrice: 40000, subCategory: "Butter & Cheese" },
  { name: "Parmesan cheese", unit: "1 kg", buyingPrice: 130000, subCategory: "Butter & Cheese" },
  { name: "Gauda cheese", unit: "1 kg", buyingPrice: 40000, subCategory: "Butter & Cheese" },
  { name: "Feta cheese", unit: "1 kg", buyingPrice: 40000, subCategory: "Butter & Cheese" },
  { name: "Feta cheese", unit: "Pkt", buyingPrice: 17000, subCategory: "Butter & Cheese" },
  { name: "Feta cheese", unit: "Tin", buyingPrice: 9000, subCategory: "Butter & Cheese" },
  { name: "Calumi cheese", unit: "1 kg", buyingPrice: 40000, subCategory: "Butter & Cheese" },
  { name: "Cream cheese", unit: "Tin", buyingPrice: 8500, subCategory: "Butter & Cheese" },
  { name: "Butter", unit: "500 g", buyingPrice: 20000, subCategory: "Butter & Cheese" },
  { name: "Panere cheese", unit: "Kg", buyingPrice: 38000, subCategory: "Butter & Cheese" },
  { name: "Cling film", unit: "Pkt", buyingPrice: 20000, subCategory: "Dry Goods" },
  { name: "Aluminium wrap (foil)", unit: "Pkt", buyingPrice: 25000, subCategory: "Dry Goods" },
  { name: "Blue band", unit: "Kg", buyingPrice: 12000, subCategory: "Dry Goods" },
  { name: "Chilli powder", unit: "Pkt", buyingPrice: 4000, subCategory: "Dry Goods" },
  { name: "Oregano", unit: "Tin", buyingPrice: 3500, subCategory: "Dry Goods" },
  { name: "Lentin flour", unit: "Kg", buyingPrice: 6500, subCategory: "Dry Goods" },
  { name: "Muster flour", unit: "Kg", buyingPrice: 5000, subCategory: "Dry Goods" },
  { name: "Chick peas", unit: "Tin", buyingPrice: 4000, subCategory: "Dry Goods" },
  { name: "Black olives", unit: "Btl", buyingPrice: 6000, subCategory: "Dry Goods" },
  { name: "Green olives", unit: "Btl", buyingPrice: 6000, subCategory: "Dry Goods" },
  { name: "Milton", unit: "Btl", buyingPrice: 8000, subCategory: "Dry Goods" },
  { name: "Cocoa prime", unit: "Pkt", buyingPrice: 18000, subCategory: "Dry Goods" },
  { name: "Tomato ketchup", unit: "Btl", buyingPrice: 5000, subCategory: "Dry Goods" },
  { name: "Chilli ketchup", unit: "Btl", buyingPrice: 5000, subCategory: "Dry Goods" },
  { name: "Mayonnaise", unit: "Btl", buyingPrice: 24000, subCategory: "Dry Goods" },
  { name: "White vinegar", unit: "Btl", buyingPrice: 1500, subCategory: "Dry Goods" },
  { name: "Olive oil", unit: "Btl", buyingPrice: 30000, subCategory: "Dry Goods" },
  { name: "Maple syrup", unit: "Btl", buyingPrice: 15000, subCategory: "Dry Goods" },
  { name: "Red wine vinegar", unit: "Btl", buyingPrice: 10000, subCategory: "Dry Goods" },
  { name: "Tang juice", unit: "Ltr", buyingPrice: 13000, subCategory: "Juices & Drinks" },
  { name: "Lemon juice", unit: "Tin", buyingPrice: 12000, subCategory: "Juices & Drinks" },
  { name: "Juice series apple", unit: "Ltr", buyingPrice: 6000, subCategory: "Juices & Drinks" },
  { name: "Series orange", unit: "Ltr", buyingPrice: 6000, subCategory: "Juices & Drinks" },
  { name: "Passion series", unit: "Ltr", buyingPrice: 6000, subCategory: "Juices & Drinks" },
  { name: "Pineapple series", unit: "Ltr", buyingPrice: 6000, subCategory: "Juices & Drinks" },
  { name: "Tropical", unit: "Ltr", buyingPrice: 6000, subCategory: "Juices & Drinks" },
  { name: "Motopoa", unit: "Ltr", buyingPrice: 9000, subCategory: "Juices & Drinks" },
  { name: "Motopoa", unit: "5 Ltr", buyingPrice: 30000, subCategory: "Juices & Drinks" },
  { name: "Milk powder (Nido)", unit: "Tin", buyingPrice: 25000, subCategory: "Cleaning / Household" },
  { name: "Lato milk powder", unit: "Tin", buyingPrice: 14000, subCategory: "Cleaning / Household" },
  { name: "Ajinomoto", unit: "Pkt", buyingPrice: 5000, subCategory: "Cleaning / Household" },
  { name: "Super Brite", unit: "Outer", buyingPrice: 4000, subCategory: "Cleaning / Household" },
  { name: "Air freshner", unit: "Pc", buyingPrice: 3500, subCategory: "Cleaning / Household" },
  { name: "Toilet paper", unit: "Roll", buyingPrice: 1000, subCategory: "Cleaning / Household" },
  { name: "Toilet paper", unit: "Roll (10,000)", buyingPrice: 10000, subCategory: "Cleaning / Household" },
  { name: "Toilet paper", unit: "Roll (12,000)", buyingPrice: 12000, subCategory: "Cleaning / Household" },
  { name: "Vim", unit: "1kg", buyingPrice: 4000, subCategory: "Cleaning / Household" },
  { name: "Vim", unit: "1kg (7,000)", buyingPrice: 7000, subCategory: "Cleaning / Household" },
  { name: "Jik", unit: "1 Ltr", buyingPrice: 7500, subCategory: "Cleaning / Household" },
  { name: "Hand wash", unit: "500ml", buyingPrice: 4000, subCategory: "Cleaning / Household" },
  { name: "Dettol", unit: "500ml", buyingPrice: 13000, subCategory: "Cleaning / Household" },
  { name: "Guest soap", unit: "Pc", buyingPrice: 300, subCategory: "Cleaning / Household" },
  { name: "Liquid soap", unit: "5 Ltr", buyingPrice: 11000, subCategory: "Cleaning / Household" },
  { name: "Toilet roll big", unit: "Pc", buyingPrice: 10000, subCategory: "Cleaning / Household" },
  { name: "Sanitizer", unit: "Bottle", buyingPrice: 7500, subCategory: "Cleaning / Household" },
  { name: "Steel wire", unit: "Roll", buyingPrice: 8000, subCategory: "Cleaning / Household" },
];

function buildKitchenCatalogSeed(existingStoreItems: MainStoreItem[], existingInventoryItems: InventoryItem[]) {
  const existingStoreKeys = new Set(
    existingStoreItems
      .filter((item) => item.lane === "kitchen")
      .map((item) => `${normalizeStockName(item.name)}|${normalizeStockName(item.unit)}|${normalizeStockName(item.subCategory ?? "")}`),
  );
  const existingInventoryKeys = new Set(
    existingInventoryItems
      .filter((item) => item.category === "Kitchen")
      .map((item) => `${normalizeStockName(item.name)}|${normalizeStockName(item.unit)}|${normalizeStockName(item.subCategory ?? "")}`),
  );

  const storeSeeds: MainStoreItem[] = [];
  const inventorySeeds: InventoryItem[] = [];

  KITCHEN_CATALOG_ITEMS.forEach((entry, index) => {
    const key = `${normalizeStockName(entry.name)}|${normalizeStockName(entry.unit)}|${normalizeStockName(entry.subCategory)}`;
    if (!existingStoreKeys.has(key)) {
      storeSeeds.push({
        id: `kitchen-catalog-store-${index + 1}`,
        name: entry.name,
        stock: 0,
        unit: entry.unit,
        minStock: 0,
        lane: "kitchen",
        subCategory: entry.subCategory,
        buyingPrice: entry.buyingPrice,
        sellingPrice: 0,
      });
    }
    if (!existingInventoryKeys.has(key)) {
      inventorySeeds.push({
        id: `kitchen-catalog-inv-${index + 1}`,
        barcode: "",
        name: entry.name,
        category: "Kitchen",
        subCategory: entry.subCategory,
        size: "",
        stock: 0,
        totSold: 0,
        buyingPrice: entry.buyingPrice,
        sellingPrice: 0,
        price: 0,
        status: "ACTIVE",
        minStock: 0,
        unit: entry.unit,
      });
    }
  });

  return { storeSeeds, inventorySeeds };
}

function getStockLabel(stock: number, minStock: number) {
  if (stock <= 0) return "Out";
  if (stock < minStock) return "Low";
  return "In Stock";
}

function getLogicLabel(rule: StockLogicRule | undefined) {
  if (!rule) return "No Logic";
  return `1 ${rule.storeUnit} -> ${rule.unitToMenu} ${rule.departmentUnit}`;
}

export function InventoryControlView({
  initialTab,
  visibleTabs = ["kitchen-stock", "barista-stock", "stock-control", "stock-movement"],
}: {
  initialTab: InventoryTab;
  visibleTabs?: InventoryTab[];
}) {
  const isDirector = useIsDirector();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [stockControlTab, setStockControlTab] = useState<StockControlTab>("kitchen");
  const [stockMovementTab, setStockMovementTab] = useState<StockControlTab>("kitchen");
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY);
  const [storeItems, setStoreItems] = useState<MainStoreItem[]>([]);
  const [movementLogs, setMovementLogs] = useState<StoreMovementLog[]>([]);
  const [logicRules, setLogicRules] = useState<StockLogicRule[]>([]);

  const [kitchenName, setKitchenName] = useState("");
  const [kitchenQty, setKitchenQty] = useState("0");
  const [kitchenUnit, setKitchenUnit] = useState("kg");
  const [kitchenThreshold, setKitchenThreshold] = useState("1");
  const [kitchenBuyingPrice, setKitchenBuyingPrice] = useState("");
  const [kitchenSellingPrice, setKitchenSellingPrice] = useState("");

  const [baristaName, setBaristaName] = useState("");
  const [baristaQty, setBaristaQty] = useState("0");
  const [baristaUnit, setBaristaUnit] = useState("kg");
  const [baristaThreshold, setBaristaThreshold] = useState("1");
  const [baristaBuyingPrice, setBaristaBuyingPrice] = useState("");
  const [baristaSellingPrice, setBaristaSellingPrice] = useState("");

  const [selectedKitchenRuleItemId, setSelectedKitchenRuleItemId] = useState("");
  const [selectedBaristaRuleItemId, setSelectedBaristaRuleItemId] = useState("");
  const [kitchenDepartmentUnit, setKitchenDepartmentUnit] = useState("portion");
  const [baristaDepartmentUnit, setBaristaDepartmentUnit] = useState("cup");
  const [kitchenUnitToMenu, setKitchenUnitToMenu] = useState("1");
  const [baristaUnitToMenu, setBaristaUnitToMenu] = useState("1");
  const [kitchenLogicNote, setKitchenLogicNote] = useState("");
  const [baristaLogicNote, setBaristaLogicNote] = useState("");

  const [selectedKitchenMoveItemId, setSelectedKitchenMoveItemId] = useState("");
  const [selectedBaristaMoveItemId, setSelectedBaristaMoveItemId] = useState("");
  const [kitchenMoveQty, setKitchenMoveQty] = useState("1");
  const [baristaMoveQty, setBaristaMoveQty] = useState("1");
  const { confirm, dialog } = useConfirmDialog();
  const canViewBuyingPrice = role === "inventory";

  useEffect(() => {
    setRole(readStoredRole());
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTab === "barista-stock") {
      setStockControlTab("barista");
      setStockMovementTab("barista");
    } else if (initialTab === "kitchen-stock") {
      setStockControlTab("kitchen");
      setStockMovementTab("kitchen");
    }
  }, [initialTab]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? "kitchen-stock");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const applyInventorySnapshot = () => {
      const inv = readJson<InventoryItem[]>(STORAGE_INVENTORY_ITEMS) ?? [];
      const store = readJson<Array<MainStoreItem & { lane?: StoreLane }>>(STORAGE_MAIN_STORE_ITEMS) ?? [];
      const moves = readJson<StoreMovementLog[]>(STORAGE_STORE_MOVEMENTS);
      const rules = readJson<StockLogicRule[]>(STORAGE_STOCK_LOGIC);
      const normalizedStore: MainStoreItem[] = store.map((item) => ({
        ...item,
        lane: item.lane === "barista" ? "barista" : "kitchen",
      }));
      const { storeSeeds, inventorySeeds } = buildKitchenCatalogSeed(normalizedStore, inv);
      const nextStore = storeSeeds.length > 0 ? [...normalizedStore, ...storeSeeds] : normalizedStore;
      const nextInventory = inventorySeeds.length > 0 ? [...inv, ...inventorySeeds] : inv;

      if (storeSeeds.length > 0) {
        writeJson(STORAGE_MAIN_STORE_ITEMS, nextStore);
      }
      if (inventorySeeds.length > 0) {
        writeJson(STORAGE_INVENTORY_ITEMS, nextInventory);
      }

      setItems(nextInventory);
      setStoreItems(nextStore);
      if (Array.isArray(moves)) setMovementLogs(moves);
      if (Array.isArray(rules)) setLogicRules(rules);
    };

    applyInventorySnapshot();
    const unsubscribeInventory = subscribeToSyncedStorageKey(STORAGE_INVENTORY_ITEMS, applyInventorySnapshot);
    const unsubscribeStore = subscribeToSyncedStorageKey(STORAGE_MAIN_STORE_ITEMS, applyInventorySnapshot);
    const unsubscribeMoves = subscribeToSyncedStorageKey(STORAGE_STORE_MOVEMENTS, applyInventorySnapshot);
    const unsubscribeLogic = subscribeToSyncedStorageKey(STORAGE_STOCK_LOGIC, applyInventorySnapshot);

    return () => {
      unsubscribeInventory();
      unsubscribeStore();
      unsubscribeMoves();
      unsubscribeLogic();
    };
  }, []);

  const kitchenStore = useMemo(() => storeItems.filter((item) => item.lane === "kitchen"), [storeItems]);
  const baristaStore = useMemo(() => storeItems.filter((item) => item.lane === "barista"), [storeItems]);
  const kitchenInventoryItems = useMemo(() => items.filter((item) => item.category === "Kitchen"), [items]);
  const baristaInventoryItems = useMemo(() => items.filter((item) => item.category === "Bar"), [items]);
  const kitchenLogicRules = useMemo(() => logicRules.filter((rule) => rule.destination === "kitchen"), [logicRules]);
  const baristaLogicRules = useMemo(() => logicRules.filter((rule) => rule.destination === "barista"), [logicRules]);

  const selectedKitchenRuleItem = useMemo(
    () => kitchenStore.find((item) => item.id === selectedKitchenRuleItemId),
    [kitchenStore, selectedKitchenRuleItemId],
  );
  const selectedBaristaRuleItem = useMemo(
    () => baristaStore.find((item) => item.id === selectedBaristaRuleItemId),
    [baristaStore, selectedBaristaRuleItemId],
  );
  const selectedKitchenMoveItem = useMemo(
    () => kitchenStore.find((item) => item.id === selectedKitchenMoveItemId),
    [kitchenStore, selectedKitchenMoveItemId],
  );
  const selectedBaristaMoveItem = useMemo(
    () => baristaStore.find((item) => item.id === selectedBaristaMoveItemId),
    [baristaStore, selectedBaristaMoveItemId],
  );

  const getRuleForItem = (destination: TransferDestination, itemId: string) =>
    logicRules.find((rule) => rule.destination === destination && rule.itemId === itemId);

  const addStoreItem = async (lane: StoreLane) => {
    if (isDirector) return;

    const name = lane === "kitchen" ? kitchenName : baristaName;
    const qtyRaw = lane === "kitchen" ? kitchenQty : baristaQty;
    const unit = lane === "kitchen" ? kitchenUnit : baristaUnit;
    const thresholdRaw = lane === "kitchen" ? kitchenThreshold : baristaThreshold;
    const buyingRaw = lane === "kitchen" ? kitchenBuyingPrice : baristaBuyingPrice;
    const sellingRaw = lane === "kitchen" ? kitchenSellingPrice : baristaSellingPrice;
    
    const qty = Number(qtyRaw);
    const threshold = Number(thresholdRaw);
    const buyingPrice = Number(buyingRaw) || 0;
    const sellingPrice = Number(sellingRaw) || 0;

    if (!name.trim() || Number.isNaN(qty) || qty < 0 || !unit.trim() || Number.isNaN(threshold) || threshold < 0) {
      return;
    }
    if (sellingPrice <= 0) return;

    const approved = await confirm({
      title: "Update Stock",
      description: `Are you sure you want to add ${qty} ${unit} of ${name.trim()} with a low threshold of ${threshold}?`,
      actionLabel: "Add Stock",
    });
    if (!approved) return;

    const existingItem = storeItems.find(
      (item) =>
        item.lane === lane &&
        normalizeStockName(item.name) === normalizeStockName(name) &&
        normalizeStockName(item.unit) === normalizeStockName(unit),
    );

    const nextStoreItems = existingItem
      ? storeItems.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                stock: item.stock + qty,
                unit,
                minStock: threshold,
                buyingPrice: canViewBuyingPrice && buyingPrice > 0 ? buyingPrice : item.buyingPrice,
                sellingPrice: sellingPrice > 0 ? sellingPrice : item.sellingPrice,
              }
            : item,
        )
      : [{ id: `s-${Date.now()}`, name: name.trim(), stock: qty, unit, minStock: threshold, lane, buyingPrice: canViewBuyingPrice ? buyingPrice : 0, sellingPrice }, ...storeItems];

    setStoreItems(nextStoreItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);

    // Add directly to main Inventory too if applicable for Barista POS sync
    const nextInventoryItems = [...items];
    const category = lane === "kitchen" ? "Kitchen" : "Bar";
    const existingInv = nextInventoryItems.find(i => i.category === category && normalizeStockName(i.name) === normalizeStockName(name));
    
    if (existingInv) {
        existingInv.stock += qty;
        if (canViewBuyingPrice && buyingPrice > 0) existingInv.buyingPrice = buyingPrice;
        if (sellingPrice > 0) existingInv.sellingPrice = sellingPrice;
        if (sellingPrice > 0) existingInv.price = sellingPrice;
    } else {
        nextInventoryItems.unshift({
            id: `inv-${Date.now()}`,
            barcode: Date.now().toString(),
            name: name.trim(),
            category,
            size: '',
            stock: qty,
            totSold: 0,
            buyingPrice: canViewBuyingPrice ? buyingPrice : 0,
            sellingPrice,
            price: sellingPrice,
            status: 'ACTIVE',
            minStock: threshold,
            unit
        });
    }
    setItems(nextInventoryItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextInventoryItems);

    if (lane === "kitchen") {
      setKitchenName("");
      setKitchenQty("0");
      setKitchenUnit("kg");
      setKitchenThreshold("1");
      setKitchenBuyingPrice("");
      setKitchenSellingPrice("");
      return;
    }

    setBaristaName("");
    setBaristaQty("0");
    setBaristaUnit("kg");
    setBaristaThreshold("1");
    setBaristaBuyingPrice("");
    setBaristaSellingPrice("");
  };

  const saveLogicRule = async (lane: StoreLane) => {
    if (isDirector) return;

    const selectedItem = lane === "kitchen" ? selectedKitchenRuleItem : selectedBaristaRuleItem;
    const departmentUnit = (lane === "kitchen" ? kitchenDepartmentUnit : baristaDepartmentUnit).trim();
    const unitToMenu = Number(lane === "kitchen" ? kitchenUnitToMenu : baristaUnitToMenu);
    const logicNote = (lane === "kitchen" ? kitchenLogicNote : baristaLogicNote).trim();

    if (!selectedItem || !departmentUnit || Number.isNaN(unitToMenu) || unitToMenu <= 0 || !logicNote) return;

    const approved = await confirm({
      title: "Save Stock Logic",
      description: `Are you sure you want to save the conversion rule for ${selectedItem.name}?`,
      actionLabel: "Save Logic",
    });
    if (!approved) return;

    const nextRule: StockLogicRule = {
      id: `logic-${lane}-${selectedItem.id}`,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      destination: lane,
      storeUnit: selectedItem.unit,
      departmentUnit,
      unitToMenu,
      logicNote,
      updatedAt: Date.now(),
    };

    const nextRules = [
      nextRule,
      ...logicRules.filter((rule) => !(rule.destination === lane && rule.itemId === selectedItem.id)),
    ];

    setLogicRules(nextRules);
    writeJson(STORAGE_STOCK_LOGIC, nextRules);

    if (lane === "kitchen") {
      setKitchenDepartmentUnit("portion");
      setKitchenUnitToMenu("1");
      setKitchenLogicNote("");
      return;
    }

    setBaristaDepartmentUnit("cup");
    setBaristaUnitToMenu("1");
    setBaristaLogicNote("");
  };

  const recordMovement = async (lane: StoreLane) => {
    if (isDirector) return;

    const selectedItem = lane === "kitchen" ? selectedKitchenMoveItem : selectedBaristaMoveItem;
    const moveQty = Number(lane === "kitchen" ? kitchenMoveQty : baristaMoveQty);
    const rule = getRuleForItem(lane, selectedItem?.id ?? "");

    if (!selectedItem || !rule || Number.isNaN(moveQty) || moveQty <= 0 || moveQty > selectedItem.stock) return;

    const approved = await confirm({
      title: "Record Stock Movement",
      description: `Are you sure you want to move ${moveQty} ${selectedItem.unit} of ${selectedItem.name} to ${lane}?`,
      actionLabel: "Record Movement",
    });
    if (!approved) return;

    const convertedQty = moveQty * rule.unitToMenu;
    const destinationCategory: ItemCategory = lane === "kitchen" ? "Kitchen" : "Bar";
    const itemLabel = getStoreItemLabel(selectedItem);
    const normalizedName = normalizeStockName(itemLabel);

    const nextStoreItems = storeItems.map((item) =>
      item.id === selectedItem.id ? { ...item, stock: item.stock - moveQty } : item,
    );

    const existingInventoryItem = items.find(
      (item) => item.category === destinationCategory && normalizeStockName(item.name) === normalizedName,
    );

    const nextItems = existingInventoryItem
      ? items.map((item) =>
          item.id === existingInventoryItem.id
            ? {
                ...item,
                stock: item.stock + convertedQty,
                minStock: selectedItem.minStock,
                buyingPrice:
                  typeof selectedItem.buyingPrice === "number" && selectedItem.buyingPrice > 0
                    ? selectedItem.buyingPrice
                    : item.buyingPrice,
                sellingPrice:
                  typeof selectedItem.sellingPrice === "number" && selectedItem.sellingPrice > 0
                    ? selectedItem.sellingPrice
                    : item.sellingPrice,
                price:
                  typeof selectedItem.sellingPrice === "number" && selectedItem.sellingPrice > 0
                    ? selectedItem.sellingPrice
                    : item.sellingPrice ?? item.price ?? 0,
                name: itemLabel,
              }
            : item,
        )
      : [
          {
            id: `i-${Date.now()}`,
            barcode: "",
            name: itemLabel,
            category: destinationCategory,
            size: selectedItem.size || "",
            stock: convertedQty,
            totSold: 0,
            buyingPrice: selectedItem.buyingPrice ?? 0,
            sellingPrice: selectedItem.sellingPrice ?? 0,
            status: "ACTIVE" as const,
            minStock: selectedItem.minStock,
            unit: rule.departmentUnit,
            price: selectedItem.sellingPrice ?? selectedItem.buyingPrice ?? 0,
          },
          ...items,
        ];

    const nextMovementLogs: StoreMovementLog[] = [
      {
        id: `mv-${Date.now()}`,
        itemId: selectedItem.id,
        itemName: itemLabel,
        source: "store",
        destination: lane,
        storeQtyMoved: moveQty,
        storeUnit: selectedItem.unit,
        conversionValue: rule.unitToMenu,
        conversionNote: `${rule.logicNote} | 1 ${rule.storeUnit} = ${rule.unitToMenu} ${rule.departmentUnit}`,
        convertedQty,
        movedAt: Date.now(),
      },
      ...movementLogs,
    ];

    setStoreItems(nextStoreItems);
    setItems(nextItems);
    setMovementLogs(nextMovementLogs);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    writeJson(STORAGE_INVENTORY_ITEMS, nextItems);
    writeJson(STORAGE_STORE_MOVEMENTS, nextMovementLogs);

    if (lane === "kitchen") {
      setKitchenMoveQty("1");
      return;
    }

    setBaristaMoveQty("1");
  };

  const clearDepartmentInventory = async (lane: StoreLane) => {
    if (isDirector) return;

    const label = lane === "kitchen" ? "Kitchen" : "Bar";
    const destinationCategory: ItemCategory = lane === "kitchen" ? "Kitchen" : "Bar";
    const laneMovementIds = movementLogs
      .filter((movement) => movement.destination === lane)
      .map((movement) => movement.id);

    const approved = await confirm({
      title: `Clear ${label} Inventory`,
      description: `Are you sure you want to clear all ${label.toLowerCase()} stock, movement logs, logic rules, and usage records?`,
      actionLabel: `Clear ${label}`,
    });
    if (!approved) return;

    const nextItems = items.filter((item) => item.category !== destinationCategory);
    const nextStoreItems = storeItems.filter((item) => item.lane !== lane);
    const nextMovementLogs = movementLogs.filter((movement) => movement.destination !== lane);
    const nextLogicRules = logicRules.filter((rule) => rule.destination !== lane);
    const usageLogs = readJson<StoreUsageLog[]>(STORAGE_STORE_USAGE) ?? [];
    const nextUsageLogs = usageLogs.filter(
      (entry) => entry.destination !== lane && !laneMovementIds.includes(entry.movementId),
    );

    setItems(nextItems);
    setStoreItems(nextStoreItems);
    setMovementLogs(nextMovementLogs);
    setLogicRules(nextLogicRules);

    writeJson(STORAGE_INVENTORY_ITEMS, nextItems);
    writeJson(STORAGE_MAIN_STORE_ITEMS, nextStoreItems);
    writeJson(STORAGE_STORE_MOVEMENTS, nextMovementLogs);
    writeJson(STORAGE_STOCK_LOGIC, nextLogicRules);
    writeJson(STORAGE_STORE_USAGE, nextUsageLogs);

    if (lane === "kitchen") {
      setKitchenName("");
      setKitchenQty("0");
      setKitchenUnit("kg");
      setKitchenThreshold("1");
      setKitchenBuyingPrice("");
      setKitchenSellingPrice("");
      setSelectedKitchenRuleItemId("");
      setKitchenDepartmentUnit("portion");
      setKitchenUnitToMenu("1");
      setKitchenLogicNote("");
      setSelectedKitchenMoveItemId("");
      setKitchenMoveQty("1");
      return;
    }

    setBaristaName("");
    setBaristaQty("0");
    setBaristaUnit("kg");
    setBaristaThreshold("1");
    setBaristaBuyingPrice("");
    setBaristaSellingPrice("");
    setSelectedBaristaRuleItemId("");
    setBaristaDepartmentUnit("cup");
    setBaristaUnitToMenu("1");
    setBaristaLogicNote("");
    setSelectedBaristaMoveItemId("");
    setBaristaMoveQty("1");
  };

  const renderStoreCard = (lane: StoreLane, title: string, list: MainStoreItem[]) => (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-lg uppercase font-black">{title}</CardTitle>
        <CardDescription>Enter stock quantity and low stock threshold together.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <Input
            value={lane === "kitchen" ? kitchenName : baristaName}
            onChange={(event) => (lane === "kitchen" ? setKitchenName(event.target.value) : setBaristaName(event.target.value))}
            placeholder="Item name"
            className="lg:col-span-2"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenQty : baristaQty}
            onChange={(event) => (lane === "kitchen" ? setKitchenQty(event.target.value) : setBaristaQty(event.target.value))}
            placeholder="Quantity"
          />
          <Input
            value={lane === "kitchen" ? kitchenUnit : baristaUnit}
            onChange={(event) => (lane === "kitchen" ? setKitchenUnit(event.target.value) : setBaristaUnit(event.target.value))}
            placeholder="Unit"
          />
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenThreshold : baristaThreshold}
            onChange={(event) => (lane === "kitchen" ? setKitchenThreshold(event.target.value) : setBaristaThreshold(event.target.value))}
            placeholder="Low threshold"
          />
          {canViewBuyingPrice && (
            <Input
              type="number"
              min="0"
              value={lane === "kitchen" ? kitchenBuyingPrice : baristaBuyingPrice}
              onChange={(event) => (lane === "kitchen" ? setKitchenBuyingPrice(event.target.value) : setBaristaBuyingPrice(event.target.value))}
              placeholder="BP (Optional)"
            />
          )}
          <Input
            type="number"
            min="0"
            value={lane === "kitchen" ? kitchenSellingPrice : baristaSellingPrice}
            onChange={(event) => (lane === "kitchen" ? setKitchenSellingPrice(event.target.value) : setBaristaSellingPrice(event.target.value))}
            placeholder="Selling Price"
          />
          <Button className="h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => addStoreItem(lane)} disabled={isDirector}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
          <Button
            variant="outline"
            className="h-10 font-black uppercase text-[10px] tracking-widest"
            onClick={() => clearDepartmentInventory(lane)}
            disabled={isDirector}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Size</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Qty</TableHead>
              {canViewBuyingPrice && <TableHead className="font-black uppercase text-[10px] tracking-widest">Buying Price</TableHead>}
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Selling Price</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Low Threshold</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.subCategory ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.size ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                {canViewBuyingPrice && (
                  <TableCell className="font-bold">
                    {typeof item.buyingPrice === "number" && item.buyingPrice > 0 ? `TSh ${item.buyingPrice.toLocaleString()}` : "-"}
                  </TableCell>
                )}
                <TableCell className="font-bold">
                  {typeof item.sellingPrice === "number" && item.sellingPrice > 0 ? `TSh ${item.sellingPrice.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell className="font-bold">{item.minStock}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={canViewBuyingPrice ? 8 : 7} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
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
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Quantity</TableHead>
              {canViewBuyingPrice && <TableHead className="font-black uppercase text-[10px] tracking-widest">Buying Price</TableHead>}
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Selling Price</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Threshold</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="font-bold">{item.subCategory ?? "-"}</TableCell>
                <TableCell className="font-bold">{item.stock} {item.unit}</TableCell>
                {canViewBuyingPrice && (
                  <TableCell className="font-bold">
                    {typeof item.buyingPrice === "number" && item.buyingPrice > 0 ? `TSh ${item.buyingPrice.toLocaleString()}` : "-"}
                  </TableCell>
                )}
                <TableCell className="font-bold">
                  {typeof item.sellingPrice === "number" && item.sellingPrice > 0 ? `TSh ${item.sellingPrice.toLocaleString()}` : (typeof item.price === "number" && item.price > 0 ? `TSh ${item.price.toLocaleString()}` : "-")}
                </TableCell>
                <TableCell className="font-bold">{item.minStock}</TableCell>
                <TableCell className="font-black uppercase text-[10px] tracking-widest">{getStockLabel(item.stock, item.minStock)}</TableCell>
              </TableRow>
            ))}
            {inventoryItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={canViewBuyingPrice ? 7 : 6} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
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
    selectedItemId: string,
    setSelectedItemId: (value: string) => void,
    selectedItem: MainStoreItem | undefined,
    departmentUnit: string,
    setDepartmentUnit: (value: string) => void,
    unitToMenu: string,
    setUnitToMenu: (value: string) => void,
    logicNote: string,
    setLogicNote: (value: string) => void,
    rules: StockLogicRule[],
  ) => (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Stock Control</CardTitle>
          <CardDescription>Preset the unit logic once here, then use it later inside stock movement.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-4">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedItemId}
            onChange={(event) => setSelectedItemId(event.target.value)}
          >
            <option value="">Select item</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.stock} {item.unit})
              </option>
            ))}
          </select>
          <Input
            value={departmentUnit}
            onChange={(event) => setDepartmentUnit(event.target.value)}
            placeholder={lane === "kitchen" ? "Kitchen unit" : "Barista unit"}
          />
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={unitToMenu}
            onChange={(event) => setUnitToMenu(event.target.value)}
            placeholder="Unit to menu"
          />
          <Input
            value={logicNote}
            onChange={(event) => setLogicNote(event.target.value)}
            placeholder="Record logic"
          />
          <Button className="h-10 font-black uppercase tracking-widest text-[10px]" onClick={() => saveLogicRule(lane)} disabled={isDirector}>
            <Save className="w-4 h-4 mr-2" /> Save Logic
          </Button>
        </CardContent>
        {selectedItem && (
          <CardContent className="pt-0">
            <div className="rounded-md border p-3">
              <p className="font-black">{selectedItem.name}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Base unit: {selectedItem.unit} | Current logic: {getLogicLabel(getRuleForItem(lane, selectedItem.id))}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Logic Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Item</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Department Unit</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Unit To Menu</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Logic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-bold">{rule.itemName}</TableCell>
                  <TableCell className="font-bold">{rule.departmentUnit}</TableCell>
                  <TableCell className="font-bold">1 {rule.storeUnit} = {rule.unitToMenu} {rule.departmentUnit}</TableCell>
                  <TableCell className="font-bold">{rule.logicNote}</TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    No logic presets yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderStockMovement = (
    lane: StoreLane,
    list: MainStoreItem[],
    selectedItemId: string,
    setSelectedItemId: (value: string) => void,
    selectedItem: MainStoreItem | undefined,
    moveQty: string,
    setMoveQty: (value: string) => void,
  ) => {
    const laneRules = logicRules.filter((rule) => rule.destination === lane);
    const laneMovements = movementLogs.filter((movement) => movement.destination === lane);
    const selectedRule = getRuleForItem(lane, selectedItemId);

    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Stock Movement</CardTitle>
            <CardDescription>Select an item and use the saved stock-control logic to move stock.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-4">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
            >
              <option value="">Select item</option>
              {list.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.stock} {item.unit})
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="1"
              value={moveQty}
              onChange={(event) => setMoveQty(event.target.value)}
              placeholder="Quantity moved"
            />
            <div className="rounded-md border px-3 py-2 text-sm font-bold">
              {selectedRule ? `1 ${selectedRule.storeUnit} = ${selectedRule.unitToMenu} ${selectedRule.departmentUnit}` : "No preset logic"}
            </div>
            <Button className="h-10 font-black uppercase tracking-widest text-[10px]" onClick={() => recordMovement(lane)} disabled={isDirector || !selectedRule}>
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Record Movement
            </Button>
          </CardContent>
          {selectedItem && (
            <CardContent className="pt-0">
              <div className="rounded-md border p-3">
                <p className="font-black">{selectedItem.name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Available: {selectedItem.stock} {selectedItem.unit} | Logic: {selectedRule ? selectedRule.logicNote : "Set logic in Stock Control first"}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg uppercase font-black">{lane === "kitchen" ? "Kitchen" : "Barista"} Movement Log</CardTitle>
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
                {laneMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-bold">{movement.itemName}</TableCell>
                    <TableCell className="font-bold">
                      {movement.storeQtyMoved} {movement.storeUnit} {"->"} {movement.convertedQty}
                    </TableCell>
                    <TableCell className="font-bold">{movement.conversionNote}</TableCell>
                    <TableCell className="font-bold text-sm">{new Date(movement.movedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {laneMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      No movement records yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {laneRules.length === 0 && (
          <Card className="border-orange-200 bg-orange-50/60 shadow-none">
            <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-orange-700">
              Set stock control logic first before recording movement here.
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {dialog}
      <header>
        <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Control</h1>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Stock entry, logic presets, and movement records for kitchen and barista
        </p>
      </header>

      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Stock and movement analytics only
          </CardContent>
        </Card>
      )}

      {visibleTabs.length > 1 && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)}>
          <TabsList className="h-11">
            {visibleTabs.includes("kitchen-stock") && (
              <TabsTrigger value="kitchen-stock" className="font-black uppercase text-[10px] tracking-widest">Kitchen Stock</TabsTrigger>
            )}
            {visibleTabs.includes("barista-stock") && (
              <TabsTrigger value="barista-stock" className="font-black uppercase text-[10px] tracking-widest">Barista Stock</TabsTrigger>
            )}
            {visibleTabs.includes("stock-control") && (
              <TabsTrigger value="stock-control" className="font-black uppercase text-[10px] tracking-widest">Stock Control</TabsTrigger>
            )}
            {visibleTabs.includes("stock-movement") && (
              <TabsTrigger value="stock-movement" className="font-black uppercase text-[10px] tracking-widest">Stock Movement</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

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
              selectedKitchenRuleItemId,
              setSelectedKitchenRuleItemId,
              selectedKitchenRuleItem,
              kitchenDepartmentUnit,
              setKitchenDepartmentUnit,
              kitchenUnitToMenu,
              setKitchenUnitToMenu,
              kitchenLogicNote,
              setKitchenLogicNote,
              kitchenLogicRules,
            )}
          </TabsContent>
          <TabsContent value="barista">
            {renderStockControl(
              "barista",
              baristaStore,
              selectedBaristaRuleItemId,
              setSelectedBaristaRuleItemId,
              selectedBaristaRuleItem,
              baristaDepartmentUnit,
              setBaristaDepartmentUnit,
              baristaUnitToMenu,
              setBaristaUnitToMenu,
              baristaLogicNote,
              setBaristaLogicNote,
              baristaLogicRules,
            )}
          </TabsContent>
        </Tabs>
      )}

      {activeTab === "stock-movement" && (
        <Tabs value={stockMovementTab} onValueChange={(value) => setStockMovementTab(value as StockControlTab)}>
          <TabsList className="h-11">
            <TabsTrigger value="kitchen" className="font-black uppercase text-[10px] tracking-widest">Kitchen</TabsTrigger>
            <TabsTrigger value="barista" className="font-black uppercase text-[10px] tracking-widest">Barista</TabsTrigger>
          </TabsList>
          <TabsContent value="kitchen">
            {renderStockMovement(
              "kitchen",
              kitchenStore,
              selectedKitchenMoveItemId,
              setSelectedKitchenMoveItemId,
              selectedKitchenMoveItem,
              kitchenMoveQty,
              setKitchenMoveQty,
            )}
          </TabsContent>
          <TabsContent value="barista">
            {renderStockMovement(
              "barista",
              baristaStore,
              selectedBaristaMoveItemId,
              setSelectedBaristaMoveItemId,
              selectedBaristaMoveItem,
              baristaMoveQty,
              setBaristaMoveQty,
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
