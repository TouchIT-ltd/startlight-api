import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IssuesService {
  private readonly collection = 'issues';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async create(data: any, userId: string): Promise<any> {
    console.log('Creating issue with data:', data);

    // Find active lease for the user to get property/unit details
    const lease = await this.mongoDb.findOneBy('leases', { userId, status: 'active' });

    if (!lease) {
      throw new NotFoundException('No active lease found for this user. Cannot submit maintenance request.');
    }

    const issueData = {
      ...data,
      userId,
      leaseId: lease.id,
      propertyId: lease.propertyId,
      unitNumber: lease.unitNumber,
      status: 'open', // Default status
      createdAt: new Date(),
    };

    const created = await this.mongoDb.create(this.collection, issueData);

    // Audit Log for creation
    await this.auditLogsService.create({
      userId,
      action: 'CREATE_ISSUE',
      entityType: 'issue',
      entityId: created.id,
      details: { description: data.description, category: data.category },
      createdAt: new Date(),
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
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }
    return item;
  }

  async findMyIssues(userId: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const filter = { userId };

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(this.collection, filter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.mongoDb.count(this.collection, filter),
    ]);

    return {
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: any): Promise<any> {
    // Check if issue exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    console.log('Updating issue with data:', data);

    const updated = await this.mongoDb.update(this.collection, id, data);

    if (!updated) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    // Notification if status changed
    if (data.status && data.status !== existing.status) {
      await this.notificationsService.create({
        userId: existing.userId,
        title: `Issue Status Updated: ${data.status}`,
        message: `Your maintenance issue '${existing.description}' has been updated to ${data.status}.`,
        type: 'ISSUE_UPDATE',
        entityId: id,
      });

      // Audit log for update
      await this.auditLogsService.create({
        userId: existing.userId, // Or manager ID if we had it mapped contextually
        action: 'UPDATE_ISSUE_STATUS',
        entityType: 'issue',
        entityId: id,
        details: { oldStatus: existing.status, newStatus: data.status },
        createdAt: new Date(),
      });
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if issue exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    return { message: 'Issue deleted successfully' };
  }
}
