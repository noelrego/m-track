import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Tag, TagSchema } from '../schemas/tag.schema';
import { AiAssistController } from './aiassist.controller';
import { AiAssistService } from './aiassist.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Tag.name, schema: TagSchema },
    ]),
  ],
  controllers: [AiAssistController],
  providers: [AiAssistService],
})
export class AiAssistModule {}
