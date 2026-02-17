import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssueResponseDto } from './dto/issue-response.dto';
import { PaginatedIssuesDto } from './dto/paginated-issues.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { RolesGuard } from '../../shared/guards/roles.guard';

@ApiBearerAuth()
@Controller('issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) { }

  @Post()
  @ApiTags('Tenant Portal')
  @ApiBody({ type: CreateIssueDto })
  @ApiOperation({ summary: 'Create a new maintenance issue' })
  @ApiResponse({
    status: 201,
    description: 'Issue created',
    type: IssueResponseDto,
  })
  async create(@Body() dto: CreateIssueDto, @Request() req: any) {
    const userId = req.user.id;
    return this.issuesService.create(dto, userId);
  }

  @Get()
  @ApiTags('Manager Portal', 'Admin Portal')
  @ApiOperation({ summary: 'Get a paginated list of all issues' })
  @ApiOkResponse({ description: 'List of issues', type: PaginatedIssuesDto })
  async findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.issuesService.findAll(p, l);
  }

  @Get('my-issues')
  @ApiTags('Tenant Portal')
  @ApiOperation({ summary: "Get current user's issues" })
  @ApiOkResponse({
    description: 'List of user issues',
    type: PaginatedIssuesDto,
  })
  async findMyIssues(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user.id;
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.issuesService.findMyIssues(userId, p, l);
  }

  @Get(':id')
  @ApiTags('Tenant Portal', 'Manager Portal', 'Admin Portal')
  @ApiOperation({ summary: 'Get issue by id' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({
    status: 200,
    description: 'Issue found',
    type: IssueResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Put(':id')
  @ApiTags('Manager Portal', 'Admin Portal')
  @ApiBody({ type: CreateIssueDto })
  @ApiOperation({ summary: 'Update an existing issue' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({
    status: 200,
    description: 'Issue updated',
    type: IssueResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: CreateIssueDto) {
    return this.issuesService.update(id, dto);
  }

  @Delete(':id')
  @ApiTags('Admin Portal')
  @ApiOperation({ summary: 'Delete an issue' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: 200, description: 'Issue deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.issuesService.remove(id);
  }
}
