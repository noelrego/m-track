import type { ExpenseItem, ExpenseTag } from '../expenses/expenses.types';

export type EmiAmountMode = 'monthly' | 'total';
export type EmiEditScope = 'single' | 'future';
export type EmiPlanStatus = 'active' | 'completed' | 'stopped';

export interface EmiScheduleFormValue {
  amount: string;
  amountMode: EmiAmountMode;
  lender: string;
  name: string;
  numberOfMonths: string;
  startDate: string;
}

export interface EmiPlanSummary {
  id: string;
  name: string;
  lender?: string;
  status: EmiPlanStatus;
  installmentCount: number;
  paidInstallments: number;
  remainingInstallments: number;
  currentMonthlyPaise: number;
  scheduledTotalPaise: number;
  paidPaise: number;
  remainingPaise: number;
  nextPaymentDate?: string;
  startDate: string;
  endDate: string;
}

export interface EmiInstallment extends ExpenseItem {
  installmentNumber: number;
  installmentCount: number;
  isPaid: boolean;
}

export interface EmiPlanDetail extends EmiPlanSummary {
  categoryId: string;
  amountMode: EmiAmountMode;
  amountPaise: number;
  tags: ExpenseTag[];
  note?: string;
  installments: EmiInstallment[];
}

export interface ListEmiPlansResponse {
  plans: EmiPlanSummary[];
  legacyExpenseCount: number;
}
