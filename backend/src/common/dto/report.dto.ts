import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Matches } from 'class-validator';
import { ExpenseCategoryKey } from '../enums/category.enum';

const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export class MonthlyExpenseWindowQueryDto {
  @ApiPropertyOptional({
    default: 5,
    description: 'Number of recent months to include in the monthly trend.',
    enum: [5, 8, 12],
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsIn([5, 8, 12])
  months?: 5 | 8 | 12;
}

export class MonthlyTagExpenseReportQueryDto {
  @ApiPropertyOptional({
    description: 'Month to report in YYYY-MM format. Defaults to the current UTC month.',
    example: '2026-05',
  })
  @IsOptional()
  @Matches(monthKeyPattern, { message: 'month must be in YYYY-MM format' })
  month?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tag ids to include in the monthly report.',
    example: '665d2fb4d5f6a0a42f1f9a21,665d2fb4d5f6a0a42f1f9a22',
    type: String,
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value !== 'string') {
      return value;
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  @IsOptional()
  @IsMongoId({ each: true })
  tagIds?: string[];
}

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

export class YearlyMonthlyExpenseItemDto {
  @ApiProperty({ example: 1 })
  monthNumber: number;

  @ApiProperty({ example: '2026-01' })
  monthKey: string;

  @ApiProperty({ example: 'January 2026' })
  monthName: string;

  @ApiProperty({ example: 'Jan' })
  label: string;

  @ApiProperty({ example: 125000 })
  totalPaise: number;

  @ApiProperty({ example: 8 })
  count: number;
}

export class CurrentYearMonthlyExpenseResponseDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 5 })
  monthCount: number;

  @ApiProperty({ example: 'Last 5 months' })
  rangeLabel: string;

  @ApiProperty({ example: '2026-01-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate: string;

  @ApiProperty({ type: () => [YearlyMonthlyExpenseItemDto] })
  months: YearlyMonthlyExpenseItemDto[];
}

export class MonthlyCategoryExpensePointDto {
  @ApiProperty({ example: 5 })
  monthNumber: number;

  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ example: 'May' })
  label: string;

  @ApiProperty({ example: 125000 })
  totalPaise: number;

  @ApiProperty({ example: 8 })
  count: number;
}

export class MonthlyCategoryExpenseSeriesDto {
  @ApiPropertyOptional({ example: '665d2fb4d5f6a0a42f1f9a21' })
  categoryId?: string;

  @ApiProperty({ example: 'Needs' })
  categoryName: string;

  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;

  @ApiProperty({ type: () => [MonthlyCategoryExpensePointDto] })
  months: MonthlyCategoryExpensePointDto[];
}

export class MonthlyCategoryExpenseTrendResponseDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 5 })
  monthCount: number;

  @ApiProperty({ example: 'Last 5 months' })
  rangeLabel: string;

  @ApiProperty({ example: '2026-01-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate: string;

  @ApiProperty({ type: () => [YearlyMonthlyExpenseItemDto] })
  months: YearlyMonthlyExpenseItemDto[];

  @ApiProperty({ type: () => [MonthlyCategoryExpenseSeriesDto] })
  categories: MonthlyCategoryExpenseSeriesDto[];
}

export class MonthlyTagExpenseItemDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  tagId: string;

  @ApiProperty({ example: 'UPI' })
  tagName: string;

  @ApiProperty({ example: 72500 })
  totalPaise: number;

  @ApiProperty({ example: 4 })
  count: number;
}

export class MonthlyTagExpenseReportResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: 'May 2026' })
  monthName: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate: string;

  @ApiProperty({
    example: ['665d2fb4d5f6a0a42f1f9a21', '665d2fb4d5f6a0a42f1f9a22'],
    isArray: true,
  })
  selectedTagIds: string[];

  @ApiProperty({
    description:
      'Unique expense total for expenses that include at least one selected tag.',
    example: 145000,
  })
  totalPaise: number;

  @ApiProperty({
    description:
      'Unique expense count for expenses that include at least one selected tag.',
    example: 7,
  })
  count: number;

  @ApiProperty({ type: () => [MonthlyTagExpenseItemDto] })
  tags: MonthlyTagExpenseItemDto[];
}
