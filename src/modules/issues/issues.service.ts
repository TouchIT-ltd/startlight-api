import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class IssuesService {
  private readonly collection = 'issues';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async create(data: any): Promise<any> {
    console.log('Creating issue with data:', data);

    const created = await this.mongoDb.create(this.collection, data);
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
