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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyResponseDto } from './dto/property-response.dto';
import { PaginatedPropertiesDto } from './dto/paginated-properties.dto';
import { PropertyTenantDto } from './dto/property-tenant.dto';
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
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Post('upload')
  @Roles(UserRole.MANAGER)
  @ApiTags('Manager Portal')
  @ApiOperation({
    summary: 'Upload property images',
    description: 'Access: MANAGER only - Upload images and get URLs back to use in property creation'
  })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new Error('Only image files (jpg, jpeg, png, webp) are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Property images'
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        urls: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async uploadImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    const urls = await this.propertiesService.uploadImages(files);
    return { urls };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Create a new property',
    description: 'Access: ADMIN only - Create property and assign manager/owner'
  })
  @ApiBody({ type: CreatePropertyDto })
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
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal')
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
  @ApiTags('Admin Portal', 'Owner Portal', 'Manager Portal')
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiTags('Admin Portal', 'Manager Portal')
  @ApiOperation({
    summary: 'Update an existing property',
    description: 'Access: ADMIN, MANAGER - Update property information'
  })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiBody({ type: CreatePropertyDto })
  @ApiResponse({
    status: 200,
    description: 'Property updated',
    type: PropertyResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: CreatePropertyDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiTags('Admin Portal', 'Manager Portal')
  @ApiOperation({
    summary: 'Delete a property',
    description: 'Access: ADMIN, OWNER only - Delete property listing'
  })
  @ApiParam({ name: 'id', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Property deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }

  @Get(':id/tenants')
  @ApiTags('Properties')
  @ApiResponse({ status: 200, description: 'List of tenants for the property', type: [PropertyTenantDto] })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async getTenants(@Param('id') id: string) {
    return this.propertiesService.getTenants(id);
  }
}