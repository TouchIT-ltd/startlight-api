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

    // convert ownerEmail/managerEmail to IDs if provided
    if (createPropertyDto.ownerEmail) {
      const owner = await this.usersService.findByEmail(createPropertyDto.ownerEmail);
      if (!owner) {
        throw new NotFoundException(`Owner with email ${createPropertyDto.ownerEmail} not found`);
      }
      if (owner.role !== 'owner') {
        throw new ConflictException(`User with email ${createPropertyDto.ownerEmail} is not an owner`);
      }
      createPropertyDto.ownerId = owner.id;
    }
    // fallback check if ownerId provided directly
    if (createPropertyDto.ownerId && !createPropertyDto.ownerEmail) {
      const owner = await this.usersService.findOne(createPropertyDto.ownerId);
      if (!owner) {
        throw new NotFoundException(`Owner with ID ${createPropertyDto.ownerId} not found`);
      }
      if (owner.role !== 'owner') {
        throw new ConflictException(`User with ID ${createPropertyDto.ownerId} is not an owner`);
      }
    }

    if (createPropertyDto.managerEmail) {
      const manager = await this.usersService.findByEmail(createPropertyDto.managerEmail);
      if (!manager) {
        throw new NotFoundException(`Manager with email ${createPropertyDto.managerEmail} not found`);
      }
      if (manager.role !== 'manager') {
        throw new ConflictException(`User with email ${createPropertyDto.managerEmail} is not a manager`);
      }
      createPropertyDto.managerId = manager.id;
    }
    if (createPropertyDto.managerId && !createPropertyDto.managerEmail) {
      const manager = await this.usersService.findOne(createPropertyDto.managerId);
      if (!manager) {
        throw new NotFoundException(`Manager with ID ${createPropertyDto.managerId} not found`);
      }
      if (manager.role !== 'manager') {
        throw new ConflictException(`User with ID ${createPropertyDto.managerId} is not a manager`);
      }
    }

    const created = await this.mongoDb.create(this.collection, createPropertyDto);

    // add email fields for response
    if (created.ownerId) {
      const owner = await this.usersService.findOne(created.ownerId).catch(() => null);
      if (owner) created.ownerEmail = owner.email;
    }
    if (created.managerId) {
      const manager = await this.usersService.findOne(created.managerId).catch(() => null);
      if (manager) created.managerEmail = manager.email;
    }

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

  async findAll(ownerId?: string, managerId?: string, page = 1, limit = 10, ownerEmail?: string, managerEmail?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // convert owner email to id if necessary
    if (ownerEmail && !ownerId) {
      const owner = await this.usersService.findByEmail(ownerEmail);
      if (owner) {
        ownerId = owner.id;
      }
    }

    // convert manager email to id
    if (managerEmail && !managerId) {
      const manager = await this.usersService.findByEmail(managerEmail);
      if (manager) {
        managerId = manager.id;
      }
    }

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

    // enrich each item with email fields
    const enriched = await Promise.all(items.map(async (it: any) => {
      if (it.ownerId) {
        const owner = await this.usersService.findOne(it.ownerId).catch(() => null);
        if (owner) it.ownerEmail = owner.email;
      }
      if (it.managerId) {
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
    if (!item) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    // enrich with emails
    if (item.ownerId) {
      const owner = await this.usersService.findOne(item.ownerId).catch(() => null);
      if (owner) item.ownerEmail = owner.email;
    }
    if (item.managerId) {
      const manager = await this.usersService.findOne(item.managerId).catch(() => null);
      if (manager) item.managerEmail = manager.email;
    }
    return item;
  }

  async getTenants(propertyId: string) {
    // find leases related to this property using public DB API
    const leases = await this.mongoDb.findAll('leases', { propertyId }, { sort: { startDate: -1 } });

    if (!leases || leases.length === 0) return [];

    const tenantIds = Array.from(new Set(
      leases.flatMap((l: any) => [l.tenantId, l.userId]).filter(Boolean)
    ));
    const tenants = await this.mongoDb.findAll('users', { id: { $in: tenantIds } });
    const tenantsById = new Map(tenants.map((t: any) => [String(t.id), t]));

    // map each lease to a tenant entry
    const result = leases.map((lease: any) => {
      const tenantId = lease.tenantId || lease.userId;
      const tenant = tenantsById.get(String(tenantId));
      return {
        id: tenant?.id || tenantId,
        fullname: tenant?.fullname || tenant?.fullName || '',
        email: tenant?.email || '',
        phoneNumber: tenant?.phoneNumber || tenant?.phone || '',
        unitNumber: lease.unitNumber || lease.unit || '',
        leaseStart: lease.startDate ? (new Date(lease.startDate)).toISOString().split('T')[0] : undefined,
        leaseEnd: lease.endDate ? (new Date(lease.endDate)).toISOString().split('T')[0] : undefined,
        leaseStatus: lease.status,
      };
    });

    return result;
  }

  async update(id: string, updatePropertyDto: any): Promise<any> {
    // Check if property exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    console.log('Updating property with data:', updatePropertyDto);

    // convert emails if present
    if (updatePropertyDto.ownerEmail) {
      const owner = await this.usersService.findByEmail(updatePropertyDto.ownerEmail);
      if (!owner) {
        throw new NotFoundException(`Owner with email ${updatePropertyDto.ownerEmail} not found`);
      }
      if (owner.role !== 'owner') {
        throw new ConflictException(`User with email ${updatePropertyDto.ownerEmail} is not an owner`);
      }
      updatePropertyDto.ownerId = owner.id;
    }
    if (updatePropertyDto.managerEmail) {
      const manager = await this.usersService.findByEmail(updatePropertyDto.managerEmail);
      if (!manager) {
        throw new NotFoundException(`Manager with email ${updatePropertyDto.managerEmail} not found`);
      }
      if (manager.role !== 'manager') {
        throw new ConflictException(`User with email ${updatePropertyDto.managerEmail} is not a manager`);
      }
      updatePropertyDto.managerId = manager.id;
    }

    const updated = await this.mongoDb.update(this.collection, id, updatePropertyDto);

    if (!updated) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    // enrich with emails
    if (updated.ownerId) {
      const owner = await this.usersService.findOne(updated.ownerId).catch(() => null);
      if (owner) updated.ownerEmail = owner.email;
    }
    if (updated.managerId) {
      const manager = await this.usersService.findOne(updated.managerId).catch(() => null);
      if (manager) updated.managerEmail = manager.email;
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

    // Cascade delete units that belong to this property
    try {
      const units = await this.mongoDb.findAll('units', { propertyId: id });
      if (units && units.length > 0) {
        await Promise.all(units.map((u: any) => this.mongoDb.delete('units', u.id)));

        // Optionally create audit logs for deleted units
        for (const u of units) {
          await this.auditLogsService.create({
            userId: existing.ownerId,
            action: 'DELETE_UNIT_ON_PROPERTY_DELETE',
            entityType: 'unit',
            entityId: u.id,
            details: { unitNumber: u.unitNumber, propertyId: id },
            createdAt: new Date(),
          });
        }
      }
    } catch (err) {
      // Log but don't block property deletion on cascade failure
      // (the MongoDatabaseService already logs errors)
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