
export type Role = 'manager' | 'inventory' | 'cashier' | 'kitchen' | 'barista';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', role: 'manager', avatar: '/logo.jpeg' },
  { id: 'u2', name: 'Sara Jenkins', role: 'inventory', avatar: '/logo.jpeg' },
  { id: 'u3', name: 'Mike Ross (Day)', role: 'cashier', avatar: '/logo.jpeg' },
  { id: 'u4', name: 'Rachel Zane (Night)', role: 'cashier', avatar: '/logo.jpeg' },
  { id: 'u5', name: 'Chef Gordon', role: 'kitchen', avatar: '/logo.jpeg' },
  { id: 'u6', name: 'Barista James', role: 'barista', avatar: '/logo.jpeg' },
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

const standardRooms: Room[] = Array.from({ length: 20 }, (_, index) => {
  const number = String(101 + index);
  let status: Room["status"] = "available";
  if (index < 5) status = "occupied";
  if (index >= 5 && index < 7) status = "cleaning";
  if (index === 19) status = "maintenance";

  return {
    id: `r${number}`,
    number,
    type: "Standard",
    status,
    price: STANDARD_ROOM_PRICE,
  };
});

const platinumRooms: Room[] = Array.from({ length: 33 }, (_, index) => {
  const number = String(201 + index);
  let status: Room["status"] = "available";
  if (index < 8) status = "occupied";
  if (index >= 8 && index < 11) status = "cleaning";
  if (index === 32) status = "maintenance";

  return {
    id: `r${number}`,
    number,
    type: "Platinum",
    status,
    price: PLATINUM_ROOM_PRICE,
  };
});

export const ROOMS: Room[] = [...standardRooms, ...platinumRooms];

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Kitchen' | 'Bar' | 'General';
  stock: number;
  minStock: number;
  unit: string;
}

export const INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Coffee Beans', category: 'Bar', stock: 5, minStock: 10, unit: 'kg' },
  { id: 'i2', name: 'Milk', category: 'Bar', stock: 12, minStock: 5, unit: 'L' },
  { id: 'i3', name: 'Chicken Breast', category: 'Kitchen', stock: 2, minStock: 15, unit: 'kg' },
  { id: 'i4', name: 'Toilet Paper', category: 'General', stock: 150, minStock: 50, unit: 'rolls' },
];

export const SALES_HISTORY = [
  { date: '2024-05-15', totalRevenue: 1200, roomRevenue: 800, foodAndDrinksRevenue: 400 },
  { date: '2024-05-16', totalRevenue: 1500, roomRevenue: 1000, foodAndDrinksRevenue: 500 },
  { date: '2024-05-17', totalRevenue: 1100, roomRevenue: 700, foodAndDrinksRevenue: 400 },
  { date: '2024-05-18', totalRevenue: 2200, roomRevenue: 1500, foodAndDrinksRevenue: 700 },
  { date: '2024-05-19', totalRevenue: 1900, roomRevenue: 1200, foodAndDrinksRevenue: 700 },
  { date: '2024-05-20', totalRevenue: 1400, roomRevenue: 900, foodAndDrinksRevenue: 500 },
  { date: '2024-05-21', totalRevenue: 1650, roomRevenue: 1100, foodAndDrinksRevenue: 550 },
];
