import type { ExpenseCategoryKey } from '../../common';

export interface ReportInsight {
  key: string;
  label: string;
  monthKey: string;
  monthName: string;
  totalPaise: number;
  categoryKeys: ExpenseCategoryKey[];
}

export interface ReportInsightsResponse {
  lastMonthAllExpense: ReportInsight;
  currentMonthAllExpense: ReportInsight;
  currentMonthNeedsWants: ReportInsight;
}

export interface ReportCategoryAmount {
  categoryId?: string;
  categoryName: string;
  normalizedName: ExpenseCategoryKey;
  totalPaise: number;
  count: number;
}

export interface CurrentMonthCategoryCardsResponse {
  monthKey: string;
  monthName: string;
  needsTotalPaise: number;
  wantsTotalPaise: number;
  categories: ReportCategoryAmount[];
}

export interface WeeklyReportItem {
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  needsTotalPaise: number;
  wantsTotalPaise: number;
  extraTotalPaise: number;
  categories: ReportCategoryAmount[];
}

export interface CurrentMonthWeeklyReportResponse {
  monthKey: string;
  monthName: string;
  weeks: WeeklyReportItem[];
}

export interface TopExpenseItem {
  id: string;
  amountPaise: number;
  date: string;
  category: {
    id: string;
    name: string;
    normalizedName: ExpenseCategoryKey;
  };
  note?: string;
  createdAt: string;
}

export interface CurrentMonthTopExpensesResponse {
  monthKey: string;
  monthName: string;
  expenses: TopExpenseItem[];
}

export interface CategoryOption {
  id: string;
  name: string;
  normalizedName: ExpenseCategoryKey;
}

export interface TagOption {
  id: string;
  name: string;
}
