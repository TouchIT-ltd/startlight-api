import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Injectable()
export class LeasesService {
  private readonly collection = 'leases';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(data: any, file?: any): Promise<any> {
    console.log('Creating lease with data:', data);
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

    // Handle file upload for documentUrl
    let documentUrl;
    if (file) {
      // Validate file type (PDFs and documents)
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException('Only PDF and Word documents are allowed');
      }

      console.log('Uploading document to Cloudinary...');
      // Upload to Cloudinary
      documentUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      console.log('Cloudinary result:', documentUrl);
      if (!documentUrl) {
        throw new ConflictException('Failed to upload document');
      }
    }

    const created = await this.mongoDb.create(this.collection, {
      ...data,
      documentUrl,
    });
    return created;
  }

  async findAll(page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        {},
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection),
    ]);

    return {
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.mongoDb.findOne(this.collection, id);
    if (!item) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }
    return item;
  }

  async findMyLease(userId: string): Promise<any> {
    const item = await this.mongoDb.findOneBy(this.collection, { userId });
    if (!item) {
      throw new NotFoundException(`No lease found for user ${userId}`);
    }
    return item;
  }

  async update(id: string, data: any, file?: any): Promise<any> {
    // Check if lease exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    console.log('Updating lease with data:', data);
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

    // Handle file upload for documentUrl
    let documentUrl = existing.documentUrl;
    if (file) {
      // Validate file type (PDFs and documents)
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException('Only PDF and Word documents are allowed');
      }

      console.log('Uploading document to Cloudinary...');
      // Upload to Cloudinary
      documentUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      console.log('Cloudinary result:', documentUrl);
      if (!documentUrl) {
        throw new ConflictException('Failed to upload document');
      }
    }

    const updated = await this.mongoDb.update(this.collection, id, {
      ...data,
      documentUrl,
    });

    if (!updated) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if lease exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    return { message: 'Lease deleted successfully' };
  }
}
