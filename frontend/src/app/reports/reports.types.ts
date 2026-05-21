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
  startDate: string;
  endDate: string;
  months: YearlyMonthlyExpenseItem[];
}
