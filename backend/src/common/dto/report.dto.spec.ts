import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MonthlyTagExpenseTrendQueryDto } from './report.dto';

describe('MonthlyTagExpenseTrendQueryDto', () => {
  const firstTagId = '665d2fb4d5f6a0a42f1f9a21';
  const secondTagId = '665d2fb4d5f6a0a42f1f9a22';

  it('transforms a comma-separated tag list and month count', async () => {
    const query = plainToInstance(MonthlyTagExpenseTrendQueryDto, {
      months: '8',
      tagIds: `${firstTagId}, ${secondTagId}`,
    });

    await expect(validate(query)).resolves.toEqual([]);
    expect(query.months).toBe(8);
    expect(query.tagIds).toEqual([firstTagId, secondTagId]);
  });

  it('requires at least one valid tag id', async () => {
    const query = plainToInstance(MonthlyTagExpenseTrendQueryDto, {
      months: '5',
      tagIds: '',
    });

    const errors = await validate(query);

    expect(errors.some((error) => error.property === 'tagIds')).toBe(true);
  });
});
