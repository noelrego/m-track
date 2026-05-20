import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const tagNamePattern = /^[A-Za-z0-9][A-Za-z0-9 &._-]*$/;

export class CreateTagDto {
  @ApiProperty({
    example: 'UPI',
    minLength: 1,
    maxLength: 40,
    description: 'User-owned tag name for grouping expenses.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 40)
  @Matches(tagNamePattern, {
    message: 'name can contain letters, numbers, spaces, &, dots, underscores, and hyphens',
  })
  name: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export class TagResponseDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'UPI' })
  name: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  updatedAt: string;
}
