import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RentRequestsService {
  private readonly collection = 'rent-requests';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async create(data: any): Promise<any> {
    console.log('Creating rent request with data:', data);

    // Fetch unit to get price and propertyId (if not provided or to validate)
    const unit = await this.mongoDb.findOne('units', data.unitId);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${data.unitId} not found`);
    }

    // Set default status to pending and use unit price
    const requestData = {
      ...data,
      amount: unit.price, // Auto-calculated from unit
      propertyId: unit.propertyId, // Ensure propertyId matches unit
      status: 'pending',
    };

    return this.mongoDb.create(this.collection, requestData);
  }

  async findAll(userId?: string, page = 1, limit = 10, filters: {
    status?: string;
    propertyId?: string;
    tenantId?: string;
  } = {}): Promise<any> {
    const skip = (page - 1) * limit;
    let filter: any = {};

    // Apply status, propertyId, tenantId filters
    if (filters.status) filter.status = filters.status;
    if (filters.propertyId) filter.propertyId = filters.propertyId;
    if (filters.tenantId) filter.tenantId = filters.tenantId;

    if (userId) {
      // Role-based filtering based on user role (this would need to be enhanced with actual user role checking)
      // For now, assume manager filtering logic
      const properties = await this.mongoDb.findAll('properties', { managerId: userId });
      const propertyIds = properties.map(p => p.id);

      const leases = await this.mongoDb.findAll('leases', { propertyId: { $in: propertyIds } });
      const leaseIds = leases.map(l => l.id);

      filter.leaseId = { $in: leaseIds };
    }

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
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }
    return item;
  }

  async approve(id: string, managerNotes?: string): Promise<any> {
    // Check if request exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }

    if (existing.status !== 'pending') {
      throw new NotFoundException('Request has already been processed');
    }

    // Unit Locking Logic: Check if any other request for this unit is already approved
    const unitId = existing.unitId;
    const conflictingRequest = await this.mongoDb.findOneBy(this.collection, {
      unitId,
      status: 'approved'
    });

    if (conflictingRequest) {
      throw new ConflictException('This unit already has an approved tenant. Cannot approve another request.');
    }

    const updateData: any = { status: 'approved' };
    if (managerNotes) {
      updateData.managerNotes = managerNotes;
    }

    const updated = await this.mongoDb.update(this.collection, id, updateData);

    if (!updated) {
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.userId,
      action: 'APPROVE_RENT_REQUEST',
      entityType: 'rent-request',
      entityId: id,
      details: { managerNotes },
      createdAt: new Date(),
    });

    // Notification
    await this.notificationsService.create({
      userId: existing.userId,
      title: 'Rent Request Approved',
      message: 'Your rent request has been approved. Please proceed to payment.',
      type: 'RENT_APPROVED',
      entityId: id,
    });

    return updated;
  }

  async reject(id: string, managerNotes?: string): Promise<any> {
    // Check if request exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }

    if (existing.status !== 'pending') {
      throw new NotFoundException('Request has already been processed');
    }

    const updateData: any = { status: 'rejected' };
    if (managerNotes) {
      updateData.managerNotes = managerNotes;
    }

    const updated = await this.mongoDb.update(this.collection, id, updateData);

    if (!updated) {
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }

    // Audit Log
    await this.auditLogsService.create({
      userId: existing.userId,
      action: 'REJECT_RENT_REQUEST',
      entityType: 'rent-request',
      entityId: id,
      details: { managerNotes },
      createdAt: new Date(),
    });

    // Notification
    await this.notificationsService.create({
      userId: existing.userId,
      title: 'Rent Request Rejected',
      message: `Your rent request was rejected. Notes: ${managerNotes || 'No notes provided.'}`,
      type: 'RENT_REJECTED',
      entityId: id,
    });

    return updated;
  }
}