import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class PropertiesService {
  private readonly collection = 'properties';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async create(data: any): Promise<any> {
    console.log('Creating property with data:', data);
    return this.mongoDb.create(this.collection, data);
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

  async update(id: string, data: any): Promise<any> {
    // Check if property exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    console.log('Updating property with data:', data);

    const updated = await this.mongoDb.update(this.collection, id, data);

    if (!updated) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

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

    return { message: 'Property deleted successfully' };
  }
}