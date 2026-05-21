import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoryResponseDto } from '../common';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active expense categories' })
  @ApiOkResponse({
    description: 'Active categories returned successfully.',
    type: [CategoryResponseDto],
  })
  listActiveCategories() {
    return this.categoriesService.listActiveCategories();
  }
}
