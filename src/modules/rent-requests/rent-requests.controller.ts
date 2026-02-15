import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RentRequestsService } from './rent-requests.service';
import { CreateRentRequestDto } from './dto/create-rent-request.dto';
import { RentRequestResponseDto } from './dto/rent-request-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('rent-requests')
@Controller('rent-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentRequestsController {
  constructor(private readonly rentRequestsService: RentRequestsService) { }

  @Post()
  @Roles(UserRole.TENANT)
  @ApiOperation({
    summary: 'Create a new rent request',
    description: 'Access: TENANT only - Submit rent payment request'
  })
  @ApiResponse({
    status: 201,
    description: 'Rent request created successfully',
    type: RentRequestResponseDto,
  })
  async create(@Body() createRentRequestDto: CreateRentRequestDto) {
    return this.rentRequestsService.create(createRentRequestDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiOperation({
    summary: 'Get a paginated list of rent requests',
    description: 'Access: ADMIN, OWNER, MANAGER, TENANT - List rent requests with filtering'
  })
  @ApiHeader({ name: 'user-id', description: 'User ID for role-based filtering', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'paid'], description: 'Filter by request status' })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property ID' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter by tenant ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiResponse({
    status: 200,
    description: 'List of rent requests',
  })
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('propertyId') propertyId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    const userId = req?.user?.id;
    return this.rentRequestsService.findAll(userId, p, l, {
      status,
      propertyId,
      tenantId,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiOperation({
    summary: 'Get rent request by id',
    description: 'Access: ADMIN, OWNER, MANAGER, TENANT - Get rent request details'
  })
  @ApiParam({ name: 'id', description: 'Rent request ID' })
  @ApiResponse({
    status: 200,
    description: 'Rent request found',
    type: RentRequestResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.rentRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Approve a rent request',
    description: 'Access: ADMIN, OWNER, MANAGER - Approve tenant rent payment request'
  })
  @ApiParam({ name: 'id', description: 'Rent request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        managerNotes: {
          type: 'string',
          description: 'Optional notes from manager',
          example: 'Approved with condition to pay remaining by March 15th',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rent request approved',
    type: RentRequestResponseDto,
  })
  async approve(
    @Param('id') id: string,
    @Body() body?: { managerNotes?: string },
  ) {
    return this.rentRequestsService.approve(id, body?.managerNotes);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Reject a rent request',
    description: 'Access: ADMIN, OWNER, MANAGER - Reject tenant rent payment request'
  })
  @ApiParam({ name: 'id', description: 'Rent request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        managerNotes: {
          type: 'string',
          description: 'Optional notes from manager',
          example: 'Unable to approve due to policy restrictions',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Rent request rejected',
    type: RentRequestResponseDto,
  })
  async reject(
    @Param('id') id: string,
    @Body() body?: { managerNotes?: string },
  ) {
    return this.rentRequestsService.reject(id, body?.managerNotes);
  }
}