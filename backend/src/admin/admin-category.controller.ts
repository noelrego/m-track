import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
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
  AuthenticatedRequest,
  CategoryResponseDto,
  CreateCategoryDto,
  Roles,
  UpdateCategoryDto,
} from '../common';
import { UserRole } from '../schemas/auth.schema';
import { AdminCategoryService } from './admin-category.service';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@ApiForbiddenResponse({ description: 'Admin role is required.' })
@Roles(UserRole.Admin)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly adminCategoryService: AdminCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create expense category' })
  @ApiCreatedResponse({
    description: 'Category created successfully.',
    type: CategoryResponseDto,
  })
  @ApiConflictResponse({ description: 'Category name already exists.' })
  createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminCategoryService.createCategory(
      createCategoryDto,
      request.user!.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List expense categories' })
  @ApiOkResponse({
    description: 'Categories returned successfully.',
    type: [CategoryResponseDto],
  })
  listCategories() {
    return this.adminCategoryService.listCategories();
  }

  @Get(':categoryId')
  @ApiOperation({ summary: 'Get one category by id' })
  @ApiParam({ name: 'categoryId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'Category returned successfully.',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  getCategory(@Param('categoryId') categoryId: string) {
    return this.adminCategoryService.getCategory(categoryId);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Update expense category' })
  @ApiParam({ name: 'categoryId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'Category updated successfully.',
    type: CategoryResponseDto,
  })
  @ApiConflictResponse({ description: 'Category name already exists.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.adminCategoryService.updateCategory(categoryId, updateCategoryDto);
  }

  @Delete(':categoryId')
  @ApiOperation({
    summary: 'Deactivate expense category',
    description: 'Soft deletes the category so existing expenses keep report history.',
  })
  @ApiParam({ name: 'categoryId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'Category deactivated successfully.',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  deactivateCategory(@Param('categoryId') categoryId: string) {
    return this.adminCategoryService.deactivateCategory(categoryId);
  }
}
