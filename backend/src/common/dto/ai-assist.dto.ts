import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { ExpenseCategoryKey } from '../enums/category.enum';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const safeTextPattern = /^[^<>]*$/;

export class AiAssistExpenseDraftInputDto {
  @ApiPropertyOptional({ example: 10000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amountPaise?: number;

  @ApiPropertyOptional({ example: '2026-05-26' })
  @IsOptional()
  @Matches(dateOnlyPattern, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ example: '665d2fb4d5f6a0a42f1f9a21' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['665d2fb4d5f6a0a42f1f9a22'], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsMongoId({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ example: 'milk', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(safeTextPattern, { message: 'note cannot contain angle brackets' })
  note?: string;
}

export class CreateAiAssistExpenseDraftDto {
  @ApiProperty({
    example: 'I spent 100 rs on milk',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @Matches(safeTextPattern, { message: 'message cannot contain angle brackets' })
  message: string;

  @ApiPropertyOptional({
    description: 'Browser local date, used until AI date parsing is added.',
    example: '2026-05-26',
  })
  @IsOptional()
  @Matches(dateOnlyPattern, { message: 'localDate must be in YYYY-MM-DD format' })
  localDate?: string;

  @ApiPropertyOptional({
    description: 'Existing draft when the user is refining the assistant result.',
    type: () => AiAssistExpenseDraftInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistExpenseDraftInputDto)
  currentDraft?: AiAssistExpenseDraftInputDto;
}

export class AiAssistDraftCategoryDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'Needs' })
  name: string;

  @ApiPropertyOptional({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName?: ExpenseCategoryKey;
}

export class AiAssistDraftTagDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a22' })
  id: string;

  @ApiProperty({ example: 'Groceries' })
  name: string;
}

export class AiAssistExpenseDraftDto {
  @ApiProperty({ example: 10000 })
  amountPaise: number;

  @ApiProperty({ example: '2026-05-26' })
  date: string;

  @ApiProperty({ type: () => AiAssistDraftCategoryDto })
  category: AiAssistDraftCategoryDto;

  @ApiProperty({ type: () => [AiAssistDraftTagDto] })
  tags: AiAssistDraftTagDto[];

  @ApiPropertyOptional({ example: 'milk' })
  note?: string;
}

export class AiAssistExpenseDraftResponseDto {
  @ApiProperty({ example: 'ready_to_save' })
  status: 'ready_to_save' | 'needs_clarification';

  @ApiProperty({
    example: 'I prepared a dummy expense for ₹100 under Needs. Review it and save.',
  })
  replyText: string;

  @ApiProperty({ example: ['OpenRouter parsing is not connected yet.'] })
  hints: string[];

  @ApiPropertyOptional({ type: () => AiAssistExpenseDraftDto })
  draft?: AiAssistExpenseDraftDto;
}
