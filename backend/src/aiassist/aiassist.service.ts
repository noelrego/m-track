import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AiAssistExpenseDraftInputDto,
  AiAssistExpenseDraftResponseDto,
  AppLogger,
  CreateAiAssistExpenseDraftDto,
  EXPENSE_CATEGORY_KEYS,
  ExpenseCategoryKey,
  isExpenseCategoryKey,
} from '../common';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Tag, TagDocument } from '../schemas/tag.schema';

interface OpenRouterChoice {
  message?: {
    content?: unknown;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
  id?: string;
  model?: string;
  usage?: unknown;
}

interface OpenRouterRequestConfig {
  appName: string;
  appUrl: string;
  baseUrl: string;
  model: string;
}

interface OpenRouterRequestResult {
  response: Response;
  responseText: string;
}

interface AiExpenseExtraction {
  amountPaise: number;
  categoryKey: ExpenseCategoryKey | 'unknown';
  confidence: number;
  date: string;
  missingFields: string[];
  note: string;
  replyText: string;
  tagNames: string[];
}

interface AiAssistContextCategory {
  id: string;
  name: string;
  normalizedName: ExpenseCategoryKey;
}

interface AiAssistContextTag {
  id: string;
  name: string;
}

interface AiAssistCurrentDraftContext {
  amountPaise?: number;
  category?: AiAssistContextCategory;
  date?: string;
  note?: string;
  tags: AiAssistContextTag[];
}

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.1-flash-lite';
const EXPENSE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class AiAssistService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async createExpenseDraft(
    createDraftDto: CreateAiAssistExpenseDraftDto,
    ownerUserId: string,
  ): Promise<AiAssistExpenseDraftResponseDto> {
    this.logger.info('AI assist request received', {
      currentDraft: createDraftDto.currentDraft,
      localDate: createDraftDto.localDate,
      message: createDraftDto.message,
      ownerUserId,
    });

    try {
      const [categories, tags] = await Promise.all([
        this.loadActiveCategories(),
        this.loadUserTags(ownerUserId),
      ]);

      this.logger.info('AI assist context loaded', {
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          normalizedName: category.normalizedName,
        })),
        ownerUserId,
        tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
      });

      if (!categories.length) {
        return {
          status: 'needs_clarification',
          replyText: 'I need an active category before this can be saved.',
          hints: ['Create or enable a category, then try again.'],
        };
      }

      const extraction = await this.callOpenRouter(
        createDraftDto,
        categories,
        tags,
      );
      const response = this.toDraftResponse(
        extraction,
        createDraftDto,
        categories,
        tags,
      );

      this.logger.info('AI assist normalized response', response);

      return response;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(error, 'AI assist expense draft failed', {
        ownerUserId,
      });
      throw error;
    }
  }

  private async callOpenRouter(
    createDraftDto: CreateAiAssistExpenseDraftDto,
    categories: CategoryDocument[],
    tags: TagDocument[],
  ): Promise<AiExpenseExtraction> {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');

    if (!apiKey) {
      this.logger.warn('OpenRouter API key missing');
      throw new ServiceUnavailableException(
        'OpenRouter API key is not configured.',
      );
    }

    const baseUrl = this.resolveOpenRouterBaseUrl();
    const model =
      this.configService.get<string>('OPENROUTER_MODEL') ??
      DEFAULT_OPENROUTER_MODEL;
    const appUrl =
      this.configService.get<string>('OPENROUTER_APP_URL') ??
      'http://localhost:5174';
    const appName =
      this.configService.get<string>('OPENROUTER_APP_NAME') ?? 'M-Track';
    const requestConfig = { appName, appUrl, baseUrl, model };

    this.logger.info('OpenRouter request config', {
      appName,
      appUrl,
      baseUrl,
      hasApiKey: Boolean(apiKey),
      model,
    });

    const strictResult = await this.sendOpenRouterRequest(
      apiKey,
      requestConfig,
      this.buildOpenRouterPayload(model, createDraftDto, categories, tags, true),
      'strict-json-schema',
    );

    if (strictResult.response.ok) {
      return this.extractOpenRouterDraft(strictResult.responseText);
    }

    if (!this.shouldRetryWithoutStructuredOutput(strictResult)) {
      throw new BadGatewayException(
        `OpenRouter returned ${strictResult.response.status}: ${strictResult.responseText}`,
      );
    }

    this.logger.warn(
      'OpenRouter structured output unsupported; retrying with plain JSON prompt',
      {
        model,
        status: strictResult.response.status,
      },
    );

    const fallbackResult = await this.sendOpenRouterRequest(
      apiKey,
      requestConfig,
      this.buildOpenRouterPayload(model, createDraftDto, categories, tags, false),
      'plain-json-fallback',
    );

    if (!fallbackResult.response.ok) {
      throw new BadGatewayException(
        `OpenRouter returned ${fallbackResult.response.status}: ${fallbackResult.responseText}`,
      );
    }

    return this.extractOpenRouterDraft(fallbackResult.responseText);
  }

  private async sendOpenRouterRequest(
    apiKey: string,
    requestConfig: OpenRouterRequestConfig,
    payload: unknown,
    mode: 'plain-json-fallback' | 'strict-json-schema',
  ): Promise<OpenRouterRequestResult> {
    this.logger.info('OpenRouter request payload', { mode, payload });

    let response: Response;

    try {
      response = await fetch(`${requestConfig.baseUrl}/chat/completions`, {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': requestConfig.appUrl,
          'X-OpenRouter-Title': requestConfig.appName,
        },
        method: 'POST',
      });
    } catch (error) {
      this.logger.error(error, 'OpenRouter network request failed', { mode });
      throw new BadGatewayException('Unable to reach OpenRouter.');
    }

    const responseText = await response.text();

    this.logger.info('OpenRouter raw response received', {
      body: responseText,
      mode,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    return { response, responseText };
  }

  private extractOpenRouterDraft(responseText: string): AiExpenseExtraction {
    const responseBody = this.parseJson<OpenRouterResponse>(
      responseText,
      'OpenRouter response was not valid JSON.',
    );
    const content = responseBody.choices?.[0]?.message?.content;

    this.logger.info('OpenRouter parsed response envelope', responseBody);
    this.logger.info('OpenRouter assistant content', { content });

    const extraction = this.parseAssistantContent(content);

    if (!this.isAiExpenseExtraction(extraction)) {
      this.logger.warn('OpenRouter extraction shape invalid', { extraction });
      throw new BadGatewayException('OpenRouter returned an invalid draft shape.');
    }

    this.logger.info('OpenRouter extracted expense draft', extraction);

    return extraction;
  }

  private buildOpenRouterPayload(
    model: string,
    createDraftDto: CreateAiAssistExpenseDraftDto,
    categories: CategoryDocument[],
    tags: TagDocument[],
    useStructuredOutput: boolean,
  ) {
    const categoriesContext = categories.map((category) => ({
      id: category.id,
      name: category.name,
      normalizedName: category.normalizedName,
    }));
    const tagsContext = tags.map((tag) => ({ id: tag.id, name: tag.name }));
    const userContext = {
      categories: categoriesContext,
      currentDraft: this.toCurrentDraftContext(
        createDraftDto.currentDraft,
        categoriesContext,
        tagsContext,
      ),
      existingTags: tagsContext,
      localDate: createDraftDto.localDate ?? this.formatDateOnly(new Date()),
      message: createDraftDto.message,
    };

    const payload: Record<string, unknown> = {
      max_tokens: 700,
      messages: [
        {
          content: useStructuredOutput
            ? this.getSystemPrompt()
            : this.getPlainJsonSystemPrompt(),
          role: 'system',
        },
        {
          content: JSON.stringify(userContext),
          role: 'user',
        },
      ],
      model,
      temperature: 0.1,
    };

    if (!useStructuredOutput) {
      return payload;
    }

    return {
      ...payload,
      provider: {
        require_parameters: true,
      },
      response_format: {
        json_schema: {
          name: 'expense_voice_draft',
          schema: this.getExpenseExtractionSchema(),
          strict: true,
        },
        type: 'json_schema',
      },
    };
  }

  private getSystemPrompt(): string {
    return [
      'You convert short natural-language expense messages into structured JSON for a personal expense tracker.',
      'Amounts are INR rupees unless the user clearly says paise. Convert rupees to paise, so 100 rupees becomes 10000.',
      'Use only the provided category normalizedName values. If category is missing and not obvious, use categoryKey "unknown".',
      'Use only existing tag names from existingTags. Never invent or create tags.',
      'Tags are optional. If no clear existing tag applies, return an empty tagNames array.',
      'If a currentDraft is present, treat the user message as a correction or refinement and preserve unchanged fields.',
      'Resolve relative dates like today, yesterday, tomorrow, and last Friday using localDate.',
      'If no date is mentioned, use localDate.',
      'Return concise replyText for the UI. Do not include markdown.',
    ].join(' ');
  }

  private getPlainJsonSystemPrompt(): string {
    return [
      this.getSystemPrompt(),
      'This call does not use API-level structured output.',
      'Return exactly one valid JSON object and nothing else.',
      'Do not wrap the JSON in markdown fences.',
      'The JSON object must have these keys and types:',
      '{"amountPaise": number, "categoryKey": "needs"|"wants"|"emis"|"extra"|"invest"|"unknown", "confidence": number, "date": "YYYY-MM-DD", "missingFields": string[], "note": string, "replyText": string, "tagNames": string[]}',
    ].join(' ');
  }

  private getExpenseExtractionSchema() {
    return {
      additionalProperties: false,
      properties: {
        amountPaise: {
          description:
            'Final amount in paise. Use 0 if the amount is missing or unclear.',
          minimum: 0,
          type: 'integer',
        },
        categoryKey: {
          description:
            'Final selected category normalizedName, or unknown if it needs user clarification.',
          enum: [...EXPENSE_CATEGORY_KEYS, 'unknown'],
          type: 'string',
        },
        confidence: {
          description: 'Confidence from 0 to 1 for the extracted draft.',
          maximum: 1,
          minimum: 0,
          type: 'number',
        },
        date: {
          description: 'Expense date in YYYY-MM-DD format.',
          type: 'string',
        },
        missingFields: {
          description:
            'Fields that need clarification before saving. Tags are optional and should not be missing unless the user explicitly asked to add a tag and it was unclear.',
          items: {
            enum: ['amount', 'category', 'date', 'note', 'tags'],
            type: 'string',
          },
          type: 'array',
        },
        note: {
          description:
            'Short expense note, such as milk, lunch, petrol, rent, or the cleaned original expense text.',
          type: 'string',
        },
        replyText: {
          description:
            'Short assistant reply that tells the user what was prepared or what is missing.',
          type: 'string',
        },
        tagNames: {
          description: 'Existing tag names selected from existingTags only.',
          items: {
            type: 'string',
          },
          type: 'array',
        },
      },
      required: [
        'amountPaise',
        'categoryKey',
        'confidence',
        'date',
        'missingFields',
        'note',
        'replyText',
        'tagNames',
      ],
      type: 'object',
    };
  }

  private toDraftResponse(
    extraction: AiExpenseExtraction,
    createDraftDto: CreateAiAssistExpenseDraftDto,
    categories: CategoryDocument[],
    tags: TagDocument[],
  ): AiAssistExpenseDraftResponseDto {
    const category = isExpenseCategoryKey(extraction.categoryKey)
      ? categories.find(
          (candidate) => candidate.normalizedName === extraction.categoryKey,
        )
      : undefined;
    const amountPaise =
      extraction.amountPaise > 0
        ? extraction.amountPaise
        : createDraftDto.currentDraft?.amountPaise;
    const date = EXPENSE_DATE_PATTERN.test(extraction.date)
      ? extraction.date
      : createDraftDto.currentDraft?.date ??
        createDraftDto.localDate ??
        this.formatDateOnly(new Date());
    const selectedTags = this.resolveTags(extraction.tagNames, tags);
    const missingFields = this.resolveMissingFields(
      extraction,
      amountPaise,
      category,
    );
    const hints = [
      `Model confidence: ${Math.round(extraction.confidence * 100)}%`,
      ...(missingFields.length ? [`Missing: ${missingFields.join(', ')}`] : []),
    ];

    if (!amountPaise || !category || missingFields.includes('date')) {
      return {
        status: 'needs_clarification',
        replyText: extraction.replyText,
        hints,
      };
    }

    return {
      status: 'ready_to_save',
      replyText: extraction.replyText,
      hints,
      draft: {
        amountPaise,
        category: {
          id: category.id,
          name: category.name,
          normalizedName: category.normalizedName,
        },
        date,
        note: extraction.note.trim() || createDraftDto.message.trim(),
        tags: selectedTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
        })),
      },
    };
  }

  private resolveTags(
    tagNames: string[],
    tags: TagDocument[],
  ): TagDocument[] {
    const tagMap = new Map(
      tags.map((tag) => [this.normalizeName(tag.name), tag]),
    );

    return Array.from(
      new Set(
        tagNames
          .map((tagName) => tagMap.get(this.normalizeName(tagName)))
          .filter((tag): tag is TagDocument => Boolean(tag))
          .map((tag) => tag.id),
      ),
    )
      .map((tagId) => tags.find((tag) => tag.id === tagId))
      .filter((tag): tag is TagDocument => Boolean(tag));
  }

  private resolveMissingFields(
    extraction: AiExpenseExtraction,
    amountPaise: number | undefined,
    category: CategoryDocument | undefined,
  ): string[] {
    const fields = new Set(extraction.missingFields);

    if (!amountPaise || amountPaise <= 0) {
      fields.add('amount');
    }

    if (!category) {
      fields.add('category');
    }

    if (!EXPENSE_DATE_PATTERN.test(extraction.date)) {
      fields.add('date');
    }

    return Array.from(fields);
  }

  private toCurrentDraftContext(
    currentDraft: AiAssistExpenseDraftInputDto | undefined,
    categories: AiAssistContextCategory[],
    tags: AiAssistContextTag[],
  ): AiAssistCurrentDraftContext | undefined {
    if (!currentDraft) {
      return undefined;
    }

    return {
      amountPaise: currentDraft.amountPaise,
      category: categories.find(
        (category) => category.id === currentDraft.categoryId,
      ),
      date: currentDraft.date,
      note: currentDraft.note,
      tags: tags.filter((tag) => currentDraft.tagIds?.includes(tag.id)),
    };
  }

  private async loadActiveCategories(): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  private async loadUserTags(ownerUserId: string): Promise<TagDocument[]> {
    return this.tagModel.find({ ownerUserId }).sort({ name: 1 }).exec();
  }

  private shouldRetryWithoutStructuredOutput(
    result: OpenRouterRequestResult,
  ): boolean {
    const body = result.responseText.toLowerCase();

    return (
      [400, 404, 422].includes(result.response.status) &&
      (body.includes('no endpoints found') ||
        body.includes('requested parameters') ||
        body.includes('require_parameters') ||
        body.includes('response_format') ||
        body.includes('json_schema'))
    );
  }

  private parseAssistantContent(content: unknown): unknown {
    if (typeof content === 'object' && content !== null) {
      return content;
    }

    if (typeof content !== 'string') {
      this.logger.warn('OpenRouter assistant content missing or unsupported', {
        content,
      });
      throw new BadGatewayException('OpenRouter assistant content was missing.');
    }

    const directParse = this.tryParseJson(content);

    if (directParse.ok) {
      return directParse.data;
    }

    const extractedJson = this.extractJsonObjectText(content);

    if (extractedJson) {
      const extractedParse = this.tryParseJson(extractedJson);

      if (extractedParse.ok) {
        return extractedParse.data;
      }
    }

    this.logger.warn('OpenRouter assistant content was not valid JSON', {
      content,
    });
    throw new BadGatewayException(
      'OpenRouter assistant content was not valid JSON.',
    );
  }

  private parseJson<T>(value: string, errorMessage: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(error, errorMessage, { value });
      throw new BadGatewayException(errorMessage);
    }
  }

  private tryParseJson(value: string):
    | { data: unknown; ok: true }
    | { ok: false } {
    try {
      return {
        data: JSON.parse(value),
        ok: true,
      };
    } catch {
      return { ok: false };
    }
  }

  private extractJsonObjectText(value: string): string | undefined {
    const withoutFence = value
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      return undefined;
    }

    return withoutFence.slice(start, end + 1);
  }

  private isAiExpenseExtraction(value: unknown): value is AiExpenseExtraction {
    return (
      typeof value === 'object' &&
      value !== null &&
      'amountPaise' in value &&
      typeof value.amountPaise === 'number' &&
      'categoryKey' in value &&
      typeof value.categoryKey === 'string' &&
      'confidence' in value &&
      typeof value.confidence === 'number' &&
      'date' in value &&
      typeof value.date === 'string' &&
      'missingFields' in value &&
      Array.isArray(value.missingFields) &&
      'note' in value &&
      typeof value.note === 'string' &&
      'replyText' in value &&
      typeof value.replyText === 'string' &&
      'tagNames' in value &&
      Array.isArray(value.tagNames)
    );
  }

  private resolveOpenRouterBaseUrl(): string {
    return (
      this.configService.get<string>('OPENROUTER_BASE_URL') ??
      DEFAULT_OPENROUTER_BASE_URL
    ).replace(/\/+$/g, '');
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
