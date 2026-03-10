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

export const DEFAULT_KITCHEN_MENU: KitchenMenuItem[] = [
  { id: "km-salad-1", name: "Fresh Garden Salad", price: 5, category: "salad", prepMinutes: 10 },
  { id: "km-salad-2", name: "Chicken Mayonnaise Salad", price: 5, category: "salad", prepMinutes: 12 },
  { id: "km-salad-3", name: "Greek Salad", price: 5, category: "salad", prepMinutes: 10 },
  { id: "km-salad-4", name: "Fresh Avocado Salad", price: 5, category: "salad", prepMinutes: 10 },
  { id: "km-soup-1", name: "Cream of Pumpkin Soup", price: 8, category: "soup", prepMinutes: 15 },
  { id: "km-soup-2", name: "Clear Beef Soup", price: 8, category: "soup", prepMinutes: 15 },
  { id: "km-soup-3", name: "Local Banana Soup", price: 8, category: "soup", prepMinutes: 18 },
  { id: "km-soup-4", name: "Local Kitchen Soup", price: 8, category: "soup", prepMinutes: 18 },
  { id: "km-snack-1", name: "Fried Chicken Wings", price: 6, category: "snacks", prepMinutes: 14 },
  { id: "km-snack-2", name: "Marinated Fish Fingers", price: 6, category: "snacks", prepMinutes: 14 },
  { id: "km-snack-3", name: "Beef Samosa", price: 6, category: "snacks", prepMinutes: 10 },
  { id: "km-beef-1", name: "Marinated Pepper Steak", price: 12, category: "beef", prepMinutes: 22 },
  { id: "km-beef-2", name: "Beef Stroganoff", price: 12, category: "beef", prepMinutes: 20 },
  { id: "km-beef-3", name: "Beef Stir-Fry", price: 12, category: "beef", prepMinutes: 18 },
  { id: "km-fish-1", name: "Grilled Lemon Nile Perch", price: 12, category: "fish", prepMinutes: 22 },
  { id: "km-fish-2", name: "Fish Curry", price: 12, category: "fish", prepMinutes: 20 },
  { id: "km-fish-3", name: "Fried Tilapia", price: 12, category: "fish", prepMinutes: 20 },
  { id: "km-pork-1", name: "Grilled Pork Chop", price: 10, category: "pork", prepMinutes: 20 },
  { id: "km-pork-2", name: "Grilled Pork Ribs", price: 10, category: "pork", prepMinutes: 24 },
  { id: "km-local-1", name: "Chicken Trooper", price: 12, category: "local-food", prepMinutes: 18 },
  { id: "km-local-2", name: "Mbuzi Kitunguu", price: 12, category: "local-food", prepMinutes: 22 },
  { id: "km-local-3", name: "Chicken Vurga", price: 12, category: "local-food", prepMinutes: 18 },
  { id: "km-local-4", name: "Mchemsho wa Samaki", price: 12, category: "local-food", prepMinutes: 22 },
  { id: "km-pizza-1", name: "Margherita Pizza", price: 10, category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-2", name: "Hawaiian Pizza", price: 10, category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-3", name: "Chicken Pizza", price: 10, category: "pizza", prepMinutes: 18 },
  { id: "km-pizza-4", name: "Orange Special Pizza", price: 10, category: "pizza", prepMinutes: 20 },
  { id: "km-burger-1", name: "Chicken Burger", price: 10, category: "burger", prepMinutes: 15 },
  { id: "km-burger-2", name: "Beef Burger", price: 10, category: "burger", prepMinutes: 15 },
  { id: "km-burger-3", name: "Vegetable Burger", price: 10, category: "burger", prepMinutes: 12 },
  { id: "km-sandwich-1", name: "Crab Sandwich", price: 10, category: "sandwich", prepMinutes: 10 },
  { id: "km-sandwich-2", name: "Ham and Bacon Sandwich", price: 10, category: "sandwich", prepMinutes: 10 },
  { id: "km-sandwich-3", name: "Egg Sandwich", price: 10, category: "sandwich", prepMinutes: 8 },
  { id: "km-pasta-1", name: "Spaghetti Napolitana", price: 10, category: "pasta", prepMinutes: 16 },
  { id: "km-pasta-2", name: "Vegetable Pasta", price: 10, category: "pasta", prepMinutes: 16 },
  { id: "km-pasta-3", name: "Spaghetti Bolognese", price: 10, category: "pasta", prepMinutes: 18 },
  { id: "km-pasta-4", name: "Chicken Pasta", price: 10, category: "pasta", prepMinutes: 18 },
  { id: "km-dessert-1", name: "Ice Cream - Vanilla", price: 5, category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-2", name: "Ice Cream - Strawberry", price: 5, category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-3", name: "Ice Cream - Chocolate", price: 5, category: "dessert", prepMinutes: 4 },
  { id: "km-dessert-4", name: "Pineapple Cake", price: 5, category: "dessert", prepMinutes: 6 },
  { id: "km-dessert-5", name: "Jam Swiss Roll", price: 5, category: "dessert", prepMinutes: 5 },
  { id: "km-dessert-6", name: "Fresh Fruit Platter", price: 5, category: "dessert", prepMinutes: 8 },
  { id: "km-drink-1", name: "Smoothie", price: 3, category: "drinks", prepMinutes: 5 },
  { id: "km-drink-2", name: "Fresh Juice", price: 3, category: "drinks", prepMinutes: 4 },
  { id: "km-drink-3", name: "Milkshake", price: 3, category: "drinks", prepMinutes: 6 },
];

export function mergeKitchenMenuItems(menuItems: KitchenMenuItem[]): KitchenMenuItem[] {
  if (menuItems.length === 0) return DEFAULT_KITCHEN_MENU;

  const merged = new Map<string, KitchenMenuItem>();

  for (const item of DEFAULT_KITCHEN_MENU) {
    merged.set(item.id, item);
  }

  for (const item of menuItems) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values());
}
