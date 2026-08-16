import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EmiAmountMode, EmiEditScope, EmiPlanStatus } from '../enums/emi.enum';
import { ExpenseResponseDto, ExpenseTagDto } from './expense.dto';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const safeTextPattern = /^[^<>]*$/;

export class CreateEmiPlanDto {
  @ApiProperty({ example: 'House loan', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(safeTextPattern, { message: 'name cannot contain angle brackets' })
  name: string;

  @ApiPropertyOptional({ example: 'SBI', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(safeTextPattern, { message: 'lender cannot contain angle brackets' })
  lender?: string;

  @ApiProperty({ enum: EmiAmountMode, example: EmiAmountMode.Monthly })
  @IsEnum(EmiAmountMode)
  amountMode: EmiAmountMode;

  @ApiProperty({ example: 2500000, description: 'Monthly or total amount in paise.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amountPaise: number;

  @ApiProperty({ example: 240, minimum: 1, maximum: 600 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  numberOfMonths: number;

  @ApiProperty({ example: '2026-06-05' })
  @IsString()
  @Matches(dateOnlyPattern, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ example: 'Auto debit on the 5th', maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(safeTextPattern, { message: 'note cannot contain angle brackets' })
  note?: string;
}

export class UpdateEmiInstallmentDto {
  @ApiProperty({ enum: EmiEditScope, example: EmiEditScope.Single })
  @IsEnum(EmiEditScope)
  scope: EmiEditScope;

  @ApiPropertyOptional({ enum: EmiAmountMode })
  @IsOptional()
  @IsEnum(EmiAmountMode)
  amountMode?: EmiAmountMode;

  @ApiPropertyOptional({ example: 2500000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amountPaise?: number;

  @ApiPropertyOptional({ example: 24, minimum: 1, maximum: 600 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  numberOfMonths?: number;

  @ApiPropertyOptional({ example: '2027-01-05' })
  @IsOptional()
  @IsString()
  @Matches(dateOnlyPattern, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(safeTextPattern, { message: 'note cannot contain angle brackets' })
  note?: string;
}

class EmiPlanMetadataDto {
  @ApiPropertyOptional({ example: 'House loan', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(safeTextPattern, { message: 'name cannot contain angle brackets' })
  name?: string;

  @ApiPropertyOptional({ example: 'SBI', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(safeTextPattern, { message: 'lender cannot contain angle brackets' })
  lender?: string;
}

export class UpdateEmiPlanDto extends PartialType(EmiPlanMetadataDto) {}

export class EmiDeleteQueryDto {
  @ApiProperty({ enum: EmiEditScope, example: EmiEditScope.Single })
  @IsEnum(EmiEditScope)
  scope: EmiEditScope;
}

export class EmiInstallmentResponseDto extends ExpenseResponseDto {
  @ApiProperty({ example: 4 })
  installmentNumber: number;

  @ApiProperty({ example: 240 })
  installmentCount: number;

  @ApiProperty({ example: true })
  isPaid: boolean;
}

export class EmiPlanSummaryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a30' })
  id: string;

  @ApiProperty({ example: 'House loan' })
  name: string;

  @ApiPropertyOptional({ example: 'SBI' })
  lender?: string;

  @ApiProperty({ enum: EmiPlanStatus })
  status: EmiPlanStatus | 'completed';

  @ApiProperty({ example: 240 })
  installmentCount: number;

  @ApiProperty({ example: 28 })
  paidInstallments: number;

  @ApiProperty({ example: 212 })
  remainingInstallments: number;

  @ApiProperty({ example: 2500000 })
  currentMonthlyPaise: number;

  @ApiProperty({ example: 70000000 })
  scheduledTotalPaise: number;

  @ApiProperty({ example: 8400000 })
  paidPaise: number;

  @ApiProperty({ example: 61600000 })
  remainingPaise: number;

  @ApiPropertyOptional({ example: '2026-09-05' })
  nextPaymentDate?: string;

  @ApiProperty({ example: '2024-05-05' })
  startDate: string;

  @ApiProperty({ example: '2044-04-05' })
  endDate: string;
}

export class EmiPlanDetailDto extends EmiPlanSummaryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  categoryId: string;

  @ApiProperty({ enum: EmiAmountMode })
  amountMode: EmiAmountMode;

  @ApiProperty({ example: 2500000 })
  amountPaise: number;

  @ApiProperty({ type: [ExpenseTagDto] })
  tags: ExpenseTagDto[];

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ type: [EmiInstallmentResponseDto] })
  installments: EmiInstallmentResponseDto[];
}

export class ListEmiPlansResponseDto {
  @ApiProperty({ type: [EmiPlanSummaryDto] })
  plans: EmiPlanSummaryDto[];

  @ApiProperty({ example: 3 })
  legacyExpenseCount: number;
}

export class EmiOverviewDto {
  @ApiProperty({ example: 2 })
  activePlanCount: number;

  @ApiProperty({ example: 28 })
  paidInstallments: number;

  @ApiProperty({ example: 212 })
  remainingInstallments: number;

  @ApiProperty({ example: 12 })
  progressPercent: number;

  @ApiProperty({ example: 4200000 })
  monthlyCommitmentPaise: number;

  @ApiProperty({ example: 98200000 })
  remainingPaise: number;

  @ApiPropertyOptional({ example: '2026-09-05' })
  nextPaymentDate?: string;
}
