import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AdminUserResponseDto,
  AuthenticatedRequest,
  CreateAdminUserDto,
  Roles,
  UpdateAdminUserDto,
} from '../common';
import { UserRole } from '../schemas/auth.schema';
import { AdminService } from './admin.service';

@ApiTags('Admin Users')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@ApiForbiddenResponse({ description: 'Admin role is required.' })
@Roles(UserRole.Admin)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user or admin' })
  @ApiCreatedResponse({
    description: 'User created successfully.',
    type: AdminUserResponseDto,
  })
  @ApiConflictResponse({ description: 'Username or email already exists.' })
  createUser(
    @Body() createUserDto: CreateAdminUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.createUser(createUserDto, request.user!.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({
    description: 'Users returned successfully.',
    type: [AdminUserResponseDto],
  })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get one user by id' })
  @ApiParam({ name: 'userId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'User returned successfully.',
    type: AdminUserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({ name: 'userId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'User updated successfully.',
    type: AdminUserResponseDto,
  })
  @ApiConflictResponse({ description: 'Username or email already exists.' })
  @ApiForbiddenResponse({ description: 'Root admin cannot be modified here.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(userId, updateUserDto);
  }

  @Patch(':userId/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'userId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'User deactivated successfully.',
    type: AdminUserResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Root admin or current admin cannot be deactivated here.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  deactivateUser(
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.deactivateUser(userId, request.user!.sub);
  }
}
