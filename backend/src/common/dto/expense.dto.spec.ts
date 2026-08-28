import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListExpensesQueryDto } from './expense.dto';

describe('ListExpensesQueryDto note search', () => {
  it('trims and accepts a note-only search', async () => {
    const query = plainToInstance(ListExpensesQueryDto, {
      limit: '20',
      note: '  office lunch  ',
      page: '2',
    });

    await expect(validate(query)).resolves.toEqual([]);
    expect(query).toMatchObject({
      limit: 20,
      note: 'office lunch',
      page: 2,
    });
  });

  it('rejects unsafe note-search characters', async () => {
    const query = plainToInstance(ListExpensesQueryDto, {
      note: '<script>',
    });
    const errors = await validate(query);

    expect(errors.some((error) => error.property === 'note')).toBe(true);
  });
});
