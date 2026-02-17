import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PropertiesService {
  private readonly collection = 'properties';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  async create(createPropertyDto: any): Promise<any> {
    console.log('Creating property with data:', createPropertyDto);

    // Validate owner
    if (createPropertyDto.ownerId) {
      const owner = await this.usersService.findOne(createPropertyDto.ownerId);
      if (!owner) {
        throw new NotFoundException(`Owner with ID ${createPropertyDto.ownerId} not found`);
      }
      if (owner.role !== 'owner') {
        throw new ConflictException(`User with ID ${createPropertyDto.ownerId} is not an owner`);
      }
    }

    const created = await this.mongoDb.create(this.collection, createPropertyDto);

    // Audit Log
    await this.auditLogsService.create({
      userId: createPropertyDto.ownerId,
      action: 'CREATE_PROPERTY',
      entityType: 'property',
      entityId: created.id,
      details: { name: createPropertyDto.name },
      createdAt: new Date()
    });

    return created;
  }

  async uploadImages(files: Array<Express.Multer.File>): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.cloudinaryService.uploadImage(file.buffer, file.originalname, file.mimetype)
    );
    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls.filter((url): url is string => url !== null);
  }

  async findAll(ownerId?: string, managerId?: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (ownerId) filter.ownerId = ownerId;
    if (managerId) filter.managerId = managerId;

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
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return item;
  }

  async update(id: string, updatePropertyDto: any): Promise<any> {
    // Check if property exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    console.log('Updating property with data:', updatePropertyDto);

    const updated = await this.mongoDb.update(this.collection, id, updatePropertyDto);

    if (!updated) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.ownerId,
      action: 'UPDATE_PROPERTY',
      entityType: 'property',
      entityId: id,
      details: { updates: Object.keys(updatePropertyDto) },
      createdAt: new Date()
    });

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if property exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.ownerId,
      action: 'DELETE_PROPERTY',
      entityType: 'property',
      entityId: id,
      details: { name: existing.name },
      createdAt: new Date()
    });

    return { message: 'Property deleted successfully' };
  }
}