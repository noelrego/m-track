import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({
  collection: 'expenses',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    currentTime: () => new Date(),
  },
})
export class Expense {
  @Prop({
    required: true,
    type: String,
    index: true,
  })
  ownerUserId: string;

  @Prop({
    required: true,
    min: 1,
    type: Number,
  })
  amountPaise: number;

  @Prop({
    required: true,
    type: Date,
    index: true,
  })
  spentAt: Date;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  monthKey: string;

  @Prop({
    required: true,
    type: String,
    index: true,
  })
  categoryId: string;

  @Prop({
    default: [],
    type: [String],
  })
  tagIds: string[];

  @Prop({
    trim: true,
  })
  note?: string;

  @Prop({
    type: String,
    index: true,
  })
  emiPlanId?: string;

  @Prop({
    min: 1,
    type: Number,
  })
  emiInstallmentNumber?: number;

  @Prop({
    min: 1,
    type: Number,
  })
  emiInstallmentCount?: number;

  createdAt: Date;

  updatedAt: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ ownerUserId: 1, spentAt: -1, createdAt: -1 });
ExpenseSchema.index({ ownerUserId: 1, monthKey: 1 });
ExpenseSchema.index({ ownerUserId: 1, monthKey: 1, categoryId: 1 });
ExpenseSchema.index(
  { ownerUserId: 1, emiPlanId: 1, emiInstallmentNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { emiPlanId: { $type: 'string' } },
  },
);
