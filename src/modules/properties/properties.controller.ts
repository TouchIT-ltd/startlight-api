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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyResponseDto } from './dto/property-response.dto';
import { PaginatedPropertiesDto } from './dto/paginated-properties.dto';
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
} from '@nestjs/swagger';

@ApiTags('properties')
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Create a new property',
    description: 'Access: ADMIN, OWNER only - Create property listing'
  })
  @ApiResponse({
    status: 201,
    description: 'Property created successfully',
    type: PropertyResponseDto,
  })
  async create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get a paginated list of properties',
    description: 'Access: ADMIN, OWNER, MANAGER - List properties with filtering'
  })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'managerId', required: false, description: 'Filter by manager ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiOkResponse({ description: 'List of properties', type: PaginatedPropertiesDto })
  async findAll(
    @Query('ownerId') ownerId?: string,
    @Query('managerId') managerId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.propertiesService.findAll(ownerId, managerId, p, l);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get property by id',
    description: 'Access: ADMIN, OWNER, MANAGER - Get property details'
  })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Property found',
    type: PropertyResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Update an existing property',
    description: 'Access: ADMIN, OWNER only - Update property information'
  })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Property updated',
    type: PropertyResponseDto,
  })
  async update(@Param('id') id: string, @Body() updatePropertyDto: CreatePropertyDto) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Delete a property',
    description: 'Access: ADMIN, OWNER only - Delete property listing'
  })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Property deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}