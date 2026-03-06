export type CompanyStockCategory =
  | "kitchen-equipment"
  | "technology"
  | "electronics"
  | "cleaning-supplies"
  | "furniture";

export interface CompanyStockItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  category: CompanyStockCategory;
  createdAt: number;
}

export const STORAGE_COMPANY_STOCK = "orange-hotel-company-stock";
