import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { LeasesService } from './leases.service';
import { LeaseSchedulerService } from './lease-scheduler.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseResponseDto } from './dto/lease-response.dto';
import { PaginatedLeasesDto } from './dto/paginated-leases.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly leaseSchedulerService: LeaseSchedulerService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiTags('Admin Portal')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new Error('Only PDF and Word documents are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for documents
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'mongo_1616161616_abcd1234' },
        propertyId: { type: 'string', example: 'mongo_1616161616_abcd1235' },
        unitNumber: { type: 'string', example: 'A101' },
        startDate: { type: 'string', format: 'date', example: '2026-02-01' },
        endDate: { type: 'string', format: 'date', example: '2027-02-01' },
        rentAmount: { type: 'number', example: 1200 },
        status: {
          type: 'string',
          enum: ['active', 'pending', 'terminated', 'expired'],
        },
        document: {
          type: 'string',
          format: 'binary',
          description: 'Lease document (PDF or Word)',
        },
      },
      required: [
        'userId',
        'propertyId',
        'unitNumber',
        'startDate',
        'endDate',
        'rentAmount',
        'status',
      ],
    },
  })
  @ApiOperation({
    summary: 'Create a new lease agreement with document upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Lease created',
    type: LeaseResponseDto,
  })
  async create(@Body() dto: CreateLeaseDto, @UploadedFile() file?: any) {
    return this.leasesService.create(dto, file);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal')
  @ApiOperation({ summary: 'Get a paginated list of leases' })
  @ApiOkResponse({ description: 'List of leases', type: PaginatedLeasesDto })
  async findAll(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('propertyId') propertyId?: string,
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    const { id: userId, role } = req.user || {};
    return this.leasesService.findAll(p, l, { propertyId, userId, role });
  }

  @Get('my-lease')
  @ApiTags('Tenant Portal')
  @ApiOperation({ summary: "Get current user's lease (uses authenticated user context)" })
  @ApiQuery({ name: 'leaseId', required: false, type: String, description: 'Specific lease ID to fetch' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'User ID (for admins to view a tenant lease)' })
  @ApiResponse({
    status: 200,
    description: 'User lease found',
    type: LeaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active lease found',
  })
  async findMyLease(
    @Request() req: any,
    @Query('leaseId') leaseId?: string,
    @Query('userId') userId?: string,
  ) {
    // If a leaseId is provided, return by lease id
    if (leaseId) {
      return this.leasesService.findOne(leaseId);
    }

    const uid = userId || req.user?.id;
    const lease = await this.leasesService.findMyLease(uid);

    if (!lease) {
      return {
        message: 'No active lease found',
        data: null,
        hasLease: false
      };
    }

    return lease;
  }

  @Post(':id/renew')
  @Roles(UserRole.TENANT)
  @ApiTags('Tenant Portal')
  @ApiOperation({ summary: 'Renew an existing lease' })
  @ApiParam({ name: 'id', description: 'Lease ID to renew' })
  @ApiResponse({ status: 200, description: 'Lease extended successfully and rent request created' })
  async renew(
    @Param('id') id: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    return this.leasesService.renew(id, userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal', 'Tenant Portal')
  @ApiOperation({ summary: 'Get lease by id' })
  @ApiParam({ name: 'id', description: 'Lease ID (not the user ID)', example: 'mongo_1772439009724_abcd1234' })
  @ApiResponse({
    status: 200,
    description: 'Lease found',
    type: LeaseResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.leasesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiTags('Admin Portal')
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new Error('Only PDF and Word documents are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for documents
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'mongo_1616161616_abcd1234' },
        propertyId: { type: 'string', example: 'mongo_1616161616_abcd1235' },
        unitNumber: { type: 'string', example: 'A101' },
        startDate: { type: 'string', format: 'date', example: '2026-02-01' },
        endDate: { type: 'string', format: 'date', example: '2027-02-01' },
        rentAmount: { type: 'number', example: 1200 },
        status: {
          type: 'string',
          enum: ['active', 'pending', 'terminated', 'expired'],
        },
        document: {
          type: 'string',
          format: 'binary',
          description: 'Lease document (PDF or Word) - optional for updates',
        },
      },
      required: [
        'userId',
        'propertyId',
        'unitNumber',
        'startDate',
        'endDate',
        'rentAmount',
        'status',
      ],
    },
  })
  @ApiOperation({ summary: 'Update an existing lease agreement' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({
    status: 200,
    description: 'Lease updated',
    type: LeaseResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateLeaseDto,
    @UploadedFile() file?: any,
  ) {
    return this.leasesService.update(id, dto, file);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiTags('Admin Portal')
  @ApiOperation({ summary: 'Delete a lease agreement' })
  @ApiParam({ name: 'id', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Lease deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.leasesService.remove(id);
  }

  @Post('expire-leases')
  @Roles(UserRole.ADMIN)
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Manually trigger lease expiration check (for testing)',
    description: 'This endpoint manually runs the lease expiration logic that normally runs daily at midnight'
  })
  @ApiResponse({
    status: 200,
    description: 'Lease expiration check completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        processed: { type: 'number' },
        errors: { type: 'number' }
      }
    }
  })
  async expireLeasesManually() {
    const result = await this.leaseSchedulerService.expireLeasesManually();
    return {
      message: 'Lease expiration check completed',
      processed: result.processed,
      errors: result.errors,
    };
  }
}
