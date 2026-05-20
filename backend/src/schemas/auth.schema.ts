import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  username: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  emailId: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash: string;

  @Prop({
    required: true,
    trim: true,
  })
  firstName: string;

  @Prop({
    trim: true,
  })
  lastName?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
