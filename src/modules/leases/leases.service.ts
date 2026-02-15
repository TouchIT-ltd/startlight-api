import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class LeasesService {
  private readonly collection = 'leases';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  async create(data: any, file?: any): Promise<any> {
    console.log('Creating lease with data:', data);

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
      if (!documentUrl) {
        throw new ConflictException('Failed to upload document');
      }
    }

    const created = await this.mongoDb.create(this.collection, {
      ...data,
      documentUrl,
    });

    // Audit Log
    await this.auditLogsService.create({
      userId: data.userId,
      action: 'CREATE_LEASE',
      entityType: 'lease',
      entityId: created.id,
      details: { propertyId: data.propertyId, unitNumber: data.unitNumber },
      createdAt: new Date(),
    });

    return created;
  }

  async findAll(page = 1, limit = 10, filters: { propertyId?: string; userId?: string; role?: string } = {}): Promise<any> {
    const skip = (page - 1) * limit;
    const dbFilter: any = {};

    if (filters.propertyId) {
      dbFilter.propertyId = filters.propertyId;
    }

    if (filters.userId && filters.role) {
      if (filters.role === 'owner') {
        const properties = await this.mongoDb.findAll('properties', { ownerId: filters.userId });
        const propertyIds = properties.map(p => p.id);
        if (dbFilter.propertyId) {
          if (!propertyIds.includes(dbFilter.propertyId)) {
            return { data: [], total: 0, page, totalPages: 0 };
          }
        } else {
          dbFilter.propertyId = { $in: propertyIds };
        }
      } else if (filters.role === 'manager') {
        const properties = await this.mongoDb.findAll('properties', { managerId: filters.userId });
        const propertyIds = properties.map(p => p.id);
        if (dbFilter.propertyId) {
          if (!propertyIds.includes(dbFilter.propertyId)) {
            return { data: [], total: 0, page, totalPages: 0 };
          }
        } else {
          dbFilter.propertyId = { $in: propertyIds };
        }
      }
    }

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        dbFilter,
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, dbFilter),
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
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    console.log('Updating lease with data:', data);

    let documentUrl = existing.documentUrl;
    if (file) {
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException('Only PDF and Word documents are allowed');
      }

      documentUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
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

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.userId,
      action: 'UPDATE_LEASE',
      entityType: 'lease',
      entityId: id,
      details: { updates: Object.keys(data) },
      createdAt: new Date(),
    });

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.userId,
      action: 'DELETE_LEASE',
      entityType: 'lease',
      entityId: id,
      details: { propertyId: existing.propertyId, unitNumber: existing.unitNumber },
      createdAt: new Date(),
    });

    return { message: 'Lease deleted successfully' };
  }
}
