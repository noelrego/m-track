export enum ExpenseCategoryKey {
  Needs = 'needs',
  Wants = 'wants',
  Emis = 'emis',
  Extra = 'extra',
  Invest = 'invest',
}

export const EXPENSE_CATEGORY_KEYS = Object.values(ExpenseCategoryKey);

export function isExpenseCategoryKey(value: string): value is ExpenseCategoryKey {
  return EXPENSE_CATEGORY_KEYS.includes(value as ExpenseCategoryKey);
}
