import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  AppLogger,
  CreateEmiPlanDto,
  EmiAmountMode,
  EmiEditScope,
  EmiOverviewDto,
  EmiPlanDetailDto,
  EmiPlanStatus,
  EmiPlanSummaryDto,
  ExpenseCategoryKey,
  ExpenseResponseDto,
  ListEmiPlansResponseDto,
  UpdateEmiInstallmentDto,
  UpdateEmiPlanDto,
} from '../common';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { EmiPlan, EmiPlanDocument } from '../schemas/emi-plan.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';
import { buildEmiSchedule } from './emi-schedule.util';

interface ExpenseRelations {
  category?: CategoryDocument;
  tags: Map<string, TagDocument>;
}

@Injectable()
export class EmiService {
  constructor(
    @InjectModel(EmiPlan.name) private readonly emiPlanModel: Model<EmiPlanDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    private readonly logger: AppLogger,
  ) {}

  async createPlan(
    createDto: CreateEmiPlanDto,
    ownerUserId: string,
  ): Promise<EmiPlanDetailDto> {
    const startDate = this.parseDateOnly(createDto.startDate);
    const category = await this.findEmiCategoryOrThrow(createDto.categoryId);
    const tagIds = this.uniqueIds(createDto.tagIds ?? []);

    await this.ensureTagsBelongToUser(tagIds, ownerUserId);

    const schedule = buildEmiSchedule(
      createDto.amountMode,
      createDto.amountPaise,
      createDto.numberOfMonths,
      startDate,
    );
    let plan: EmiPlanDocument | undefined;

    try {
      plan = await this.emiPlanModel.create({
        ownerUserId,
        name: createDto.name,
        lender: createDto.lender || undefined,
        categoryId: category.id,
        startDate,
        paymentDay: startDate.getUTCDate(),
        amountMode: createDto.amountMode,
        amountPaise: createDto.amountPaise,
        installmentCount: createDto.numberOfMonths,
        tagIds,
        note: createDto.note || undefined,
        status: EmiPlanStatus.Active,
      });

      await this.expenseModel.insertMany(
        schedule.map((item) => ({
          ownerUserId,
          amountPaise: item.amountPaise,
          spentAt: item.date,
          monthKey: item.monthKey,
          categoryId: category.id,
          tagIds,
          note: createDto.note || undefined,
          emiPlanId: plan!.id,
          emiInstallmentNumber: item.installmentNumber,
          emiInstallmentCount: createDto.numberOfMonths,
        })),
      );

      this.logger.info('EMI plan created successfully', {
        ownerUserId,
        planId: plan.id,
        installmentCount: createDto.numberOfMonths,
      });

      return this.getPlan(plan.id, ownerUserId);
    } catch (error) {
      if (plan) {
        await Promise.allSettled([
          this.expenseModel.deleteMany({ ownerUserId, emiPlanId: plan.id }).exec(),
          this.emiPlanModel.deleteOne({ _id: plan.id, ownerUserId }).exec(),
        ]);
      }

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(error, 'EMI plan create failed', { ownerUserId });
      throw error;
    }
  }

  async listPlans(ownerUserId: string): Promise<ListEmiPlansResponseDto> {
    const plans = await this.emiPlanModel
      .find({ ownerUserId })
      .sort({ status: 1, createdAt: -1 })
      .exec();
    const planIds = plans.map((plan) => plan.id);
    const [installments, legacyExpenseCount] = await Promise.all([
      planIds.length
        ? this.expenseModel
            .find({ ownerUserId, emiPlanId: { $in: planIds } })
            .sort({ spentAt: 1, emiInstallmentNumber: 1 })
            .exec()
        : Promise.resolve([]),
      this.countLegacyEmiExpenses(ownerUserId),
    ]);
    const installmentsByPlan = new Map<string, ExpenseDocument[]>();

    for (const installment of installments) {
      if (!installment.emiPlanId) {
        continue;
      }

      const current = installmentsByPlan.get(installment.emiPlanId) ?? [];
      current.push(installment);
      installmentsByPlan.set(installment.emiPlanId, current);
    }

    return {
      plans: plans.map((plan) =>
        this.toPlanSummary(plan, installmentsByPlan.get(plan.id) ?? []),
      ),
      legacyExpenseCount,
    };
  }

  async getOverview(ownerUserId: string): Promise<EmiOverviewDto> {
    const { plans } = await this.listPlans(ownerUserId);
    const activePlans = plans.filter((plan) => plan.status === EmiPlanStatus.Active);
    const paidInstallments = activePlans.reduce(
      (total, plan) => total + plan.paidInstallments,
      0,
    );
    const remainingInstallments = activePlans.reduce(
      (total, plan) => total + plan.remainingInstallments,
      0,
    );
    const installmentCount = paidInstallments + remainingInstallments;
    const nextPaymentDates = activePlans
      .map((plan) => plan.nextPaymentDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    return {
      activePlanCount: activePlans.length,
      paidInstallments,
      remainingInstallments,
      progressPercent: installmentCount
        ? Math.round((paidInstallments / installmentCount) * 100)
        : 0,
      monthlyCommitmentPaise: activePlans.reduce(
        (total, plan) => total + plan.currentMonthlyPaise,
        0,
      ),
      remainingPaise: activePlans.reduce(
        (total, plan) => total + plan.remainingPaise,
        0,
      ),
      nextPaymentDate: nextPaymentDates[0],
    };
  }

  async getPlan(planId: string, ownerUserId: string): Promise<EmiPlanDetailDto> {
    const plan = await this.findOwnedPlanOrThrow(planId, ownerUserId);
    const installments = await this.expenseModel
      .find({ ownerUserId, emiPlanId: plan.id })
      .sort({ spentAt: 1, emiInstallmentNumber: 1 })
      .exec();
    const relations = await this.loadRelations(
      plan.categoryId,
      this.uniqueIds([...plan.tagIds, ...installments.flatMap((item) => item.tagIds)]),
      ownerUserId,
    );
    const summary = this.toPlanSummary(plan, installments);

    return {
      ...summary,
      categoryId: plan.categoryId,
      amountMode: plan.amountMode,
      amountPaise: plan.amountPaise,
      tags: plan.tagIds
        .map((tagId) => relations.tags.get(tagId))
        .filter((tag): tag is TagDocument => Boolean(tag))
        .map((tag) => ({ id: tag.id, name: tag.name })),
      note: plan.note,
      installments: installments.map((installment) => ({
        ...this.toExpenseResponse(installment, relations),
        installmentNumber: installment.emiInstallmentNumber ?? 0,
        installmentCount: installment.emiInstallmentCount ?? plan.installmentCount,
        isPaid: this.isPaid(installment.spentAt),
      })),
    };
  }

  async listLegacyExpenses(ownerUserId: string): Promise<ExpenseResponseDto[]> {
    const categoryIds = await this.findEmiCategoryIds();

    if (!categoryIds.length) {
      return [];
    }

    const expenses = await this.expenseModel
      .find({
        ownerUserId,
        categoryId: { $in: categoryIds },
        $or: [{ emiPlanId: { $exists: false } }, { emiPlanId: null }],
      })
      .sort({ spentAt: -1, createdAt: -1 })
      .limit(100)
      .exec();
    const relations = await this.loadRelations(
      categoryIds[0],
      this.uniqueIds(expenses.flatMap((expense) => expense.tagIds)),
      ownerUserId,
    );

    return expenses.map((expense) => this.toExpenseResponse(expense, relations));
  }

  async updatePlan(
    planId: string,
    updateDto: UpdateEmiPlanDto,
    ownerUserId: string,
  ): Promise<EmiPlanDetailDto> {
    const plan = await this.findOwnedPlanOrThrow(planId, ownerUserId);

    if (updateDto.name !== undefined) {
      plan.name = updateDto.name;
    }

    if (updateDto.lender !== undefined) {
      plan.lender = updateDto.lender || undefined;
    }

    await plan.save();

    return this.getPlan(plan.id, ownerUserId);
  }

  async updateInstallment(
    planId: string,
    expenseId: string,
    updateDto: UpdateEmiInstallmentDto,
    ownerUserId: string,
  ): Promise<EmiPlanDetailDto> {
    const plan = await this.findOwnedPlanOrThrow(planId, ownerUserId);
    const installment = await this.findOwnedInstallmentOrThrow(
      plan.id,
      expenseId,
      ownerUserId,
    );

    if (updateDto.tagIds !== undefined) {
      await this.ensureTagsBelongToUser(updateDto.tagIds, ownerUserId);
    }

    if (updateDto.scope === EmiEditScope.Single) {
      await this.updateSingleInstallment(installment, updateDto);
    } else {
      await this.updateFutureInstallments(plan, installment, updateDto, ownerUserId);
    }

    return this.getPlan(plan.id, ownerUserId);
  }

  async deleteInstallment(
    planId: string,
    expenseId: string,
    scope: EmiEditScope,
    ownerUserId: string,
  ) {
    const plan = await this.findOwnedPlanOrThrow(planId, ownerUserId);
    const installment = await this.findOwnedInstallmentOrThrow(
      plan.id,
      expenseId,
      ownerUserId,
    );

    if (scope === EmiEditScope.Single) {
      await installment.deleteOne();
    } else {
      await this.expenseModel
        .deleteMany({
          ownerUserId,
          emiPlanId: plan.id,
          emiInstallmentNumber: { $gte: installment.emiInstallmentNumber ?? 1 },
        })
        .exec();
      plan.status = EmiPlanStatus.Stopped;
      await plan.save();
    }

    const remaining = await this.expenseModel.countDocuments({
      ownerUserId,
      emiPlanId: plan.id,
    });

    if (!remaining && plan.status !== EmiPlanStatus.Stopped) {
      plan.status = EmiPlanStatus.Stopped;
      await plan.save();
    }

    return { id: expenseId, deleted: true, scope };
  }

  private async updateSingleInstallment(
    installment: ExpenseDocument,
    updateDto: UpdateEmiInstallmentDto,
  ) {
    if (updateDto.amountPaise !== undefined) {
      installment.amountPaise = updateDto.amountPaise;
    }

    if (updateDto.date) {
      const date = this.parseDateOnly(updateDto.date);
      installment.spentAt = date;
      installment.monthKey = this.toMonthKey(date);
    }

    if (updateDto.tagIds !== undefined) {
      installment.tagIds = this.uniqueIds(updateDto.tagIds);
    }

    if (updateDto.note !== undefined) {
      installment.note = updateDto.note || undefined;
    }

    await installment.save();
  }

  private async updateFutureInstallments(
    plan: EmiPlanDocument,
    selected: ExpenseDocument,
    updateDto: UpdateEmiInstallmentDto,
    ownerUserId: string,
  ) {
    if (
      !updateDto.amountMode ||
      updateDto.amountPaise === undefined ||
      updateDto.numberOfMonths === undefined ||
      !updateDto.date
    ) {
      throw new BadRequestException(
        'Future EMI updates require amount mode, amount, number of months, and date',
      );
    }

    const startDate = this.parseDateOnly(updateDto.date);
    const firstInstallmentNumber = selected.emiInstallmentNumber ?? 1;
    const schedule = buildEmiSchedule(
      updateDto.amountMode,
      updateDto.amountPaise,
      updateDto.numberOfMonths,
      startDate,
      firstInstallmentNumber,
    );
    const totalInstallmentCount = firstInstallmentNumber - 1 + schedule.length;
    const futureInstallments = await this.expenseModel
      .find({
        ownerUserId,
        emiPlanId: plan.id,
        emiInstallmentNumber: { $gte: firstInstallmentNumber },
      })
      .sort({ emiInstallmentNumber: 1 })
      .exec();
    const tagIds = this.uniqueIds(updateDto.tagIds ?? selected.tagIds);
    const note = updateDto.note !== undefined ? updateDto.note : selected.note;
    const sharedFields = {
      categoryId: plan.categoryId,
      emiInstallmentCount: totalInstallmentCount,
      emiPlanId: plan.id,
      note: note || undefined,
      ownerUserId,
      tagIds,
    };
    const commonCount = Math.min(schedule.length, futureInstallments.length);

    for (let index = 0; index < commonCount; index += 1) {
      const installment = futureInstallments[index];
      const item = schedule[index];

      installment.amountPaise = item.amountPaise;
      installment.spentAt = item.date;
      installment.monthKey = item.monthKey;
      installment.categoryId = plan.categoryId;
      installment.tagIds = tagIds;
      installment.note = note || undefined;
      installment.emiInstallmentNumber = item.installmentNumber;
      installment.emiInstallmentCount = totalInstallmentCount;
      await installment.save();
    }

    if (schedule.length > futureInstallments.length) {
      await this.expenseModel.insertMany(
        schedule.slice(commonCount).map((item) => ({
          ...sharedFields,
          amountPaise: item.amountPaise,
          spentAt: item.date,
          monthKey: item.monthKey,
          emiInstallmentNumber: item.installmentNumber,
        })),
      );
    }

    if (futureInstallments.length > schedule.length) {
      await this.expenseModel
        .deleteMany({
          _id: { $in: futureInstallments.slice(commonCount).map((item) => item._id) },
          ownerUserId,
        })
        .exec();
    }

    await this.expenseModel
      .updateMany(
        {
          ownerUserId,
          emiPlanId: plan.id,
          emiInstallmentNumber: { $lt: firstInstallmentNumber },
        },
        { $set: { emiInstallmentCount: totalInstallmentCount } },
      )
      .exec();

    plan.amountMode = updateDto.amountMode;
    plan.amountPaise = updateDto.amountPaise;
    plan.installmentCount = totalInstallmentCount;
    plan.tagIds = tagIds;
    plan.note = note || undefined;
    plan.status = EmiPlanStatus.Active;

    if (firstInstallmentNumber === 1) {
      plan.startDate = startDate;
      plan.paymentDay = startDate.getUTCDate();
    }

    await plan.save();
  }

  private toPlanSummary(
    plan: EmiPlanDocument,
    installments: ExpenseDocument[],
  ): EmiPlanSummaryDto {
    const paid = installments.filter((installment) => this.isPaid(installment.spentAt));
    const remaining = installments.filter(
      (installment) => !this.isPaid(installment.spentAt),
    );
    const sorted = [...installments].sort(
      (first, second) => first.spentAt.getTime() - second.spentAt.getTime(),
    );
    const paidPaise = paid.reduce((total, item) => total + item.amountPaise, 0);
    const remainingPaise = remaining.reduce(
      (total, item) => total + item.amountPaise,
      0,
    );
    const status =
      plan.status === EmiPlanStatus.Stopped
        ? EmiPlanStatus.Stopped
        : remaining.length
          ? EmiPlanStatus.Active
          : 'completed';

    return {
      id: plan.id,
      name: plan.name,
      lender: plan.lender,
      status,
      installmentCount: installments.length,
      paidInstallments: paid.length,
      remainingInstallments: remaining.length,
      currentMonthlyPaise:
        remaining[0]?.amountPaise ?? sorted[sorted.length - 1]?.amountPaise ?? 0,
      scheduledTotalPaise: paidPaise + remainingPaise,
      paidPaise,
      remainingPaise,
      nextPaymentDate: remaining[0]
        ? this.formatDateOnly(remaining[0].spentAt)
        : undefined,
      startDate: sorted[0]
        ? this.formatDateOnly(sorted[0].spentAt)
        : this.formatDateOnly(plan.startDate),
      endDate: sorted.length
        ? this.formatDateOnly(sorted[sorted.length - 1].spentAt)
        : this.formatDateOnly(plan.startDate),
    };
  }

  private async loadRelations(
    categoryId: string,
    tagIds: string[],
    ownerUserId: string,
  ): Promise<ExpenseRelations> {
    const [category, tags] = await Promise.all([
      this.categoryModel.findById(categoryId).exec(),
      tagIds.length
        ? this.tagModel.find({ _id: { $in: tagIds }, ownerUserId }).exec()
        : Promise.resolve([]),
    ]);

    return {
      category: category ?? undefined,
      tags: new Map(tags.map((tag) => [tag.id, tag])),
    };
  }

  private toExpenseResponse(
    expense: ExpenseDocument,
    relations: ExpenseRelations,
  ): ExpenseResponseDto {
    return {
      id: expense.id,
      amountPaise: expense.amountPaise,
      date: this.formatDateOnly(expense.spentAt),
      category: {
        id: expense.categoryId,
        name: relations.category?.name ?? 'EMIs',
        normalizedName: relations.category?.normalizedName,
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

  private async findEmiCategoryOrThrow(categoryId: string) {
    if (!isValidObjectId(categoryId)) {
      throw new NotFoundException('EMI category not found');
    }

    const category = await this.categoryModel
      .findOne({
        _id: categoryId,
        isActive: true,
        normalizedName: ExpenseCategoryKey.Emis,
      })
      .exec();

    if (!category) {
      throw new BadRequestException('Selected category must be the active EMIs category');
    }

    return category;
  }

  private async findOwnedPlanOrThrow(planId: string, ownerUserId: string) {
    if (!isValidObjectId(planId)) {
      throw new NotFoundException('EMI plan not found');
    }

    const plan = await this.emiPlanModel.findOne({ _id: planId, ownerUserId }).exec();

    if (!plan) {
      throw new NotFoundException('EMI plan not found');
    }

    return plan;
  }

  private async findOwnedInstallmentOrThrow(
    planId: string,
    expenseId: string,
    ownerUserId: string,
  ) {
    if (!isValidObjectId(expenseId)) {
      throw new NotFoundException('EMI installment not found');
    }

    const installment = await this.expenseModel
      .findOne({ _id: expenseId, ownerUserId, emiPlanId: planId })
      .exec();

    if (!installment) {
      throw new NotFoundException('EMI installment not found');
    }

    return installment;
  }

  private async ensureTagsBelongToUser(tagIds: string[], ownerUserId: string) {
    const uniqueTagIds = this.uniqueIds(tagIds);

    if (!uniqueTagIds.length) {
      return;
    }

    if (uniqueTagIds.some((tagId) => !isValidObjectId(tagId))) {
      throw new NotFoundException('Tag not found');
    }

    const count = await this.tagModel
      .countDocuments({ _id: { $in: uniqueTagIds }, ownerUserId })
      .exec();

    if (count !== uniqueTagIds.length) {
      throw new NotFoundException('Tag not found');
    }
  }

  private async countLegacyEmiExpenses(ownerUserId: string) {
    const categoryIds = await this.findEmiCategoryIds();

    if (!categoryIds.length) {
      return 0;
    }

    return this.expenseModel
      .countDocuments({
        ownerUserId,
        categoryId: { $in: categoryIds },
        $or: [{ emiPlanId: { $exists: false } }, { emiPlanId: null }],
      })
      .exec();
  }

  private async findEmiCategoryIds() {
    const categories = await this.categoryModel
      .find({ normalizedName: ExpenseCategoryKey.Emis })
      .select('_id')
      .exec();

    return categories.map((category) => category.id);
  }

  private parseDateOnly(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid EMI date');
    }

    return date;
  }

  private isPaid(date: Date) {
    return this.formatDateOnly(date) <= this.formatDateOnly(new Date());
  }

  private formatDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toMonthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private uniqueIds(ids: string[]) {
    return Array.from(new Set(ids));
  }
}
