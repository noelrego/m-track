import { Mongoose } from 'mongoose';
import { ExpenseSchema } from './expense.schema';

describe('ExpenseSchema EMI compatibility', () => {
  const mongoose = new Mongoose();
  const ExpenseModel = mongoose.model('LegacyExpenseCompatibility', ExpenseSchema);

  it.each(['needs', 'wants', 'invest', 'emis', 'extra', 'rent'])(
    'accepts an old %s expense document with no EMI fields',
    (categoryKey) => {
      const expense = new ExpenseModel({
        ownerUserId: 'legacy-user-id',
        amountPaise: 12_345,
        spentAt: new Date(Date.UTC(2025, 10, 20)),
        monthKey: '2025-11',
        categoryId: `legacy-${categoryKey}-category-id`,
        tagIds: [],
        note: 'Existing production record',
      });

      expect(expense.validateSync()).toBeUndefined();
      expect(expense.emiPlanId).toBeUndefined();
      expect(expense.emiInstallmentNumber).toBeUndefined();
      expect(expense.emiInstallmentCount).toBeUndefined();
    },
  );

  it('accepts a linked EMI child as the same report-compatible expense shape', () => {
    const expense = new ExpenseModel({
      ownerUserId: 'user-id',
      amountPaise: 250_000,
      spentAt: new Date(Date.UTC(2026, 5, 5)),
      monthKey: '2026-06',
      categoryId: 'emi-category-id',
      tagIds: [],
      emiPlanId: 'emi-plan-id',
      emiInstallmentNumber: 1,
      emiInstallmentCount: 12,
    });

    expect(expense.validateSync()).toBeUndefined();
    expect(expense.amountPaise).toBe(250_000);
    expect(expense.monthKey).toBe('2026-06');
  });

  it('uses a partial unique index that ignores legacy documents', () => {
    const emiIndex = ExpenseSchema.indexes().find(
      ([fields]) => 'emiInstallmentNumber' in fields,
    );

    expect(emiIndex?.[1]).toMatchObject({
      partialFilterExpression: { emiPlanId: { $type: 'string' } },
      unique: true,
    });
  });

  it('indexes owner tag trend lookups across the selected date window', () => {
    const tagTrendIndex = ExpenseSchema.indexes().find(
      ([fields]) => fields.tagIds === 1 && fields.spentAt === 1,
    );

    expect(tagTrendIndex?.[0]).toEqual({
      ownerUserId: 1,
      tagIds: 1,
      spentAt: 1,
    });
  });
});
