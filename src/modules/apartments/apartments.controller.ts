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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
} from '@nestjs/swagger';

@ApiTags('apartments')
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('images', {
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
  @ApiBody({ type: CreateApartmentDto })
  @ApiOperation({ summary: 'Create a new apartment listing with images' })
  @ApiResponse({
    status: 201,
    description: 'Apartment created',
    type: ApartmentResponseDto,
  })
  async create(@Body() dto: CreateApartmentDto, @UploadedFile() file?: any) {
    return this.apartmentsService.create(dto, file);
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
  @UseInterceptors(
    FileInterceptor('images', {
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
  @ApiBody({ type: CreateApartmentDto })
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
    @UploadedFile() file?: any,
  ) {
    return this.apartmentsService.update(id, dto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an apartment listing' })
  @ApiParam({ name: 'id', description: 'Apartment ID' })
  @ApiResponse({ status: 200, description: 'Apartment deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.apartmentsService.remove(id);
  }
}
