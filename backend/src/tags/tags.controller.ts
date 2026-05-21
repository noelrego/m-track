import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
  CreateTagDto,
  TagResponseDto,
  UpdateTagDto,
} from '../common';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT token is missing or invalid.' })
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create user tag' })
  @ApiCreatedResponse({
    description: 'Tag created successfully.',
    type: TagResponseDto,
  })
  @ApiConflictResponse({ description: 'Tag name already exists for this user.' })
  createTag(
    @Body() createTagDto: CreateTagDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tagsService.createTag(createTagDto, request.user!.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List current user tags' })
  @ApiOkResponse({
    description: 'Tags returned successfully.',
    type: [TagResponseDto],
  })
  listTags(@Req() request: AuthenticatedRequest) {
    return this.tagsService.listTags(request.user!.sub);
  }

  @Get(':tagId')
  @ApiOperation({ summary: 'Get one current user tag' })
  @ApiParam({ name: 'tagId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'Tag returned successfully.',
    type: TagResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  getTag(@Param('tagId') tagId: string, @Req() request: AuthenticatedRequest) {
    return this.tagsService.getTag(tagId, request.user!.sub);
  }

  @Patch(':tagId')
  @ApiOperation({ summary: 'Update current user tag' })
  @ApiParam({ name: 'tagId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({
    description: 'Tag updated successfully.',
    type: TagResponseDto,
  })
  @ApiConflictResponse({ description: 'Tag name already exists for this user.' })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  updateTag(
    @Param('tagId') tagId: string,
    @Body() updateTagDto: UpdateTagDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tagsService.updateTag(tagId, updateTagDto, request.user!.sub);
  }

  @Delete(':tagId')
  @ApiOperation({
    summary: 'Delete current user tag',
    description: 'Removes the tag and pulls it from old expenses for this user.',
  })
  @ApiParam({ name: 'tagId', example: '665d2fb4d5f6a0a42f1f9a21' })
  @ApiOkResponse({ description: 'Tag deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  deleteTag(@Param('tagId') tagId: string, @Req() request: AuthenticatedRequest) {
    return this.tagsService.deleteTag(tagId, request.user!.sub);
  }
}
