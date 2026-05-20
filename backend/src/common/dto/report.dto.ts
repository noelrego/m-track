import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategoryKey } from '../enums/category.enum';

export class ReportInsightDto {
  @ApiProperty({ example: 'currentMonthAllExpense' })
  key: string;

  @ApiProperty({ example: 'May 2026 Total' })
  label: string;

  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ example: 780000 })
  totalPaise: number;

  @ApiProperty({ enum: ExpenseCategoryKey, isArray: true })
  categoryKeys: ExpenseCategoryKey[];
}

export class ReportInsightsResponseDto {
  @ApiProperty({ type: () => ReportInsightDto })
  lastMonthAllExpense: ReportInsightDto;

  @ApiProperty({ type: () => ReportInsightDto })
  currentMonthAllExpense: ReportInsightDto;

  @ApiProperty({ type: () => ReportInsightDto })
  currentMonthNeedsWants: ReportInsightDto;
}

export class ReportCategoryAmountDto {
  @ApiPropertyOptional({ example: '665d2fb4d5f6a0a42f1f9a21' })
  categoryId?: string;

  @ApiProperty({ example: 'Needs' })
  categoryName: string;

  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;

  @ApiProperty({ example: 452500 })
  totalPaise: number;

  @ApiProperty({ example: 18 })
  count: number;
}

export class CurrentMonthCategoryCardsResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ example: 452500 })
  needsTotalPaise: number;

  @ApiProperty({ example: 180000 })
  wantsTotalPaise: number;

  @ApiProperty({ type: () => [ReportCategoryAmountDto] })
  categories: ReportCategoryAmountDto[];
}

export class WeeklyReportCategoryAmountDto {
  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;

  @ApiProperty({ example: 'Needs' })
  categoryName: string;

  @ApiProperty({ example: 125000 })
  totalPaise: number;

  @ApiProperty({ example: 5 })
  count: number;
}

export class WeeklyReportItemDto {
  @ApiProperty({ example: 1 })
  weekNumber: number;

  @ApiProperty({ example: 'Week 1' })
  label: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-07' })
  endDate: string;

  @ApiProperty({ example: 125000 })
  needsTotalPaise: number;

  @ApiProperty({ example: 42500 })
  wantsTotalPaise: number;

  @ApiProperty({ example: 15000 })
  extraTotalPaise: number;

  @ApiProperty({ type: () => [WeeklyReportCategoryAmountDto] })
  categories: WeeklyReportCategoryAmountDto[];
}

export class CurrentMonthWeeklyReportResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ type: () => [WeeklyReportItemDto] })
  weeks: WeeklyReportItemDto[];
}

export class TopExpenseCategoryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'Needs' })
  name: string;

  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;
}

export class TopExpenseItemDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a23' })
  id: string;

  @ApiProperty({ example: 125000 })
  amountPaise: number;

  @ApiProperty({ example: '2026-05-20' })
  date: string;

  @ApiProperty({ type: () => TopExpenseCategoryDto })
  category: TopExpenseCategoryDto;

  @ApiPropertyOptional({ example: 'Unexpected dinner with friends' })
  note?: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  createdAt: string;
}

export class CurrentMonthTopExpensesResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ type: () => [TopExpenseItemDto] })
  expenses: TopExpenseItemDto[];
}
