import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AppLogger,
  CategoryResponseDto,
  CreateCategoryDto,
  ExpenseCategoryKey,
  isExpenseCategoryKey,
  UpdateCategoryDto,
} from '../common';
import {
  Category,
  CategoryDocument,
} from '../schemas/category.schema';

@Injectable()
export class AdminCategoryService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly logger: AppLogger,
  ) {}

  async createCategory(
    createCategoryDto: CreateCategoryDto,
    createdByUserId: string,
  ): Promise<CategoryResponseDto> {
    const normalizedName = this.normalizeName(createCategoryDto.name);
    this.ensureStaticCategoryKey(normalizedName);

    this.logger.debug('Admin create category requested', {
      name: createCategoryDto.name,
      normalizedName,
      createdByUserId,
    });

    try {
      await this.ensureCategoryNameIsAvailable(normalizedName);

      const category = await this.categoryModel.create({
        name: createCategoryDto.name,
        normalizedName,
        description: createCategoryDto.description || undefined,
        sortOrder: createCategoryDto.sortOrder ?? 0,
        isActive: true,
        createdByUserId,
      });

      this.logger.info('Admin category created successfully');

      return this.toCategoryResponse(category);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Admin create category duplicate key conflict', {
          name: createCategoryDto.name,
        });
        throw new ConflictException('Category name already exists');
      }

      this.logger.error(error, 'Admin create category failed', {
        name: createCategoryDto.name,
      });
      throw error;
    }
  }

  async listCategories(): Promise<CategoryResponseDto[]> {
    try {
      const categories = await this.categoryModel
        .find()
        .sort({ sortOrder: 1, name: 1 })
        .exec();

      return categories.map((category) => this.toCategoryResponse(category));
    } catch (error) {
      this.logger.error(error, 'Admin list categories failed');
      throw error;
    }
  }

  async getCategory(categoryId: string): Promise<CategoryResponseDto> {
    const category = await this.findCategoryOrThrow(categoryId);

    return this.toCategoryResponse(category);
  }

  async updateCategory(
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.findCategoryOrThrow(categoryId);

    try {
      if (updateCategoryDto.name) {
        const normalizedName = this.normalizeName(updateCategoryDto.name);
        this.ensureStaticCategoryKey(normalizedName);
        await this.ensureCategoryNameIsAvailable(normalizedName, category.id);
        category.name = updateCategoryDto.name;
        category.normalizedName = normalizedName;
      }

      if (updateCategoryDto.description !== undefined) {
        category.description = updateCategoryDto.description || undefined;
      }

      if (updateCategoryDto.sortOrder !== undefined) {
        category.sortOrder = updateCategoryDto.sortOrder;
      }

      if (updateCategoryDto.isActive !== undefined) {
        category.isActive = updateCategoryDto.isActive;
      }

      const updatedCategory = await category.save();
      this.logger.info('Admin category updated successfully');

      return this.toCategoryResponse(updatedCategory);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Admin update category duplicate key conflict', {
          categoryId,
        });
        throw new ConflictException('Category name already exists');
      }

      this.logger.error(error, 'Admin update category failed', { categoryId });
      throw error;
    }
  }

  async deactivateCategory(categoryId: string): Promise<CategoryResponseDto> {
    const category = await this.findCategoryOrThrow(categoryId);

    try {
      category.isActive = false;
      const updatedCategory = await category.save();
      this.logger.info('Admin category deactivated successfully');

      return this.toCategoryResponse(updatedCategory);
    } catch (error) {
      this.logger.error(error, 'Admin deactivate category failed', { categoryId });
      throw error;
    }
  }

  private async findCategoryOrThrow(categoryId: string): Promise<CategoryDocument> {
    if (!isValidObjectId(categoryId)) {
      throw new NotFoundException('Category not found');
    }

    try {
      const category = await this.categoryModel.findById(categoryId).exec();

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(error, 'Admin find category failed', { categoryId });
      throw error;
    }
  }

  private async ensureCategoryNameIsAvailable(
    normalizedName: ExpenseCategoryKey,
    currentCategoryId?: string,
  ): Promise<void> {
    const existingCategory = await this.categoryModel
      .findOne({ normalizedName })
      .exec();

    if (existingCategory && existingCategory.id !== currentCategoryId) {
      throw new ConflictException('Category name already exists');
    }
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private ensureStaticCategoryKey(
    normalizedName: string,
  ): asserts normalizedName is ExpenseCategoryKey {
    if (!isExpenseCategoryKey(normalizedName)) {
      throw new BadRequestException(
        'Category must be one of needs, wants, emis, extra, or invest',
      );
    }
  }

  private toCategoryResponse(category: CategoryDocument): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      normalizedName: category.normalizedName,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdByUserId: category.createdByUserId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
