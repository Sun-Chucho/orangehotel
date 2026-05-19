export const STORAGE_EXPENSES = "orange-hotel-expenses";

export type ExpenseDepartment = "kitchen" | "barista" | "rooms" | "others";
export type ExpenseAmountType = "cash" | "mobile-money" | "card" | "bank" | "credit";

export interface ExpenseRecord {
  id: string;
  department: ExpenseDepartment;
  title: string;
  amount: number;
  amountType: ExpenseAmountType;
  notes?: string;
  createdAt: number;
  createdBy?: string;
  payoutStatus?: "approved" | "paid-out";
  paidOutAt?: number;
  paidOutBy?: string;
}

export const EXPENSE_DEPARTMENTS: Array<{ value: ExpenseDepartment; label: string }> = [
  { value: "kitchen", label: "Kitchen" },
  { value: "barista", label: "Barista" },
  { value: "rooms", label: "Rooms" },
  { value: "others", label: "Others" },
];

export const EXPENSE_AMOUNT_TYPES: Array<{ value: ExpenseAmountType; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mobile-money", label: "Mobile Money" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
  { value: "credit", label: "Credit" },
];

export function getExpenseDepartmentLabel(department: ExpenseDepartment) {
  return EXPENSE_DEPARTMENTS.find((item) => item.value === department)?.label ?? "Others";
}

export function getExpenseAmountTypeLabel(amountType: ExpenseAmountType) {
  return EXPENSE_AMOUNT_TYPES.find((item) => item.value === amountType)?.label ?? "Cash";
}
