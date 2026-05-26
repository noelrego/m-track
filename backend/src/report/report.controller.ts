import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  CurrentMonthCategoryCardsResponseDto,
  CurrentMonthTopExpensesResponseDto,
  CurrentMonthWeeklyReportResponseDto,
  CurrentYearMonthlyExpenseResponseDto,
  MonthlyCategoryExpenseTrendResponseDto,
  MonthlyExpenseWindowQueryDto,
  MonthlyTagExpenseReportQueryDto,
  MonthlyTagExpenseReportResponseDto,
  ReportInsightsResponseDto,
} from '../common';
import { ReportService } from './report.service';

@ApiTags('Report')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('insights')
  @ApiOperation({
    summary: 'Get dashboard insight totals',
    description:
      'Returns last month all-category total, current month all-category total, and current month Needs + Wants total.',
  })
  @ApiOkResponse({
    description: 'Report insights returned successfully.',
    type: ReportInsightsResponseDto,
  })
  getInsights(@Req() request: AuthenticatedRequest) {
    return this.reportService.getInsights(request.user!.sub);
  }

  @Get('current-month/categories')
  @ApiOperation({
    summary: 'Get current month category card totals',
    description:
      'Returns current month totals for all static categories plus direct Needs and Wants totals.',
  })
  @ApiOkResponse({
    description: 'Current month category totals returned successfully.',
    type: CurrentMonthCategoryCardsResponseDto,
  })
  getCurrentMonthCategoryCards(@Req() request: AuthenticatedRequest) {
    return this.reportService.getCurrentMonthCategoryCards(request.user!.sub);
  }

  @Get('current-month/weekly')
  @ApiOperation({
    summary: 'Get weekly chart totals for current month',
    description:
      'Returns Week 1, Week 2, etc. for the current UTC month with Needs, Wants, and Extra totals.',
  })
  @ApiOkResponse({
    description: 'Current month weekly report returned successfully.',
    type: CurrentMonthWeeklyReportResponseDto,
  })
  getCurrentMonthWeeklyReport(@Req() request: AuthenticatedRequest) {
    return this.reportService.getCurrentMonthWeeklyReport(request.user!.sub);
  }

  @Get('current-month/top-expenses')
  @ApiOperation({
    summary: 'Get top current month expenses',
    description:
      'Returns the top 4 highest current month expenses among Needs, Wants, and Extra.',
  })
  @ApiOkResponse({
    description: 'Current month top expenses returned successfully.',
    type: CurrentMonthTopExpensesResponseDto,
  })
  getCurrentMonthTopExpenses(@Req() request: AuthenticatedRequest) {
    return this.reportService.getCurrentMonthTopExpenses(request.user!.sub);
  }

  @Get('current-year/monthly-expenses')
  @ApiOperation({
    summary: 'Get recent monthly expense totals',
    description:
      'Returns the last 5, 8, or 12 UTC months with total expense across every category. Defaults to the last 5 months.',
  })
  @ApiOkResponse({
    description: 'Monthly expense totals returned successfully.',
    type: CurrentYearMonthlyExpenseResponseDto,
  })
  getCurrentYearMonthlyExpenses(
    @Req() request: AuthenticatedRequest,
    @Query() query: MonthlyExpenseWindowQueryDto,
  ) {
    return this.reportService.getCurrentYearMonthlyExpenses(
      request.user!.sub,
      query.months,
    );
  }

  @Get('monthly-expenses/by-category')
  @ApiOperation({
    summary: 'Get recent monthly expense totals by category',
    description:
      'Returns the last 5, 8, or 12 UTC months with a monthly total series for each static category. Defaults to the last 5 months.',
  })
  @ApiOkResponse({
    description: 'Monthly category expense trends returned successfully.',
    type: MonthlyCategoryExpenseTrendResponseDto,
  })
  getMonthlyCategoryExpenseTrend(
    @Req() request: AuthenticatedRequest,
    @Query() query: MonthlyExpenseWindowQueryDto,
  ) {
    return this.reportService.getMonthlyCategoryExpenseTrend(
      request.user!.sub,
      query.months,
    );
  }

  @Get('monthly-tags')
  @ApiOperation({
    summary: 'Get monthly expense totals by selected tags',
    description:
      'Returns totals for one UTC month across the selected user-owned tags, including a unique matching-expense total and per-tag totals.',
  })
  @ApiOkResponse({
    description: 'Monthly tag expense report returned successfully.',
    type: MonthlyTagExpenseReportResponseDto,
  })
  getMonthlyTagExpenseReport(
    @Req() request: AuthenticatedRequest,
    @Query() query: MonthlyTagExpenseReportQueryDto,
  ) {
    return this.reportService.getMonthlyTagExpenseReport(
      request.user!.sub,
      query.month,
      query.tagIds,
    );
  }
}
