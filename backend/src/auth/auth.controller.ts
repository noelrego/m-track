import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  clearAuthCookie,
  AuthenticatedRequest,
  CurrentUserResponseDto,
  getJwtTransport,
  LoginDto,
  LoginResponseDto,
  Public,
  setAuthCookie,
  shouldUseBearer,
  shouldUseCookie,
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
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const loginResponse = await this.authService.login(loginDto);

    if (shouldUseCookie()) {
      setAuthCookie(response, loginResponse.accessToken);
    }

    return {
      ...loginResponse,
      accessToken: shouldUseBearer() ? loginResponse.accessToken : undefined,
      authTransport: getJwtTransport(),
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the authenticated user from the JWT' })
  @ApiOkResponse({
    description: 'Authenticated user returned successfully.',
    type: CurrentUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Clear the auth cookie when cookie auth is enabled' })
  @ApiOkResponse({ description: 'Logout completed.' })
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response);

    return { message: 'Logged out' };
  }
}
