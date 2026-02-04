import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class RentRequestsService {
  private readonly collection = 'rent-requests';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async create(data: any): Promise<any> {
    console.log('Creating rent request with data:', data);

    // Set default status to pending
    const requestData = {
      ...data,
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

      const leases = await this.mongoDb.findAll('leases', { apartmentId: { $in: propertyIds } });
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

    const updateData: any = { status: 'approved' };
    if (managerNotes) {
      updateData.managerNotes = managerNotes;
    }

    const updated = await this.mongoDb.update(this.collection, id, updateData);

    if (!updated) {
      throw new NotFoundException(`Rent request with ID ${id} not found`);
    }

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

    return updated;
  }
}