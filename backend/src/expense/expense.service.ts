import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AppLogger,
  CreateExpenseDto,
  ExpenseCategorySummaryDto,
  ExpenseResponseDto,
  ListExpensesResponseDto,
  ListExpensesQueryDto,
  MonthlyExpenseSummaryQueryDto,
  MonthlyExpenseSummaryResponseDto,
  UpdateExpenseDto,
} from '../common';
import {
  Category,
  CategoryDocument,
} from '../schemas/category.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';

interface MonthRange {
  end: Date;
  endDate: string;
  monthKey: string;
  start: Date;
  startDate: string;
}

interface ExpenseRelations {
  categories: Map<string, CategoryDocument>;
  tags: Map<string, TagDocument>;
}

interface CategoryAggregate {
  _id: string;
  count: number;
  totalPaise: number;
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    private readonly logger: AppLogger,
  ) {}

  async createExpense(
    createExpenseDto: CreateExpenseDto,
    ownerUserId: string,
  ): Promise<ExpenseResponseDto> {
    const parsedDate = this.parseExpenseDate(createExpenseDto.date);

    try {
      await this.findActiveCategoryOrThrow(createExpenseDto.categoryId);
      await this.ensureTagsBelongToUser(createExpenseDto.tagIds ?? [], ownerUserId);

      const expense = await this.expenseModel.create({
        ownerUserId,
        amountPaise: createExpenseDto.amountPaise,
        spentAt: parsedDate.spentAt,
        monthKey: parsedDate.monthKey,
        categoryId: createExpenseDto.categoryId,
        tagIds: this.uniqueIds(createExpenseDto.tagIds ?? []),
        note: createExpenseDto.note || undefined,
      });

      this.logger.info('Expense created successfully');

      return this.toExpenseResponse(expense, ownerUserId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(error, 'Expense create failed', { ownerUserId });
      throw error;
    }
  }

  async listRecentExpenses(
    query: ListExpensesQueryDto,
    ownerUserId: string,
  ): Promise<ExpenseResponseDto[]> {
    const monthRange = this.resolveMonthRange(query.month);
    const limit = query.limit ?? 10;

    try {
      const expenses = await this.expenseModel
        .find({
          ownerUserId,
          spentAt: { $gte: monthRange.start, $lt: monthRange.end },
        })
        .sort({ spentAt: -1, createdAt: -1 })
        .limit(limit)
        .exec();

      return this.toExpenseResponses(expenses, ownerUserId);
    } catch (error) {
      this.logger.error(error, 'Expense list recent failed', {
        ownerUserId,
        monthKey: monthRange.monthKey,
      });
      throw error;
    }
  }

  async listExpenses(
    query: ListExpensesQueryDto,
    ownerUserId: string,
  ): Promise<ListExpensesResponseDto> {
    const monthRange = this.resolveMonthRange(query.month);
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    try {
      const filter = {
        ownerUserId,
        spentAt: { $gte: monthRange.start, $lt: monthRange.end },
      };
      const [expenses, total] = await Promise.all([
        this.expenseModel
          .find(filter)
          .sort({ spentAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.expenseModel.countDocuments(filter).exec(),
      ]);

      return {
        monthKey: monthRange.monthKey,
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        expenses: await this.toExpenseResponses(expenses, ownerUserId),
      };
    } catch (error) {
      this.logger.error(error, 'Expense list failed', {
        ownerUserId,
        monthKey: monthRange.monthKey,
        page,
      });
      throw error;
    }
  }

  async getExpense(expenseId: string, ownerUserId: string): Promise<ExpenseResponseDto> {
    const expense = await this.findOwnedExpenseOrThrow(expenseId, ownerUserId);

    return this.toExpenseResponse(expense, ownerUserId);
  }

  async updateExpense(
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
    ownerUserId: string,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.findOwnedExpenseOrThrow(expenseId, ownerUserId);

    try {
      if (updateExpenseDto.amountPaise !== undefined) {
        expense.amountPaise = updateExpenseDto.amountPaise;
      }

      if (updateExpenseDto.date) {
        const parsedDate = this.parseExpenseDate(updateExpenseDto.date);
        expense.spentAt = parsedDate.spentAt;
        expense.monthKey = parsedDate.monthKey;
      }

      if (updateExpenseDto.categoryId) {
        await this.findActiveCategoryOrThrow(updateExpenseDto.categoryId);
        expense.categoryId = updateExpenseDto.categoryId;
      }

      if (updateExpenseDto.tagIds !== undefined) {
        await this.ensureTagsBelongToUser(updateExpenseDto.tagIds, ownerUserId);
        expense.tagIds = this.uniqueIds(updateExpenseDto.tagIds);
      }

      if (updateExpenseDto.note !== undefined) {
        expense.note = updateExpenseDto.note || undefined;
      }

      const updatedExpense = await expense.save();
      this.logger.info('Expense updated successfully');

      return this.toExpenseResponse(updatedExpense, ownerUserId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(error, 'Expense update failed', { expenseId, ownerUserId });
      throw error;
    }
  }

  async deleteExpense(expenseId: string, ownerUserId: string) {
    const expense = await this.findOwnedExpenseOrThrow(expenseId, ownerUserId);

    try {
      await expense.deleteOne();
      this.logger.info('Expense deleted successfully');

      return { id: expense.id, deleted: true };
    } catch (error) {
      this.logger.error(error, 'Expense delete failed', { expenseId, ownerUserId });
      throw error;
    }
  }

  async getMonthlySummary(
    query: MonthlyExpenseSummaryQueryDto,
    ownerUserId: string,
  ): Promise<MonthlyExpenseSummaryResponseDto> {
    const monthRange = this.resolveMonthRange(query.month);

    try {
      const aggregates = await this.expenseModel
        .aggregate<CategoryAggregate>([
          {
            $match: {
              ownerUserId,
              spentAt: { $gte: monthRange.start, $lt: monthRange.end },
            },
          },
          {
            $group: {
              _id: '$categoryId',
              count: { $sum: 1 },
              totalPaise: { $sum: '$amountPaise' },
            },
          },
        ])
        .exec();

      const activeCategories = await this.categoryModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();
      const aggregateCategoryIds = aggregates.map((aggregate) => aggregate._id);
      const inactiveUsedCategories = await this.categoryModel
        .find({
          _id: { $in: aggregateCategoryIds },
          isActive: false,
        })
        .exec();
      const categories = [...activeCategories, ...inactiveUsedCategories];
      const categoryMap = new Map(categories.map((category) => [category.id, category]));
      const aggregateMap = new Map(
        aggregates.map((aggregate) => [aggregate._id, aggregate]),
      );
      const categorySummaries = categories.map<ExpenseCategorySummaryDto>((category) => {
        const aggregate = aggregateMap.get(category.id);

        return {
          categoryId: category.id,
          categoryName: category.name,
          normalizedName: category.normalizedName,
          totalPaise: aggregate?.totalPaise ?? 0,
          count: aggregate?.count ?? 0,
        };
      });
      const totalPaise = categorySummaries.reduce(
        (total, category) => total + category.totalPaise,
        0,
      );

      return {
        monthKey: monthRange.monthKey,
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        totalPaise,
        categories: categorySummaries,
      };
    } catch (error) {
      this.logger.error(error, 'Expense monthly summary failed', {
        ownerUserId,
        monthKey: monthRange.monthKey,
      });
      throw error;
    }
  }

  private async findActiveCategoryOrThrow(
    categoryId: string,
  ): Promise<CategoryDocument> {
    if (!isValidObjectId(categoryId)) {
      throw new NotFoundException('Category not found');
    }

    const category = await this.categoryModel
      .findOne({ _id: categoryId, isActive: true })
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async ensureTagsBelongToUser(
    tagIds: string[],
    ownerUserId: string,
  ): Promise<void> {
    const uniqueTagIds = this.uniqueIds(tagIds);

    if (!uniqueTagIds.length) {
      return;
    }

    if (uniqueTagIds.some((tagId) => !isValidObjectId(tagId))) {
      throw new NotFoundException('Tag not found');
    }

    const tagCount = await this.tagModel
      .countDocuments({ _id: { $in: uniqueTagIds }, ownerUserId })
      .exec();

    if (tagCount !== uniqueTagIds.length) {
      throw new NotFoundException('Tag not found');
    }
  }

  private async findOwnedExpenseOrThrow(
    expenseId: string,
    ownerUserId: string,
  ): Promise<ExpenseDocument> {
    if (!isValidObjectId(expenseId)) {
      throw new NotFoundException('Expense not found');
    }

    try {
      const expense = await this.expenseModel
        .findOne({ _id: expenseId, ownerUserId })
        .exec();

      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      return expense;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(error, 'Expense find failed', { expenseId, ownerUserId });
      throw error;
    }
  }

  private async toExpenseResponse(
    expense: ExpenseDocument,
    ownerUserId: string,
  ): Promise<ExpenseResponseDto> {
    const [response] = await this.toExpenseResponses([expense], ownerUserId);

    return response;
  }

  private async toExpenseResponses(
    expenses: ExpenseDocument[],
    ownerUserId: string,
  ): Promise<ExpenseResponseDto[]> {
    const relations = await this.loadRelations(expenses, ownerUserId);

    return expenses.map((expense) => this.toExpenseResponseWithRelations(expense, relations));
  }

  private async loadRelations(
    expenses: ExpenseDocument[],
    ownerUserId: string,
  ): Promise<ExpenseRelations> {
    const categoryIds = this.uniqueIds(expenses.map((expense) => expense.categoryId));
    const tagIds = this.uniqueIds(expenses.flatMap((expense) => expense.tagIds));
    const [categories, tags] = await Promise.all([
      categoryIds.length
        ? this.categoryModel.find({ _id: { $in: categoryIds } }).exec()
        : Promise.resolve([]),
      tagIds.length
        ? this.tagModel.find({ _id: { $in: tagIds }, ownerUserId }).exec()
        : Promise.resolve([]),
    ]);

    return {
      categories: new Map(categories.map((category) => [category.id, category])),
      tags: new Map(tags.map((tag) => [tag.id, tag])),
    };
  }

  private toExpenseResponseWithRelations(
    expense: ExpenseDocument,
    relations: ExpenseRelations,
  ): ExpenseResponseDto {
    const category = relations.categories.get(expense.categoryId);

    return {
      id: expense.id,
      amountPaise: expense.amountPaise,
      date: this.formatDateOnly(expense.spentAt),
      category: {
        id: expense.categoryId,
        name: category?.name ?? 'Unknown category',
        normalizedName: category?.normalizedName,
      },
      tags: expense.tagIds
        .map((tagId) => relations.tags.get(tagId))
        .filter((tag): tag is TagDocument => Boolean(tag))
        .map((tag) => ({ id: tag.id, name: tag.name })),
      note: expense.note,
      monthKey: expense.monthKey,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private parseExpenseDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    const spentAt = new Date(Date.UTC(year, month - 1, day));

    if (
      spentAt.getUTCFullYear() !== year ||
      spentAt.getUTCMonth() !== month - 1 ||
      spentAt.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid expense date');
    }

    return {
      spentAt,
      monthKey: this.toMonthKey(year, month),
    };
  }

  private resolveMonthRange(month?: string): MonthRange {
    const now = new Date();
    const [year, monthNumber] = month
      ? month.split('-').map(Number)
      : [now.getUTCFullYear(), now.getUTCMonth() + 1];
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    if (
      start.getUTCFullYear() !== year ||
      start.getUTCMonth() !== monthNumber - 1
    ) {
      throw new BadRequestException('Invalid month');
    }

    return {
      start,
      end,
      monthKey: this.toMonthKey(year, monthNumber),
      startDate: this.formatDateOnly(start),
      endDate: this.formatDateOnly(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
    };
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private uniqueIds(ids: string[]): string[] {
    return Array.from(new Set(ids));
  }
}
