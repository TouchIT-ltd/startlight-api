import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class LeasesService {
  private readonly collection = 'leases';
  private readonly logger = new Logger(LeasesService.name);

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(data: any, file?: any): Promise<any> {
    try {
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
          throw new ConflictException(
            'Only PDF and Word documents are allowed',
          );
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
    } catch (error: any) {
      const errorResponse = {
        message: `Failed to create lease: ${error.message}`,
        error: error.message,
        code: error.code || 'CREATE_LEASE_ERROR',
        timestamp: new Date().toISOString(),
        details: {
          userId: data?.userId,
          propertyId: data?.propertyId,
          unitNumber: data?.unitNumber,
          stack: error.stack,
        },
      };
      this.logger.error('Create lease error:', errorResponse);
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: { propertyId?: string; userId?: string; role?: string } = {},
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const dbFilter: any = {};

    if (filters.propertyId) {
      dbFilter.propertyId = filters.propertyId;
    }

    if (filters.userId && filters.role) {
      if (filters.role === 'owner') {
        const properties = await this.mongoDb.findAll('properties', {
          ownerId: filters.userId,
        });
        const propertyIds = properties.map((p) => p.id);
        if (dbFilter.propertyId) {
          if (!propertyIds.includes(dbFilter.propertyId)) {
            return { data: [], total: 0, page, totalPages: 0 };
          }
        } else {
          dbFilter.propertyId = { $in: propertyIds };
        }
      } else if (filters.role === 'manager') {
        const properties = await this.mongoDb.findAll('properties', {
          managerId: filters.userId,
        });
        const propertyIds = properties.map((p) => p.id);
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
      this.mongoDb.findAll(this.collection, dbFilter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.mongoDb.count(this.collection, dbFilter),
    ]);

    const populatedItems = await Promise.all(
      items.map((item) => this._populateLeaseDetails(item)),
    );

    return {
      data: populatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    try {
      this.logger.log(`findOne lease id=${id}`);
      const item = await this.mongoDb.findOne(this.collection, id);
      if (!item) {
        this.logger.warn(`lease id=${id} not found`);
        throw new NotFoundException(`Lease with ID ${id} not found`);
      }
      return this._populateLeaseDetails(item);
    } catch (error: any) {
      const errorResponse = {
        message: `Failed to find lease: ${error.message}`,
        error: error.message,
        code: error.code || 'FIND_LEASE_ERROR',
        timestamp: new Date().toISOString(),
        leaseId: id,
        details: {
          stack: error.stack,
        },
      };
      this.logger.error('Find lease error:', errorResponse);
      throw error;
    }
  }

  async findMyLease(userId: string): Promise<any> {
    try {
      this.logger.log(`findMyLease lookup for user ${userId}`);
      if (!userId) {
        throw new NotFoundException('User id is required to find lease');
      }

      // Support leases that reference the tenant as either `userId` or `tenantId`.
      const item = await this.mongoDb.findOneBy(this.collection, {
        $or: [{ userId }, { tenantId: userId }],
        // status: 'active',
      });

      if (!item) {
        this.logger.log(`No active lease found for user ${userId}`);
        return null;
      }

      return this._populateLeaseDetails(item);
    } catch (error: any) {
      const errorResponse = {
        message: `Failed to find my lease: ${error.message}`,
        error: error.message,
        code: error.code || 'FIND_MY_LEASE_ERROR',
        timestamp: new Date().toISOString(),
        userId,
        details: {
          stack: error.stack,
        },
      };
      this.logger.error('Find my lease error:', errorResponse);
      throw error;
    }
  }

  private async _populateLeaseDetails(lease: any): Promise<any> {
    if (!lease) return lease;

    // Populate Unit Details
    if (lease.unitNumber && lease.propertyId) {
      try {
        const unit = await this.mongoDb.findOneBy('units', {
          propertyId: lease.propertyId,
          unitNumber: lease.unitNumber,
        });
        if (unit) {
          lease.unit = {
            id: unit.id,
            unitNumber: unit.unitNumber,
            price: unit.price,
            images: unit.images || [],
            image: unit.image,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            amenities: unit.amenities || [],
            description: unit.description,
            status: unit.status,
            propertySpecification: unit.propertySpecification,
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to populate unit details for lease ${lease.id}: ${err.message}`,
        );
      }
    }

    // Populate Property Details
    if (lease.propertyId) {
      try {
        const property = await this.mongoDb.findOne(
          'properties',
          lease.propertyId,
        );
        if (property) {
          const propDetails: any = {
            id: property.id,
            name: property.name,
            address: property.address,
            description: property.description,
            images: property.images || [],
            image: property.image,
            totalUnits: property.totalUnits,
            ownerEmail: property.ownerEmail,
            managerEmail: property.managerEmail,
          };

          // Enrich with emails if missing from property object but IDs exist
          if (!propDetails.ownerEmail && property.ownerId) {
            const owner = await this.mongoDb.findOne('users', property.ownerId);
            if (owner) propDetails.ownerEmail = owner.email;
          }
          if (!propDetails.managerEmail && property.managerId) {
            const manager = await this.mongoDb.findOne(
              'users',
              property.managerId,
            );
            if (manager) propDetails.managerEmail = manager.email;
          }

          lease.property = propDetails;
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to populate property details for lease ${lease.id}: ${err.message}`,
        );
      }
    }

    return lease;
  }

  async update(id: string, data: any, file?: any): Promise<any> {
    try {
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
          throw new ConflictException(
            'Only PDF and Word documents are allowed',
          );
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
    } catch (error: any) {
      const errorResponse = {
        message: `Failed to update lease: ${error.message}`,
        error: error.message,
        code: error.code || 'UPDATE_LEASE_ERROR',
        timestamp: new Date().toISOString(),
        leaseId: id,
        details: {
          stack: error.stack,
        },
      };
      this.logger.error('Update lease error:', errorResponse);
      throw error;
    }
  }

  async renew(id: string, userId: string): Promise<any> {
    try {
      this.logger.log(`Renewing lease id=${id} for user=${userId}`);
      const lease = await this.mongoDb.findOne(this.collection, id);
      if (!lease) {
        throw new NotFoundException(`Lease with ID ${id} not found`);
      }

      if (lease.userId !== userId && lease.tenantId !== userId) {
        throw new ConflictException(
          'You are not authorized to renew this lease',
        );
      }

      const unit = await this.mongoDb.findOneBy('units', {
        propertyId: lease.propertyId,
        unitNumber: lease.unitNumber,
      });

      if (!unit) {
        throw new NotFoundException('Associated unit not found');
      }

      const durationMonths = unit.duration || 12;
      const price = unit.price || lease.rentAmount;

      const currentEndDate = new Date(lease.endDate);
      const now = new Date();

      let newStartDate = currentEndDate;
      if (currentEndDate < now) {
        newStartDate = now;
      }

      const newEndDate = new Date(newStartDate);
      newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

      const updatedLease = await this.mongoDb.update(this.collection, id, {
        endDate: newEndDate.toISOString().split('T')[0],
        status: 'active',
        rentAmount: price,
      });

      const property = await this.mongoDb.findOne(
        'properties',
        lease.propertyId,
      );
      await this.mongoDb.create('rent-requests', {
        tenantId: userId,
        userId: userId,
        propertyId: lease.propertyId,
        unitId: unit.id,
        amount: price,
        status: 'pending',
        managerId: property?.managerId,
        description: `Lease renewal for ${durationMonths} months`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.auditLogsService.create({
        userId: userId,
        action: 'RENEW_LEASE',
        entityType: 'lease',
        entityId: id,
        details: {
          propertyId: lease.propertyId,
          unitNumber: lease.unitNumber,
          newEndDate: newEndDate.toISOString().split('T')[0],
        },
        createdAt: new Date(),
      });

      return updatedLease;
    } catch (error: any) {
      this.logger.error(`Error renewing lease: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
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
        details: {
          propertyId: existing.propertyId,
          unitNumber: existing.unitNumber,
        },
        createdAt: new Date(),
      });

      return { message: 'Lease deleted successfully' };
    } catch (error: any) {
      const errorResponse = {
        message: `Failed to delete lease: ${error.message}`,
        error: error.message,
        code: error.code || 'DELETE_LEASE_ERROR',
        timestamp: new Date().toISOString(),
        leaseId: id,
        details: {
          stack: error.stack,
        },
      };
      this.logger.error('Delete lease error:', errorResponse);
      throw error;
    }
  }
}
