import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseCategoryKey } from '../enums/category.enum';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthKeyPattern = /^\d{4}-\d{2}$/;
const safeTextPattern = /^[^<>]*$/;

export class CreateExpenseDto {
  @ApiProperty({
    example: 12500,
    minimum: 1,
    description: 'Amount in paise. INR 125.00 is stored as 12500.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amountPaise: number;

  @ApiProperty({
    example: '2026-05-20',
    description: 'Expense date in UTC date-only format.',
  })
  @IsString()
  @Matches(dateOnlyPattern, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({
    example: ['665d2fb4d5f6a0a42f1f9a22'],
    maxItems: 20,
    description: 'Optional existing tag ids owned by the current user.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    example: 'Lunch with office team',
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(safeTextPattern, { message: 'note cannot contain angle brackets' })
  note?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ListExpensesQueryDto {
  @ApiPropertyOptional({
    example: '2026-05',
    description: 'Calendar month to list. Defaults to current UTC month.',
  })
  @IsOptional()
  @Matches(monthKeyPattern, { message: 'month must be in YYYY-MM format' })
  month?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 50,
    description: 'Number of expenses to return. Defaults to 10.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Page number to return. Defaults to 1.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;
}

export class MonthlyExpenseSummaryQueryDto {
  @ApiPropertyOptional({
    example: '2026-05',
    description: 'Calendar month to summarize. Defaults to current UTC month.',
  })
  @IsOptional()
  @Matches(monthKeyPattern, { message: 'month must be in YYYY-MM format' })
  month?: string;
}

export class ExpenseCategoryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'Needs' })
  name: string;

  @ApiPropertyOptional({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName?: ExpenseCategoryKey;
}

export class ExpenseTagDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a22' })
  id: string;

  @ApiProperty({ example: 'UPI' })
  name: string;
}

export class ExpenseResponseDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a23' })
  id: string;

  @ApiProperty({ example: 12500 })
  amountPaise: number;

  @ApiProperty({ example: '2026-05-20' })
  date: string;

  @ApiProperty({ type: () => ExpenseCategoryDto })
  category: ExpenseCategoryDto;

  @ApiProperty({ type: () => [ExpenseTagDto] })
  tags: ExpenseTagDto[];

  @ApiPropertyOptional({ example: 'Lunch with office team' })
  note?: string;

  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  updatedAt: string;
}

export class ExpenseDeleteResponseDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a23' })
  id: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}

export class ListExpensesResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate: string;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ type: () => [ExpenseResponseDto] })
  expenses: ExpenseResponseDto[];
}

export class ExpenseCategorySummaryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  categoryId: string;

  @ApiProperty({ example: 'Needs' })
  categoryName: string;

  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;

  @ApiProperty({ example: 452500 })
  totalPaise: number;

  @ApiProperty({ example: 18 })
  count: number;
}

export class MonthlyExpenseSummaryResponseDto {
  @ApiProperty({ example: '2026-05' })
  monthKey: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31' })
  endDate: string;

  @ApiProperty({ example: 780000 })
  totalPaise: number;

  @ApiProperty({ type: () => [ExpenseCategorySummaryDto] })
  categories: ExpenseCategorySummaryDto[];
}
