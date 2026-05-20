import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export enum UserStatus {
  Active = 'active',
  Disabled = 'disabled',
}

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    currentTime: () => new Date(),
  },
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

  @Prop({
    enum: UserRole,
    default: UserRole.User,
    required: true,
  })
  role: UserRole;

  @Prop({
    default: false,
    required: true,
  })
  isRootAdmin: boolean;

  @Prop({
    enum: UserStatus,
    default: UserStatus.Active,
    required: true,
  })
  status: UserStatus;

  @Prop({
    type: String,
  })
  createdByUserId?: string;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { isRootAdmin: 1 },
  {
    unique: true,
    partialFilterExpression: { isRootAdmin: true },
  },
);
