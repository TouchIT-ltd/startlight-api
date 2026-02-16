import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { PaginatedUnitsDto } from './dto/paginated-units.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal')
  @ApiOperation({
    summary: 'Create a new unit',
    description: 'Access: ADMIN, OWNER, MANAGER - Create unit within property'
  })
  @ApiResponse({
    status: 201,
    description: 'Unit created successfully',
    type: UnitResponseDto,
  })
  async create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal', 'Tenant Portal')
  @ApiOperation({
    summary: 'Get a paginated list of units',
    description: 'Access: ADMIN, OWNER, MANAGER, TENANT - List units with filtering'
  })
  @ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['vacant', 'occupied', 'maintenance'], description: 'Filter by unit status' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter by tenant ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiOkResponse({ description: 'List of units', type: PaginatedUnitsDto })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.unitsService.findAll(propertyId, p, l, { status, tenantId });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TENANT)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal', 'Tenant Portal')
  @ApiOperation({
    summary: 'Get unit by id',
    description: 'Access: ADMIN, OWNER, MANAGER, TENANT - Get unit details'
  })
  @ApiParam({ name: 'id', description: 'Unit ID' })
  @ApiResponse({
    status: 200,
    description: 'Unit found',
    type: UnitResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal')
  @ApiOperation({
    summary: 'Update an existing unit',
    description: 'Access: ADMIN, OWNER, MANAGER - Update unit information'
  })
  @ApiParam({ name: 'id', description: 'Unit ID' })
  @ApiResponse({
    status: 200,
    description: 'Unit updated',
    type: UnitResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateUnitDto: CreateUnitDto) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiTags('Admin Portal', 'Owner Portal')
  @ApiOperation({
    summary: 'Delete a unit',
    description: 'Access: ADMIN, OWNER only - Delete unit'
  })
  @ApiParam({ name: 'id', description: 'Unit ID' })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}