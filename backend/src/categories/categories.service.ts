import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLogger, CategoryResponseDto } from '../common';
import {
  Category,
  CategoryDocument,
} from '../schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly logger: AppLogger,
  ) {}

  async listActiveCategories(): Promise<CategoryResponseDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();

      return categories.map((category) => this.toCategoryResponse(category));
    } catch (error) {
      this.logger.error(error, 'Category list active failed');
      throw error;
    }
  }

  private toCategoryResponse(category: CategoryDocument): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdByUserId: category.createdByUserId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
