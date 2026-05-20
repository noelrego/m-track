import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  CreateExpenseDto,
  ExpenseDeleteResponseDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  MonthlyExpenseSummaryQueryDto,
  MonthlyExpenseSummaryResponseDto,
  UpdateExpenseDto,
} from '../common';
import { ExpenseService } from './expense.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @ApiOperation({ summary: 'Create expense' })
  @ApiCreatedResponse({
    description: 'Expense created successfully.',
    type: ExpenseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category or tag not found.' })
  createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.createExpense(createExpenseDto, request.user!.sub);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'List recent expenses for calendar month',
    description: 'Defaults to current UTC calendar month and limit 10.',
  })
  @ApiOkResponse({
    description: 'Expenses returned successfully.',
    type: [ExpenseResponseDto],
  })
  listRecentExpenses(
    @Query() query: ListExpensesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.listRecentExpenses(query, request.user!.sub);
  }

  @Get('monthly-summary')
  @ApiOperation({
    summary: 'Get monthly category summary',
    description: 'Calendar month range is always day 1 through the end of the month.',
  })
  @ApiOkResponse({
    description: 'Monthly summary returned successfully.',
    type: MonthlyExpenseSummaryResponseDto,
  })
  getMonthlySummary(
    @Query() query: MonthlyExpenseSummaryQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.getMonthlySummary(query, request.user!.sub);
  }

  @Get(':expenseId')
  @ApiOperation({ summary: 'Get one expense' })
  @ApiParam({ name: 'expenseId', example: '665d2fb4d5f6a0a42f1f9a23' })
  @ApiOkResponse({
    description: 'Expense returned successfully.',
    type: ExpenseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Expense not found.' })
  getExpense(
    @Param('expenseId') expenseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.getExpense(expenseId, request.user!.sub);
  }

  @Patch(':expenseId')
  @ApiOperation({ summary: 'Update expense' })
  @ApiParam({ name: 'expenseId', example: '665d2fb4d5f6a0a42f1f9a23' })
  @ApiOkResponse({
    description: 'Expense updated successfully.',
    type: ExpenseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Expense, category, or tag not found.' })
  updateExpense(
    @Param('expenseId') expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.updateExpense(
      expenseId,
      updateExpenseDto,
      request.user!.sub,
    );
  }

  @Delete(':expenseId')
  @ApiOperation({ summary: 'Delete expense' })
  @ApiParam({ name: 'expenseId', example: '665d2fb4d5f6a0a42f1f9a23' })
  @ApiOkResponse({
    description: 'Expense deleted successfully.',
    type: ExpenseDeleteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Expense not found.' })
  deleteExpense(
    @Param('expenseId') expenseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.expenseService.deleteExpense(expenseId, request.user!.sub);
  }
}
