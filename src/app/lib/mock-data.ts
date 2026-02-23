
export type Role = 'manager' | 'inventory' | 'cashier' | 'kitchen' | 'barista';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', role: 'manager', avatar: 'https://picsum.photos/seed/u1/100/100' },
  { id: 'u2', name: 'Sara Jenkins', role: 'inventory', avatar: 'https://picsum.photos/seed/u2/100/100' },
  { id: 'u3', name: 'Mike Ross (Day)', role: 'cashier', avatar: 'https://picsum.photos/seed/u3/100/100' },
  { id: 'u4', name: 'Rachel Zane (Night)', role: 'cashier', avatar: 'https://picsum.photos/seed/u4/100/100' },
  { id: 'u5', name: 'Chef Gordon', role: 'kitchen', avatar: 'https://picsum.photos/seed/u5/100/100' },
  { id: 'u6', name: 'Barista James', role: 'barista', avatar: 'https://picsum.photos/seed/u6/100/100' },
];

export interface Room {
  id: string;
  number: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  price: number;
}

export const ROOMS: Room[] = [
  { id: 'r101', number: '101', type: 'Standard', status: 'occupied', price: 150 },
  { id: 'r102', number: '102', type: 'Standard', status: 'available', price: 150 },
  { id: 'r103', number: '103', type: 'Deluxe', status: 'cleaning', price: 250 },
  { id: 'r104', number: '104', type: 'Suite', status: 'available', price: 450 },
  { id: 'r201', number: '201', type: 'Deluxe', status: 'occupied', price: 250 },
  { id: 'r202', number: '202', type: 'Suite', status: 'maintenance', price: 450 },
];

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
