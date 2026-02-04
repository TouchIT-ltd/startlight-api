import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class AuditLogsService {
  private readonly collection = 'audit-logs';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async create(data: any): Promise<any> {
    console.log('Creating audit log with data:', data);
    return this.mongoDb.create(this.collection, data);
  }

  async findAll(page = 1, limit = 50, filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.entityType) query.entityType = filters.entityType;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        query,
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, query),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        { userId },
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, { userId }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByAction(action: string, page = 1, limit = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        { action },
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, { action }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}