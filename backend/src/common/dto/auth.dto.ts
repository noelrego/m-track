import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const textNamePattern = /^[A-Za-z][A-Za-z' -]*$/;
const usernamePattern = /^[A-Za-z0-9_.-]+$/;

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    minLength: 3,
    maxLength: 40,
    description: 'Unique username used during registration.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(3, 40)
  @Matches(usernamePattern, {
    message: 'username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    example: 'admin12345',
    minLength: 8,
    maxLength: 128,
    description: 'Account password.',
  })
  @IsString()
  @Length(8, 128)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'admin',
    minLength: 3,
    maxLength: 40,
    description: 'Unique username. Letters, numbers, dots, underscores, and hyphens only.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(3, 40)
  @Matches(usernamePattern, {
    message: 'username can only contain letters, numbers, dots, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    example: 'admin12345',
    minLength: 8,
    maxLength: 128,
    description: 'Password. Stored only as a salted hash.',
  })
  @IsString()
  @Length(8, 128)
  password: string;

  @ApiProperty({
    example: 'admin@example.com',
    maxLength: 254,
    description: 'User email address. Request field name is emailid.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  emailid: string;

  @ApiProperty({
    example: 'Admin',
    minLength: 1,
    maxLength: 80,
    description: 'First name. Letters, spaces, apostrophes, and hyphens only.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  @Matches(textNamePattern, {
    message: 'firstName can only contain letters, spaces, apostrophes, and hyphens',
  })
  firstName: string;

  @ApiPropertyOptional({
    example: 'User',
    minLength: 1,
    maxLength: 80,
    description: 'Optional last name. Letters, spaces, apostrophes, and hyphens only.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(textNamePattern, {
    message: 'lastName can only contain letters, spaces, apostrophes, and hyphens',
  })
  lastName?: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: '665d2fb4d5f6a0a42f1f9a21' })
  id: string;

  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'admin@example.com' })
  emailId: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiPropertyOptional({ example: 'User' })
  lastName?: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token.',
  })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: '1h' })
  expiresIn: string;
}

export class TempResponseDto {
  @ApiProperty({ example: 'JWT is valid' })
  message: string;

  @ApiProperty({
    example: {
      sub: '665d2fb4d5f6a0a42f1f9a21',
      username: 'admin',
      emailId: 'admin@example.com',
    },
  })
  user: Record<string, unknown>;
}
