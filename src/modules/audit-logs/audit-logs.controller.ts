import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get a paginated list of audit logs',
    description: 'Access: ADMIN only - System audit trail and activity logs'
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (user, property, unit, etc.)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '50' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
  })
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 50;
    return this.auditLogsService.findAll(p, l, {
      userId,
      action,
      entityType,
      startDate,
      endDate,
    });
  }
}