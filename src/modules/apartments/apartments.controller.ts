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
  UploadedFiles,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { ApartmentResponseDto } from './dto/apartment-response.dto';
import { PaginatedApartmentsDto } from './dto/paginated-apartments.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('apartments')
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
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
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'price', 'priceUnit', 'location', 'city', 'bedrooms', 'bathrooms', 'squareFeet', 'minTerm', 'minTermUnit'],
      properties: {
        title: { type: 'string', example: 'Cozy 2BR near park' },
        description: { type: 'string', example: 'A lovely apartment...' },
        price: { type: 'number', example: 1200 },
        priceUnit: { type: 'string', enum: ['mo', 'year'], example: 'mo' },
        location: { type: 'string', example: 'Ikeja' },
        city: { type: 'string', example: 'Lagos' },
        bedrooms: { type: 'number', example: 2 },
        bathrooms: { type: 'number', example: 1 },
        squareFeet: { type: 'number', example: 1200 },
        minTerm: { type: 'number', example: 6 },
        minTermUnit: { type: 'string', enum: ['month', 'year'], example: 'month' },
        amenities: { type: 'array', items: { type: 'string' }, example: ['WiFi', 'Parking'] },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Upload up to 5 images'
        },
      },
    },
  })
  @ApiOperation({ summary: 'Create a new apartment listing with images' })
  @ApiResponse({
    status: 201,
    description: 'Apartment created',
    type: ApartmentResponseDto,
  })
  async create(@Body() dto: CreateApartmentDto, @UploadedFiles() files: Array<Express.Multer.File>) {
    return this.apartmentsService.create(dto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of apartments' })
  @ApiOkResponse({
    description: 'List of apartments',
    type: PaginatedApartmentsDto,
  })
  async findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.apartmentsService.findAll(p, l);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get apartment by id' })
  @ApiParam({ name: 'id', description: 'Apartment ID' })
  @ApiResponse({
    status: 200,
    description: 'Apartment found',
    type: ApartmentResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.apartmentsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
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
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Cozy 2BR near park' },
        description: { type: 'string', example: 'A lovely apartment...' },
        price: { type: 'number', example: 1200 },
        priceUnit: { type: 'string', enum: ['mo', 'year'], example: 'mo' },
        location: { type: 'string', example: 'Ikeja' },
        city: { type: 'string', example: 'Lagos' },
        bedrooms: { type: 'number', example: 2 },
        bathrooms: { type: 'number', example: 1 },
        squareFeet: { type: 'number', example: 1200 },
        minTerm: { type: 'number', example: 6 },
        minTermUnit: { type: 'string', enum: ['month', 'year'], example: 'month' },
        amenities: { type: 'array', items: { type: 'string' }, example: ['WiFi', 'Parking'] },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Upload up to 5 images'
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update an existing apartment listing' })
  @ApiParam({ name: 'id', description: 'Apartment ID' })
  @ApiResponse({
    status: 200,
    description: 'Apartment updated',
    type: ApartmentResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateApartmentDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.apartmentsService.update(id, dto, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an apartment listing' })
  @ApiParam({ name: 'id', description: 'Apartment ID' })
  @ApiResponse({ status: 200, description: 'Apartment deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.apartmentsService.remove(id);
  }
}
