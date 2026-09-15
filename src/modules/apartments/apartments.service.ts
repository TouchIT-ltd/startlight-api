import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

import { UsersService } from '../users/users.service';

@Injectable()
export class ApartmentsService {
  private readonly collection = 'apartments';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly usersService: UsersService
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

    if (data.ownerEmail) {
      const owner = await this.usersService.findByEmail(data.ownerEmail);
      if (owner) data.ownerId = owner.id;
    }

    if (data.managerEmail) {
      const manager = await this.usersService.findByEmail(data.managerEmail);
      if (manager) data.managerId = manager.id;
    }

    // Validate owner
    if (data.ownerId) {
      const owner = await this.usersService.findOne(data.ownerId).catch(() => null);
      if (!owner) {
        throw new NotFoundException(`Owner with ID ${data.ownerId} not found`);
      }
      if (owner.role !== 'owner') {
        throw new ConflictException(`User with ID ${data.ownerId} is not an owner`);
      }
    }

    let images = data.images || [];

    // Ensure images is an array
    if (!Array.isArray(images)) {
      images = [images];
    }

    if (files && files.length > 0) {
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

      images = [...images, ...validUrls];
    }

    const created = await this.mongoDb.create(this.collection, {
      ...data,
      images,
    });

    if (created.ownerId) {
      const owner = await this.usersService.findOne(created.ownerId).catch(() => null);
      if (owner) created.ownerEmail = owner.email;
    }
    if (created.managerId) {
      const manager = await this.usersService.findOne(created.managerId).catch(() => null);
      if (manager) created.managerEmail = manager.email;
    }

    return created;
  }

  async findAll(
    ownerId?: string,
    managerId?: string,
    page = 1,
    limit = 10,
    ownerEmail?: string,
    managerEmail?: string,
    city?: string,
    location?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const filter: any = { isDeleted: { $ne: true } };

    if (ownerEmail && !ownerId) {
      const owner = await this.usersService.findByEmail(ownerEmail);
      if (owner) ownerId = owner.id;
    }

    if (managerEmail && !managerId) {
      const manager = await this.usersService.findByEmail(managerEmail);
      if (manager) managerId = manager.id;
    }

    if (ownerId) filter.ownerId = ownerId;
    if (managerId) filter.managerId = managerId;
    if (city) filter.city = new RegExp(city, 'i');
    if (location) filter.location = new RegExp(location, 'i');

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        filter,
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, filter),
    ]);

    const enriched = await Promise.all(items.map(async (it: any) => {
      if (it.ownerId && !it.ownerEmail) {
        const owner = await this.usersService.findOne(it.ownerId).catch(() => null);
        if (owner) it.ownerEmail = owner.email;
      }
      if (it.managerId && !it.managerEmail) {
        const manager = await this.usersService.findOne(it.managerId).catch(() => null);
        if (manager) it.managerEmail = manager.email;
      }
      return it;
    }));

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.mongoDb.findOne(this.collection, id);
    if (!item || item.isDeleted) {
      throw new NotFoundException(`Apartment with ID ${id} not found`);
    }
    if (item.ownerId && !item.ownerEmail) {
      const owner = await this.usersService.findOne(item.ownerId).catch(() => null);
      if (owner) item.ownerEmail = owner.email;
    }
    if (item.managerId && !item.managerEmail) {
      const manager = await this.usersService.findOne(item.managerId).catch(() => null);
      if (manager) item.managerEmail = manager.email;
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
