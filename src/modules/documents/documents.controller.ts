import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  Delete,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { PaginatedDocumentsDto } from './dto/paginated-documents.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new Error('Only PDF, Word documents, and images are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document data with file upload',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '507f1f77bcf86cd799439012',
          description: 'ID of the user who owns this document',
        },
        leaseId: {
          type: 'string',
          example: '507f1f77bcf86cd799439013',
          description: 'ID of the lease this document belongs to',
        },
        type: {
          type: 'string',
          example: 'lease_agreement',
          enum: ['lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_report', 'other'],
          description: 'Type of document',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF or document file to upload',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  async create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.create(dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of documents' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'leaseId', required: false, description: 'Filter by lease ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiOkResponse({ description: 'List of documents', type: PaginatedDocumentsDto })
  async findAll(
    @Query('userId') userId?: string,
    @Query('leaseId') leaseId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 10;
    return this.documentsService.findAll(userId, leaseId, p, l);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by id' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document found',
    type: DocumentResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Download URL retrieved',
  })
  async download(@Param('id') id: string, @Res() res: Response) {
    const downloadUrl = await this.documentsService.getDownloadUrl(id);
    // Redirect to the Cloudinary URL for download
    res.redirect(downloadUrl);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}