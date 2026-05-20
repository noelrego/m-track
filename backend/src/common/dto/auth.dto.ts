import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { UserRole } from '../../schemas/auth.schema';

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

export class LoginUserDto {
  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'admin@example.com' })
  emailId: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'User', required: false })
  lastName?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.User })
  role: UserRole;

  @ApiProperty({ example: false })
  isRootAdmin: boolean;
}

export class LoginResponseDto {
  @ApiProperty({
    type: () => LoginUserDto,
    description: 'Logged in user profile data safe to store on the frontend.',
  })
  user: LoginUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT token. Present only when JWT_TRANSPORT=bearer.',
    required: false,
  })
  token?: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({
    type: () => LoginUserDto,
    description: 'Current authenticated user profile.',
  })
  user: LoginUserDto;
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
