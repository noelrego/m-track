import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AiAssistExpenseDraftResponseDto,
  AuthenticatedRequest,
  CreateAiAssistExpenseDraftDto,
} from '../common';
import { AiAssistService } from './aiassist.service';

@ApiTags('AI Assist')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('aiassist')
export class AiAssistController {
  constructor(private readonly aiAssistService: AiAssistService) {}

  @Post('expense-draft')
  @ApiOperation({
    summary: 'Create a draft expense from assistant text',
    description:
      'Calls OpenRouter with the current user categories, tags, and assistant text, then returns an AI-prepared expense draft.',
  })
  @ApiOkResponse({
    description: 'Expense draft prepared successfully.',
    type: AiAssistExpenseDraftResponseDto,
  })
  createExpenseDraft(
    @Body() createDraftDto: CreateAiAssistExpenseDraftDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.aiAssistService.createExpenseDraft(
      createDraftDto,
      request.user!.sub,
    );
  }
}
