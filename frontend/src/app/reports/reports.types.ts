import type { ExpenseCategoryKey } from '../../common';

export type MonthlyExpenseWindow = 5 | 8 | 12;

export interface YearlyMonthlyExpenseItem {
  monthNumber: number;
  monthKey: string;
  monthName: string;
  label: string;
  totalPaise: number;
  count: number;
}

export interface CurrentYearMonthlyExpenseResponse {
  year: number;
  monthCount: MonthlyExpenseWindow;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  months: YearlyMonthlyExpenseItem[];
}

export interface MonthlyCategoryExpensePoint {
  monthNumber: number;
  monthKey: string;
  monthName: string;
  label: string;
  totalPaise: number;
  count: number;
}

export interface MonthlyCategoryExpenseSeries {
  categoryId?: string;
  categoryName: string;
  normalizedName: ExpenseCategoryKey;
  months: MonthlyCategoryExpensePoint[];
}

export interface MonthlyCategoryExpenseTrendResponse {
  year: number;
  monthCount: MonthlyExpenseWindow;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  months: YearlyMonthlyExpenseItem[];
  categories: MonthlyCategoryExpenseSeries[];
}

export interface ReportTagOption {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyTagExpenseItem {
  tagId: string;
  tagName: string;
  totalPaise: number;
  count: number;
}

export interface MonthlyTagExpenseReportResponse {
  monthKey: string;
  monthName: string;
  startDate: string;
  endDate: string;
  selectedTagIds: string[];
  totalPaise: number;
  count: number;
  tags: MonthlyTagExpenseItem[];
}
