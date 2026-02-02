import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Injectable()
export class DocumentsService {
  private readonly collection = 'documents';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(data: any, file?: any): Promise<any> {
    console.log('Creating document with data:', data);
    console.log(
      'File received:',
      file
        ? {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
          }
        : 'No file',
    );

    // Handle file upload
    let fileUrl;
    if (file) {
      // Validate file type (PDFs and documents)
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException('Only PDF, Word documents, and images are allowed');
      }

      console.log('Uploading document to Cloudinary...');
      // Upload to Cloudinary
      fileUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
    } else {
      throw new ConflictException('Document file is required');
    }

    const documentData = {
      ...data,
      fileName: file.originalname,
      fileUrl,
    };

    const created = await this.mongoDb.create(this.collection, documentData);
    return created;
  }

  async findAll(userId?: string, leaseId?: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (userId) filter.userId = userId;
    if (leaseId) filter.leaseId = leaseId;

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        filter,
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, filter),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.mongoDb.findOne(this.collection, id);
    if (!item) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return item;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const document = await this.findOne(id);
    return document.fileUrl;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if document exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // TODO: Optionally delete from Cloudinary as well
    // await this.cloudinaryService.deleteImage(existing.fileUrl);

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return { message: 'Document deleted successfully' };
  }
}