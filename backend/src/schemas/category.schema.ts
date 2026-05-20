import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ExpenseCategoryKey } from '../common/enums/category.enum';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  collection: 'categories',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    currentTime: () => new Date(),
  },
})
export class Category {
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    enum: ExpenseCategoryKey,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    index: true,
  })
  normalizedName: ExpenseCategoryKey;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    default: true,
    required: true,
  })
  isActive: boolean;

  @Prop({
    default: 0,
    required: true,
  })
  sortOrder: number;

  @Prop({
    type: String,
  })
  createdByUserId?: string;

  createdAt: Date;

  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
