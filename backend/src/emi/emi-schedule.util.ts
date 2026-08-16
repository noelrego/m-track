import { BadRequestException } from '@nestjs/common';
import { EmiAmountMode } from '../common';

export interface EmiScheduleItem {
  amountPaise: number;
  date: Date;
  installmentNumber: number;
  monthKey: string;
}

export function buildEmiSchedule(
  amountMode: EmiAmountMode,
  amountPaise: number,
  numberOfMonths: number,
  startDate: Date,
  firstInstallmentNumber = 1,
): EmiScheduleItem[] {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new BadRequestException('EMI amount must be a positive integer in paise');
  }

  if (!Number.isSafeInteger(numberOfMonths) || numberOfMonths <= 0) {
    throw new BadRequestException('EMI number of months must be a positive integer');
  }

  if (amountMode === EmiAmountMode.Total && amountPaise < numberOfMonths) {
    throw new BadRequestException(
      'Total EMI amount must be at least one paise for every month',
    );
  }

  const anchorDay = startDate.getUTCDate();
  const monthlyBase =
    amountMode === EmiAmountMode.Monthly
      ? amountPaise
      : Math.floor(amountPaise / numberOfMonths);
  const remainder =
    amountMode === EmiAmountMode.Total ? amountPaise % numberOfMonths : 0;

  return Array.from({ length: numberOfMonths }, (_, index) => {
    const year = startDate.getUTCFullYear();
    const monthIndex = startDate.getUTCMonth() + index;
    const installmentYear = year + Math.floor(monthIndex / 12);
    const installmentMonthIndex = monthIndex % 12;
    const lastDayOfMonth = new Date(
      Date.UTC(installmentYear, installmentMonthIndex + 1, 0),
    ).getUTCDate();
    const date = new Date(
      Date.UTC(
        installmentYear,
        installmentMonthIndex,
        Math.min(anchorDay, lastDayOfMonth),
      ),
    );

    return {
      amountPaise: monthlyBase + (index < remainder ? 1 : 0),
      date,
      installmentNumber: firstInstallmentNumber + index,
      monthKey: `${installmentYear}-${String(installmentMonthIndex + 1).padStart(2, '0')}`,
    };
  });
}
