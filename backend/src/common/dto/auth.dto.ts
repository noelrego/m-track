import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

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

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token.',
    required: false,
  })
  accessToken?: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: '1h' })
  expiresIn: string;

  @ApiProperty({
    example: 'both',
    enum: ['bearer', 'cookie', 'both'],
    description: 'How the API delivered the JWT for this login response.',
  })
  authTransport: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({
    example: {
      sub: '665d2fb4d5f6a0a42f1f9a21',
      username: 'admin',
      emailId: 'admin@example.com',
      role: 'admin',
      isRootAdmin: true,
    },
  })
  user: Record<string, unknown>;
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
