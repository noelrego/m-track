import { ReportService } from './report.service';

describe('ReportService monthly tag expense trend', () => {
  const ownedTagId = '665d2fb4d5f6a0a42f1f9a21';
  const foreignTagId = '665d2fb4d5f6a0a42f1f9a22';
  const ownerUserId = 'owner-user-id';
  const tagFindExec = jest.fn();
  const expenseAggregateExec = jest.fn();
  const tagModel = {
    find: jest.fn(() => ({ exec: tagFindExec })),
  };
  const expenseModel = {
    aggregate: jest.fn(() => ({ exec: expenseAggregateExec })),
  };
  const logger = {
    error: jest.fn(),
  };
  const service = new ReportService(
    {} as never,
    expenseModel as never,
    tagModel as never,
    logger as never,
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns owner-scoped, zero-filled monthly series in selection order', async () => {
    tagFindExec.mockResolvedValue([{ id: ownedTagId, name: 'UPI' }]);
    expenseAggregateExec.mockResolvedValue([
      {
        _id: { monthKey: '2026-07', tagId: ownedTagId },
        count: 2,
        totalPaise: 50_000,
      },
      {
        _id: { monthKey: '2026-08', tagId: ownedTagId },
        count: 1,
        totalPaise: 12_500,
      },
    ]);

    const report = await service.getMonthlyTagExpenseTrend(ownerUserId, 5, [
      foreignTagId,
      ownedTagId,
      ownedTagId,
    ]);

    expect(tagModel.find).toHaveBeenCalledWith({
      _id: { $in: [foreignTagId, ownedTagId] },
      ownerUserId,
    });
    expect(report.selectedTagIds).toEqual([ownedTagId]);
    expect(report.months.map((month) => month.monthKey)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(report.tags).toEqual([
      expect.objectContaining({
        tagId: ownedTagId,
        tagName: 'UPI',
        months: [
          expect.objectContaining({ monthKey: '2026-04', totalPaise: 0 }),
          expect.objectContaining({ monthKey: '2026-05', totalPaise: 0 }),
          expect.objectContaining({ monthKey: '2026-06', totalPaise: 0 }),
          expect.objectContaining({ monthKey: '2026-07', totalPaise: 50_000 }),
          expect.objectContaining({ monthKey: '2026-08', totalPaise: 12_500 }),
        ],
      }),
    ]);

    const pipeline = expenseModel.aggregate.mock.calls[0][0];

    expect(pipeline[0]).toEqual({
      $match: expect.objectContaining({
        ownerUserId,
        tagIds: { $in: [ownedTagId] },
      }),
    });
    expect(pipeline).toContainEqual({ $unwind: '$tagIds' });
  });

  it('does not run an expense query when no selected tag belongs to the user', async () => {
    tagFindExec.mockResolvedValue([]);

    const report = await service.getMonthlyTagExpenseTrend(ownerUserId, 8, [
      foreignTagId,
    ]);

    expect(expenseModel.aggregate).not.toHaveBeenCalled();
    expect(report.selectedTagIds).toEqual([]);
    expect(report.tags).toEqual([]);
    expect(report.months).toHaveLength(8);
  });
});
