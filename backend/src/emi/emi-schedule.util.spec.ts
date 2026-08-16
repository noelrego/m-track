import { BadRequestException } from '@nestjs/common';
import { EmiAmountMode } from '../common';
import { buildEmiSchedule } from './emi-schedule.util';

describe('buildEmiSchedule', () => {
  it('creates one equal expense row for each monthly installment', () => {
    const schedule = buildEmiSchedule(
      EmiAmountMode.Monthly,
      250_000,
      3,
      new Date(Date.UTC(2026, 0, 15)),
    );

    expect(schedule.map((item) => item.amountPaise)).toEqual([
      250_000,
      250_000,
      250_000,
    ]);
    expect(schedule.map((item) => item.monthKey)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('preserves the intended payment day with month-end clamping', () => {
    const schedule = buildEmiSchedule(
      EmiAmountMode.Monthly,
      100_000,
      3,
      new Date(Date.UTC(2026, 0, 31)),
    );

    expect(schedule.map((item) => item.date.toISOString().slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('distributes a total amount exactly without losing paise', () => {
    const schedule = buildEmiSchedule(
      EmiAmountMode.Total,
      10_000,
      3,
      new Date(Date.UTC(2026, 4, 5)),
    );

    expect(schedule.map((item) => item.amountPaise)).toEqual([3334, 3333, 3333]);
    expect(schedule.reduce((total, item) => total + item.amountPaise, 0)).toBe(
      10_000,
    );
  });

  it('keeps numbering when rebuilding only this and future installments', () => {
    const schedule = buildEmiSchedule(
      EmiAmountMode.Monthly,
      50_000,
      2,
      new Date(Date.UTC(2026, 7, 1)),
      7,
    );

    expect(schedule.map((item) => item.installmentNumber)).toEqual([7, 8]);
  });

  it('rejects totals that cannot allocate at least one paise per month', () => {
    expect(() =>
      buildEmiSchedule(
        EmiAmountMode.Total,
        2,
        3,
        new Date(Date.UTC(2026, 0, 1)),
      ),
    ).toThrow(BadRequestException);
  });
});
