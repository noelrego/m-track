import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseCategoryKey } from '../enums/category.enum';

const categoryNamePattern = /^[A-Za-z0-9][A-Za-z0-9 &._-]*$/;
const safeTextPattern = /^[^<>]*$/;

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Needs',
    minLength: 2,
    maxLength: 60,
    description:
      'Static category display name. Normalized value must be one of needs, wants, emis, extra, or invest.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60)
  @Matches(categoryNamePattern, {
    message: 'name can contain letters, numbers, spaces, &, dots, underscores, and hyphens',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Daily essentials like food, groceries, and vehicle service.',
    maxLength: 240,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Matches(safeTextPattern, { message: 'description cannot contain angle brackets' })
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    maximum: 1000,
    description: 'Display order for the category list.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'Needs' })
  name: string;

  @ApiProperty({ enum: ExpenseCategoryKey, example: ExpenseCategoryKey.Needs })
  normalizedName: ExpenseCategoryKey;

  @ApiPropertyOptional({
    example: 'Daily essentials like food, groceries, and vehicle service.',
  })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 10 })
  sortOrder: number;

  @ApiPropertyOptional({ example: '665d2fb4d5f6a0a42f1f9a20' })
  createdByUserId?: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  updatedAt: string;
}
