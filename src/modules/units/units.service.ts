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

  async create(data: any, files?: Array<Express.Multer.File>): Promise<any> {
    console.log('Creating unit with data:', data);

    // Mandate file upload
    if (!files || files.length === 0) {
      throw new ConflictException('Unit images are required (at least one)');
    }

    // Upload all images and collect URLs
    const imageUrls: string[] = [];
    for (const file of files) {
      const imageUrl = await this.cloudinaryService.uploadImage(file.buffer, file.originalname, file.mimetype);
      if (!imageUrl) {
        throw new ConflictException(`Failed to upload image: ${file.originalname}`);
      }
      imageUrls.push(imageUrl);
    }

    // Store as array of images or single primary image + gallery
    data.images = imageUrls;
    data.image = imageUrls[0]; // Primary image is the first one for backward compatibility

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
        details: { unitNumber: data.unitNumber, propertyId: data.propertyId, imageCount: imageUrls.length },
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

    // Fetch properties for these units
    let propertiesById: Record<string, any> = {};
    if (propertyIds.length > 0) {
      const properties = await this.mongoDb.findAll('properties', { id: { $in: propertyIds } });
      propertiesById = properties.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
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
      // attach property info
      if (u.propertyId && propertiesById[u.propertyId]) {
        const prop = propertiesById[u.propertyId];
        u.property = { id: prop.id, name: prop.name, address: prop.address };
      } else {
        u.property = null;
      }

      if (u.tenantId && tenantsById[u.tenantId]) {
        const tenant = tenantsById[u.tenantId];
        const { password, ...tenantSafe } = tenant;
        const leaseKey = `${u.tenantId}_${u.propertyId}_${u.unitNumber}`;
        const lease = leasesByKey[leaseKey];
        u.currentTenant = {
          id: tenantSafe.id,
          fullName: tenantSafe.fullname || tenantSafe.fullName || '',
          email: tenantSafe.email,
          phone: tenantSafe.phoneNumber || tenantSafe.phone || undefined,
          leaseStart: lease ? lease.startDate : undefined,
          leaseEnd: lease ? lease.endDate : undefined,
          leaseStatus: lease ? lease.status : undefined,
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
    // attach property info
    if (item.propertyId) {
      const prop = await this.mongoDb.findOne('properties', item.propertyId);
      item.property = prop ? { id: prop.id, name: prop.name, address: prop.address } : null;
    } else {
      item.property = null;
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
          email: tenantSafe.email,
          phone: tenantSafe.phoneNumber || tenantSafe.phone || undefined,
          leaseStart: lease ? lease.startDate : undefined,
          leaseEnd: lease ? lease.endDate : undefined,
          leaseStatus: lease ? lease.status : undefined,
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

  async getAvailableTenants(propertyId: string): Promise<any> {
    // Find all active leases on this property
    const leases = await this.mongoDb.findAll('leases', {
      propertyId,
      status: 'active',
    });

    if (!leases || leases.length === 0) {
      return { data: [], total: 0 };
    }

    // Extract unique tenant IDs
    const tenantIds = Array.from(new Set(leases.map((l: any) => l.userId || l.tenantId).filter(Boolean)));

    // Fetch tenant details
    const tenants = await this.mongoDb.findAll('users', { id: { $in: tenantIds } });
    const tenantsById = new Map(tenants.map((t: any) => [t.id, t]));

    // Map leases to tenant info
    const result = leases.map((lease: any) => {
      const tenant = tenantsById.get(String(lease.userId || lease.tenantId));
      return {
        id: tenant?.id || lease.userId || lease.tenantId,
        fullName: tenant?.fullName || tenant?.fullname || '',
        email: tenant?.email,
        phone: tenant?.phoneNumber || tenant?.phone,
        leaseStart: lease.startDate ? (new Date(lease.startDate)).toISOString().split('T')[0] : undefined,
        leaseEnd: lease.endDate ? (new Date(lease.endDate)).toISOString().split('T')[0] : undefined,
        leaseStatus: lease.status,
      };
    });

    return { data: result, total: result.length };
  }
}