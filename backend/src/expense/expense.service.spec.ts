import { ExpenseService } from './expense.service';

describe('ExpenseService note search', () => {
  const ownerUserId = 'owner-user-id';
  const expenseFindExec = jest.fn();
  const expenseCountExec = jest.fn();
  const categoryFindExec = jest.fn();
  const expenseFindQuery = {
    exec: expenseFindExec,
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  const expenseModel = {
    countDocuments: jest.fn(() => ({ exec: expenseCountExec })),
    find: jest.fn(() => expenseFindQuery),
  };
  const categoryModel = {
    find: jest.fn(() => ({
      select: jest.fn(() => ({ exec: categoryFindExec })),
    })),
  };
  const service = new ExpenseService(
    expenseModel as never,
    categoryModel as never,
    {} as never,
    { error: jest.fn() } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    categoryFindExec.mockResolvedValue([]);
    expenseFindExec.mockResolvedValue([]);
    expenseCountExec.mockResolvedValue(0);
  });

  it('searches only notes across all months and escapes regex characters', async () => {
    const response = await service.listExpenses(
      { limit: 10, month: '2026-05', note: 'milk.*', page: 1 },
      ownerUserId,
    );
    const filter = expenseModel.find.mock.calls[0][0];

    expect(filter).toEqual({
      note: { $options: 'i', $regex: 'milk\\.\\*' },
      ownerUserId,
    });
    expect(filter).not.toHaveProperty('spentAt');
    expect(response.noteSearch).toBe('milk.*');
  });

  it('keeps the existing month boundary when note search is absent', async () => {
    await service.listExpenses(
      { limit: 10, month: '2026-05', page: 1 },
      ownerUserId,
    );
    const filter = expenseModel.find.mock.calls[0][0];

    expect(filter.ownerUserId).toBe(ownerUserId);
    expect(filter).not.toHaveProperty('note');
    expect(filter.spentAt).toEqual({
      $gte: new Date('2026-05-01T00:00:00.000Z'),
      $lt: new Date('2026-06-01T00:00:00.000Z'),
    });
  });
});
