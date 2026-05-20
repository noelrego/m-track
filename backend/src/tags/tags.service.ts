import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AppLogger,
  CreateTagDto,
  TagResponseDto,
  UpdateTagDto,
} from '../common';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    private readonly logger: AppLogger,
  ) {}

  async createTag(
    createTagDto: CreateTagDto,
    ownerUserId: string,
  ): Promise<TagResponseDto> {
    const normalizedName = this.normalizeName(createTagDto.name);

    try {
      await this.ensureTagNameIsAvailable(ownerUserId, normalizedName);

      const tag = await this.tagModel.create({
        ownerUserId,
        name: createTagDto.name,
        normalizedName,
      });

      this.logger.info('Tag created successfully');

      return this.toTagResponse(tag);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Tag create duplicate key conflict', {
          ownerUserId,
          name: createTagDto.name,
        });
        throw new ConflictException('Tag name already exists');
      }

      this.logger.error(error, 'Tag create failed', {
        ownerUserId,
        name: createTagDto.name,
      });
      throw error;
    }
  }

  async listTags(ownerUserId: string): Promise<TagResponseDto[]> {
    try {
      const tags = await this.tagModel
        .find({ ownerUserId })
        .sort({ name: 1 })
        .exec();

      return tags.map((tag) => this.toTagResponse(tag));
    } catch (error) {
      this.logger.error(error, 'Tag list failed', { ownerUserId });
      throw error;
    }
  }

  async getTag(tagId: string, ownerUserId: string): Promise<TagResponseDto> {
    const tag = await this.findOwnedTagOrThrow(tagId, ownerUserId);

    return this.toTagResponse(tag);
  }

  async updateTag(
    tagId: string,
    updateTagDto: UpdateTagDto,
    ownerUserId: string,
  ): Promise<TagResponseDto> {
    const tag = await this.findOwnedTagOrThrow(tagId, ownerUserId);

    try {
      if (updateTagDto.name) {
        const normalizedName = this.normalizeName(updateTagDto.name);
        await this.ensureTagNameIsAvailable(ownerUserId, normalizedName, tag.id);
        tag.name = updateTagDto.name;
        tag.normalizedName = normalizedName;
      }

      const updatedTag = await tag.save();
      this.logger.info('Tag updated successfully');

      return this.toTagResponse(updatedTag);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Tag update duplicate key conflict', {
          tagId,
          ownerUserId,
        });
        throw new ConflictException('Tag name already exists');
      }

      this.logger.error(error, 'Tag update failed', { tagId, ownerUserId });
      throw error;
    }
  }

  async deleteTag(tagId: string, ownerUserId: string) {
    const tag = await this.findOwnedTagOrThrow(tagId, ownerUserId);

    try {
      await tag.deleteOne();
      await this.expenseModel
        .updateMany({ ownerUserId, tagIds: tag.id }, { $pull: { tagIds: tag.id } })
        .exec();

      this.logger.info('Tag deleted successfully');

      return { id: tag.id, deleted: true };
    } catch (error) {
      this.logger.error(error, 'Tag delete failed', { tagId, ownerUserId });
      throw error;
    }
  }

  private async findOwnedTagOrThrow(
    tagId: string,
    ownerUserId: string,
  ): Promise<TagDocument> {
    if (!isValidObjectId(tagId)) {
      throw new NotFoundException('Tag not found');
    }

    try {
      const tag = await this.tagModel.findOne({ _id: tagId, ownerUserId }).exec();

      if (!tag) {
        throw new NotFoundException('Tag not found');
      }

      return tag;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(error, 'Tag find failed', { tagId, ownerUserId });
      throw error;
    }
  }

  private async ensureTagNameIsAvailable(
    ownerUserId: string,
    normalizedName: string,
    currentTagId?: string,
  ): Promise<void> {
    const existingTag = await this.tagModel
      .findOne({ ownerUserId, normalizedName })
      .exec();

    if (existingTag && existingTag.id !== currentTagId) {
      throw new ConflictException('Tag name already exists');
    }
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private toTagResponse(tag: TagDocument): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
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
