
export type Role = 'manager' | 'inventory' | 'cashier' | 'kitchen' | 'barista';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export const USERS: User[] = [];

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

export const INVENTORY: InventoryItem[] = [];

export const SALES_HISTORY: Array<{
  date: string;
  totalRevenue: number;
  roomRevenue: number;
  foodAndDrinksRevenue: number;
}> = [];
