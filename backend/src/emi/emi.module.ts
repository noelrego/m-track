import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../schemas/category.schema';
import { EmiPlan, EmiPlanSchema } from '../schemas/emi-plan.schema';
import { Expense, ExpenseSchema } from '../schemas/expense.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { EmiController } from './emi.controller';
import { EmiService } from './emi.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: EmiPlan.name, schema: EmiPlanSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
  ],
  controllers: [EmiController],
  providers: [EmiService],
})
export class EmiModule {}
