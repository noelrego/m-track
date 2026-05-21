import { Controller, Get, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedRequest, TempResponseDto } from '../common';

@ApiTags('Auth')
@Controller()
export class AuthDevController {
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
