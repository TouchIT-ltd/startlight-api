import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class OwnerService {
  constructor(
    private readonly mongoDb: MongoDatabaseService,
  ) {}

  async getDashboard(ownerId: string): Promise<any> {
    // Get all properties owned by this owner
    const properties = await this.mongoDb.findAll('properties', { ownerId });

    // Get all units in these properties
    const propertyIds = properties.map(p => p.id);
    const units = await this.mongoDb.findAll('units', { propertyId: { $in: propertyIds } });

    // Calculate occupancy
    const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
    const totalUnits = units.length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Calculate revenue (placeholder - would need actual payment data)
    const totalRevenue = 0;
    const totalArrears = 0;

    // Revenue trend (placeholder)
    const revenueTrend: Record<string, number> = {};
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      revenueTrend[key] = 0; // Placeholder
    }

    // Occupancy distribution by property
    const occupancyDistribution = await Promise.all(
      properties.map(async (property) => {
        const propertyUnits = units.filter(unit => unit.propertyId === property.id);
        const occupiedCount = propertyUnits.filter(unit => unit.status === 'occupied').length;
        const rate = propertyUnits.length > 0 ? (occupiedCount / propertyUnits.length) * 100 : 0;

        return {
          propertyName: property.name,
          occupancyRate: Math.round(rate * 10) / 10,
        };
      })
    );

    // Top properties by revenue (placeholder)
    const topProperties = properties.map(property => ({
      propertyName: property.name,
      revenue: 0, // Placeholder
    })).slice(0, 5);

    return {
      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      totalRevenue,
      totalArrears,
      revenueTrend,
      occupancyDistribution,
      topProperties,
    };
  }
}