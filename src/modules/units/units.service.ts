import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class UnitsService {
  private readonly collection = 'units';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly usersService: UsersService
  ) { }

  async create(data: any, file?: Express.Multer.File): Promise<any> {
    console.log('Creating unit with data:', data);

    // Mandate file upload
    if (!file) {
      throw new ConflictException('Unit image is required');
    }

    // Upload image
    const imageUrl = await this.cloudinaryService.uploadImage(file.buffer, file.originalname, file.mimetype);
    if (!imageUrl) {
      throw new ConflictException('Failed to upload unit image');
    }
    data.image = imageUrl;

    // Check if unit number already exists for this property
    const existingUnit = await this.mongoDb.findOneBy(this.collection, {
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
    });

    if (existingUnit) {
      throw new ConflictException(`Unit number ${data.unitNumber} already exists in this property`);
    }

    const created = await this.mongoDb.create(this.collection, data);

    // Fetch property to get ownerId for audit log
    const property = await this.mongoDb.findOne('properties', data.propertyId);
    if (property) {
      await this.auditLogsService.create({
        userId: property.ownerId,
        action: 'CREATE_UNIT',
        entityType: 'unit',
        entityId: created.id,
        details: { unitNumber: data.unitNumber, propertyId: data.propertyId },
        createdAt: new Date()
      });
    }

    return created;
  }

  async findAll(propertyId?: string, page = 1, limit = 10, filters: { status?: string; tenantId?: string } = {}): Promise<any> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (propertyId) filter.propertyId = propertyId;
    if (filters.status) filter.status = filters.status;
    if (filters.tenantId) filter.tenantId = filters.tenantId;

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        filter,
        { skip, limit, sort: { unitNumber: 1 } },
      ),
      this.mongoDb.count(this.collection, filter),
    ]);

    // Populate tenant details and active lease info for units that have tenantId
    const tenantIds = Array.from(new Set(items.map((u: any) => u.tenantId).filter(Boolean)));
    const propertyIds = Array.from(new Set(items.map((u: any) => u.propertyId).filter(Boolean)));

    let tenantsById: Record<string, any> = {};
    if (tenantIds.length > 0) {
      const tenants = await this.mongoDb.findAll('users', { id: { $in: tenantIds } });
      tenantsById = tenants.reduce((acc: Record<string, any>, t: any) => {
        acc[t.id] = t;
        return acc;
      }, {});
    }

    // Fetch active leases matching tenantIds and relevant properties/units
    let leasesByKey: Record<string, any> = {};
    if (tenantIds.length > 0 && propertyIds.length > 0) {
      const leases = await this.mongoDb.findAll('leases', {
        userId: { $in: tenantIds },
        propertyId: { $in: propertyIds },
        status: 'active',
      });
      leasesByKey = leases.reduce((acc: Record<string, any>, l: any) => {
        const key = `${l.userId}_${l.propertyId}_${l.unitNumber}`;
        acc[key] = l;
        return acc;
      }, {});
    }

    const itemsWithTenants = items.map((u: any) => {
      if (u.tenantId && tenantsById[u.tenantId]) {
        const tenant = tenantsById[u.tenantId];
        const { password, ...tenantSafe } = tenant;
        const leaseKey = `${u.tenantId}_${u.propertyId}_${u.unitNumber}`;
        const lease = leasesByKey[leaseKey];
        u.currentTenant = {
          id: tenantSafe.id,
          fullName: tenantSafe.fullname || tenantSafe.fullName || '',
          leaseStart: lease ? lease.startDate : undefined,
          leaseEnd: lease ? lease.endDate : undefined,
        };
      } else {
        u.currentTenant = null;
      }
      return u;
    });

    return {
      data: itemsWithTenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.mongoDb.findOne(this.collection, id);
    if (!item) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    // If unit has tenantId, populate tenant and lease info
    if (item.tenantId) {
      const tenant = await this.mongoDb.findOne('users', item.tenantId);
      if (tenant) {
        const { password, ...tenantSafe } = tenant;
        // Try to find active lease for this tenant on this unit
        const lease = await this.mongoDb.findOneBy('leases', {
          userId: item.tenantId,
          propertyId: item.propertyId,
          unitNumber: item.unitNumber,
          status: 'active',
        });

        item.currentTenant = {
          id: tenantSafe.id,
          fullName: tenantSafe.fullname || tenantSafe.fullName || '',
          leaseStart: lease ? lease.startDate : undefined,
          leaseEnd: lease ? lease.endDate : undefined,
        };
      } else {
        item.currentTenant = null;
      }
    } else {
      item.currentTenant = null;
    }

    return item;
  }

  async update(id: string, data: any): Promise<any> {
    // Check if unit exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // If updating unit number, check for conflicts
    if (data.unitNumber && data.unitNumber !== existing.unitNumber) {
      const conflictingUnit = await this.mongoDb.findOneBy(this.collection, {
        propertyId: existing.propertyId,
        unitNumber: data.unitNumber,
      });

      if (conflictingUnit && conflictingUnit.id !== id) {
        throw new ConflictException(`Unit number ${data.unitNumber} already exists in this property`);
      }
    }

    console.log('Updating unit with data:', data);

    const updated = await this.mongoDb.update(this.collection, id, data);

    if (!updated) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Audit Log
    const property = await this.mongoDb.findOne('properties', existing.propertyId);
    if (property) {
      await this.auditLogsService.create({
        userId: property.ownerId,
        action: 'UPDATE_UNIT',
        entityType: 'unit',
        entityId: id,
        details: { updates: Object.keys(data) },
        createdAt: new Date()
      });
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if unit exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Check if unit is occupied
    if (existing.status === 'occupied') {
      throw new ConflictException('Cannot delete an occupied unit');
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Audit Log
    const property = await this.mongoDb.findOne('properties', existing.propertyId);
    if (property) {
      await this.auditLogsService.create({
        userId: property.ownerId,
        action: 'DELETE_UNIT',
        entityType: 'unit',
        entityId: id,
        details: { unitNumber: existing.unitNumber },
        createdAt: new Date()
      });
    }

    return { message: 'Unit deleted successfully' };
  }
}