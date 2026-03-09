export type TransferDestination = "kitchen" | "barista";
export type StoreLane = "kitchen" | "barista";

export interface MainStoreItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  lane: StoreLane;
  size?: string;
  buyingPrice?: number;
  totLimit?: number;
  totSold?: number;
}

export interface StoreMovementLog {
  id: string;
  itemId: string;
  itemName: string;
  source: "store";
  destination: TransferDestination;
  storeQtyMoved: number;
  storeUnit: string;
  conversionValue: number;
  conversionNote: string;
  convertedQty: number;
  movedAt: number;
}

export interface StockLogicRule {
  id: string;
  itemId: string;
  itemName: string;
  destination: TransferDestination;
  storeUnit: string;
  departmentUnit: string;
  unitToMenu: number;
  logicNote: string;
  updatedAt: number;
}

export interface StoreUsageLog {
  id: string;
  movementId: string;
  destination: TransferDestination;
  quantityUsed: number;
  usedAt: number;
}

export const STORAGE_INVENTORY_ITEMS = "orange-hotel-inventory-items";
export const STORAGE_MAIN_STORE_ITEMS = "orange-hotel-main-store-items";
export const STORAGE_STORE_MOVEMENTS = "orange-hotel-store-movements";
export const STORAGE_STORE_USAGE = "orange-hotel-store-usage";
export const STORAGE_STOCK_LOGIC = "orange-hotel-stock-logic";
