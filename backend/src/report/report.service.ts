import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppLogger,
  CurrentMonthCategoryCardsResponseDto,
  CurrentMonthTopExpensesResponseDto,
  CurrentMonthWeeklyReportResponseDto,
  EXPENSE_CATEGORY_KEYS,
  ExpenseCategoryKey,
  ReportCategoryAmountDto,
  ReportInsightDto,
  ReportInsightsResponseDto,
  TopExpenseItemDto,
  WeeklyReportItemDto,
} from '../common';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';

interface MonthRange {
  end: Date;
  endDate: string;
  monthKey: string;
  monthName: string;
  start: Date;
  startDate: string;
}

interface CategoryAggregate {
  _id: string;
  count: number;
  totalPaise: number;
}

interface CategoryLookup {
  byId: Map<string, CategoryDocument>;
  byKey: Map<ExpenseCategoryKey, CategoryDocument>;
}

interface WeekRange {
  end: Date;
  endDate: string;
  label: string;
  start: Date;
  startDate: string;
  weekNumber: number;
}

const ALL_CATEGORY_KEYS = EXPENSE_CATEGORY_KEYS;
const NEEDS_WANTS_KEYS = [ExpenseCategoryKey.Needs, ExpenseCategoryKey.Wants];
const CHART_CATEGORY_KEYS = [
  ExpenseCategoryKey.Needs,
  ExpenseCategoryKey.Wants,
  ExpenseCategoryKey.Extra,
];

const CATEGORY_LABELS: Record<ExpenseCategoryKey, string> = {
  [ExpenseCategoryKey.Needs]: 'Needs',
  [ExpenseCategoryKey.Wants]: 'Wants',
  [ExpenseCategoryKey.Emis]: 'EMIs',
  [ExpenseCategoryKey.Extra]: 'Extra',
  [ExpenseCategoryKey.Invest]: 'Invest',
};

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    private readonly logger: AppLogger,
  ) {}

  async getInsights(ownerUserId: string): Promise<ReportInsightsResponseDto> {
    const currentMonth = this.getCurrentMonthRange();
    const lastMonth = this.getRelativeMonthRange(currentMonth, -1);

    try {
      const categories = await this.loadStaticCategories();
      const allCategoryIds = this.getCategoryIds(categories, ALL_CATEGORY_KEYS);
      const needsWantsCategoryIds = this.getCategoryIds(
        categories,
        NEEDS_WANTS_KEYS,
      );
      const [lastMonthAllTotal, currentMonthAllTotal, currentMonthNeedsWantsTotal] =
        await Promise.all([
          this.sumExpenses(ownerUserId, lastMonth, allCategoryIds),
          this.sumExpenses(ownerUserId, currentMonth, allCategoryIds),
          this.sumExpenses(ownerUserId, currentMonth, needsWantsCategoryIds),
        ]);

      return {
        lastMonthAllExpense: this.toInsight(
          'lastMonthAllExpense',
          `${lastMonth.monthName} Total`,
          lastMonth,
          ALL_CATEGORY_KEYS,
          lastMonthAllTotal,
        ),
        currentMonthAllExpense: this.toInsight(
          'currentMonthAllExpense',
          `${currentMonth.monthName} Total`,
          currentMonth,
          ALL_CATEGORY_KEYS,
          currentMonthAllTotal,
        ),
        currentMonthNeedsWants: this.toInsight(
          'currentMonthNeedsWants',
          `${currentMonth.monthName} Needs + Wants`,
          currentMonth,
          NEEDS_WANTS_KEYS,
          currentMonthNeedsWantsTotal,
        ),
      };
    } catch (error) {
      this.logger.error(error, 'Report insights failed', { ownerUserId });
      throw error;
    }
  }

  async getCurrentMonthCategoryCards(
    ownerUserId: string,
  ): Promise<CurrentMonthCategoryCardsResponseDto> {
    const currentMonth = this.getCurrentMonthRange();

    try {
      const categories = await this.loadStaticCategories();
      const categoryIds = this.getCategoryIds(categories, ALL_CATEGORY_KEYS);
      const aggregateMap = await this.aggregateByCategory(
        ownerUserId,
        currentMonth,
        categoryIds,
      );
      const categoryAmounts = this.toCategoryAmounts(
        categories,
        aggregateMap,
        ALL_CATEGORY_KEYS,
      );

      return {
        monthKey: currentMonth.monthKey,
        monthName: currentMonth.monthName,
        needsTotalPaise:
          categoryAmounts.find(
            (category) => category.normalizedName === ExpenseCategoryKey.Needs,
          )?.totalPaise ?? 0,
        wantsTotalPaise:
          categoryAmounts.find(
            (category) => category.normalizedName === ExpenseCategoryKey.Wants,
          )?.totalPaise ?? 0,
        categories: categoryAmounts,
      };
    } catch (error) {
      this.logger.error(error, 'Report current month categories failed', {
        ownerUserId,
      });
      throw error;
    }
  }

  async getCurrentMonthWeeklyReport(
    ownerUserId: string,
  ): Promise<CurrentMonthWeeklyReportResponseDto> {
    const currentMonth = this.getCurrentMonthRange();

    try {
      const categories = await this.loadStaticCategories();
      const categoryIds = this.getCategoryIds(categories, CHART_CATEGORY_KEYS);
      const weeks = this.getWeeksForMonth(currentMonth);

      if (!categoryIds.length) {
        return {
          monthKey: currentMonth.monthKey,
          monthName: currentMonth.monthName,
          weeks: weeks.map((week) => this.toEmptyWeek(week)),
        };
      }

      const expenses = await this.expenseModel
        .find({
          ownerUserId,
          categoryId: { $in: categoryIds },
          spentAt: { $gte: currentMonth.start, $lt: currentMonth.end },
        })
        .select('amountPaise spentAt categoryId')
        .exec();
      const weeklyTotals = this.buildWeeklyTotals(expenses, weeks);

      return {
        monthKey: currentMonth.monthKey,
        monthName: currentMonth.monthName,
        weeks: weeks.map((week) =>
          this.toWeeklyReportItem(week, categories, weeklyTotals),
        ),
      };
    } catch (error) {
      this.logger.error(error, 'Report current month weekly failed', {
        ownerUserId,
      });
      throw error;
    }
  }

  async getCurrentMonthTopExpenses(
    ownerUserId: string,
  ): Promise<CurrentMonthTopExpensesResponseDto> {
    const currentMonth = this.getCurrentMonthRange();

    try {
      const categories = await this.loadStaticCategories();
      const categoryIds = this.getCategoryIds(categories, CHART_CATEGORY_KEYS);

      if (!categoryIds.length) {
        return {
          monthKey: currentMonth.monthKey,
          monthName: currentMonth.monthName,
          expenses: [],
        };
      }

      const expenses = await this.expenseModel
        .find({
          ownerUserId,
          categoryId: { $in: categoryIds },
          spentAt: { $gte: currentMonth.start, $lt: currentMonth.end },
        })
        .sort({ amountPaise: -1, spentAt: -1, createdAt: -1 })
        .limit(4)
        .exec();

      return {
        monthKey: currentMonth.monthKey,
        monthName: currentMonth.monthName,
        expenses: expenses
          .map((expense) => this.toTopExpense(expense, categories))
          .filter(
            (expense): expense is TopExpenseItemDto => expense !== undefined,
          ),
      };
    } catch (error) {
      this.logger.error(error, 'Report current month top expenses failed', {
        ownerUserId,
      });
      throw error;
    }
  }

  private async loadStaticCategories(): Promise<CategoryLookup> {
    const categories = await this.categoryModel
      .find({ normalizedName: { $in: ALL_CATEGORY_KEYS } })
      .exec();

    return {
      byId: new Map(categories.map((category) => [category.id, category])),
      byKey: new Map(
        categories.map((category) => [category.normalizedName, category]),
      ),
    };
  }

  private getCategoryIds(
    categories: CategoryLookup,
    categoryKeys: ExpenseCategoryKey[],
  ): string[] {
    return categoryKeys
      .map((categoryKey) => categories.byKey.get(categoryKey)?.id)
      .filter((categoryId): categoryId is string => Boolean(categoryId));
  }

  private async sumExpenses(
    ownerUserId: string,
    monthRange: MonthRange,
    categoryIds: string[],
  ): Promise<number> {
    if (!categoryIds.length) {
      return 0;
    }

    const [result] = await this.expenseModel
      .aggregate<{ totalPaise: number }>([
        {
          $match: {
            ownerUserId,
            categoryId: { $in: categoryIds },
            spentAt: { $gte: monthRange.start, $lt: monthRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalPaise: { $sum: '$amountPaise' },
          },
        },
      ])
      .exec();

    return result?.totalPaise ?? 0;
  }

  private async aggregateByCategory(
    ownerUserId: string,
    monthRange: MonthRange,
    categoryIds: string[],
  ): Promise<Map<string, CategoryAggregate>> {
    if (!categoryIds.length) {
      return new Map();
    }

    const aggregates = await this.expenseModel
      .aggregate<CategoryAggregate>([
        {
          $match: {
            ownerUserId,
            categoryId: { $in: categoryIds },
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

    return new Map(aggregates.map((aggregate) => [aggregate._id, aggregate]));
  }

  private toInsight(
    key: string,
    label: string,
    monthRange: MonthRange,
    categoryKeys: ExpenseCategoryKey[],
    totalPaise: number,
  ): ReportInsightDto {
    return {
      key,
      label,
      monthKey: monthRange.monthKey,
      monthName: monthRange.monthName,
      totalPaise,
      categoryKeys,
    };
  }

  private toCategoryAmounts(
    categories: CategoryLookup,
    aggregateMap: Map<string, CategoryAggregate>,
    categoryKeys: ExpenseCategoryKey[],
  ): ReportCategoryAmountDto[] {
    return categoryKeys.map((categoryKey) => {
      const category = categories.byKey.get(categoryKey);
      const aggregate = category ? aggregateMap.get(category.id) : undefined;

      return {
        categoryId: category?.id,
        categoryName: category?.name ?? CATEGORY_LABELS[categoryKey],
        normalizedName: categoryKey,
        totalPaise: aggregate?.totalPaise ?? 0,
        count: aggregate?.count ?? 0,
      };
    });
  }

  private buildWeeklyTotals(
    expenses: ExpenseDocument[],
    weeks: WeekRange[],
  ): Map<number, Map<string, CategoryAggregate>> {
    const weeklyTotals = new Map<number, Map<string, CategoryAggregate>>();

    for (const week of weeks) {
      weeklyTotals.set(week.weekNumber, new Map());
    }

    for (const expense of expenses) {
      const week = weeks.find(
        (weekRange) =>
          expense.spentAt >= weekRange.start && expense.spentAt < weekRange.end,
      );

      if (!week) {
        continue;
      }

      const weekMap = weeklyTotals.get(week.weekNumber) ?? new Map();
      const existing = weekMap.get(expense.categoryId) ?? {
        _id: expense.categoryId,
        count: 0,
        totalPaise: 0,
      };

      existing.count += 1;
      existing.totalPaise += expense.amountPaise;
      weekMap.set(expense.categoryId, existing);
      weeklyTotals.set(week.weekNumber, weekMap);
    }

    return weeklyTotals;
  }

  private toWeeklyReportItem(
    week: WeekRange,
    categories: CategoryLookup,
    weeklyTotals: Map<number, Map<string, CategoryAggregate>>,
  ): WeeklyReportItemDto {
    const aggregateMap = weeklyTotals.get(week.weekNumber) ?? new Map();
    const categoryAmounts = this.toCategoryAmounts(
      categories,
      aggregateMap,
      CHART_CATEGORY_KEYS,
    );

    return {
      weekNumber: week.weekNumber,
      label: week.label,
      startDate: week.startDate,
      endDate: week.endDate,
      needsTotalPaise:
        categoryAmounts.find(
          (category) => category.normalizedName === ExpenseCategoryKey.Needs,
        )?.totalPaise ?? 0,
      wantsTotalPaise:
        categoryAmounts.find(
          (category) => category.normalizedName === ExpenseCategoryKey.Wants,
        )?.totalPaise ?? 0,
      extraTotalPaise:
        categoryAmounts.find(
          (category) => category.normalizedName === ExpenseCategoryKey.Extra,
        )?.totalPaise ?? 0,
      categories: categoryAmounts.map((category) => ({
        normalizedName: category.normalizedName,
        categoryName: category.categoryName,
        totalPaise: category.totalPaise,
        count: category.count,
      })),
    };
  }

  private toEmptyWeek(week: WeekRange): WeeklyReportItemDto {
    return {
      weekNumber: week.weekNumber,
      label: week.label,
      startDate: week.startDate,
      endDate: week.endDate,
      needsTotalPaise: 0,
      wantsTotalPaise: 0,
      extraTotalPaise: 0,
      categories: CHART_CATEGORY_KEYS.map((categoryKey) => ({
        normalizedName: categoryKey,
        categoryName: CATEGORY_LABELS[categoryKey],
        totalPaise: 0,
        count: 0,
      })),
    };
  }

  private toTopExpense(
    expense: ExpenseDocument,
    categories: CategoryLookup,
  ): TopExpenseItemDto | undefined {
    const category = categories.byId.get(expense.categoryId);

    if (!category) {
      return undefined;
    }

    return {
      id: expense.id,
      amountPaise: expense.amountPaise,
      date: this.formatDateOnly(expense.spentAt),
      category: {
        id: category.id,
        name: category.name,
        normalizedName: category.normalizedName,
      },
      note: expense.note,
      createdAt: expense.createdAt.toISOString(),
    };
  }

  private getWeeksForMonth(monthRange: MonthRange): WeekRange[] {
    const weeks: WeekRange[] = [];
    let weekNumber = 1;
    let weekStart = new Date(monthRange.start);

    while (weekStart < monthRange.end) {
      const weekEnd = new Date(
        Math.min(
          Date.UTC(
            weekStart.getUTCFullYear(),
            weekStart.getUTCMonth(),
            weekStart.getUTCDate() + 7,
          ),
          monthRange.end.getTime(),
        ),
      );
      const inclusiveEnd = new Date(weekEnd.getTime() - 24 * 60 * 60 * 1000);

      weeks.push({
        weekNumber,
        label: `Week ${weekNumber}`,
        start: weekStart,
        end: weekEnd,
        startDate: this.formatDateOnly(weekStart),
        endDate: this.formatDateOnly(inclusiveEnd),
      });

      weekStart = weekEnd;
      weekNumber += 1;
    }

    return weeks;
  }

  private getCurrentMonthRange(): MonthRange {
    const now = new Date();

    return this.getMonthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
  }

  private getRelativeMonthRange(
    monthRange: MonthRange,
    monthOffset: number,
  ): MonthRange {
    return this.getMonthRange(
      monthRange.start.getUTCFullYear(),
      monthRange.start.getUTCMonth() + 1 + monthOffset,
    );
  }

  private getMonthRange(year: number, month: number): MonthRange {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    return {
      start,
      end,
      monthKey: this.toMonthKey(start.getUTCFullYear(), start.getUTCMonth() + 1),
      monthName: this.formatMonthName(start),
      startDate: this.formatDateOnly(start),
      endDate: this.formatDateOnly(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
    };
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatMonthName(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(date);
  }

  private toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}
