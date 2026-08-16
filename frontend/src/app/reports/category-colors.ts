import { ExpenseCategoryKey } from '../../common';

export const categoryColors: Record<ExpenseCategoryKey, string> = {
  [ExpenseCategoryKey.Needs]: '#66bfb6',
  [ExpenseCategoryKey.Wants]: '#f5b33d',
  [ExpenseCategoryKey.Emis]: '#8d78d6',
  [ExpenseCategoryKey.Extra]: '#f36f4e',
  [ExpenseCategoryKey.Invest]: '#242424',
  [ExpenseCategoryKey.Rent]: '#2f6fed',
};
