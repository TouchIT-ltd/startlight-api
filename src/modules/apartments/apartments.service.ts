import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Injectable()
export class ApartmentsService {
  private readonly collection = 'apartments';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(data: any, file?: any): Promise<any> {
    console.log('Creating apartment with data:', data);
    console.log('File received:', file ? { originalname: file.originalname, size: file.size, mimetype: file.mimetype } : 'No file');

    // Handle file upload for imageUrl
    let imageUrl = data.imageUrl;
    if (file) {
      // Validate file type (images only)
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException('Only image files (jpg, jpeg, png, webp) are allowed');
      }

      console.log('Uploading to Cloudinary...');
      // Upload to Cloudinary
      imageUrl = await this.cloudinaryService.uploadImage(file.buffer, file.originalname, file.mimetype);
      console.log('Cloudinary result:', imageUrl);
      if (!imageUrl) {
        throw new ConflictException('Failed to upload image');
      }
    }

    const created = await this.mongoDb.create(this.collection, {
      ...data,
      imageUrl,
    });
    return created;
  }

  async findAll(page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.mongoDb.findAll(this.collection, {}, { skip, limit, sort: { createdAt: -1 } }),
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
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }
    return item;
  }
}
