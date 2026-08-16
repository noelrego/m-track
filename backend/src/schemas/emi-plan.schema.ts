import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EmiAmountMode, EmiPlanStatus } from '../common/enums/emi.enum';

export type EmiPlanDocument = HydratedDocument<EmiPlan>;

@Schema({
  collection: 'emi_plans',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    currentTime: () => new Date(),
  },
})
export class EmiPlan {
  @Prop({ required: true, type: String, index: true })
  ownerUserId: string;

  @Prop({ minlength: 1, required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  lender?: string;

  @Prop({ required: true, type: String, index: true })
  categoryId: string;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, min: 1, max: 31, type: Number })
  paymentDay: number;

  @Prop({ enum: EmiAmountMode, required: true })
  amountMode: EmiAmountMode;

  @Prop({ required: true, min: 1, type: Number })
  amountPaise: number;

  @Prop({ required: true, min: 1, type: Number })
  installmentCount: number;

  @Prop({ default: [], type: [String] })
  tagIds: string[];

  @Prop({ trim: true })
  note?: string;

  @Prop({ enum: EmiPlanStatus, default: EmiPlanStatus.Active, required: true })
  status: EmiPlanStatus;

  createdAt: Date;

  updatedAt: Date;
}

export const EmiPlanSchema = SchemaFactory.createForClass(EmiPlan);

EmiPlanSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });
