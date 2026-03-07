
export type Role = 'manager' | 'director' | 'inventory' | 'cashier' | 'kitchen' | 'barista';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Amina Hassan", role: "manager", avatar: "/logo.jpeg" },
  { id: "u2", name: "Daniel Mwangi", role: "cashier", avatar: "/logo.jpeg" },
  { id: "u3", name: "Neema Joseph", role: "kitchen", avatar: "/logo.jpeg" },
  { id: "u4", name: "Brian Otieno", role: "barista", avatar: "/logo.jpeg" },
  { id: "u5", name: "Grace Mushi", role: "inventory", avatar: "/logo.jpeg" },
  { id: "u6", name: "Paul Komba", role: "director", avatar: "/logo.jpeg" },
];

export interface Room {
  id: string;
  number: string;
  type: 'Standard' | 'Platinum';
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  price: number;
}

const STANDARD_ROOM_PRICE = 70000;
const PLATINUM_ROOM_PRICE = 100000;

const PLATINUM_ROOM_NUMBERS = [
  "1001",
  "1002",
  "1003",
  "1004",
  "1005",
  "1006",
  "2003",
  "2004",
  "2005",
  "2006",
  "2007",
  "2008",
  "3003",
  "3004",
  "3005",
  "3006",
  "3007",
  "3008",
  "4003",
  "4004",
  "4005",
  "4006",
  "4007",
  "4008",
  "5003",
  "5004",
  "5005",
  "5006",
  "5007",
  "5008",
] as const;

const STANDARD_ROOM_NUMBERS = [
  "1007",
  "1008",
  "1009",
  "2001",
  "2002",
  "2009",
  "2010",
  "2011",
  "3001",
  "3002",
  "3009",
  "3010",
  "3011",
  "4001",
  "4002",
  "4009",
  "4010",
  "4011",
  "5001",
  "5002",
  "5009",
  "5010",
  "5011",
] as const;

const standardRooms: Room[] = STANDARD_ROOM_NUMBERS.map((number) => ({
  id: `r${number}`,
  number,
  type: "Standard",
  status: "available",
  price: STANDARD_ROOM_PRICE,
}));

const platinumRooms: Room[] = PLATINUM_ROOM_NUMBERS.map((number) => ({
  id: `r${number}`,
  number,
  type: "Platinum",
  status: "available",
  price: PLATINUM_ROOM_PRICE,
}));

export const ROOMS: Room[] = [...standardRooms, ...platinumRooms];

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Kitchen' | 'Bar' | 'General';
  stock: number;
  minStock: number;
  unit: string;
  price?: number;
}

export const INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Arabica Coffee Beans", category: "Bar", stock: 18, minStock: 10, unit: "kg", price: 38000 },
  { id: "inv-2", name: "Fresh Milk", category: "Bar", stock: 42, minStock: 20, unit: "L", price: 4200 },
  { id: "inv-3", name: "Tea Leaves", category: "Bar", stock: 8, minStock: 12, unit: "kg", price: 16000 },
  { id: "inv-4", name: "Rice", category: "Kitchen", stock: 50, minStock: 25, unit: "kg", price: 3200 },
  { id: "inv-5", name: "Chicken", category: "Kitchen", stock: 36, minStock: 20, unit: "kg", price: 11500 },
  { id: "inv-6", name: "Cooking Oil", category: "Kitchen", stock: 10, minStock: 15, unit: "L", price: 8000 },
];

export const SALES_HISTORY: Array<{
  date: string;
  totalRevenue: number;
  roomRevenue: number;
  foodAndDrinksRevenue: number;
}> = [
  { date: "2026-03-01", totalRevenue: 4860000, roomRevenue: 3720000, foodAndDrinksRevenue: 1140000 },
  { date: "2026-03-02", totalRevenue: 5120000, roomRevenue: 3910000, foodAndDrinksRevenue: 1210000 },
  { date: "2026-03-03", totalRevenue: 5380000, roomRevenue: 4050000, foodAndDrinksRevenue: 1330000 },
  { date: "2026-03-04", totalRevenue: 4950000, roomRevenue: 3790000, foodAndDrinksRevenue: 1160000 },
  { date: "2026-03-05", totalRevenue: 5610000, roomRevenue: 4240000, foodAndDrinksRevenue: 1370000 },
  { date: "2026-03-06", totalRevenue: 5870000, roomRevenue: 4420000, foodAndDrinksRevenue: 1450000 },
  { date: "2026-03-07", totalRevenue: 6030000, roomRevenue: 4560000, foodAndDrinksRevenue: 1470000 },
];
