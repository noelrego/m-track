import type { ExpenseCategoryKey } from '../../common';

export interface ExpenseCategory {
  id: string;
  name: string;
  normalizedName?: ExpenseCategoryKey;
}

export interface ExpenseTag {
  id: string;
  name: string;
}

export interface ExpenseItem {
  id: string;
  amountPaise: number;
  date: string;
  category: ExpenseCategory;
  tags: ExpenseTag[];
  note?: string;
  monthKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListExpensesResponse {
  monthKey: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  expenses: ExpenseItem[];
}

export interface CategoryOption extends ExpenseCategory {
  isActive?: boolean;
  sortOrder?: number;
}

export interface TagOption extends ExpenseTag {
  createdAt?: string;
  updatedAt?: string;
}
