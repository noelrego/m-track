import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Expense, ExpenseSchema } from '../schemas/expense.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
