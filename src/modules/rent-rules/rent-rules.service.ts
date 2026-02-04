import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class RentRulesService {
  private readonly collection = 'rent-rules';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async create(data: any): Promise<any> {
    console.log('Creating rent rule with data:', data);

    // Check if rule already exists for this property
    const existing = await this.mongoDb.findOneBy(this.collection, {
      propertyId: data.propertyId,
    });

    if (existing) {
      throw new ConflictException('Rent rule already exists for this property');
    }

    return this.mongoDb.create(this.collection, data);
  }

  async findByPropertyId(propertyId: string): Promise<any> {
    const rule = await this.mongoDb.findOneBy(this.collection, { propertyId });
    if (!rule) {
      throw new NotFoundException(`Rent rule not found for property ${propertyId}`);
    }
    return rule;
  }

  async update(propertyId: string, data: any): Promise<any> {
    // Check if rule exists
    const existing = await this.mongoDb.findOneBy(this.collection, { propertyId });
    if (!existing) {
      throw new NotFoundException(`Rent rule not found for property ${propertyId}`);
    }

    console.log('Updating rent rule with data:', data);

    // Use the existing document's ID for update
    const updated = await this.mongoDb.update(this.collection, existing.id, data);

    if (!updated) {
      throw new NotFoundException(`Rent rule not found for property ${propertyId}`);
    }

    return updated;
  }

  async remove(propertyId: string): Promise<{ message: string }> {
    const existing = await this.mongoDb.findOneBy(this.collection, { propertyId });
    if (!existing) {
      throw new NotFoundException(`Rent rule not found for property ${propertyId}`);
    }

    const deleted = await this.mongoDb.delete(this.collection, existing.id);
    if (!deleted) {
      throw new NotFoundException(`Rent rule not found for property ${propertyId}`);
    }

    return { message: 'Rent rule deleted successfully' };
  }
}