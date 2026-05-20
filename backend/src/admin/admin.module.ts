import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/auth.schema';
import { Category, CategorySchema } from '../schemas/category.schema';
import { AdminCategoryController } from './admin-category.controller';
import { AdminCategoryService } from './admin-category.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [AdminController, AdminCategoryController],
  providers: [AdminService, AdminCategoryService],
  exports: [AdminService, AdminCategoryService],
})
export class AdminModule {}
