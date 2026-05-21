import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  CurrentUserResponseDto,
  LoginDto,
  LoginResponseDto,
  Public,
} from '../common';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiOkResponse({
    description: 'JWT token created successfully.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password.' })
  async login(@Body() loginDto: LoginDto) {
    const loginResponse = await this.authService.login(loginDto);

    return {
      user: loginResponse.user,
      token: loginResponse.token,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user from the JWT' })
  @ApiOkResponse({
    description: 'Authenticated user returned successfully.',
    type: CurrentUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  async me(@Req() request: AuthenticatedRequest) {
    return { user: await this.authService.getCurrentUser(request.user!.sub) };
  }
}
