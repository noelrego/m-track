import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  CreateEmiPlanDto,
  EmiDeleteQueryDto,
  EmiOverviewDto,
  EmiPlanDetailDto,
  ExpenseResponseDto,
  ListEmiPlansResponseDto,
  UpdateEmiInstallmentDto,
  UpdateEmiPlanDto,
} from '../common';
import { EmiService } from './emi.service';

@ApiTags('EMIs')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('emis')
export class EmiController {
  constructor(private readonly emiService: EmiService) {}

  @Post()
  @ApiOperation({ summary: 'Create an EMI plan and monthly expense installments' })
  @ApiCreatedResponse({ type: EmiPlanDetailDto })
  createPlan(
    @Body() createDto: CreateEmiPlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.emiService.createPlan(createDto, request.user!.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List EMI plans with paid and remaining progress' })
  @ApiOkResponse({ type: ListEmiPlansResponseDto })
  listPlans(@Req() request: AuthenticatedRequest) {
    return this.emiService.listPlans(request.user!.sub);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get aggregate EMI progress for the dashboard' })
  @ApiOkResponse({ type: EmiOverviewDto })
  getOverview(@Req() request: AuthenticatedRequest) {
    return this.emiService.getOverview(request.user!.sub);
  }

  @Get('legacy')
  @ApiOperation({ summary: 'List older ungrouped EMI expenses' })
  @ApiOkResponse({ type: [ExpenseResponseDto] })
  listLegacyExpenses(@Req() request: AuthenticatedRequest) {
    return this.emiService.listLegacyExpenses(request.user!.sub);
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get an EMI plan and its monthly installments' })
  @ApiOkResponse({ type: EmiPlanDetailDto })
  getPlan(
    @Param('planId') planId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.emiService.getPlan(planId, request.user!.sub);
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Update EMI parent details' })
  @ApiOkResponse({ type: EmiPlanDetailDto })
  updatePlan(
    @Param('planId') planId: string,
    @Body() updateDto: UpdateEmiPlanDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.emiService.updatePlan(planId, updateDto, request.user!.sub);
  }

  @Patch(':planId/installments/:expenseId')
  @ApiOperation({ summary: 'Update one EMI installment or this and future installments' })
  @ApiOkResponse({ type: EmiPlanDetailDto })
  updateInstallment(
    @Param('planId') planId: string,
    @Param('expenseId') expenseId: string,
    @Body() updateDto: UpdateEmiInstallmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.emiService.updateInstallment(
      planId,
      expenseId,
      updateDto,
      request.user!.sub,
    );
  }

  @Delete(':planId/installments/:expenseId')
  @ApiOperation({ summary: 'Delete one EMI installment or this and future installments' })
  deleteInstallment(
    @Param('planId') planId: string,
    @Param('expenseId') expenseId: string,
    @Query() query: EmiDeleteQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.emiService.deleteInstallment(
      planId,
      expenseId,
      query.scope,
      request.user!.sub,
    );
  }
}
