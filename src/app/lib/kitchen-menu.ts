export type KitchenMenuCategory =
  | "salad"
  | "soup"
  | "snacks"
  | "beef"
  | "fish"
  | "pork"
  | "local-food"
  | "pizza"
  | "burger"
  | "sandwich"
  | "pasta"
  | "dessert"
  | "drinks";

export interface KitchenMenuItem {
  id: string;
  name: string;
  price: number;
  category: KitchenMenuCategory;
  prepMinutes: number;
}

export const KITCHEN_CATEGORY_OPTIONS: Array<{ value: KitchenMenuCategory; label: string }> = [
  { value: "salad", label: "Salads" },
  { value: "soup", label: "Soups" },
  { value: "snacks", label: "Snacks" },
  { value: "beef", label: "Beef" },
  { value: "fish", label: "Fish" },
  { value: "pork", label: "Pork" },
  { value: "local-food", label: "Local Food" },
  { value: "pizza", label: "Pizza" },
  { value: "burger", label: "Burgers" },
  { value: "sandwich", label: "Sandwiches" },
  { value: "pasta", label: "Pasta" },
  { value: "dessert", label: "Desserts" },
  { value: "drinks", label: "Drinks" },
];

export const KITCHEN_CATEGORY_LABELS: Record<KitchenMenuCategory, string> = Object.fromEntries(
  KITCHEN_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<KitchenMenuCategory, string>;

const tsh = (usd: number) => usd * 2600;

export const DEFAULT_KITCHEN_MENU: KitchenMenuItem[] = [
  { id: "km-salad-1", name: "Fresh Garden Salad", price: tsh(5), category: "salad", prepMinutes: 10 },
  { id: "km-salad-2", name: "Chicken Mayonnaise Salad", price: tsh(5), category: "salad", prepMinutes: 12 },
  { id: "km-salad-3", name: "Greek Salad", price: tsh(5), category: "salad", prepMinutes: 10 },
  { id: "km-salad-4", name: "Fresh Avocado Salad", price: tsh(5), category: "salad", prepMinutes: 10 },
  { id: "km-soup-1", name: "Cream of Pumpkin Soup", price: tsh(8), category: "soup", prepMinutes: 15 },
  { id: "km-soup-2", name: "Clear Beef Soup", price: tsh(8), category: "soup", prepMinutes: 15 },
  { id: "km-soup-3", name: "Local Banana Soup", price: tsh(8), category: "soup", prepMinutes: 18 },
  { id: "km-soup-4", name: "Local Kitchen Soup", price: tsh(8), category: "soup", prepMinutes: 18 },
  { id: "km-snack-1", name: "Fried Chicken Wings", price: tsh(6), category: "snacks", prepMinutes: 14 },
  { id: "km-snack-2", name: "Marinated Fish Fingers", price: tsh(6), category: "snacks", prepMinutes: 14 },
  { id: "km-snack-3", name: "Beef Samosa", price: tsh(6), category: "snacks", prepMinutes: 10 },
  { id: "km-beef-1", name: "Marinated Pepper Steak", price: tsh(12), category: "beef", prepMinutes: 22 },
  { id: "km-beef-2", name: "Beef Stroganoff", price: tsh(12), category: "beef", prepMinutes: 20 },
  { id: "km-beef-3", name: "Beef Stir-Fry", price: tsh(12), category: "beef", prepMinutes: 18 },
  { id: "km-fish-1", name: "Grilled Lemon Nile Perch", price: tsh(12), category: "fish", prepMinutes: 22 },
  { id: "km-fish-2", name: "Fish Curry", price: tsh(12), category: "fish", prepMinutes: 20 },
  { id: "km-fish-3", name: "Fried Tilapia", price: tsh(12), category: "fish", prepMinutes: 20 },
  { id: "km-pork-1", name: "Grilled Pork Chop", price: tsh(10), category: "pork", prepMinutes: 20 },
  { id: "km-pork-2", name: "Grilled Pork Ribs", price: tsh(10), category: "pork", prepMinutes: 24 },
  { id: "km-local-1", name: "Chicken Trooper", price: tsh(12), category: "local-food", prepMinutes: 18 },
  { id: "km-local-2", name: "Mbuzi Kitunguu", price: tsh(12), category: "local-food", prepMinutes: 22 },
  { id: "km-local-3", name: "Chicken Vurga", price: tsh(12), category: "local-food", prepMinutes: 18 },
  { id: "km-local-4", name: "Mchemsho wa Samaki", price: tsh(12), category: "local-food", prepMinutes: 22 },
  { id: "km-pizza-1", name: "Margherita Pizza", price: tsh(10), category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-2", name: "Hawaiian Pizza", price: tsh(10), category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-3", name: "Chicken Pizza", price: tsh(10), category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-4", name: "Orange Special Pizza", price: tsh(10), category: "pizza", prepMinutes: 20 },
  { id: "km-burger-1", name: "Chicken Burger", price: tsh(10), category: "burger", prepMinutes: 15 },
  { id: "km-burger-2", name: "Beef Burger", price: tsh(10), category: "burger", prepMinutes: 15 },
  { id: "km-burger-3", name: "Vegetable Burger", price: tsh(10), category: "burger", prepMinutes: 12 },
  { id: "km-sandwich-1", name: "Crab Sandwich", price: tsh(10), category: "sandwich", prepMinutes: 10 },
  { id: "km-sandwich-2", name: "Ham and Bacon Sandwich", price: tsh(10), category: "sandwich", prepMinutes: 10 },
  { id: "km-sandwich-3", name: "Egg Sandwich", price: tsh(10), category: "sandwich", prepMinutes: 8 },
  { id: "km-pasta-1", name: "Spaghetti Napolitana", price: tsh(10), category: "pasta", prepMinutes: 16 },
  { id: "km-pasta-2", name: "Vegetable Pasta", price: tsh(10), category: "pasta", prepMinutes: 16 },
  { id: "km-pasta-3", name: "Spaghetti Bolognese", price: tsh(10), category: "pasta", prepMinutes: 18 },
  { id: "km-pasta-4", name: "Chicken Pasta", price: tsh(10), category: "pasta", prepMinutes: 18 },
  { id: "km-dessert-1", name: "Ice Cream - Vanilla", price: tsh(5), category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-2", name: "Ice Cream - Strawberry", price: tsh(5), category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-3", name: "Ice Cream - Chocolate", price: tsh(5), category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-4", name: "Pineapple Cake", price: tsh(5), category: "dessert", prepMinutes: 6 },
  { id: "km-dessert-5", name: "Jam Swiss Roll", price: tsh(5), category: "dessert", prepMinutes: 5 },
  { id: "km-dessert-6", name: "Fresh Fruit Platter", price: tsh(5), category: "dessert", prepMinutes: 8 },
  { id: "km-drink-1", name: "Smoothie", price: tsh(3), category: "drinks", prepMinutes: 5 },
  { id: "km-drink-2", name: "Fresh Juice", price: tsh(3), category: "drinks", prepMinutes: 4 },
  { id: "km-drink-3", name: "Milkshake", price: tsh(3), category: "drinks", prepMinutes: 6 },
];

function isKitchenMenuCategory(value: unknown): value is KitchenMenuCategory {
  return KITCHEN_CATEGORY_OPTIONS.some((option) => option.value === value);
}

function isValidKitchenMenuItem(item: unknown): item is KitchenMenuItem {
  if (!item || typeof item !== "object") return false;

  const candidate = item as Partial<KitchenMenuItem>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.price === "number" &&
    Number.isFinite(candidate.price) &&
    candidate.price > 0 &&
    isKitchenMenuCategory(candidate.category) &&
    typeof candidate.prepMinutes === "number" &&
    Number.isFinite(candidate.prepMinutes) &&
    candidate.prepMinutes > 0
  );
}

function buildKitchenMenuSignature(item: KitchenMenuItem) {
  return `${item.name}|${item.price}|${item.category}|${item.prepMinutes}`;
}

const DEFAULT_KITCHEN_MENU_SIGNATURES = new Map(
  DEFAULT_KITCHEN_MENU.map((item) => [item.id, buildKitchenMenuSignature(item)]),
);

export function isDefaultKitchenMenuItem(item: KitchenMenuItem): boolean {
  return DEFAULT_KITCHEN_MENU_SIGNATURES.get(item.id) === buildKitchenMenuSignature(item);
}

export function mergeKitchenMenuItems(
  menuItems: KitchenMenuItem[],
  options?: { includeDefaultMenu?: boolean; stripDefaultMenu?: boolean },
): KitchenMenuItem[] {
  const includeDefaultMenu = options?.includeDefaultMenu ?? false;
  const stripDefaultMenu = options?.stripDefaultMenu ?? false;

  const merged = new Map<string, KitchenMenuItem>();

  for (const item of menuItems) {
    if (!isValidKitchenMenuItem(item)) continue;
    if (stripDefaultMenu && isDefaultKitchenMenuItem(item)) continue;
    merged.set(item.id, item);
  }

  if (includeDefaultMenu) {
    for (const item of DEFAULT_KITCHEN_MENU) {
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values());
}
