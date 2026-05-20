import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../schemas/expense.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tag.name, schema: TagSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
