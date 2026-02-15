import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Injectable()
export class ApartmentsService {
  private readonly collection = 'apartments';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async uploadImages(files: Array<Express.Multer.File>): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate all files first
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    for (const file of files) {
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException(
          `File ${file.originalname} is not an allowed image type (jpg, jpeg, png, webp)`,
        );
      }
    }

    console.log(`Uploading ${files.length} images to Cloudinary...`);

    // Upload all files in parallel
    const uploadPromises = files.map(file =>
      this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      )
    );

    const uploadedUrls = await Promise.all(uploadPromises);

    // Filter out any failed uploads (nulls)
    const validUrls = uploadedUrls.filter((url): url is string => !!url);

    if (validUrls.length !== files.length) {
      console.warn('Some images failed to upload');
    }

    return validUrls;
  }

  async create(data: any, files?: Array<Express.Multer.File>): Promise<any> {
    console.log('Creating apartment with data:', data);

    let images = data.images || [];

    // Ensure images is an array
    if (!Array.isArray(images)) {
      images = [images];
    }

    if (files && files.length > 0) {
      // Validate all files
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      for (const file of files) {
        if (!allowedMimes.includes(file.mimetype)) {
          throw new ConflictException(
            `File ${file.originalname} is not an allowed image type`,
          );
        }
      }

      console.log(`Uploading ${files.length} images to Cloudinary...`);

      const uploadPromises = files.map(file =>
        this.cloudinaryService.uploadImage(
          file.buffer,
          file.originalname,
          file.mimetype,
        )
      );

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => !!url);

      // Append new uploads to the images list
      images = [...images, ...validUrls];
    }

    const created = await this.mongoDb.create(this.collection, {
      ...data,
      images,
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
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }
    return item;
  }

  async update(id: string, data: any, files?: Array<Express.Multer.File>): Promise<any> {
    // Check if apartment exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }

    console.log('Updating apartment with data:', data);
    console.log(
      'Files received:',
      files
        ? files.map(f => ({
          originalname: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
        }))
        : 'No files',
    );

    // Start with existing images or what's passed in data (if erasing/reordering)
    // IMPORTANT: If 'images' is passed in body, it replaces existing images (e.g. deleting old ones by omission).
    // If files are uploaded, they are APPENDED to the resulting list? Or REPLACE?
    // User request: "uploading image not inserting string".
    // Usually on update:
    // - If `images` field is present in body (string URLs), use that (allows keeping old images/deleting some).
    // - If `files` are present, upload them and APPEND to the list.

    let images = data.images || existing.images || [];

    // Ensure images is an array
    if (!Array.isArray(images)) {
      images = [images];
    }

    if (files && files.length > 0) {
      // Validate all files
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      for (const file of files) {
        if (!allowedMimes.includes(file.mimetype)) {
          throw new ConflictException(
            `File ${file.originalname} is not an allowed image type`,
          );
        }
      }

      console.log(`Uploading ${files.length} images to Cloudinary...`);

      const uploadPromises = files.map(file =>
        this.cloudinaryService.uploadImage(
          file.buffer,
          file.originalname,
          file.mimetype,
        )
      );

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => !!url);

      // Append new uploads to the images list
      images = [...images, ...validUrls];
    }

    const updated = await this.mongoDb.update(this.collection, id, {
      ...data,
      images,
    });

    if (!updated) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if apartment exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }

    return { message: 'Apartment deleted successfully' };
  }
}
