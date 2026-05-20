import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TagDocument = HydratedDocument<Tag>;

@Schema({
  collection: 'tags',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    currentTime: () => new Date(),
  },
})
export class Tag {
  @Prop({
    required: true,
    type: String,
    index: true,
  })
  ownerUserId: string;

  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  normalizedName: string;

  createdAt: Date;

  updatedAt: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

TagSchema.index({ ownerUserId: 1, normalizedName: 1 }, { unique: true });
