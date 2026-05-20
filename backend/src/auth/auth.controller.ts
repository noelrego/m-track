import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  LoginDto,
  LoginResponseDto,
  Public,
  RegisterDto,
  RegisterResponseDto,
  TempResponseDto,
} from '../common';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered successfully.',
    type: RegisterResponseDto,
  })
  @ApiConflictResponse({ description: 'Username or email already exists.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiOkResponse({
    description: 'JWT token created successfully.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('temp')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Temporary protected route for JWT testing' })
  @ApiOkResponse({
    description: 'Bearer token is valid.',
    type: TempResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  temp(@Req() request: AuthenticatedRequest) {
    return {
      message: 'JWT is valid',
      user: request.user,
    };
  }
}
